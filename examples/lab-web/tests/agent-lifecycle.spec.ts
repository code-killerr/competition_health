// Keyless composed Agent lifecycle snapshot for the opt-in LABWEAVE composition.
// The model is deterministic, but every lab_* call below is dispatched through
// the real Agent loop and Agent-scoped ToolRuntime.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabProjectWorkspaceRegistry } from '@deepseek-ai/dsh-experimental-lab-project'
import { parseLabProjectConversationCommand, parseLabWebCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import * as LabMvp from '@deepseek-ai/dsh-experimental-lab-mvp'
import * as ToolLab from '@deepseek-ai/dsh-experimental-tool-lab'
import { MockAdapter, textResponse, toolCallResponse } from '../../../packages/core/agent-loop/tests/mock-adapter.ts'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('keyless composed Agent laboratory lifecycle snapshot', () => {
  it('starts with real Agent tools, yields at the approval gate, replans after failure, and reports the result', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'dsh-lab-agent-snapshot-'))
    try {
      const ctx = new Context()
      contexts.push(ctx)
      await mountAgentLoopTestDependencies(ctx)
      await ctx.plugin(AgentLoop, { agents: [] })
      await ctx.plugin(UserQuestionService)
      await ctx.plugin(ToolAskUser)
      await ctx.plugin(SkillRegistry)
      const workspace = { id: brandId<'WorkspaceId'>('workspace-agent-snapshot'), path: workspacePath, sessionIds: [] as SessionId[] }
      const workspaceRegistry: LabProjectWorkspaceRegistry = {
        get: workspaceId => workspaceId === workspace.id ? workspace : undefined,
        list: () => [workspace],
      }
      ctx.provide('workspaceRegistry', workspaceRegistry)
      await ctx.plugin(LabMvp, {
        knowledgePath: ':memory:',
        storagePath: ':memory:',
        runtime: { statePath: ':memory:' },
        device: { devices: [{ id: 'device-agent-snapshot', name: 'snapshot device', capabilities: ['dispense'] }] },
      })
      await ctx.plugin(ToolLab)

      const scriptedResponses: Array<ReturnType<typeof textResponse>> = []
      const adapter = new MockAdapter(Array.from({ length: 32 }, () => () => {
        const response = scriptedResponses.shift()
        if (response === undefined) throw new Error('composed Agent snapshot response queue is empty')
        return response
      }))
      ctx.llm.registerAdapter(['mock'], adapter)
      const agent = ctx.agentLoop.create(SessionId('lab-agent-snapshot-session'), { provider: 'mock', model: 'mock' })
      workspace.sessionIds.push(agent.session.id)

      const web = ctx.labMvpWeb
      const send = async (payload: Record<string, unknown>): Promise<unknown> => {
        const result = await web.dispatch(parseLabWebCommand({ ...payload, sessionId: agent.session.id }))
        return result.value
      }
      const sendProject = async (payload: Record<string, unknown>): Promise<unknown> => {
        const result = await web.dispatchProject(parseLabProjectConversationCommand({ ...payload, sessionId: agent.session.id }))
        return result.value
      }

      // Host/UI bootstrap is deliberately outside the Agent: Project creation and
      // selecting its Knowledge scope are not Agent responsibilities.
      const imported = asRecord(await send({
        command: 'knowledge-import',
        name: 'agent-snapshot-source.txt',
        bytesBase64: Buffer.from('A controlled bench procedure records the observed output.\n').toString('base64'),
      }))
      const projectView = asRecord(await sendProject({ command: 'project-create', workspaceId: workspace.id, name: 'Agent snapshot project' }))
      const projectId = requiredString(asRecord(projectView.project).projectId)
      await sendProject({
        command: 'project-scope-update',
        projectId,
        sources: [{ documentId: requiredString(imported.documentId), versionId: requiredString(imported.versionId) }],
        deviceIds: ['device-agent-snapshot'],
      })
      const search = asRecord(await send({ command: 'knowledge-search', request: { query: 'bench' } }))
      const citationId = requiredString(asRecord(array(asRecord(search).results)[0]).citationId)
      await send({ command: 'knowledge-fact-confirm', citationId, confirmedBy: 'agent-snapshot-reviewer' })

      const requestFor = (experimentId: string) => ({
        experimentId,
        objective: 'Controlled bench procedure',
        samples: [],
        constraints: [],
        expectedOutputs: ['observed output recorded'],
        unresolved: [],
      })
      const planFor = (experimentId: string, planId: string, skillRevisionId: string, revision: number, supersedesPlanId?: string, operationResource = 'manual-record') => ({
        planId,
        experimentId,
        revision,
        status: 'DRAFT',
        objective: 'Controlled bench procedure',
        ...supersedesPlanId === undefined ? {} : { supersedesPlanId },
        citations: [citationId],
        assumptions: [],
        unresolved: [],
        steps: [{
          stepId: revision === 1 ? 'step-agent-snapshot' : 'step-agent-replanned',
          title: revision === 1 ? 'Record observed output' : 'Record corrected observed output',
          dependencies: [],
          skillRevisionId,
          operationKind: 'human',
          operationResource,
          requiresApproval: true,
          requiredInputs: [],
          parameters: {},
          citations: [citationId],
          expectedOutputs: ['observed output recorded'],
        }],
      })
      const skillDraftFor = (skillId: string, revisionId: string, name = 'manual-record') => ({
        skillId,
        revisionId,
        status: 'DRAFT',
        name,
        purpose: 'Record the observed output',
        applicability: ['controlled bench procedure'],
        inputs: [],
        outputs: ['observed output recorded'],
        parameterConstraints: {},
        completionConditions: ['the observer records the output'],
        failurePolicy: 'REPLAN',
        citations: [citationId],
        operations: [{ kind: 'human', resourceRef: name, installed: true }],
      })

      // Phase 1: real Agent calls for Knowledge, scoped Project context, and the
      // Host-owned Experiment registration.
      scriptedResponses.push(
        toolCallResponse('agent-knowledge-catalog', 'lab_knowledge_catalog', {}),
        toolCallResponse('agent-device-catalog', 'lab_device_catalog', { project_id: projectId }),
        toolCallResponse('agent-knowledge', 'lab_knowledge_search', { query: 'bench', confirmed: true }),
        toolCallResponse('agent-project-context', 'lab_project_context', { project_id: projectId }),
        toolCallResponse('agent-experiment-create', 'lab_experiment_create', {
          title: 'Agent snapshot experiment',
          objective: 'Controlled bench procedure',
          expected_outputs: ['observed output recorded'],
        }),
        textResponse('The Experiment is registered and ready for evidence-backed planning.'),
      )
      followup(agent, 'Start the laboratory lifecycle from this goal and prepare the Experiment.')
      await agent.whenIdle()
      const experiment = (await ctx.labProjects.listExperiments(brandId<'LabProjectId'>(projectId)))[0]
      if (experiment === undefined) throw new Error('Agent did not create an Experiment')
      const experimentId = String(experiment.experimentId)

      // Phase 2: the Agent proposes and validates a Plan, then requests approval.
      // The next model response is intentionally a final explanation so the loop
      // does not poll or retry the policy-denied approval call.
      scriptedResponses.push(
        toolCallResponse('agent-plan-context', 'lab_project_plan_context', {
          project_id: projectId,
          experiment_id: experimentId,
          objective: 'Controlled bench procedure',
          unresolved: [],
        }),
        toolCallResponse('agent-plan-propose', 'lab_plan_propose', {
          request: requestFor(experimentId),
          plan: planFor(experimentId, 'plan-agent-snapshot-1', 'skill-agent-snapshot-r1', 1),
          skill_drafts: [skillDraftFor('skill-agent-snapshot', 'skill-agent-snapshot-r1')],
        }),
        toolCallResponse('agent-skill-validate', 'lab_skill_validate', { skill_revision_id: 'skill-agent-snapshot-r1' }),
        toolCallResponse('agent-plan-approve', 'lab_plan_approve', {
          experiment_id: experimentId,
          plan_id: 'plan-agent-snapshot-1',
          approved_by: 'agent-snapshot-reviewer',
          skill_revision_ids: ['skill-agent-snapshot-r1'],
        }),
        textResponse('The Plan is ready; I am waiting for the reviewer to approve it and start the Run.'),
      )
      followup(agent, 'Use the confirmed evidence and available device to propose and validate the executable Plan.')
      await agent.whenIdle()
      const deniedApprovals = agent.session.events.filter(event =>
        event.type === 'tool/result'
        && event.data.message.source.kind === 'tool'
        && event.data.message.source.callId === 'agent-plan-approve'
        && event.data.message.content.some(block => block.isError === true),
      )
      expect(deniedApprovals).toHaveLength(1)

      // Human gate: the UI/Host now performs the durable approval and Run start.
      await send({ command: 'skill-approve', revisionId: 'skill-agent-snapshot-r1', approvedBy: 'agent-snapshot-reviewer' })
      await send({ command: 'skill-activate', revisionId: 'skill-agent-snapshot-r1' })
      await send({ command: 'plan-validate', planId: 'plan-agent-snapshot-1' })
      await send({ command: 'plan-approve', experimentId, planId: 'plan-agent-snapshot-1', approvedBy: 'agent-snapshot-reviewer' })
      const firstRun = asRecord(await sendProject({ command: 'run-start', experimentId, planId: 'plan-agent-snapshot-1' }))
      const firstRunId = requiredString(firstRun.runId)
      await send({ command: 'run-step', runId: firstRunId })
      const failedRun = asRecord(await send({ command: 'run-confirm', runId: firstRunId, evidence: ['unexpected-evidence'], confirmedBy: 'agent-snapshot-reviewer', stepId: 'step-agent-snapshot' }))
      expect(failedRun.runStatus).toBe('BLOCKED')
      const derivedProject = asRecord(await sendProject({ command: 'experiment-derive', projectId, sourceExperimentId: experimentId, title: 'Replanned snapshot experiment', objective: 'Controlled bench procedure' }))
      const derivedExperiment = asRecord(array(derivedProject.experiments).at(-1))
      const replanExperimentId = requiredString(derivedExperiment.experimentId)

      // Phase 3: failure is fed back to the Agent, which proposes a new Plan on a derived Experiment.
      scriptedResponses.push(
        toolCallResponse('agent-replan-context', 'lab_project_plan_context', {
          project_id: projectId,
          experiment_id: replanExperimentId,
          objective: 'Controlled bench procedure',
          unresolved: [],
        }),
        toolCallResponse('agent-replan-propose', 'lab_plan_propose', {
          request: requestFor(replanExperimentId),
          plan: planFor(replanExperimentId, 'plan-agent-snapshot-2', 'skill-agent-replanned-r1', 2, undefined, 'manual-record-corrected'),
          skill_drafts: [skillDraftFor('skill-agent-replanned', 'skill-agent-replanned-r1', 'manual-record-corrected')],
        }),
        toolCallResponse('agent-replan-skill-validate', 'lab_skill_validate', { skill_revision_id: 'skill-agent-replanned-r1' }),
        toolCallResponse('agent-replan-approve', 'lab_plan_approve', {
          experiment_id: replanExperimentId,
          plan_id: 'plan-agent-snapshot-2',
          approved_by: 'agent-snapshot-reviewer',
          skill_revision_ids: ['skill-agent-replanned-r1'],
        }),
        textResponse('The failed Run is preserved. The revised Plan is waiting for human approval.'),
      )
      followup(agent, 'The Run failed because required evidence was missing. Explain the failure and replan without rewriting that Run.')
      await agent.whenIdle()
      expect(agent.session.events.filter(event => event.type === 'tool/call' && event.data.name === 'lab_plan_propose')).toHaveLength(2)
      await send({ command: 'skill-approve', revisionId: 'skill-agent-replanned-r1', approvedBy: 'agent-snapshot-reviewer' })
      await send({ command: 'skill-activate', revisionId: 'skill-agent-replanned-r1' })
      const replanValidation = asRecord(await send({ command: 'plan-validate', planId: 'plan-agent-snapshot-2' }))
      expect(replanValidation.validation).toMatchObject({ valid: true, issues: [] })
      await send({ command: 'plan-approve', experimentId: replanExperimentId, planId: 'plan-agent-snapshot-2', approvedBy: 'agent-snapshot-reviewer' })
      const secondRun = asRecord(await sendProject({ command: 'run-start', experimentId: replanExperimentId, planId: 'plan-agent-snapshot-2' }))
      const secondRunId = requiredString(secondRun.runId)
      await send({ command: 'run-step', runId: secondRunId })
      const completedRun = asRecord(await send({ command: 'run-confirm', runId: secondRunId, evidence: ['observed output recorded'], confirmedBy: 'agent-snapshot-reviewer', stepId: 'step-agent-replanned' }))
      expect(completedRun.runStatus).toBe('COMPLETED')
      const report = asRecord(await sendProject({ command: 'run-report', runId: secondRunId }))
      const files = array(await sendProject({ command: 'project-file-list', projectId })).map(asRecord)

      // Final Agent turn: the Host has published the authoritative report; the
      // Agent reads the current Project again and explains the supported result.
      scriptedResponses.push(
        toolCallResponse('agent-final-context', 'lab_project_context', { project_id: projectId }),
        textResponse('The revised Run completed successfully. The evidence satisfies the configured criterion, so the supported result is PASS.'),
      )
      followup(agent, `The Host published this report. Explain the final result using the Project context: ${JSON.stringify(report)}`)
      await agent.whenIdle()

      const toolCalls = agent.session.events
        .filter(event => event.type === 'tool/call')
        .map(event => event.data.name)
      const eventTypes = agent.session.events.filter(event => event.type.startsWith('lab/')).map(event => event.type)
      expect({
        agent: {
          toolCalls,
          approvalAttempts: toolCalls.filter(name => name === 'lab_plan_approve').length,
          finalMessage: agent.session.events.filter(event => event.type === 'assistant/message').at(-1)?.data.message.content,
        },
        host: {
          imported: imported.status,
          firstRun: failedRun.runStatus,
          secondRun: completedRun.runStatus,
          reportStatus: report.status,
          verdict: asRecord(report.assessment).verdict,
          reportFiles: files.filter(file => file.group === 'run-artifacts').length,
        },
        preservation: {
          experimentId: 'experiment',
          replanExperimentId: 'derived-experiment',
          failedRunId: firstRunId,
          completedRunId: secondRunId,
          replanProposals: agent.session.events.filter(event => event.type === 'lab/plan/proposed').length,
        },
        lifecycle: {
          knowledgeConfirmed: eventTypes.includes('lab/knowledge/confirmed'),
          planProposals: eventTypes.filter(type => type === 'lab/plan/proposed').length,
          approvals: eventTypes.filter(type => type === 'lab/skill/approved' || type === 'lab/plan/approved'),
          verdicts: eventTypes.filter(type => type === 'lab/run/verdict').length,
        },
      }).toMatchInlineSnapshot(`
        {
          "agent": {
            "approvalAttempts": 2,
            "finalMessage": [
              {
                "text": "The revised Run completed successfully. The evidence satisfies the configured criterion, so the supported result is PASS.",
                "type": "text",
              },
            ],
            "toolCalls": [
              "lab_knowledge_catalog",
              "lab_device_catalog",
              "lab_knowledge_search",
              "lab_project_context",
              "lab_experiment_create",
              "lab_project_plan_context",
              "lab_plan_propose",
              "lab_skill_validate",
              "lab_plan_approve",
              "lab_project_plan_context",
              "lab_plan_propose",
              "lab_skill_validate",
              "lab_plan_approve",
              "lab_project_context",
            ],
          },
          "host": {
            "firstRun": "BLOCKED",
            "imported": "READY",
            "reportFiles": 3,
            "reportStatus": "COMPLETED",
            "secondRun": "COMPLETED",
            "verdict": "PASS",
          },
          "lifecycle": {
            "approvals": [
              "lab/skill/approved",
              "lab/plan/approved",
              "lab/skill/approved",
              "lab/plan/approved",
            ],
            "knowledgeConfirmed": true,
            "planProposals": 2,
            "verdicts": 1,
          },
          "preservation": {
            "completedRunId": "run-2",
            "experimentId": "experiment",
            "failedRunId": "run-1",
            "replanExperimentId": "derived-experiment",
            "replanProposals": 2,
          },
        }
      `)    } finally {
      await rm(workspacePath, { recursive: true, force: true })
    }
  })
})

function followup(agent: ReturnType<Context['agentLoop']['create']>, text: string): void {
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
}

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


























