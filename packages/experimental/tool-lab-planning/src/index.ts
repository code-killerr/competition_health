/** 在既有 DeepSeek Harness Agent scope 中提供实验规划工具。 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  brandId,
  type ExperimentPlan,
  type ExperimentRequest,
  type PlanParameter,
  type PlanStep,
  type UnitValue,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabDeviceService } from '@deepseek-ai/dsh-experimental-lab-device'
import type { LabPlanningService } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { defineTool, type InferValue, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools'

/** Cordis 插件名称。 */
export const name = 'tool-lab-planning'
/** 复用 Harness Agent、工具注册表、规划和设备 Service。 */
export const inject = ['agents', 'tools', 'labPlanning', 'labDevices']

const JSON_SCHEMA = { type: 'json' } as const
const CONTEXT_OUTPUT_SCHEMA = JSON_SCHEMA
const DEVICE_OUTPUT_SCHEMA = { type: 'array', items: { type: 'json' } } as const

/** 声明一个 JSON 输出，让 Harness 负责标准化模型可见结果。 */
function jsonOutput<const S extends ValueSchemaSpec>(schema: S): {
  schema: S
  render: (args: unknown, value: InferValue<S>) => [{ type: 'text'; text: string }]
} {
  return {
    schema,
    render: (_args: unknown, value: InferValue<S>) => [{ type: 'text', text: JSON.stringify(value) }],
  }
}

/** 确保调用来自一个已发布的 Agent scope。 */
function callingAgent(agent: Agent | undefined, toolName: string): Agent {
  if (agent === undefined) throw new Error(`${toolName} requires a calling Agent`)
  return agent
}

/** 注册规划阶段工具到一个精确 Agent scope。 */
function install(agent: Agent, planning: LabPlanningService, devices: LabDeviceService): () => void {
  const disposers: Array<() => unknown> = []
  const register = (disposer: () => unknown): void => { disposers.push(disposer) }
  try {
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_plan_context',
      description: 'Retrieve cited laboratory evidence, unresolved conflicts, and read-only device facts for an experiment request. This tool never reserves or commands a device.',
      parameters: {
        request: { type: 'json', required: true, description: 'Experiment request object with experimentId, objective, samples, constraints, expectedOutputs, and unresolved.' },
      },
      output: jsonOutput(CONTEXT_OUTPUT_SCHEMA),
      async execute(args, exec) {
        callingAgent(exec.agent, 'lab_plan_context')
        return jsonValue(await planning.buildContext(parseRequest(args.request)))
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_plan_devices',
      description: 'List healthy and reserved laboratory device capabilities for planning. This tool is read-only and does not reserve or command a device.',
      parameters: {},
      output: jsonOutput(DEVICE_OUTPUT_SCHEMA),
      async execute(_args, exec) {
        callingAgent(exec.agent, 'lab_plan_devices')
        return jsonValue(devices.listDevices()) as JsonValue[]
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_plan_propose',
      description: 'Submit a structured experiment plan and declarative Lab Skill drafts for deterministic validation. This tool never approves, locks, starts, or executes the plan.',
      parameters: {
        request: { type: 'json', required: true, description: 'Experiment request object.' },
        plan: { type: 'json', required: true, description: 'DRAFT experiment plan with cited steps and unit-bearing parameters.' },
        skill_drafts: { type: 'array', required: true, items: { type: 'json' }, description: 'DRAFT Lab Skill revisions referenced by plan steps.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_plan_propose')
        const result = await planning.propose({
          request: parseRequest(args.request),
          plan: parsePlan(args.plan),
          skillDrafts: args.skill_drafts.map((draft, index) => parseSkillDraft(draft, `skill_drafts[${index}]`)),
        })
        caller.session.append('lab/plan/proposed', {
          version: 1,
          experimentId: result.plan.experimentId,
          planId: result.plan.planId,
          citationIds: result.plan.citations,
          skillRevisionIds: result.skillRevisions.map(revision => revision.revisionId),
        })
        return jsonValue(result)
      },
    })))
  } catch (error) {
    for (const dispose of disposers.reverse()) void dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) void dispose()
  }
}

/** 安装现有 Agent 与后续创建 Agent 的规划工具。 */
export function apply(ctx: Context): void {
  const installed = new Map<Agent, () => void>()
  const maybeInstall = (agent: Agent): void => {
    if (installed.has(agent)) return
    installed.set(agent, install(agent, ctx.labPlanning, ctx.labDevices))
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
  }, 'tool-lab-planning.scopedTools()')
}

function jsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('planning result is not JSON serializable')
  return JSON.parse(serialized) as JsonValue
}

function parseRequest(value: unknown): ExperimentRequest {
  const object = record(value, 'request')
  return {
    experimentId: brandId<'ExperimentId'>(string(object.experimentId, 'request.experimentId')),
    objective: string(object.objective, 'request.objective'),
    samples: array(object.samples, 'request.samples').map((sample, index) => {
      const item = record(sample, `request.samples[${index}]`)
      return {
        name: string(item.name, `request.samples[${index}].name`),
        attributes: stringRecord(item.attributes, `request.samples[${index}].attributes`),
      }
    }),
    constraints: array(object.constraints, 'request.constraints').map((constraint, index) => {
      const item = record(constraint, `request.constraints[${index}]`)
      return {
        name: string(item.name, `request.constraints[${index}].name`),
        value: string(item.value, `request.constraints[${index}].value`),
        citations: array(item.citations, `request.constraints[${index}].citations`).map((citation, citationIndex) => brandId<'CitationId'>(string(citation, `request.constraints[${index}].citations[${citationIndex}]`))),
      }
    }),
    expectedOutputs: array(object.expectedOutputs, 'request.expectedOutputs').map((output, index) => string(output, `request.expectedOutputs[${index}]`)),
    unresolved: array(object.unresolved, 'request.unresolved').map((item, index) => string(item, `request.unresolved[${index}]`)),
  }
}

function parsePlan(value: unknown): ExperimentPlan {
  const object = record(value, 'plan')
  return {
    planId: brandId<'PlanId'>(string(object.planId, 'plan.planId')),
    experimentId: brandId<'ExperimentId'>(string(object.experimentId, 'plan.experimentId')),
    revision: integer(object.revision, 'plan.revision'),
    status: literal(object.status, 'plan.status', ['DRAFT', 'VALIDATED', 'HUMAN_APPROVED', 'LOCKED', 'REJECTED'] as const),
    objective: string(object.objective, 'plan.objective'),
    citations: array(object.citations, 'plan.citations').map((item, index) => brandId<'CitationId'>(string(item, `plan.citations[${index}]`))),
    assumptions: array(object.assumptions, 'plan.assumptions').map((item, index) => string(item, `plan.assumptions[${index}]`)),
    unresolved: array(object.unresolved, 'plan.unresolved').map((item, index) => string(item, `plan.unresolved[${index}]`)),
    steps: array(object.steps, 'plan.steps').map((item, index) => parseStep(item, `plan.steps[${index}]`)),
  }
}

function parseStep(value: unknown, path: string): PlanStep {
  const object = record(value, path)
  return {
    stepId: brandId<'PlanStepId'>(string(object.stepId, `${path}.stepId`)),
    title: string(object.title, `${path}.title`),
    dependencies: array(object.dependencies, `${path}.dependencies`).map((item, index) => brandId<'PlanStepId'>(string(item, `${path}.dependencies[${index}]`))),
    skillRevisionId: brandId<'SkillRevisionId'>(string(object.skillRevisionId, `${path}.skillRevisionId`)),
    operationKind: literal(object.operationKind, `${path}.operationKind`, ['device', 'human', 'approval', 'script', 'api'] as const),
    operationResource: string(object.operationResource, `${path}.operationResource`),
    ...object.deviceId === undefined ? {} : { deviceId: brandId<'DeviceId'>(string(object.deviceId, `${path}.deviceId`)) },
    ...object.deviceCapability === undefined ? {} : { deviceCapability: string(object.deviceCapability, `${path}.deviceCapability`) },
    requiresApproval: boolean(object.requiresApproval, `${path}.requiresApproval`),
    requiredInputs: array(object.requiredInputs, `${path}.requiredInputs`).map((item, index) => string(item, `${path}.requiredInputs[${index}]`)),
    parameters: parameterRecord(object.parameters, `${path}.parameters`),
    citations: array(object.citations, `${path}.citations`).map((item, index) => brandId<'CitationId'>(string(item, `${path}.citations[${index}]`))),
    expectedOutputs: array(object.expectedOutputs, `${path}.expectedOutputs`).map((item, index) => string(item, `${path}.expectedOutputs[${index}]`)),
  }
}

function parseSkillDraft(value: unknown, path: string) {
  const object = record(value, path)
  return {
    skillId: brandId<'LabSkillId'>(string(object.skillId, `${path}.skillId`)),
    revisionId: brandId<'SkillRevisionId'>(string(object.revisionId, `${path}.revisionId`)),
    status: literal(object.status, `${path}.status`, ['DRAFT'] as const),
    name: string(object.name, `${path}.name`),
    purpose: string(object.purpose, `${path}.purpose`),
    citations: array(object.citations, `${path}.citations`).map((item, index) => brandId<'CitationId'>(string(item, `${path}.citations[${index}]`))),
    operations: array(object.operations, `${path}.operations`).map((item, index) => {
      const operation = record(item, `${path}.operations[${index}]`)
      return {
        kind: literal(operation.kind, `${path}.operations[${index}].kind`, ['device', 'human', 'approval', 'script', 'api'] as const),
        resourceRef: string(operation.resourceRef, `${path}.operations[${index}].resourceRef`),
        installed: boolean(operation.installed, `${path}.operations[${index}].installed`),
      }
    }),
  }
}

function parameterRecord(value: unknown, path: string): Readonly<Record<string, PlanParameter>> {
  const object = record(value, path)
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, parameter(item, `${path}.${key}`)]))
}

function parameter(value: unknown, path: string): PlanParameter {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const object = record(value, path)
  return unitValue(object, path)
}

function unitValue(value: Record<string, unknown>, path: string): UnitValue {
  const unit = string(value.unit, `${path}.unit`)
  const amount = value.value
  if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new Error(`${path}.value must be a finite number`)
  return { value: amount, unit }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`)
  return value as Record<string, unknown>
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`)
  return value
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`)
  return value
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`${path} must be an integer`)
  return value
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value
}

function stringRecord(value: unknown, path: string): Readonly<Record<string, string>> {
  const object = record(value, path)
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, string(item, `${path}.${key}`)]))
}

function literal<const T extends readonly string[]>(value: unknown, path: string, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error(`${path} must be one of ${values.join(', ')}`)
  return value as T[number]
}
