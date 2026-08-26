import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { brandId, rebuildExperimentCache } from '@deepseek-ai/dsh-experimental-lab-domain'
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
    storagePath: ':memory:',
    runtime: { statePath: ':memory:' },
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

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

describe('tool-lab runtime events', () => {
  it('composes a user intent into a cited plan review without requiring a model token', async () => {
    const { ctx, agent } = await setup()
    const request = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-review',
      objective: 'prepare sample',
      expected_outputs: ['prepared sample'],
    })
    expect(request.isError).toBe(false)
    await ctx.labKnowledge.importDocument({
      source: { kind: 'bytes', name: 'review-facts.csv', bytes: new TextEncoder().encode('alpha,42\n') },
    })
    const contextResult = await execute(ctx, agent, 'lab_plan_context', {
      request: {
        experimentId: 'experiment-review',
        objective: 'alpha',
        samples: [{ name: 'sample', attributes: {} }],
        constraints: [],
        expectedOutputs: ['prepared sample'],
        unresolved: [],
      },
    })
    const context = parseJson(text(contextResult)) as { citations: Array<{ citationId: string }> }
    const citationId = context.citations[0]!.citationId
    const proposalResult = await execute(ctx, agent, 'lab_plan_propose', {
      request: {
        experimentId: 'experiment-review',
        objective: 'alpha',
        samples: [{ name: 'sample', attributes: {} }],
        constraints: [],
        expectedOutputs: ['prepared sample'],
        unresolved: [],
      },
      plan: {
        planId: 'plan-review',
        experimentId: 'experiment-review',
        revision: 1,
        status: 'DRAFT',
        objective: 'alpha',
        citations: [citationId],
        assumptions: [],
        unresolved: [],
        steps: [{
          stepId: 'step-review',
          title: 'manual sample preparation',
          dependencies: [],
          skillRevisionId: 'skill-review',
          operationKind: 'human',
          operationResource: 'manual-check',
          requiresApproval: true,
          requiredInputs: [],
          parameters: {},
          citations: [citationId],
          expectedOutputs: ['prepared sample'],
        }],
      },
      skill_drafts: [{
        skillId: 'skill-review-id',
        revisionId: 'skill-review',
        status: 'DRAFT',
        name: 'review-sample',
        purpose: 'Review a manually prepared sample.',
        applicability: ['manual laboratory review'],
        inputs: [],
        outputs: ['prepared sample'],
        parameterConstraints: {},
        completionConditions: ['review evidence recorded'],
        failurePolicy: 'REPLAN',
        citations: [citationId],
        operations: [{ kind: 'human', resourceRef: 'manual-check', installed: true }],
      }],
    })
    const proposal = parseJson(text(proposalResult)) as {
      plan: { planId: string; status: string }
      validation: { valid: boolean; issues: Array<{ code: string }> }
      skillRevisions: Array<{ status: string }>
    }
    expect({
      intentRecorded: agent.session.events.some(event => event.type === 'lab/experiment/requested'),
      planId: proposal.plan.planId,
      planStatus: proposal.plan.status,
      validation: {
        valid: proposal.validation.valid,
        codes: proposal.validation.issues.map((issue: { code: string }) => issue.code),
      },
      skillStatus: proposal.skillRevisions[0]!.status,
    }).toMatchInlineSnapshot(`
      {
        "intentRecorded": true,
        "planId": "plan-review",
        "planStatus": "DRAFT",
        "skillStatus": "DRAFT",
        "validation": {
          "codes": [
            "SKILL_NOT_ACTIVE",
          ],
          "valid": false,
        },
      }
    `)
  })

  it('records request, approval, run state, observation, and cache events in the Agent Session', async () => {
    const { ctx, agent } = await setup()
    const request = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-1',
      objective: 'prepare sample',
      expected_outputs: ['prepared sample'],
    })
    expect(request.isError).toBe(false)

    await proposePlan(ctx, agent, 'experiment-1', 'plan-rejected', 'skill-rejected', 'step-rejected')
    const rejected = await execute(ctx, agent, 'lab_plan_reject', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-rejected',
      reason: 'missing source citation',
      replacement_plan_id: 'plan-revision-2',
    })
    expect(rejected.isError).toBe(false)

    await prepareActivePlan(ctx, agent, 'experiment-1', 'plan-1', 'skill-revision-1', 'step-1')
    const approval = await execute(ctx, agent, 'lab_plan_approve', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-1',
      approved_by: 'reviewer-1',
      skill_revision_ids: ['skill-revision-1'],
    })
    expect(approval.isError, text(approval)).toBe(false)

    const started = await execute(ctx, agent, 'lab_run_start', {
      experiment_id: 'experiment-1',
      plan_id: 'plan-1',
    })
    const startedView = parseJson(text(started)) as { runId: string; runStatus: string }
    expect(startedView).toMatchObject({ runStatus: 'WAITING_CONFIRMATION' })
    const runId = startedView.runId

    const confirmed = await execute(ctx, agent, 'lab_run_confirm', {
      run_id: runId,
      step_id: 'step-1',
      operation_id: 'operation-1',
      evidence: ['manual-check'],
      confirmed_by: 'reviewer-1',
    })
    expect(parseJson(text(confirmed)) as { runStatus: string }).toMatchObject({ runStatus: 'COMPLETED' })

    expect(agent.session.events.map(event => event.type)).toEqual(expect.arrayContaining([
      'lab/experiment/requested',
      'lab/plan/rejected',
      'lab/plan/approved',
      'lab/run/state',
      'lab/run/observation',
      'lab/cache/projected',
    ]))
    expect(rebuildExperimentCache(agent.session.events, brandId<'ExperimentId'>('experiment-1'))).toMatchObject({
      experimentId: 'experiment-1',
      runId,
      status: 'COMPLETED',
    })
    expect(ctx.get('storageDomain')?.get('lab_experiment_cache')?.table('experiments').get('experiment-1')).toMatchObject({
      experimentId: 'experiment-1',
      status: 'COMPLETED',
    })
  })

  it('executes an approved device step through the Agent tools', async () => {
    const { ctx, agent } = await setup()
    const created = await execute(ctx, agent, 'lab_experiment_create', {
      experiment_id: 'experiment-device',
      objective: 'dispense sample',
      expected_outputs: ['dispensed sample'],
    })
    expect(created.isError).toBe(false)

    await prepareActivePlan(ctx, agent, 'experiment-device', 'plan-device', 'skill-revision-1', 'step-device', 'device')
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
        requires_approval: true,
        expected_evidence: [],
        failure_policy: 'BLOCK',
      }],
      skill_snapshots: [{
        skill_id: 'skill-1',
        revision_id: 'skill-revision-1',
        definition_hash: 'hash-1',
      }],
    })
    expect(approval.isError, text(approval)).toBe(false)

    const started = await execute(ctx, agent, 'lab_run_start', {
      experiment_id: 'experiment-device',
      plan_id: 'plan-device',
    })
    const run = parseJson(text(started)) as { runId: string; runStatus: string }
    expect(run.runStatus).toBe('WAITING_CONFIRMATION')

    const waitingForApproval = await execute(ctx, agent, 'lab_run_step', { run_id: run.runId })
    expect(parseJson(text(waitingForApproval)) as { runStatus: string }).toMatchObject({ runStatus: 'WAITING_CONFIRMATION' })

    const approvalConfirmation = await execute(ctx, agent, 'lab_run_confirm', {
      run_id: run.runId,
      step_id: 'step-device',
      operation_id: 'operation-device-approval',
      evidence: ['device approval'],
      confirmed_by: 'reviewer-1',
    })
    expect(parseJson(text(approvalConfirmation)) as { runStatus: string }).toMatchObject({ runStatus: 'RUNNING' })

    const stepped = await execute(ctx, agent, 'lab_run_step', { run_id: run.runId })
    expect(parseJson(text(stepped)) as { runStatus: string; observations: Array<{ status: string; valid: boolean }> }).toMatchObject({
      runStatus: 'COMPLETED',
      observations: [{ status: 'COMPLETED', valid: true }],
    })
    const report = await execute(ctx, agent, 'lab_run_report', { run_id: run.runId })
    const reportView = parseJson(text(report)) as { status: string; feedback: { status: string; valid: boolean; replanRequested: boolean } }
    expect(reportView).toMatchObject({
      status: 'COMPLETED',
      feedback: { status: 'COMPLETED', valid: true, replanRequested: false },
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

async function prepareActivePlan(
  ctx: Context,
  agent: ReturnType<Context['agents']['get']>,
  experimentId: string,
  planId: string,
  skillRevisionId: string,
  stepId: string,
  operationKind: 'human' | 'device' = 'human',
): Promise<void> {
  await proposePlan(ctx, agent, experimentId, planId, skillRevisionId, stepId, operationKind)
  const validated = await execute(ctx, agent, 'lab_skill_validate', { skill_revision_id: skillRevisionId })
  expect(validated.isError).toBe(false)
  const approved = await execute(ctx, agent, 'lab_skill_approve', { skill_revision_id: skillRevisionId, approved_by: 'reviewer-1' })
  expect(approved.isError).toBe(false)
  const activated = await execute(ctx, agent, 'lab_skill_activate', { skill_revision_id: skillRevisionId })
  expect(activated.isError).toBe(false)
  const proposal = await ctx.labPlanning.validatePlan(brandId<'PlanId'>(planId))
  if (!proposal.validation.valid) throw new Error(JSON.stringify(proposal.validation))
}

async function proposePlan(
  ctx: Context,
  agent: ReturnType<Context['agents']['get']>,
  experimentId: string,
  planId: string,
  skillRevisionId: string,
  stepId: string,
  operationKind: 'human' | 'device' = 'human',
): Promise<void> {
  if (agent === undefined) throw new Error('test agent is missing')
  await ctx.labKnowledge.importDocument({
    source: { kind: 'bytes', name: `${planId}.csv`, bytes: new TextEncoder().encode('alpha,42\n') },
  })
  const citationResult = await execute(ctx, agent, 'lab_knowledge_search', { query: 'alpha', limit: 1 })
  if (citationResult.isError) throw new Error(text(citationResult))
  const citationId = (parseJson(text(citationResult)) as Array<{ citationId?: string }>)[0]?.citationId
  if (citationId === undefined) throw new Error('test knowledge citation is missing')
  const result = await execute(ctx, agent, 'lab_plan_propose', {
    request: {
      experimentId,
      objective: 'alpha',
      samples: [{ name: 'sample', attributes: {} }],
      constraints: [],
      expectedOutputs: [],
      unresolved: [],
    },
    plan: {
      planId,
      experimentId,
      revision: 1,
      status: 'DRAFT',
      objective: 'alpha',
      citations: [citationId],
      assumptions: [],
      unresolved: [],
      steps: [{
        stepId,
        title: 'controlled laboratory step',
        dependencies: [],
        skillRevisionId,
        operationKind,
        operationResource: operationKind === 'device' ? 'dispense' : 'manual-check',
        ...(operationKind === 'device' ? { deviceId: 'device-1' } : {}),
        ...(operationKind === 'device' ? { deviceCapability: 'dispense' } : {}),
        requiresApproval: operationKind === 'device',
        requiredInputs: [],
        parameters: {},
        citations: [citationId],
        expectedOutputs: [],
      }],
    },
    skill_drafts: [{
      skillId: `skill-${skillRevisionId}`,
      revisionId: skillRevisionId,
      status: 'DRAFT',
      name: `skill-${skillRevisionId}`,
      purpose: 'Run a controlled laboratory step.',
      applicability: ['configured laboratory'],
      inputs: [],
      outputs: [],
      parameterConstraints: {},
      completionConditions: ['evidence recorded'],
      failurePolicy: 'STOP',
      citations: [citationId],
      operations: [{ kind: operationKind, resourceRef: operationKind === 'device' ? 'dispense' : 'manual-check', installed: true }],
    }],
  })
  expect(result.isError).toBe(false)
}
