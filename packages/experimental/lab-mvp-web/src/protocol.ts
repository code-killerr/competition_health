/** 实验 Web Consumer 的 JSON 命令协议和运行时解析器。 */

import {
  brandId,
  type ExperimentPlan,
  type ExperimentRequest,
  type KnowledgeSearchRequest,
  type KnowledgeSopDraftId,
  type PlanParameter,
  type PlanStep,
  type UnitValue,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { PlanProposalInput } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { CreateSopDraftRequest, UpdateSopDraftRequest } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import type { LabSkillDraft } from '@deepseek-ai/dsh-experimental-lab-skill'
import type { OperationId, PlanStepId, RunId, SkillRevisionId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionId } from '@deepseek-ai/dsh-session'

/** Web 命令的稳定错误码。 */
export type LabWebErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_JSON'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'DOMAIN_ERROR'
  | 'CROSS_PROJECT_REFERENCE'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR'

/** Facade 返回的命令结果。 */
export type LabWebCommandResult =
  | { readonly kind: 'snapshot'; readonly value: unknown }
  | { readonly kind: 'knowledge-import'; readonly value: unknown }
  | { readonly kind: 'knowledge-search'; readonly value: unknown }
  | { readonly kind: 'knowledge-sop'; readonly value: unknown }
  | { readonly kind: 'planning-context'; readonly value: unknown }
  | { readonly kind: 'plan-proposal'; readonly value: unknown }
  | { readonly kind: 'plan-rejection'; readonly value: unknown }
  | { readonly kind: 'skill-revision'; readonly value: unknown }
  | { readonly kind: 'run'; readonly value: unknown }
  | { readonly kind: 'report'; readonly value: unknown }

/** 可执行的 Web 命令；领域 ID 已在解析阶段完成 branding。 */
export type LabWebCommand = { readonly sessionId?: SessionId } & (
  | { readonly command: 'snapshot'; readonly experimentId: ExperimentRequest['experimentId'] }
  | { readonly command: 'knowledge-import'; readonly name: string; readonly bytes: Uint8Array; readonly metadata: Readonly<Record<string, string>> }
  | { readonly command: 'knowledge-search'; readonly request: KnowledgeSearchRequest }
  | { readonly command: 'knowledge-sop-create'; readonly title: string; readonly steps: CreateSopDraftRequest['steps'] }
  | { readonly command: 'knowledge-sop-get'; readonly draftId: KnowledgeSopDraftId }
  | { readonly command: 'knowledge-sop-list' }
  | { readonly command: 'knowledge-sop-update'; readonly draftId: KnowledgeSopDraftId; readonly title: string; readonly steps: UpdateSopDraftRequest['steps'] }
  | { readonly command: 'knowledge-sop-publish'; readonly draftId: KnowledgeSopDraftId; readonly publishedBy: string }
  | { readonly command: 'experiment-create'; readonly request: ExperimentRequest }
  | { readonly command: 'planning-context'; readonly request: ExperimentRequest }
  | { readonly command: 'plan-propose'; readonly input: PlanProposalInput }
  | { readonly command: 'plan-validate'; readonly planId: ExperimentPlan['planId'] }
  | { readonly command: 'plan-approve'; readonly experimentId: ExperimentRequest['experimentId']; readonly planId: ExperimentPlan['planId']; readonly approvedBy: string }
  | { readonly command: 'plan-reject'; readonly planId: ExperimentPlan['planId']; readonly reason: string }
  | { readonly command: 'skill-validate'; readonly revisionId: SkillRevisionId }
  | { readonly command: 'skill-approve'; readonly revisionId: SkillRevisionId; readonly approvedBy: string }
  | { readonly command: 'skill-activate'; readonly revisionId: SkillRevisionId }
  | { readonly command: 'run-start'; readonly experimentId: ExperimentRequest['experimentId']; readonly planId: ExperimentPlan['planId'] }
  | { readonly command: 'run-step'; readonly runId: RunId }
  | { readonly command: 'run-confirm'; readonly runId: RunId; readonly evidence: readonly string[]; readonly confirmedBy: string; readonly stepId?: PlanStepId; readonly operationId?: OperationId }
  | { readonly command: 'run-stop'; readonly runId: RunId; readonly requestedBy: string }
  | { readonly command: 'run-report'; readonly runId: RunId }
)

/** Parse one unknown JSON value into a Web command.
 * @param value - unknown JSON value at the Web boundary.
 * @returns - validated Web command.
 */
export function parseLabWebCommand(value: unknown): LabWebCommand {
  const object = record(value, 'command')
  const command = literal(object.command, 'command.command', [
    'snapshot', 'knowledge-import', 'knowledge-search', 'experiment-create', 'planning-context',
    'knowledge-sop-create', 'knowledge-sop-get', 'knowledge-sop-list', 'knowledge-sop-update', 'knowledge-sop-publish',
    'plan-propose', 'plan-validate', 'plan-approve', 'plan-reject', 'run-start', 'run-step',
    'skill-validate', 'skill-approve', 'skill-activate', 'run-confirm', 'run-stop', 'run-report',
  ] as const)
  const sessionId = object.sessionId === undefined ? undefined : brandId<'SessionId'>(nonBlankString(object.sessionId, 'command.sessionId'))
  const parsed = (() => {
    switch (command) {
      case 'snapshot':
        return { command, experimentId: experimentId(object.experimentId, 'command.experimentId') }
      case 'knowledge-import':
        return {
          command,
          name: nonBlankString(object.name, 'command.name'),
          bytes: decodeBase64(object.bytesBase64, 'command.bytesBase64'),
          metadata: optionalStringRecord(object.metadata, 'command.metadata') ?? {},
        }
      case 'knowledge-search':
        return { command, request: parseSearchRequest(object.request, 'command.request') }
      case 'knowledge-sop-create':
        return { command, title: nonBlankString(object.title, 'command.title'), steps: parseSopSteps(object.steps, 'command.steps') }
      case 'knowledge-sop-get':
        return { command, draftId: brandId<'KnowledgeSopDraftId'>(nonBlankString(object.draftId, 'command.draftId')) }
      case 'knowledge-sop-list':
        return { command }
      case 'knowledge-sop-update':
        return { command, draftId: brandId<'KnowledgeSopDraftId'>(nonBlankString(object.draftId, 'command.draftId')), title: nonBlankString(object.title, 'command.title'), steps: parseSopSteps(object.steps, 'command.steps') }
      case 'knowledge-sop-publish':
        return { command, draftId: brandId<'KnowledgeSopDraftId'>(nonBlankString(object.draftId, 'command.draftId')), publishedBy: nonBlankString(object.publishedBy, 'command.publishedBy') }
      case 'experiment-create':
        return { command, request: parseExperimentRequest(object.request, 'command.request') }
      case 'planning-context':
        return { command, request: parseExperimentRequest(object.request, 'command.request') }
      case 'plan-propose':
        return { command, input: parsePlanProposalInput(object.input, 'command.input') }
      case 'plan-validate':
        return { command, planId: planId(object.planId, 'command.planId') }
      case 'plan-approve':
        return {
          command,
          experimentId: experimentId(object.experimentId, 'command.experimentId'),
          planId: planId(object.planId, 'command.planId'),
          approvedBy: nonBlankString(object.approvedBy, 'command.approvedBy'),
        }
      case 'plan-reject':
        return { command, planId: planId(object.planId, 'command.planId'), reason: nonBlankString(object.reason, 'command.reason') }
      case 'skill-validate':
        return { command, revisionId: brandId<'SkillRevisionId'>(nonBlankString(object.revisionId, 'command.revisionId')) }
      case 'skill-approve':
        return {
          command,
          revisionId: brandId<'SkillRevisionId'>(nonBlankString(object.revisionId, 'command.revisionId')),
          approvedBy: nonBlankString(object.approvedBy, 'command.approvedBy'),
        }
      case 'skill-activate':
        return { command, revisionId: brandId<'SkillRevisionId'>(nonBlankString(object.revisionId, 'command.revisionId')) }
      case 'run-start':
        return {
          command,
          experimentId: experimentId(object.experimentId, 'command.experimentId'),
          planId: planId(object.planId, 'command.planId'),
        }
      case 'run-step':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'run-confirm':
        return {
          command,
          runId: runId(object.runId, 'command.runId'),
          evidence: stringArray(object.evidence, 'command.evidence'),
          confirmedBy: nonBlankString(object.confirmedBy, 'command.confirmedBy'),
          ...object.stepId === undefined ? {} : { stepId: planStepId(object.stepId, 'command.stepId') },
          ...object.operationId === undefined ? {} : { operationId: operationId(object.operationId, 'command.operationId') },
        }
      case 'run-stop':
        return { command, runId: runId(object.runId, 'command.runId'), requestedBy: nonBlankString(object.requestedBy, 'command.requestedBy') }
      case 'run-report':
        return { command, runId: runId(object.runId, 'command.runId') }
    }
  })()
  return sessionId === undefined ? parsed : { ...parsed, sessionId }
}

function parsePlanProposalInput(value: unknown, path: string): PlanProposalInput {
  const object = record(value, path)
  return {
    request: parseExperimentRequest(object.request, `${path}.request`),
    plan: parsePlan(object.plan, `${path}.plan`),
    skillDrafts: array(object.skillDrafts, `${path}.skillDrafts`).map((item, index) => parseSkillDraft(item, `${path}.skillDrafts[${index}]`)),
  }
}

function parseExperimentRequest(value: unknown, path: string): ExperimentRequest {
  const object = record(value, path)
  return {
    experimentId: experimentId(object.experimentId, `${path}.experimentId`),
    objective: nonBlankString(object.objective, `${path}.objective`),
    samples: array(object.samples, `${path}.samples`).map((item, index) => {
      const sample = record(item, `${path}.samples[${index}]`)
      return {
        name: nonBlankString(sample.name, `${path}.samples[${index}].name`),
        attributes: stringRecord(sample.attributes, `${path}.samples[${index}].attributes`),
      }
    }),
    constraints: array(object.constraints, `${path}.constraints`).map((item, index) => {
      const constraint = record(item, `${path}.constraints[${index}]`)
      return {
        name: nonBlankString(constraint.name, `${path}.constraints[${index}].name`),
        value: nonBlankString(constraint.value, `${path}.constraints[${index}].value`),
        citations: stringArray(constraint.citations, `${path}.constraints[${index}].citations`).map((item, citationIndex) => brandId<'CitationId'>(item || fail(`${path}.constraints[${index}].citations[${citationIndex}] must not be empty`))),
      }
    }),
    expectedOutputs: stringArray(object.expectedOutputs, `${path}.expectedOutputs`),
    unresolved: stringArray(object.unresolved, `${path}.unresolved`),
  }
}

function parseSopSteps(value: unknown, path: string): CreateSopDraftRequest['steps'] {
  return array(value, path).map((item, index) => {
    const step = record(item, `${path}[${index}]`)
    const requiredInputs = step.requiredInputs === undefined ? [] : stringArray(step.requiredInputs, `${path}[${index}].requiredInputs`)
    const completionCriteria = step.completionCriteria === undefined ? [] : stringArray(step.completionCriteria, `${path}[${index}].completionCriteria`)
    const missingFields = step.missingFields === undefined ? [] : stringArray(step.missingFields, `${path}[${index}].missingFields`)
    return {
      order: integer(step.order, `${path}[${index}].order`),
      title: nonBlankString(step.title, `${path}[${index}].title`),
      instruction: nonBlankString(step.instruction, `${path}[${index}].instruction`),
      requiredInputs,
      completionCriteria,
      citations: stringArray(step.citations, `${path}[${index}].citations`).map(item => brandId<'CitationId'>(item)),
      missingFields,
    }
  })
}

function parseSearchRequest(value: unknown, path: string): KnowledgeSearchRequest {
  const object = record(value, path)
  const confirmed = object.confirmed
  if (confirmed !== undefined && typeof confirmed !== 'boolean') throw new Error(`${path}.confirmed must be a boolean`)
  const limit = object.limit
  if (limit !== undefined && (typeof limit !== 'number' || !Number.isInteger(limit))) throw new Error(`${path}.limit must be an integer`)
  return {
    query: nonBlankString(object.query, `${path}.query`),
    ...object.experimentId === undefined ? {} : { experimentId: experimentId(object.experimentId, `${path}.experimentId`) },
    ...object.documentIds === undefined ? {} : { documentIds: stringArray(object.documentIds, `${path}.documentIds`).map(item => brandId<'KnowledgeDocumentId'>(item)) },
    ...object.versionIds === undefined ? {} : { versionIds: stringArray(object.versionIds, `${path}.versionIds`).map(item => brandId<'KnowledgeDocumentVersionId'>(item)) },
    ...confirmed === undefined ? {} : { confirmed },
    ...limit === undefined ? {} : { limit },
  }
}

function parsePlan(value: unknown, path: string): ExperimentPlan {
  const object = record(value, path)
  return {
    planId: planId(object.planId, `${path}.planId`),
    experimentId: experimentId(object.experimentId, `${path}.experimentId`),
    revision: integer(object.revision, `${path}.revision`),
    ...object.supersedesPlanId === undefined ? {} : { supersedesPlanId: planId(object.supersedesPlanId, `${path}.supersedesPlanId`) },
    status: literal(object.status, `${path}.status`, ['DRAFT', 'VALIDATED', 'HUMAN_APPROVED', 'LOCKED', 'REJECTED'] as const),
    objective: nonBlankString(object.objective, `${path}.objective`),
    citations: stringArray(object.citations, `${path}.citations`).map(item => brandId<'CitationId'>(item)),
    assumptions: stringArray(object.assumptions, `${path}.assumptions`),
    unresolved: stringArray(object.unresolved, `${path}.unresolved`),
    steps: array(object.steps, `${path}.steps`).map((item, index) => parsePlanStep(item, `${path}.steps[${index}]`)),
  }
}

function parsePlanStep(value: unknown, path: string): PlanStep {
  const object = record(value, path)
  return {
    stepId: planStepId(object.stepId, `${path}.stepId`),
    title: nonBlankString(object.title, `${path}.title`),
    dependencies: stringArray(object.dependencies, `${path}.dependencies`).map(item => planStepId(item, `${path}.dependencies`)),
    skillRevisionId: brandId<'SkillRevisionId'>(nonBlankString(object.skillRevisionId, `${path}.skillRevisionId`)),
    operationKind: literal(object.operationKind, `${path}.operationKind`, ['device', 'human', 'approval', 'script', 'api'] as const),
    operationResource: nonBlankString(object.operationResource, `${path}.operationResource`),
    ...object.deviceId === undefined ? {} : { deviceId: brandId<'DeviceId'>(nonBlankString(object.deviceId, `${path}.deviceId`)) },
    ...object.deviceCapability === undefined ? {} : { deviceCapability: nonBlankString(object.deviceCapability, `${path}.deviceCapability`) },
    requiresApproval: boolean(object.requiresApproval, `${path}.requiresApproval`),
    requiredInputs: stringArray(object.requiredInputs, `${path}.requiredInputs`),
    parameters: parameterRecord(object.parameters, `${path}.parameters`),
    citations: stringArray(object.citations, `${path}.citations`).map(item => brandId<'CitationId'>(item)),
    expectedOutputs: stringArray(object.expectedOutputs, `${path}.expectedOutputs`),
  }
}

function parseSkillDraft(value: unknown, path: string): LabSkillDraft {
  const object = record(value, path)
  return {
    skillId: brandId<'LabSkillId'>(nonBlankString(object.skillId, `${path}.skillId`)),
    revisionId: brandId<'SkillRevisionId'>(nonBlankString(object.revisionId, `${path}.revisionId`)),
    status: literal(object.status, `${path}.status`, ['DRAFT'] as const),
    name: nonBlankString(object.name, `${path}.name`),
    purpose: nonBlankString(object.purpose, `${path}.purpose`),
    applicability: stringArray(object.applicability, `${path}.applicability`),
    inputs: stringArray(object.inputs, `${path}.inputs`),
    outputs: stringArray(object.outputs, `${path}.outputs`),
    parameterConstraints: stringRecord(object.parameterConstraints, `${path}.parameterConstraints`),
    completionConditions: stringArray(object.completionConditions, `${path}.completionConditions`),
    failurePolicy: literal(object.failurePolicy, `${path}.failurePolicy`, ['BLOCK', 'STOP', 'REPLAN'] as const),
    citations: stringArray(object.citations, `${path}.citations`).map(item => brandId<'CitationId'>(item)),
    operations: array(object.operations, `${path}.operations`).map((item, index) => {
      const operation = record(item, `${path}.operations[${index}]`)
      return {
        kind: literal(operation.kind, `${path}.operations[${index}].kind`, ['device', 'human', 'approval', 'script', 'api'] as const),
        resourceRef: nonBlankString(operation.resourceRef, `${path}.operations[${index}].resourceRef`),
        installed: boolean(operation.installed, `${path}.operations[${index}].installed`),
      }
    }),
  }
}

function parameterRecord(value: unknown, path: string): Readonly<Record<string, PlanParameter>> {
  const object = record(value, path)
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, parseParameter(item, `${path}.${key}`)]))
}

function parseParameter(value: unknown, path: string): PlanParameter {
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const object = record(value, path)
  const amount = object.value
  if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new Error(`${path}.value must be a finite number`)
  return { value: amount, unit: nonBlankString(object.unit, `${path}.unit`) } satisfies UnitValue
}

function decodeBase64(value: unknown, path: string): Uint8Array {
  const encoded = nonBlankString(value, path)
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.length === 0) throw new Error(`${path} must contain non-empty bytes`)
  return new Uint8Array(bytes)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`)
  return value as Record<string, unknown>
}

function stringRecord(value: unknown, path: string): Readonly<Record<string, string>> {
  const object = record(value, path)
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, nonBlankString(item, `${path}.${key}`)]))
}

function optionalStringRecord(value: unknown, path: string): Readonly<Record<string, string>> | undefined {
  return value === undefined ? undefined : stringRecord(value, path)
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value.map((item, index) => nonBlankString(item, `${path}[${index}]`))
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value
}

function nonBlankString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-blank string`)
  return value.trim()
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`)
  return value
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`${path} must be an integer`)
  return value
}

function literal<const T extends readonly string[]>(value: unknown, path: string, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error(`${path} must be one of ${values.join(', ')}`)
  return value
}

function experimentId(value: unknown, path: string) { return brandId<'ExperimentId'>(nonBlankString(value, path)) }
function planId(value: unknown, path: string) { return brandId<'PlanId'>(nonBlankString(value, path)) }
function planStepId(value: unknown, path: string) { return brandId<'PlanStepId'>(nonBlankString(value, path)) }
function runId(value: unknown, path: string) { return brandId<'RunId'>(nonBlankString(value, path)) }
function operationId(value: unknown, path: string) { return brandId<'OperationId'>(nonBlankString(value, path)) }

function fail(message: string): never { throw new Error(message) }
