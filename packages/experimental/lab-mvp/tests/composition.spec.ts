import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import LabRuntimeService from '@deepseek-ai/dsh-experimental-lab-runtime'
import KnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import LabPlanningService from '@deepseek-ai/dsh-experimental-lab-planning'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import LabDeviceService from '@deepseek-ai/dsh-experimental-lab-device'
import { LabMvpWebService } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import { parseLabWebCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import { parseLabProjectConversationCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import { brandId, LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabProjectWorkspaceRegistry } from '@deepseek-ai/dsh-experimental-lab-project'
import * as LabMvp from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('lab-mvp composition', () => {
  it('mounts all four capability providers and the Web Consumer with explicit configuration', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(LabMvp, {
      knowledgePath: ':memory:',
      storagePath: ':memory:',
      runtime: { statePath: ':memory:' },
      device: { devices: [{ id: 'device-1', name: 'test device', capabilities: ['dispense'] }] },
    })

    expect(ctx.labDevices.listDevices()).toMatchObject([
      { id: 'device-1', name: 'test device', healthy: true, reserved: false },
    ])
    expect(ctx.get('labKnowledge')).toBeDefined()
    expect(ctx.get('labPlanning')).toBeDefined()
    expect(ctx.get('labSkills')).toBeDefined()
    expect(ctx.get('labDevices')).toBeDefined()
    expect(ctx.get('labRuntime')).toBeDefined()
    expect(ctx.get('labMvpWeb')).toBeDefined()
    expect(() => ctx.labKnowledge.search({ query: 'none' })).not.toThrow()
    await expect((ctx.get('labMvpWeb') as LabMvpWebService).snapshot(brandId<'ExperimentId'>('experiment-1'))).resolves.toMatchObject({
      knowledge: [],
      planReviews: [],
      devices: [{ id: 'device-1' }],
    })
  })

  it('fails loudly when any capability Provider is absent outside the bundle', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(KnowledgeService)
    await ctx.plugin(LabPlanningService)
    await ctx.plugin(LabSkillService)
    await ctx.plugin(LabDeviceService)
    await ctx.plugin(LabRuntimeService)
    expect(() => ctx.labKnowledge.search({ query: 'none' })).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labPlanning.buildContext({} as never)).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labSkills.resolveRevision(brandId<'SkillRevisionId'>('revision-1'))).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labDevices.listDevices()).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labRuntime.getRun(brandId<'RunId'>('run-1'))).toThrow(LabProviderUnavailableError)
  })

  it('wires the opt-in Docling adapter and reports an unavailable local runtime', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(LabMvp, {
      knowledgePath: ':memory:',
      storagePath: ':memory:',
      runtime: { statePath: ':memory:' },
      docling: { pythonCommand: 'dsh-python-that-is-not-installed' },
    })

    const result = await ctx.labMvpWeb.dispatch(parseLabWebCommand({
      command: 'knowledge-import',
      name: 'protocol.pdf',
      bytesBase64: Buffer.from('%PDF-1.7\n').toString('base64'),
    }))
    expect(result).toMatchObject({ kind: 'knowledge-import', value: { status: 'FAILED', errorCode: 'DOCLING_RUNTIME_UNAVAILABLE' } })
    expect(ctx.get('subprocess')).toBeDefined()
  })

  it('runs a keyless browser-command workflow through the Facade and back to a report', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(LabMvp, {
      knowledgePath: ':memory:',
      storagePath: ':memory:',
      runtime: { statePath: ':memory:' },
      device: { devices: [{ id: 'device-1', name: 'test device', capabilities: ['dispense'] }] },
    })

    const web = ctx.labMvpWeb
    const session = ctx.sessions.create(SessionId('lab-web-session'))
    const send = (payload: Record<string, unknown>) => web.dispatch(parseLabWebCommand({ ...payload, sessionId: session.id }))
    const source = 'Controlled bench procedure\nRecord the observed bench output.\n'
    await expect(send({
      command: 'knowledge-import',
      name: 'minimal-source.txt',
      bytesBase64: Buffer.from(source).toString('base64'),
    })).resolves.toMatchObject({ kind: 'knowledge-import', value: { status: 'READY' } })

    const search = await send({ command: 'knowledge-search', request: { query: 'bench', experimentId: 'experiment-1' } })
    const searchCitation = (search.value as { results: readonly { citationId: string }[] }).results[0]?.citationId
    expect(searchCitation).toBeDefined()
    const request = {
      experimentId: 'experiment-1',
      objective: 'Controlled bench procedure',
      samples: [],
      constraints: [],
      expectedOutputs: ['observed output recorded'],
      unresolved: [],
    }
    await send({ command: 'experiment-create', request })
    const context = await send({ command: 'planning-context', request })
    const citation = (context.value as { citations: readonly { citationId: string }[] }).citations[0]?.citationId
    expect(citation).toBeDefined()
    expect(context).toMatchObject({
      kind: 'planning-context',
      value: { citations: expect.arrayContaining([expect.objectContaining({ citationId: citation })]) as unknown },
    })
    await expect(send({
      command: 'plan-propose',
      input: {
        request,
        plan: {
          planId: 'plan-local-demo-1',
          experimentId: 'experiment-1',
          revision: 1,
          status: 'DRAFT',
          objective: request.objective,
          citations: [citation],
          assumptions: [],
          unresolved: [],
          steps: [{
            stepId: 'step-record-output',
            title: 'Record the observed bench output',
            dependencies: [],
            skillRevisionId: 'skill-local-demo-r1',
            operationKind: 'human',
            operationResource: 'manual-record',
            requiresApproval: true,
            requiredInputs: [],
            parameters: {},
            citations: [citation],
            expectedOutputs: ['observed output recorded'],
          }],
        },
        skillDrafts: [{
          skillId: 'skill-local-demo',
          revisionId: 'skill-local-demo-r1',
          status: 'DRAFT',
          name: 'manual-record',
          purpose: 'Record a human-observed output for a controlled bench procedure',
          applicability: ['controlled bench procedure'],
          inputs: [],
          outputs: ['observed output recorded'],
          parameterConstraints: {},
          completionConditions: ['the observer records the output'],
          failurePolicy: 'BLOCK',
          citations: [citation],
          operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }],
        }],
      },
    })).resolves.toMatchObject({ kind: 'plan-proposal', value: { plan: { status: 'DRAFT' } } })
    await send({ command: 'skill-validate', revisionId: 'skill-local-demo-r1' })
    await send({ command: 'skill-approve', revisionId: 'skill-local-demo-r1', approvedBy: 'reviewer' })
    await send({ command: 'skill-activate', revisionId: 'skill-local-demo-r1' })
    await expect(send({ command: 'plan-validate', planId: 'plan-local-demo-1' })).resolves.toMatchObject({
      kind: 'plan-proposal',
      value: { plan: { status: 'VALIDATED' }, validation: { valid: true } },
    })
    await send({ command: 'plan-approve', experimentId: 'experiment-1', planId: 'plan-local-demo-1', approvedBy: 'reviewer' })
    const started = await send({ command: 'run-start', experimentId: 'experiment-1', planId: 'plan-local-demo-1' })
    const runId = (started.value as { runId: string }).runId
    await send({ command: 'run-step', runId })
    await expect(send({ command: 'run-confirm', runId, evidence: ['observed output recorded'], confirmedBy: 'reviewer', stepId: 'step-record-output' })).resolves.toMatchObject({
      kind: 'run',
      value: { runStatus: 'COMPLETED' },
    })
    await expect(send({ command: 'run-report', runId })).resolves.toMatchObject({ kind: 'report', value: { runId, status: 'COMPLETED' } })
    await expect(send({ command: 'snapshot', experimentId: 'experiment-1' })).resolves.toMatchObject({
      kind: 'snapshot',
      value: { run: { runId, runStatus: 'COMPLETED' }, report: { runId, status: 'COMPLETED' } },
    })
    expect(session.events.map(event => event.type)).toEqual(expect.arrayContaining([
      'lab/experiment/requested',
      'lab/plan/proposed',
      'lab/skill/activated',
      'lab/plan/approved',
      'lab/run/step',
      'lab/run/approval',
      'lab/run/observation',
      'lab/run/state',
      'lab/run/feedback',
      'lab/run/verdict',
      'lab/cache/projected',
    ]))
    expect(session.events.findLast(event => event.type === 'lab/run/step')).toMatchObject({
      type: 'lab/run/step',
      data: { experimentId: 'experiment-1', runId, stepId: 'step-record-output', status: 'COMPLETED' },
    })
    expect(session.events.find(event => event.type === 'lab/run/approval')).toMatchObject({
      type: 'lab/run/approval',
      data: { experimentId: 'experiment-1', runId, stepId: 'step-record-output', approvedBy: 'reviewer' },
    })
    expect(session.events.findLast(event => event.type === 'lab/run/verdict')).toMatchObject({
      type: 'lab/run/verdict',
      data: { experimentId: 'experiment-1', runId, status: 'PASSED', verdict: 'PASS', humanQcRequired: false },
    })
    expect(ctx.get('labExperimentCache')?.get(brandId<'ExperimentId'>('experiment-1'))).toMatchObject({
      experimentId: 'experiment-1',
      runId,
      status: 'COMPLETED',
    })
  })

  it('keeps Project identity, Session events, Runtime replan and authorized files on one Host journey', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'dsh-lab-composed-'))
    try {
      const ctx = new Context()
      contexts.push(ctx)
      await ctx.plugin(SkillRegistry)
      await ctx.plugin(SessionStore)
      const workspace = { id: brandId<'WorkspaceId'>('workspace-composed'), path: workspacePath, sessionIds: [] as SessionId[] }
      const workspaceRegistry: LabProjectWorkspaceRegistry = {
        get: workspaceId => workspaceId === workspace.id ? workspace : undefined,
        list: () => [workspace],
      }
      ctx.provide('workspaceRegistry', workspaceRegistry)
      await ctx.plugin(LabMvp, {
        knowledgePath: ':memory:',
        storagePath: ':memory:',
        runtime: { statePath: ':memory:' },
        device: { devices: [{ id: 'device-composed', name: 'composed device', capabilities: ['dispense'] }] },
      })

      const web = ctx.labMvpWeb
      const session = ctx.sessions.create(SessionId('lab-composed-session'), { meta: { cwd: workspacePath } })
      workspace.sessionIds.push(session.id)
      const send = async (payload: Record<string, unknown>): Promise<unknown> => {
        const result = await web.dispatch(parseLabWebCommand({ ...payload, sessionId: session.id }))
        return result.value
      }
      const sendProject = async (payload: Record<string, unknown>): Promise<unknown> => {
        const result = await web.dispatchProject(parseLabProjectConversationCommand({ ...payload, sessionId: session.id }))
        return result.value
      }

      const imported = asRecord(await send({
        command: 'knowledge-import',
        name: 'composed-source.txt',
        bytesBase64: Buffer.from('Controlled bench procedure\nRecord the observed bench output.\n').toString('base64'),
      }))
      expect(imported.status).toBe('READY')
      const documentId = stringValue(imported.documentId)
      const versionId = stringValue(imported.versionId)
      expect(documentId).toBeDefined()
      expect(versionId).toBeDefined()
      if (documentId === undefined || versionId === undefined) throw new Error('composed Knowledge source has no identity')

      const projectCreated = asRecord(await sendProject({ command: 'project-create', workspaceId: workspace.id, name: 'Composed Host project' }))
      const projectId = stringValue(asRecord(projectCreated.project).projectId)
      expect(projectId).toBeDefined()
      if (projectId === undefined) throw new Error('composed Project has no identity')
      const attached = asRecord(await sendProject({ command: 'project-session-attach', projectId, targetSessionId: session.id }))
      expect(array(asRecord(attached).sessions)).toEqual(expect.arrayContaining([expect.objectContaining({ sessionId: session.id })]))
      await sendProject({
        command: 'project-scope-update',
        projectId,
        sources: [{ documentId, versionId }],
        deviceIds: ['device-composed'],
      })

      const search = asRecord(await send({ command: 'knowledge-search', request: { query: 'bench' } }))
      const citationId = stringValue(asRecord(array(asRecord(search).results)[0]).citationId)
      expect(citationId).toBeDefined()
      if (citationId === undefined) throw new Error('composed Knowledge search has no citation')
      await send({ command: 'knowledge-fact-confirm', citationId, confirmedBy: 'composed-reviewer' })
      const sopStep = {
        order: 1,
        title: 'Record the observed bench output',
        instruction: 'Record the observed bench output.',
        requiredInputs: [],
        completionCriteria: ['observed output recorded'],
        citations: [citationId],
        missingFields: [],
      }
      const sop = asRecord(await send({ command: 'knowledge-sop-create', title: 'Composed bench procedure', steps: [sopStep] }))
      const sopDraftId = stringValue(asRecord(sop.draft).draftId)
      expect(sopDraftId).toBeDefined()
      if (sopDraftId === undefined) throw new Error('composed SOP has no identity')
      await send({ command: 'knowledge-sop-update', draftId: sopDraftId, title: 'Composed bench procedure', steps: [sopStep] })
      await send({ command: 'knowledge-sop-publish', draftId: sopDraftId, publishedBy: 'composed-reviewer' })

      const createdExperiment = asRecord(await sendProject({
        command: 'experiment-create',
        projectId,
        title: 'Composed experiment',
        objective: 'Controlled bench procedure',
      }))
      const experiment = asRecord(array(asRecord(createdExperiment).experiments)[0])
      const experimentId = stringValue(experiment.experimentId)
      expect(experimentId).toBeDefined()
      if (experimentId === undefined) throw new Error('composed Experiment has no identity')
      const request = {
        experimentId,
        objective: 'Controlled bench procedure',
        samples: [],
        constraints: [],
        expectedOutputs: ['observed output recorded'],
        unresolved: [],
      }
      const scopedProject = asRecord(await sendProject({ command: 'project-open', projectId }))
      expect(array(scopedProject.sources)).toEqual(expect.arrayContaining([expect.objectContaining({ documentId, versionId })]))
      const projectPlanning = asRecord(await sendProject({ command: 'project-planning-context', projectId, request }))
      const projectPlanningContext = asRecord(projectPlanning.planningContext)
      expect(projectPlanningContext.experimentId).toBe(experimentId)
      const planning = asRecord(await send({ command: 'planning-context', request }))
      const planningCitationId = stringValue(asRecord(array(asRecord(planning).citations)[0]).citationId)
      expect(planningCitationId).toBeDefined()
      if (planningCitationId === undefined) throw new Error('composed planning context has no citation')
      const planCitationId = planningCitationId

      await send({
        command: 'plan-propose',
        input: {
          request,
          plan: {
            planId: 'plan-composed-1',
            experimentId,
            revision: 1,
            status: 'DRAFT',
            objective: request.objective,
            citations: [planCitationId],
            assumptions: [],
            unresolved: [],
            steps: [{
              stepId: 'step-composed',
              title: 'Record the observed bench output',
              dependencies: [],
              skillRevisionId: 'skill-composed-r1',
              operationKind: 'human',
              operationResource: 'manual-record',
              requiresApproval: true,
              requiredInputs: [],
              parameters: {},
              citations: [planCitationId],
              expectedOutputs: ['observed output recorded'],
            }],
          },
          skillDrafts: [{
            skillId: 'skill-composed',
            revisionId: 'skill-composed-r1',
            status: 'DRAFT',
            name: 'manual-record',
            purpose: 'Record a human-observed output',
            applicability: ['controlled bench procedure'],
            inputs: [],
            outputs: ['observed output recorded'],
            parameterConstraints: {},
            completionConditions: ['the observer records the output'],
            failurePolicy: 'REPLAN',
            citations: [planCitationId],
            operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }],
          }],
        },
      })
      await send({ command: 'skill-validate', revisionId: 'skill-composed-r1' })
      await send({ command: 'skill-approve', revisionId: 'skill-composed-r1', approvedBy: 'composed-reviewer' })
      await send({ command: 'skill-activate', revisionId: 'skill-composed-r1' })
      await send({ command: 'plan-validate', planId: 'plan-composed-1' })
      await send({ command: 'plan-approve', experimentId, planId: 'plan-composed-1', approvedBy: 'composed-reviewer' })

      const started = asRecord(await sendProject({ command: 'run-start', experimentId, planId: 'plan-composed-1' }))
      const runId = stringValue(started.runId)
      expect(runId).toBeDefined()
      if (runId === undefined) throw new Error('composed Run has no identity')
      await send({ command: 'run-step', runId })
      const blocked = asRecord(await send({
        command: 'run-confirm',
        runId,
        evidence: ['evidence does not match the expected output'],
        confirmedBy: 'composed-reviewer',
        stepId: 'step-composed',
      }))
      expect(blocked).toMatchObject({ runId, runStatus: 'BLOCKED', replanRequest: { runId, stepId: 'step-composed' } })
      const report = asRecord(await sendProject({ command: 'run-report', runId }))
      expect(report).toMatchObject({ runId, status: 'BLOCKED', assessment: { status: 'FAILED', verdict: 'FAIL', humanQcRequired: false } })

      const presentation = await web.presentForSession(session.id, { view: 'run', projectId, experimentId, runId })
      expect(presentation).toEqual({ accepted: true, intent: { view: 'run', projectId, experimentId, runId } })
      await new Promise(resolve => setTimeout(resolve, 0))
      const files = array(await sendProject({ command: 'project-file-list', projectId })).map(asRecord)
      expect(files.map(file => file.relativePath)).toEqual(expect.arrayContaining([
        'configuration/workflow/plan-plan-composed-1.json',
        'configuration/workflow/skill-skill-composed-r1.json',
        'run-artifacts/run-' + runId + '.json',
        'run-artifacts/report-' + runId + '.json',
      ]))

      const projectView = asRecord(await sendProject({ command: 'project-open', projectId }))
      expect(asRecord(projectView.project)).toMatchObject({ projectId, workspaceId: workspace.id })
      expect(array(projectView.experiments)).toEqual(expect.arrayContaining([expect.objectContaining({ experimentId, projectId })]))
      const runList = array(await sendProject({ command: 'run-list', experimentId })).map(asRecord)
      expect(runList).toEqual(expect.arrayContaining([expect.objectContaining({ runId, experimentId, runStatus: 'BLOCKED' })]))

      const eventTypes = session.events.map(event => event.type)
      expect(eventTypes).toEqual(expect.arrayContaining([
        'lab/project/created',
        'lab/project/session-attached',
        'lab/project/scope-updated',
        'lab/project/experiment-created',
        'lab/experiment/requested',
        'lab/agent/context-read',
        'lab/plan/proposed',
        'lab/skill/validated',
        'lab/skill/approved',
        'lab/skill/activated',
        'lab/plan/approved',
        'lab/run/step',
        'lab/run/approval',
        'lab/run/observation',
        'lab/run/state',
        'lab/run/feedback',
        'lab/run/verdict',
        'lab/cache/projected',
        'lab/project/evidence/projected',
        'lab/project/file-revision',
        'lab/presentation/accepted',
      ]))
      const experimentIdentities = session.events
        .filter(event => typeof event.data === 'object' && event.data !== null && 'experimentId' in event.data)
        .map(event => String((event.data as { readonly experimentId: unknown }).experimentId))
      expect(new Set(experimentIdentities)).toEqual(new Set([experimentId]))
    } finally {
      await rm(workspacePath, { recursive: true, force: true })
    }
  })
})

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('expected object')
  return value as Record<string, unknown>
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}
