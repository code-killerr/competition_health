// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { SessionId } from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as LabMvp from '@deepseek-ai/dsh-experimental-lab-mvp'
import * as ToolLab from '../src/index.ts'
import { MockAdapter } from '../../../core/agent-loop/tests/mock-adapter.ts'

const contexts: Context[] = []
let callNumber = 0

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

async function setup() {
  const ctx = new Context()
  contexts.push(ctx)
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(ToolAskUser)
  await ctx.plugin(SkillRegistry)
  const workspace = { id: brandId<'WorkspaceId'>('tool-lab-workspace'), path: '/tmp/tool-lab', sessionIds: [] as SessionId[] }
  ctx.provide('workspaceRegistry', { get: (id: string) => id === workspace.id ? workspace : undefined, list: () => [workspace] })
  await ctx.plugin(LabMvp, {
    knowledgePath: ':memory:',
    storagePath: ':memory:',
    runtime: { statePath: ':memory:' },
    device: { devices: [{ id: 'device-1', name: 'mock device', capabilities: ['dispense'] }] },
  })
  await ctx.plugin(ToolLab)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(['hang']))
  const agent = ctx.agentLoop.create(SessionId('tool-lab-test'), { provider: 'mock', model: 'mock' })
  workspace.sessionIds.push(agent.session.id)
  return { ctx, agent, workspace }
}

function execute(ctx: Context, agent: ReturnType<Context['agents']['get']>, name: string, arguments_: unknown, callId?: string) {
  if (agent === undefined) throw new Error('test agent is missing')
  return ctx.tools.execute({
    callId: CallId(callId ?? 'tool-lab-call-' + String(++callNumber)),
    name,
    arguments: arguments_,
    agent,
    signal: AbortSignal.timeout(5_000),
  })
}

function text(result: Awaited<ReturnType<typeof execute>>): string {
  return result.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

describe('tool-lab runtime events', () => {
  it('keeps retrieval and planning tools in the Agent scope', async () => {
    const { ctx, agent } = await setup()
    const scope = scopeOf(agent.ctx)
    if (scope === undefined) throw new Error('expected Agent scope')
    const assembly = await ctx.systemPrompt.assemble({ scope })
    expect(assembly.tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'lab_knowledge_status',
      'lab_knowledge_search',
      'lab_knowledge_conflicts',
      'lab_plan_context',
      'lab_plan_devices',
      'lab_plan_propose',
      'lab_experiment_create',
      'lab_skill_validate',
      'lab_run_report',
    ]))
  })

  it('rejects Agent attempts to perform human-gated laboratory actions', async () => {
    const { ctx, agent } = await setup()
    const attempts: readonly [string, unknown][] = [
      ['lab_plan_approve', { experiment_id: 'experiment-1', plan_id: 'plan-1', approved_by: 'reviewer-1', skill_revision_ids: [] }],
      ['lab_plan_reject', { experiment_id: 'experiment-1', plan_id: 'plan-1', reason: 'needs revision' }],
      ['lab_skill_approve', { skill_revision_id: 'skill-1', approved_by: 'reviewer-1' }],
      ['lab_skill_activate', { skill_revision_id: 'skill-1' }],
      ['lab_run_start', { experiment_id: 'experiment-1', plan_id: 'plan-1' }],
      ['lab_run_step', { run_id: 'run-1' }],
      ['lab_run_confirm', { run_id: 'run-1', step_id: 'step-1', operation_id: 'operation-1', evidence: [], confirmed_by: 'reviewer-1' }],
      ['lab_run_stop', { run_id: 'run-1', requested_by: 'reviewer-1', reason: 'operator stop' }],
      ['lab_run_report', { run_id: 'run-1' }],
    ]

    for (const [name, arguments_] of attempts) {
      const result = await execute(ctx, agent, name, arguments_)
      expect(result.isError, name + ': ' + text(result)).toBe(true)
      expect(text(result)).toContain('explicit human action in the project workspace')
    }
  })

  it('injects the LABWEAVE Agent role into the assembled system prompt', async () => {
    const { ctx, agent } = await setup()
    const scope = scopeOf(agent.ctx)
    if (scope === undefined) throw new Error('expected Agent scope')
    const assembly = await ctx.systemPrompt.assemble({ scope })
    const role = assembly.sections.find(section => section.name === 'labweave:agent-role')
    expect(role?.text).toContain('end-to-end experiment lifecycle')
    expect(role?.text).toContain('lab_experiment_create')
  })

  it('creates an Agent Experiment through the current Session Project and replays the same Host operation', async () => {
    const { ctx, agent, workspace } = await setup()
    const project = await ctx.labProjects.create({ workspaceId: workspace.id, createdBy: agent.session.id })
    await ctx.labProjects.attachSession({ projectId: project.project.projectId, sessionId: agent.session.id, attachedBy: agent.session.id })
    const arguments_ = { title: 'Tool-created experiment', objective: 'prepare sample', expected_outputs: ['prepared sample'] }
    const first = await execute(ctx, agent, 'lab_experiment_create', arguments_, 'agent-operation-1')
    expect(first.isError, text(first)).toBe(false)
    const firstValue = JSON.parse(text(first)) as { state: string; projectId: string; registeredDestination?: { projectId: string; experimentId: string } }
    expect(firstValue).toMatchObject({ state: 'registered', projectId: project.project.projectId, registeredDestination: { projectId: project.project.projectId } })
    const second = await execute(ctx, agent, 'lab_experiment_create', arguments_, 'agent-operation-1')
    expect(second.isError, text(second)).toBe(false)
    expect(JSON.parse(text(second))).toMatchObject({ state: 'already-registered', projectId: project.project.projectId, registeredDestination: { projectId: project.project.projectId } })
    expect((await ctx.labProjects.listExperiments(project.project.projectId))).toHaveLength(1)
    expect(agent.session.events.filter(event => event.type === 'lab/experiment/requested')).toHaveLength(1)
  })

  it('returns a typed blocked progress result when the current Session has no Project', async () => {
    const { ctx, agent } = await setup()
    const result = await execute(ctx, agent, 'lab_experiment_create', { title: 'Blocked experiment', objective: 'prepare sample', expected_outputs: ['sample'] })
    expect(result.isError, text(result)).toBe(false)
    expect(JSON.parse(text(result))).toMatchObject({ state: 'blocked', sessionId: agent.session.id, nextActor: 'human', allowedActions: ['select_workspace'] })
  })

  it('routes a clarification through the current Harness Agent and user-question provider', async () => {
    const { ctx, agent } = await setup()
    const requests: import('@deepseek-ai/dsh-user-questions').AskUserQuestionRequest[] = []
    ctx.userQuestions.registerProvider({
      async ask(request) {
        requests.push(request)
        return { answers: [{ id: 'sample', selected: ['sample-1'] }] }
      },
    })

    const result = await execute(ctx, agent, 'ask_user_question', {
      questions: [{
        id: 'sample',
        question: 'Which sample should be used?',
        options: [{ label: 'sample-1', description: 'Use the first sample.' }],
      }],
    })

    expect(result.isError, text(result)).toBe(false)
    expect(JSON.parse(text(result))).toEqual({ answers: [{ id: 'sample', selected: ['sample-1'] }] })
    expect(requests).toHaveLength(1)
    expect(requests[0]?.agent).toBe(agent)
    expect(requests[0]?.questions[0]).toMatchObject({ id: 'sample', question: 'Which sample should be used?' })
  })
})
