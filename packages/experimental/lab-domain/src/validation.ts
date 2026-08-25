import type {
  ExperimentPlan,
  ExecutableStepValidationInput,
  LabSkillStatus,
  PlanStep,
  PlanValidationContext,
  PlanValidationResult,
  ValidationIssue,
  ValidationResult,
  UnitValue,
} from './types.ts'

const NEXT_SKILL_STATUS: Readonly<Record<LabSkillStatus, readonly LabSkillStatus[]>> = {
  DRAFT: ['VALIDATED'],
  VALIDATED: ['HUMAN_APPROVED'],
  HUMAN_APPROVED: ['ACTIVE'],
  ACTIVE: ['RETIRED'],
  RETIRED: [],
}

/** 校验 Skill 是否沿规定生命周期前进。 */
export function assertSkillTransition(from: LabSkillStatus, to: LabSkillStatus): void {
  if (!NEXT_SKILL_STATUS[from].includes(to)) {
    throw new Error(`cannot transition Lab Skill from ${from} to ${to}; allowed next states: ${NEXT_SKILL_STATUS[from].join(', ') || 'none'}`)
  }
}

/** 校验有单位参数，避免使用 NaN、无穷或空单位掩盖实验输入错误。 */
export function validateUnitValue(value: UnitValue): void {
  if (!Number.isFinite(value.value)) throw new Error('unit value must be finite')
  if (value.unit.trim().length === 0) throw new Error('unit must be non-blank')
}

/** 校验计划步骤是否满足运行时的最小安全条件。 */
export function validateExecutableStep(input: ExecutableStepValidationInput): ValidationResult {
  const issues: ValidationIssue[] = []
  if (input.skillStatus !== 'ACTIVE') {
    issues.push({ code: 'SKILL_NOT_ACTIVE', message: 'plan step must reference an ACTIVE Lab Skill revision' })
  }
  if (!input.operationInstalled) {
    issues.push({
      code: 'OPERATION_NOT_INSTALLED',
      message: `operation implementation for ${input.operationKind} is not installed and approved`,
    })
  }
  return { valid: issues.length === 0, issues }
}

/** 对 Agent 生成的计划执行不依赖模型的字段级校验。 */
export function validateExperimentPlan(plan: ExperimentPlan, context: PlanValidationContext): PlanValidationResult {
  const issues: ValidationIssue[] = []
  if (!Number.isInteger(plan.revision) || plan.revision < 1) {
    issues.push({ code: 'PLAN_REVISION_INVALID', message: 'plan revision must be a positive integer', path: 'revision' })
  }
  if (plan.objective.trim().length === 0) {
    issues.push({ code: 'OBJECTIVE_REQUIRED', message: 'plan objective must be non-blank', path: 'objective' })
  }
  if (plan.citations.length === 0) {
    issues.push({ code: 'CITATION_REQUIRED', message: 'plan must contain at least one knowledge citation', path: 'citations' })
  }
  if (plan.unresolved.length > 0) {
    issues.push({ code: 'UNRESOLVED_INFORMATION', message: 'plan contains unresolved information', path: 'unresolved' })
  }
  if (plan.steps.length === 0) {
    issues.push({ code: 'STEP_REQUIRED', message: 'plan must contain at least one step', path: 'steps' })
  }

  const steps = new Map<PlanStep['stepId'], PlanStep>()
  for (const [index, step] of plan.steps.entries()) {
    const path = `steps[${index}]`
    if (steps.has(step.stepId)) {
      issues.push({ code: 'STEP_ID_DUPLICATE', message: `step id "${step.stepId}" is duplicated`, path: `${path}.stepId` })
    } else {
      steps.set(step.stepId, step)
    }
  }
  for (const [index, step] of plan.steps.entries()) {
    const path = `steps[${index}]`
    validateStep(step, path, steps, context, issues)
  }
  validateDependencyReferences(plan.steps, steps, issues)
  validateDependencyCycles(plan.steps, issues)

  return { planId: plan.planId, revision: plan.revision, valid: issues.length === 0, issues }
}

function validateStep(
  step: PlanStep,
  path: string,
  steps: ReadonlyMap<PlanStep['stepId'], PlanStep>,
  context: PlanValidationContext,
  issues: ValidationIssue[],
): void {
  if (step.title.trim().length === 0) issues.push({ code: 'STEP_TITLE_REQUIRED', message: 'step title must be non-blank', path: `${path}.title` })
  if (step.citations.length === 0) issues.push({ code: 'CITATION_REQUIRED', message: 'step must contain at least one knowledge citation', path: `${path}.citations` })
  for (const input of step.requiredInputs) {
    if (!context.availableInputs.has(input)) {
      issues.push({ code: 'REQUIRED_INPUT_MISSING', message: `required input "${input}" is not available`, path: `${path}.requiredInputs` })
    }
  }

  const skillStatus = context.skillStatuses.get(step.skillRevisionId)
  if (skillStatus === undefined) {
    issues.push({ code: 'SKILL_REVISION_UNKNOWN', message: `Skill revision "${step.skillRevisionId}" is not available`, path: `${path}.skillRevisionId` })
  } else {
    const skillResult = validateExecutableStep({ skillStatus, operationKind: step.operationKind, operationInstalled: true })
    if (!skillResult.valid) issues.push(...skillResult.issues.map(issue => ({ ...issue, path: `${path}.skillRevisionId` })))
  }

  if (step.operationResource.trim().length === 0) {
    issues.push({ code: 'OPERATION_RESOURCE_REQUIRED', message: 'operation resource must be non-blank', path: `${path}.operationResource` })
  } else if (!context.installedOperations.has(`${step.operationKind}:${step.operationResource}`)) {
    issues.push({ code: 'OPERATION_NOT_INSTALLED', message: `operation ${step.operationKind}:${step.operationResource} is not installed and approved`, path: `${path}.operationResource` })
  }

  if (step.operationKind === 'device') validateDeviceStep(step, path, context, issues)
  for (const [name, parameter] of Object.entries(step.parameters)) {
    if (typeof parameter === 'number') {
      issues.push({ code: 'PARAMETER_UNIT_REQUIRED', message: `parameter "${name}" must include a unit`, path: `${path}.parameters.${name}` })
    } else if (isUnitValue(parameter)) {
      try {
        validateUnitValue(parameter)
      } catch (error) {
        issues.push({ code: 'PARAMETER_UNIT_INVALID', message: error instanceof Error ? error.message : String(error), path: `${path}.parameters.${name}` })
      }
    }
  }

  for (const dependency of step.dependencies) {
    if (!steps.has(dependency)) {
      issues.push({ code: 'DEPENDENCY_UNKNOWN', message: `dependency "${dependency}" is not present in the plan`, path: `${path}.dependencies` })
    }
  }
}

function validateDeviceStep(step: PlanStep, path: string, context: PlanValidationContext, issues: ValidationIssue[]): void {
  if (!step.requiresApproval) issues.push({ code: 'APPROVAL_REQUIRED', message: 'device steps require explicit approval', path: `${path}.requiresApproval` })
  if (step.deviceId === undefined || step.deviceCapability === undefined || step.deviceCapability.trim().length === 0) {
    issues.push({ code: 'DEVICE_CAPABILITY_REQUIRED', message: 'device steps require a device and capability', path: `${path}.deviceCapability` })
    return
  }
  const capabilities = context.deviceCapabilities.get(step.deviceId)
  if (capabilities === undefined) {
    issues.push({ code: 'DEVICE_UNKNOWN', message: `device "${step.deviceId}" is not available`, path: `${path}.deviceId` })
  } else if (!capabilities.includes(step.deviceCapability)) {
    issues.push({ code: 'DEVICE_CAPABILITY_UNAVAILABLE', message: `device "${step.deviceId}" does not provide capability "${step.deviceCapability}"`, path: `${path}.deviceCapability` })
  }
}

function validateDependencyReferences(
  steps: readonly PlanStep[],
  knownSteps: ReadonlyMap<PlanStep['stepId'], PlanStep>,
  issues: ValidationIssue[],
): void {
  for (const [index, step] of steps.entries()) {
    for (const dependency of step.dependencies) {
      if (dependency === step.stepId) issues.push({ code: 'DEPENDENCY_SELF', message: 'step cannot depend on itself', path: `steps[${index}].dependencies` })
      if (!knownSteps.has(dependency)) continue
    }
  }
}

function validateDependencyCycles(steps: readonly PlanStep[], issues: ValidationIssue[]): void {
  const graph = new Map(steps.map(step => [step.stepId, step.dependencies]))
  const visiting = new Set<PlanStep['stepId']>()
  const visited = new Set<PlanStep['stepId']>()
  const reported = new Set<PlanStep['stepId']>()

  const visit = (stepId: PlanStep['stepId']): void => {
    if (visited.has(stepId)) return
    if (visiting.has(stepId)) {
      if (!reported.has(stepId)) {
        issues.push({ code: 'DEPENDENCY_CYCLE', message: `dependency cycle includes step "${stepId}"`, path: 'steps' })
        reported.add(stepId)
      }
      return
    }
    visiting.add(stepId)
    for (const dependency of graph.get(stepId) ?? []) {
      if (graph.has(dependency)) visit(dependency)
    }
    visiting.delete(stepId)
    visited.add(stepId)
  }

  for (const step of steps) visit(step.stepId)
}

function isUnitValue(value: unknown): value is UnitValue {
  return typeof value === 'object' && value !== null && 'value' in value && 'unit' in value
}
