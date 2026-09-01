// Keyless Host lifecycle snapshot for the opt-in LABWEAVE composition.
// This uses the same lab-mvp Facade and Session event path as the Web Host;
// browser-only layout acceptance remains in apps/web/tests.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabProjectWorkspaceRegistry } from '@deepseek-ai/dsh-experimental-lab-project'
import { parseLabProjectConversationCommand, parseLabWebCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import * as LabMvp from '@deepseek-ai/dsh-experimental-lab-mvp'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('keyless Host lifecycle snapshot', () => {
  it('replays one Project identity from goal evidence through report and files', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'dsh-lab-snapshot-'))
    try {
      const ctx = new Context()
      contexts.push(ctx)
      await ctx.plugin(SkillRegistry)
      await ctx.plugin(SessionStore)
      const workspace = { id: brandId<'WorkspaceId'>('workspace-snapshot'), path: workspacePath, sessionIds: [] as SessionId[] }
      const workspaceRegistry: LabProjectWorkspaceRegistry = {
        get: workspaceId => workspaceId === workspace.id ? workspace : undefined,
        list: () => [workspace],
      }
      ctx.provide('workspaceRegistry', workspaceRegistry)
      await ctx.plugin(LabMvp, {
        knowledgePath: ':memory:',
        storagePath: ':memory:',
        runtime: { statePath: ':memory:' },
        device: { devices: [{ id: 'device-snapshot', name: 'snapshot device', capabilities: ['dispense'] }] },
      })

      const session = ctx.sessions.create(SessionId('lab-snapshot-session'), { meta: { cwd: workspacePath } })
      workspace.sessionIds.push(session.id)
      const web = ctx.labMvpWeb
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
        name: 'snapshot-source.txt',
        bytesBase64: Buffer.from('A controlled bench procedure records the observed output.\n').toString('base64'),
      }))
      const documentId = requiredString(imported.documentId)
      const versionId = requiredString(imported.versionId)
      const projectView = asRecord(await sendProject({ command: 'project-create', workspaceId: workspace.id, name: 'Snapshot project' }))
      const projectId = requiredString(asRecord(projectView.project).projectId)
      await sendProject({ command: 'project-scope-update', projectId, sources: [{ documentId, versionId }], deviceIds: ['device-snapshot'] })

      const search = asRecord(await send({ command: 'knowledge-search', request: { query: 'bench' } }))
      const citationId = requiredString(asRecord(array(asRecord(search).results)[0]).citationId)
      await send({ command: 'knowledge-fact-confirm', citationId, confirmedBy: 'snapshot-reviewer' })
      const created = asRecord(await sendProject({ command: 'experiment-create', projectId, title: 'Snapshot experiment', objective: 'Controlled bench procedure' }))
      const experimentId = requiredString(asRecord(array(created.experiments)[0]).experimentId)
      const request = { experimentId, objective: 'Controlled bench procedure', samples: [], constraints: [], expectedOutputs: ['observed output recorded'], unresolved: [] }
      const planning = asRecord(await sendProject({ command: 'project-planning-context', projectId, request }))
      const planningContext = asRecord(asRecord(planning).planningContext)
      const planningCitations = array(planningContext.citations)
      const planningCitation = requiredString(asRecord(planningCitations[0]).citationId)

      await send({
        command: 'plan-propose',
        input: {
          request,
          plan: {
            planId: 'plan-snapshot-1',
            experimentId,
            revision: 1,
            status: 'DRAFT',
            objective: request.objective,
            citations: [planningCitation],
            assumptions: [],
            unresolved: [],
            steps: [{
              stepId: 'step-snapshot',
              title: 'Record observed output',
              dependencies: [],
              skillRevisionId: 'skill-snapshot-r1',
              operationKind: 'human',
              operationResource: 'manual-record',
              requiresApproval: true,
              requiredInputs: [],
              parameters: {},
              citations: [planningCitation],
              expectedOutputs: ['observed output recorded'],
            }],
          },
          skillDrafts: [{
            skillId: 'skill-snapshot',
            revisionId: 'skill-snapshot-r1',
            status: 'DRAFT',
            name: 'manual-record',
            purpose: 'Record the observed output',
            applicability: ['controlled bench procedure'],
            inputs: [],
            outputs: ['observed output recorded'],
            parameterConstraints: {},
            completionConditions: ['the observer records the output'],
            failurePolicy: 'REPLAN',
            citations: [planningCitation],
            operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }],
          }],
        },
      })
      await send({ command: 'skill-validate', revisionId: 'skill-snapshot-r1' })
      await send({ command: 'skill-approve', revisionId: 'skill-snapshot-r1', approvedBy: 'snapshot-reviewer' })
      await send({ command: 'skill-activate', revisionId: 'skill-snapshot-r1' })
      await send({ command: 'plan-validate', planId: 'plan-snapshot-1' })
      await send({ command: 'plan-approve', experimentId, planId: 'plan-snapshot-1', approvedBy: 'snapshot-reviewer' })
      const run = asRecord(await sendProject({ command: 'run-start', experimentId, planId: 'plan-snapshot-1' }))
      const runId = requiredString(run.runId)
      await send({ command: 'run-step', runId })
      await send({ command: 'run-confirm', runId, evidence: ['observed output recorded'], confirmedBy: 'snapshot-reviewer', stepId: 'step-snapshot' })
      const report = asRecord(await sendProject({ command: 'run-report', runId }))
      await new Promise(resolve => setTimeout(resolve, 0))
      const files = array(await sendProject({ command: 'project-file-list', projectId })).map(asRecord)
      const accepted = await web.presentForSession(session.id, { view: 'run', projectId, experimentId, runId })

      expect({
        identities: { project: 'project', workspace: String(asRecord(asRecord(await sendProject({ command: 'project-open', projectId })).project).workspaceId), experiment: 'experiment', run: 'run' },
        planning: { imported: imported.status, citationConfirmed: session.events.some(event => event.type === 'lab/knowledge/confirmed'), selectedDevices: 1 },
        approvals: session.events.filter(event => event.type.startsWith('lab/skill/') || event.type === 'lab/plan/approved').map(event => event.type),
        execution: { status: report.status, verdict: asRecord(report.assessment).verdict, presentationAccepted: asRecord(accepted).accepted },
        files: files.map(file => ({ group: file.group, relativePath: file.relativePath })).sort((left, right) => String(left.relativePath).localeCompare(String(right.relativePath))),
        eventTypes: session.events.map(event => event.type),
      }).toMatchInlineSnapshot(`
        {
          "approvals": [
            "lab/skill/validated",
            "lab/skill/approved",
            "lab/skill/activated",
            "lab/plan/approved",
          ],
          "eventTypes": [
            "lab/project/session-attached",
            "lab/project/created",
            "lab/project/scope-updated",
            "lab/knowledge/confirmed",
            "lab/project/experiment-created",
            "lab/experiment/requested",
            "lab/agent/context-read",
            "lab/plan/proposed",
            "lab/project/evidence/projected",
            "lab/project/file-revision",
            "lab/project/file-revision",
            "lab/skill/validated",
            "lab/project/file-revision",
            "lab/skill/approved",
            "lab/project/file-revision",
            "lab/skill/activated",
            "lab/project/file-revision",
            "lab/project/file-revision",
            "lab/plan/approved",
            "lab/project/evidence/projected",
            "lab/run/state",
            "lab/run/feedback",
            "lab/cache/projected",
            "lab/project/evidence/projected",
            "lab/project/file-revision",
            "lab/run/step",
            "lab/run/observation",
            "lab/run/state",
            "lab/run/feedback",
            "lab/cache/projected",
            "lab/project/evidence/projected",
            "lab/project/file-revision",
            "lab/run/step",
            "lab/run/observation",
            "lab/run/state",
            "lab/run/feedback",
            "lab/cache/projected",
            "lab/project/evidence/projected",
            "lab/project/file-revision",
            "lab/run/approval",
            "lab/run/state",
            "lab/run/feedback",
            "lab/cache/projected",
            "lab/project/evidence/projected",
            "lab/project/file-revision",
            "lab/run/verdict",
            "lab/presentation/accepted",
          ],
          "execution": {
            "presentationAccepted": true,
            "status": "COMPLETED",
            "verdict": "PASS",
          },
          "files": [
            {
              "group": "configuration",
              "relativePath": "configuration/workflow/plan-plan-snapshot-1.json",
            },
            {
              "group": "configuration",
              "relativePath": "configuration/workflow/skill-skill-snapshot-r1.json",
            },
            {
              "group": "run-artifacts",
              "relativePath": "run-artifacts/report-run-1.json",
            },
            {
              "group": "run-artifacts",
              "relativePath": "run-artifacts/run-run-1.json",
            },
          ],
          "identities": {
            "experiment": "experiment",
            "project": "project",
            "run": "run",
            "workspace": "workspace-snapshot",
          },
          "planning": {
            "citationConfirmed": true,
            "imported": "READY",
            "selectedDevices": 1,
          },
        }
      `)
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

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('expected non-empty string')
  return value
}
