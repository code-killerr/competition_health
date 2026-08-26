import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
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
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(LabMvp, {
    knowledgePath: ':memory:',
    device: { devices: [{ id: 'device-1', name: 'mock device', capabilities: ['dispense'] }] },
  })
  await ctx.plugin(ToolLab)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(['hang']))
  const agent = ctx.agentLoop.create(SessionId('tool-lab-test'), { provider: 'mock', model: 'mock' })
  return { ctx, agent }
}

function execute(ctx: Context, agent: ReturnType<Context['agents']['get']>, name: string, arguments_: unknown) {
  if (agent === undefined) throw new Error('test agent is missing')
  return ctx.tools.execute({
    callId: CallId(`tool-lab-call-${++callNumber}`),
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
  it('records request, approval, run state, observation, and cache events in the Agent Session', async () => {
    const { ctx, agent } = await setup()
    const request = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-1',
      objective: 'prepare sample',
      expected_outputs: ['prepared sample'],
    })
    expect(request.isError).toBe(false)

    const rejected = await execute(ctx, agent, 'lab_plan_reject', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-rejected',
      reason: 'missing source citation',
      replacement_plan_id: 'plan-revision-2',
    })
    expect(rejected.isError).toBe(false)

    const approval = await execute(ctx, agent, 'lab_plan_approve', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-1',
      approved_by: 'reviewer-1',
      skill_revision_ids: ['skill-revision-1'],
    })
    expect(approval.isError).toBe(false)

    const started = await execute(ctx, agent, 'lab_run_start', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-1',
    })
    expect(JSON.parse(text(started))).toMatchObject({ runStatus: 'WAITING_CONFIRMATION' })
    const runId = JSON.parse(text(started)).runId

    const confirmed = await execute(ctx, agent, 'lab_run_confirm', {
      run_id: runId,
      step_id: 'step-1',
      operation_id: 'operation-1',
      evidence: ['manual-check'],
      confirmed_by: 'reviewer-1',
    })
    expect(JSON.parse(text(confirmed))).toMatchObject({ runStatus: 'COMPLETED' })

    expect(agent.session.events.map(event => event.type)).toEqual(expect.arrayContaining([
      'lab/experiment/requested',
      'lab/plan/rejected',
      'lab/plan/approved',
      'lab/run/state',
      'lab/run/observation',
      'lab/cache/projected',
    ]))
  })

  it('executes an approved device step through the Agent tools', async () => {
    const { ctx, agent } = await setup()
    const created = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-device',
      objective: 'dispense sample',
      expected_outputs: ['dispensed sample'],
    })
    expect(created.isError).toBe(false)

    const approval = await execute(ctx, agent, 'lab_plan_approve', {
      experiment_id: 'experiment-device',
      plan_id: 'plan-device',
      approved_by: 'reviewer-1',
      skill_revision_ids: ['skill-revision-1'],
      execution_steps: [{
        step_id: 'step-device',
        skill_revision_id: 'skill-revision-1',
        operation_kind: 'device',
        operation_resource: 'dispense',
        device_id: 'device-1',
        parameters: { volume: { value: 10, unit: 'uL' } },
        requires_approval: false,
        expected_evidence: ['device receipt'],
        failure_policy: 'BLOCK',
      }],
      skill_snapshots: [{
        skill_id: 'skill-1',
        revision_id: 'skill-revision-1',
        definition_hash: 'hash-1',
      }],
    })
    expect(approval.isError).toBe(false)

    const started = await execute(ctx, agent, 'lab_run_start', {
      experiment_id: 'experiment-device',
      plan_id: 'plan-device',
    })
    const run = JSON.parse(text(started))
    expect(run.runStatus).toBe('RUNNING')

    const stepped = await execute(ctx, agent, 'lab_run_step', { run_id: run.runId })
    expect(JSON.parse(text(stepped))).toMatchObject({
      runStatus: 'COMPLETED',
      observations: [{ status: 'COMPLETED', valid: true }],
    })
  })

  it('routes plan approval through the existing approval seam when composed', async () => {
    const { ctx, agent } = await setup()
    let approvalRequests = 0
    ctx.provide('approval', {
      request: async () => {
        approvalRequests += 1
        return 'rejected'
      },
    } as never)

    const created = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-rejected',
      objective: 'prepare sample',
      expected_outputs: ['prepared sample'],
    })
    expect(created.isError).toBe(false)

    const approval = await execute(ctx, agent, 'lab_plan_approve', {
      experiment_id: 'experiment-rejected',
      plan_id: 'plan-rejected',
      approved_by: 'reviewer-1',
      skill_revision_ids: ['skill-revision-1'],
    })

    expect(approval.isError).toBe(true)
    expect(approvalRequests).toBe(1)
    expect(agent.session.events).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'lab/plan/approved' }),
    ]))
  })

})
