/** 实验 Agent 工具的 opt-in 聚合 Consumer。 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { brandId, type ExperimentPlan } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ExecutionStepSpec, LabRuntimeService, RunView } from '@deepseek-ai/dsh-experimental-lab-runtime'
import type { OperationKind, PlanParameter, SkillSnapshot } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabPlanningService } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { LabSkillService } from '@deepseek-ai/dsh-experimental-lab-skill'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { defineTool, type InferValue, type PreToolDecision, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import * as ToolLabKnowledge from '@deepseek-ai/dsh-experimental-tool-lab-knowledge'
import * as ToolLabPlanning from '@deepseek-ai/dsh-experimental-tool-lab-planning'
import LabExperimentCache from '@deepseek-ai/dsh-experimental-lab-cache'
import type { LabExperimentCacheService } from '@deepseek-ai/dsh-experimental-lab-cache'

/** Cordis 插件名称。 */
export const name = 'tool-lab'
/** 复用 Harness Agent、工具注册表与 Runtime Service。 */
export const inject = ['agents', 'tools', 'labRuntime', 'labPlanning', 'labSkills', 'labMvpWeb']

const JSON_SCHEMA = { type: 'json' } as const
const HUMAN_ACTION_TOOLS = new Set([
  'lab_plan_approve',
  'lab_plan_reject',
  'lab_skill_approve',
  'lab_skill_activate',
  'lab_run_start',
  'lab_run_step',
  'lab_run_confirm',

  'lab_run_stop',
  'lab_run_report',
])

interface LabAgentExperimentProgress {
  readonly state: 'registered' | 'already-registered' | 'blocked'
  readonly sessionId: string
  readonly projectId?: string
  readonly reason: string
  readonly nextActor: 'agent' | 'human' | 'runtime' | 'capability'
  readonly allowedActions: readonly string[]
  readonly registeredDestination?: { readonly projectId: string; readonly experimentId: string }
  readonly workbenchDestination?: { readonly view: 'lab-monitor' | 'lab-project'; readonly projectId?: string; readonly experimentId?: string }
}

interface LabAgentExperimentHost {
  createAgentExperiment(request: { readonly operationId: string; readonly sessionId: string; readonly title: string; readonly objective: string; readonly expectedOutputs: readonly string[] }): Promise<LabAgentExperimentProgress>
}

const LABWEAVE_SYSTEM_PROMPT = [
  'You are the LABWEAVE laboratory Agent inside DeepSeek Harness.',
  'Own the end-to-end experiment lifecycle: clarify the goal, inspect Knowledge and available capabilities, generate the workflow and executable plan, request human approval at required gates, monitor execution, assess evidence, and state the final result.',
  'Use lab_project_context, lab_knowledge_catalog, and lab_device_catalog before planning so imported Knowledge status and configured/selected device capabilities are visible to you; then use lab_project_plan_context for confirmed, Project-scoped evidence.',
  'Use lab_experiment_create to register a new Experiment from the current Session; never invent Project or Experiment IDs and never create a Workspace or Project from an Agent tool.',
  'Keep every action scoped to the current Project and Session. Treat device operations, approvals, plan changes, and final assessment as Host-controlled or human-gated operations.',
  'When a Host result returns blocked or requires a human, stop at that gate and explain the exact next action. When work is complete, summarize evidence, failures, unresolved items, and the result judgment.',
].join('\n');

function jsonOutput<const S extends ValueSchemaSpec>(schema: S): {
  schema: S
  render: (args: unknown, value: InferValue<S>) => [{ type: 'text'; text: string }]
} {
  return {
    schema,
    render: (_args: unknown, value: InferValue<S>) => [{ type: 'text', text: JSON.stringify(value) }],
  }
}

function jsonValue(value: unknown): JsonValue {
  const serialized: unknown = JSON.stringify(value)
  if (typeof serialized !== 'string') throw new Error('laboratory result is not JSON serializable')
  return JSON.parse(serialized) as JsonValue
}

function callingAgent(agent: Agent | undefined, toolName: string): Agent {
  if (agent === undefined) throw new Error(`${toolName} requires a calling Agent`)
  return agent
}

function install(
  agent: Agent,
  runtime: LabRuntimeService,
  planning: LabPlanningService,
  skills: LabSkillService,
  cache: LabExperimentCacheService,
  web: LabAgentExperimentHost,
): () => void {
  const disposers: Array<() => unknown> = []
  const register = (disposer: () => unknown): void => { disposers.push(disposer) }
  try {
    register(agent.ctx.systemPrompt.section({ name: 'labweave:agent-role', order: 60, text: LABWEAVE_SYSTEM_PROMPT }))
    register(agent.ctx.on('tools/pre-execute', (exec, next): Promise<PreToolDecision> => {
      if (!HUMAN_ACTION_TOOLS.has(exec.name)) return next()
      return Promise.resolve({ kind: 'deny', reason: 'This laboratory action requires an explicit human action in the project workspace.' })
    }))
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_experiment_create',
      description: 'Create a Project Experiment from the current Session. The Host resolves the Project, generates the Experiment ID, registers Runtime, and returns the next Agent actions.',
      parameters: {
        title: { type: 'string', required: true, description: 'Short experiment title.' },
        objective: { type: 'string', required: true, description: 'User experiment objective.' },
        expected_outputs: { type: 'array', required: true, items: { type: 'string' }, description: 'Expected result labels.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_experiment_create')
        const title = string(args.title, 'title')
        const objective = string(args.objective, 'objective')
        const expectedOutputs = stringArray(args.expected_outputs, 'expected_outputs')
        const progress = await web.createAgentExperiment({
          operationId: brandId<'LabOperationId'>(String(exec.callId)),
          sessionId: caller.session.id,
          title,
          objective,
          expectedOutputs,
        })
        return jsonValue(progress)
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_plan_approve',
      description: 'Approve a validated plan and its Skill revisions. This records approval but does not start a run.',
      parameters: {
        experiment_id: { type: 'string', required: true, description: 'Opaque experiment id.' },
        plan_id: { type: 'string', required: true, description: 'Exact plan revision id.' },
        approved_by: { type: 'string', required: true, description: 'Accountable reviewer identity.' },
        skill_revision_ids: { type: 'array', required: true, items: { type: 'string' }, description: 'All referenced Skill revision ids.' },
        execution_steps: { type: 'json', description: 'Optional immutable execution steps; only device, human, and approval operations are accepted by Runtime.' },
        skill_snapshots: { type: 'json', description: 'Optional ACTIVE Skill snapshots locked into the run.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_plan_approve')
        const experimentId = brandId<'ExperimentId'>(string(args.experiment_id, 'experiment_id'))
        const planId = brandId<'PlanId'>(string(args.plan_id, 'plan_id'))
        const approvedBy = string(args.approved_by, 'approved_by')
        const skillRevisionIds = stringArray(args.skill_revision_ids, 'skill_revision_ids').map(id => brandId<'SkillRevisionId'>(id))
        const executionSteps = parseExecutionSteps(args.execution_steps)
        const skillSnapshots = parseSkillSnapshots(args.skill_snapshots)
        const proposal = await planning.validatePlan(planId)
        if (proposal.plan.experimentId !== experimentId) throw new Error('plan experimentId does not match request')
        if (!proposal.validation.valid || proposal.plan.status !== 'VALIDATED') throw new Error('only a validated plan can be approved')
        const referencedRevisionIds = new Set(proposal.plan.steps.map(step => step.skillRevisionId))
        if (
          referencedRevisionIds.size !== skillRevisionIds.length
          || skillRevisionIds.some(revisionId => !referencedRevisionIds.has(revisionId))
        ) {
          throw new Error('skill_revision_ids must exactly match the plan step Skill revisions')
        }
        for (const revisionId of skillRevisionIds) {
          if (skills.resolveRevision(revisionId)?.status !== 'ACTIVE') throw new Error(`Skill revision ${revisionId} must be ACTIVE before plan approval`)
        }
        const lockedExecutionSteps = executionSteps ?? executionStepsFromPlan(proposal.plan, skills)
        const lockedSkillSnapshots = skillSnapshots ?? await skills.snapshotForRun(skillRevisionIds)
        await runtime.approvePlan({
          experimentId,
          planId,
          approvedBy,
          skillRevisionIds,
          executionSteps: lockedExecutionSteps,
          skillSnapshots: lockedSkillSnapshots,
        })
        await planning.approvePlan(planId, approvedBy)
        caller.session.append('lab/plan/approved', {
          version: 1,
          experimentId,
          planId,
          approvedBy,
          skillRevisionIds,
        })
        return jsonValue({ experimentId, planId, approvedBy, skillRevisionIds })
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_plan_reject',
      description: 'Reject a plan revision and record an optional replacement revision. This never starts or changes a run.',
      parameters: {
        experiment_id: { type: 'string', required: true, description: 'Opaque experiment id.' },
        plan_id: { type: 'string', required: true, description: 'Plan revision to reject.' },
        reason: { type: 'string', required: true, description: 'Human-readable rejection reason.' },
        replacement_plan_id: { type: 'string', description: 'Optional new plan revision id to submit for validation.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        await Promise.resolve()
        const caller = callingAgent(exec.agent, 'lab_plan_reject')
        const experimentId = brandId<'ExperimentId'>(string(args.experiment_id, 'experiment_id'))
        const planId = brandId<'PlanId'>(string(args.plan_id, 'plan_id'))
        const reason = string(args.reason, 'reason')
        const replacement = optionalString(args.replacement_plan_id, 'replacement_plan_id')
        const replacementPlanId = replacement === undefined ? undefined : brandId<'PlanId'>(replacement)
        await planning.rejectPlan(planId, reason)
        caller.session.append('lab/plan/rejected', {
          version: 1,
          experimentId,
          planId,
          rejectedBy: caller.session.id,
          reason,
          ...replacementPlanId === undefined ? {} : { replacementPlanId },
        })
        return jsonValue({
          experimentId,
          planId,
          reason,
          ...replacementPlanId === undefined ? {} : { replacementPlanId },
        })
      },
    })))
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_run_start',
      description: 'Start a run only from the exact approved plan revision.',
      parameters: {
        experiment_id: { type: 'string', required: true, description: 'Opaque experiment id.' },
        plan_id: { type: 'string', required: true, description: 'Approved plan revision id.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_run_start')
        const experimentId = brandId<'ExperimentId'>(string(args.experiment_id, 'experiment_id'))
        const planId = brandId<'PlanId'>(string(args.plan_id, 'plan_id'))
        const run = await runtime.startRun({ experimentId, planId })
        appendState(caller, run, 'CREATED')
        await appendCache(caller, run, cache)
        appendFeedback(caller, run)
        return jsonValue(run)
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_run_step',
      description: 'Advance exactly one step in the locked ExecutionGraph. Device operations go through Lab Device Service; unsupported script and API operations are blocked.',
      parameters: {
        run_id: { type: 'string', required: true, description: 'Opaque run id.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_run_step')
        const runId = brandId<'RunId'>(string(args.run_id, 'run_id'))
        const run = await runtime.executeNextStep(runId)
        for (const observation of run.observations) appendObservation(caller, run, observation)
        appendState(caller, run, undefined)
        await appendCache(caller, run, cache)
        appendFeedback(caller, run)
        return jsonValue(run)
      },
    })))
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_run_confirm',
      description: 'Submit evidence for a waiting human step and resume the controlled run.',
      parameters: {
        run_id: { type: 'string', required: true, description: 'Opaque run id.' },
        step_id: { type: 'string', required: true, description: 'Waiting plan step id.' },
        operation_id: { type: 'string', required: true, description: 'Opaque operation id.' },
        evidence: { type: 'array', required: true, items: { type: 'string' }, description: 'Structured evidence references.' },
        confirmed_by: { type: 'string', required: true, description: 'Accountable actor identity.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_run_confirm')
        const runId = brandId<'RunId'>(string(args.run_id, 'run_id'))
        const stepId = brandId<'PlanStepId'>(string(args.step_id, 'step_id'))
        const operationId = brandId<'OperationId'>(string(args.operation_id, 'operation_id'))
        const evidence = stringArray(args.evidence, 'evidence')
        const confirmedBy = string(args.confirmed_by, 'confirmed_by')
        const run = await runtime.confirmStep(runId, evidence, confirmedBy, stepId, operationId)
        caller.session.append('lab/run/approval', {
          version: 1,
          experimentId: run.experimentId,
          runId,
          stepId,
          operationId,
          approvedBy: confirmedBy,
          evidence,
        })
        caller.session.append('lab/run/observation', {
          version: 1,
          experimentId: run.experimentId,
          runId,
          stepId,
          operationId,
          valid: run.runStatus === 'COMPLETED',
          evidence,
        })
        appendState(caller, run, 'WAITING_CONFIRMATION')
        await appendCache(caller, run, cache)
        appendFeedback(caller, run)
        return jsonValue(run)
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_run_stop',
      description: 'Request a safe stop for a running experiment.',
      parameters: {
        run_id: { type: 'string', required: true, description: 'Opaque run id.' },
        requested_by: { type: 'string', required: true, description: 'Accountable requester identity.' },
        reason: { type: 'string', required: true, description: 'Reason for the stop request.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_run_stop')
        const runId = brandId<'RunId'>(string(args.run_id, 'run_id'))
        const requestedBy = string(args.requested_by, 'requested_by')
        const reason = string(args.reason, 'reason')
        const run = await runtime.stopRun(runId, requestedBy)
        appendState(caller, run, 'WAITING_CONFIRMATION', reason)
        await appendCache(caller, run, cache)
        appendFeedback(caller, run)
        return jsonValue(run)
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_run_report',
      description: 'Build an auditable report for a controlled run.',
      parameters: {
        run_id: { type: 'string', required: true, description: 'Opaque run id.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_run_report')
        const report = await runtime.buildReport(brandId<'RunId'>(string(args.run_id, 'run_id')))
        const run = runtime.getRun(report.runId)
        for (const artifact of run?.artifacts ?? []) appendArtifact(caller, artifact, report.experimentId, report.runId)
        caller.session.append('lab/run/verdict', {
          version: 1,
          experimentId: report.experimentId,
          runId: report.runId,
          status: report.assessment.status,
          ...report.assessment.verdict === undefined ? {} : { verdict: report.assessment.verdict },
          ...report.assessment.method === undefined ? {} : { method: report.assessment.method },
          evidenceIds: report.assessment.evidenceIds,
          ...report.assessment.assessedBy === undefined ? {} : { assessedBy: report.assessment.assessedBy },
          ...report.assessment.assessedAt === undefined ? {} : { assessedAt: report.assessment.assessedAt },
          humanQcRequired: report.assessment.humanQcRequired,
        })
        return jsonValue(report)
      },
    })))
  } catch (error) {
    for (const dispose of disposers.reverse()) void dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}

function appendState(agent: Agent, run: RunView, from: RunView['runStatus'], reason?: string): void {
  if (run.runStatus === undefined) throw new Error('runtime returned a run without a state')
  agent.session.append('lab/run/state', {
    version: 1,
    experimentId: run.experimentId,
    runId: run.runId,
    ...from === undefined ? {} : { from },
    to: run.runStatus,
    requestedBy: agent.session.id,
    ...reason === undefined ? {} : { reason },
  })
}

async function appendCache(agent: Agent, run: RunView, cache: LabExperimentCacheService): Promise<void> {
  agent.session.append('lab/cache/projected', { version: 1, projection: run.cache })
  await cache.project(run.cache)
}

function appendObservation(agent: Agent, run: RunView, observation: RunView['observations'][number]): void {
  const step = run.executionGraph.steps.find(candidate => candidate.stepId === observation.stepId)
  agent.session.append('lab/run/step', {
    version: 1,
    experimentId: run.experimentId,
    runId: run.runId,
    stepId: observation.stepId,
    operationId: observation.operationId,
    status: observation.status,
    requestedBy: agent.session.id,
  })
  if (step?.operationKind === 'device') agent.session.append('lab/run/device-receipt', {
    version: 1,
    experimentId: run.experimentId,
    runId: run.runId,
    stepId: observation.stepId,
    operationId: observation.operationId,
    status: observation.status === 'COMPLETED' ? 'completed' : observation.status === 'WAITING' ? 'accepted' : observation.status === 'STOPPED' ? 'stopped' : 'failed',
    evidence: observation.evidence,
  })
  agent.session.append('lab/run/observation', {
    version: 1,
    experimentId: run.experimentId,
    runId: run.runId,
    stepId: observation.stepId,
    operationId: observation.operationId,
    valid: observation.valid,
    evidence: observation.evidence,
    status: observation.status,
    ...observation.error === undefined ? {} : { error: observation.error },
    ...observation.replanRequested === undefined ? {} : { replanRequested: observation.replanRequested },
  })
}

function appendArtifact(
  agent: Agent,
  artifact: RunView['artifacts'][number],
  experimentId: RunView['experimentId'],
  runId: RunView['runId'],
): void {
  agent.session.append('lab/run/artifact', {
    version: 1,
    experimentId,
    runId,
    artifactId: artifact.artifactId,
    kind: artifact.kind,
    displayName: artifact.displayName,
    mediaType: artifact.mediaType,
    size: artifact.size,
    digest: artifact.digest,
    createdAt: artifact.createdAt,
  })
}

function appendFeedback(agent: Agent, run: RunView): void {
  if (run.runStatus === undefined) throw new Error('runtime returned a run without feedback state')
  agent.session.append('lab/run/feedback', {
    version: 1,
    experimentId: run.experimentId,
    runId: run.runId,
    status: run.runStatus,
    valid: run.feedback.valid,
    summary: run.feedback.summary,
    issues: run.feedback.issues,
    replanRequested: run.feedback.replanRequested,
    ...run.replanRequest === undefined ? {} : { replanRequest: { stepId: run.replanRequest.stepId, reason: run.replanRequest.reason } },
  })
}

function parseExecutionSteps(value: unknown): readonly ExecutionStepSpec[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('execution_steps must be an array')
  return value.map((item, index) => {
    const entry = record(item, 'execution_steps[' + String(index) + ']')
    const operationKind = string(entry.operation_kind, 'execution_steps[' + String(index) + '].operation_kind') as OperationKind
    if (!['device', 'human', 'approval', 'script', 'api'].includes(operationKind)) {
      throw new Error('execution_steps[' + String(index) + '].operation_kind is invalid')
    }
    const deviceId = optionalString(entry.device_id, 'execution_steps[' + String(index) + '].device_id')
    const result: ExecutionStepSpec = {
      stepId: brandId<'PlanStepId'>(string(entry.step_id, 'execution_steps[' + String(index) + '].step_id')),
      skillRevisionId: brandId<'SkillRevisionId'>(string(entry.skill_revision_id, 'execution_steps[' + String(index) + '].skill_revision_id')),
      operationKind,
      operationResource: string(entry.operation_resource, 'execution_steps[' + String(index) + '].operation_resource'),
      parameters: planParameters(entry.parameters, 'execution_steps[' + String(index) + '].parameters'),
      requiresApproval: entry.requires_approval === true,
      expectedEvidence: entry.expected_evidence === undefined ? [] : stringArray(entry.expected_evidence, 'execution_steps[' + String(index) + '].expected_evidence'),
      failurePolicy: parseFailurePolicy(entry.failure_policy, 'execution_steps[' + String(index) + '].failure_policy'),
      ...deviceId === undefined ? {} : { deviceId: brandId<'DeviceId'>(deviceId) },
    }
    return result
  })
}

function parseSkillSnapshots(value: unknown): readonly SkillSnapshot[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('skill_snapshots must be an array')
  return value.map((item, index) => {
    const entry = record(item, 'skill_snapshots[' + String(index) + ']')
    return {
      skillId: brandId<'LabSkillId'>(string(entry.skill_id, 'skill_snapshots[' + String(index) + '].skill_id')),
      revisionId: brandId<'SkillRevisionId'>(string(entry.revision_id, 'skill_snapshots[' + String(index) + '].revision_id')),
      status: 'ACTIVE',
      definitionHash: string(entry.definition_hash, 'skill_snapshots[' + String(index) + '].definition_hash'),
    }
  })
}

function parseFailurePolicy(value: unknown, path: string): ExecutionStepSpec['failurePolicy'] {
  const policy = value === undefined ? 'BLOCK' : string(value, path)
  if (policy !== 'BLOCK' && policy !== 'STOP' && policy !== 'REPLAN') throw new Error(path + ' must be BLOCK, STOP, or REPLAN')
  return policy
}

function planParameters(value: unknown, path: string): Readonly<Record<string, PlanParameter>> {
  if (value === undefined) return {}
  const entries = record(value, path)
  const parameters: Record<string, PlanParameter> = {}
  for (const [name, item] of Object.entries(entries)) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      parameters[name] = item
      continue
    }
    const unitValue = record(item, path + '.' + name)
    if (typeof unitValue.value !== 'number' || typeof unitValue.unit !== 'string' || unitValue.unit.trim().length === 0) {
      throw new Error(path + '.' + name + ' must be a string, number, boolean, or unit value')
    }
    parameters[name] = { value: unitValue.value, unit: unitValue.unit }
  }
  return parameters
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(path + ' must be an object')
  return value as Record<string, unknown>
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-blank string`)
  return value
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value.map((item, index) => string(item, `${path}[${index}]`))
}

/** 在既有 Agent scope 中组合知识、规划与运行工具。 */
export async function apply(ctx: Context): Promise<void> {
  await ctx.plugin(ToolLabKnowledge)
  await ctx.plugin(ToolLabPlanning)
  if (ctx.get('labExperimentCache') === undefined) await ctx.plugin(LabExperimentCache)
  const cache = ctx.get('labExperimentCache')
  if (cache === undefined) throw new Error('lab experiment cache service did not install')
  const web = ctx.get('labMvpWeb') as LabAgentExperimentHost | undefined
  if (web === undefined) throw new Error('lab-mvp-web service did not install')

  const installed = new Map<Agent, () => void>()
  const maybeInstall = (agent: Agent): void => {
    if (installed.has(agent)) return
    installed.set(agent, install(agent, ctx.labRuntime, ctx.labPlanning, ctx.labSkills, cache, web))
  }
  for (const agent of ctx.agents.list()) maybeInstall(agent)
  ctx.on('agent/created', ({ agent }) => { maybeInstall(agent) })
  ctx.on('agent/disposed', ({ agent }) => {
    installed.get(agent)?.()
    installed.delete(agent)
  })
  ctx.effect(() => () => {
    for (const dispose of installed.values()) dispose()
    installed.clear()
  }, 'tool-lab.runtimeTools()')
}

/** 将已校验计划转换为 Runtime 可锁定的声明式执行图步骤。 */
function executionStepsFromPlan(plan: ExperimentPlan, skills: LabSkillService): readonly ExecutionStepSpec[] {
  return plan.steps.map((step) => {
    const revision = skills.resolveRevision(step.skillRevisionId)
    if (revision === undefined || revision.status !== 'ACTIVE') throw new Error(`Skill revision ${step.skillRevisionId} is not ACTIVE`)
    return {
      stepId: step.stepId,
      skillRevisionId: step.skillRevisionId,
      operationKind: step.operationKind,
      operationResource: step.operationResource,
      parameters: step.parameters,
      requiresApproval: step.requiresApproval,
      expectedEvidence: step.expectedOutputs,
      failurePolicy: revision.failurePolicy,
      ...step.deviceId === undefined ? {} : { deviceId: step.deviceId },
    }
  })
}
