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
import { brandId, LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'
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
      'lab/cache/projected',
    ]))
    expect(ctx.get('labExperimentCache')?.get(brandId<'ExperimentId'>('experiment-1'))).toMatchObject({
      experimentId: 'experiment-1',
      runId,
      status: 'COMPLETED',
    })
  })
})
