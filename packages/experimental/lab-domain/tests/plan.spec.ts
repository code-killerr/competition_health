import { describe, expect, it } from 'vitest'
import { brandId, validateExperimentPlan, type ExperimentPlan, type PlanValidationContext } from '../src/index.ts'

const citationId = brandId<'CitationId'>('citation-1')
const deviceId = brandId<'DeviceId'>('device-1')
const skillRevisionId = brandId<'SkillRevisionId'>('skill-revision-1')

function context(overrides: Partial<PlanValidationContext> = {}): PlanValidationContext {
  return {
    availableInputs: new Set(['sample']),
    availableCitations: new Set([citationId]),
    skillStatuses: new Map([[skillRevisionId, 'ACTIVE']]),
    skillParameterConstraints: new Map([[skillRevisionId, { volume: 'positive uL volume' }]]),
    installedOperations: new Set(['device:dispense']),
    deviceCapabilities: new Map([[deviceId, ['dispense']]]),
    ...overrides,
  }
}

function plan(overrides: Partial<ExperimentPlan> = {}): ExperimentPlan {
  return {
    planId: brandId<'PlanId'>('plan-1'),
    experimentId: brandId<'ExperimentId'>('experiment-1'),
    revision: 1,
    status: 'DRAFT',
    objective: 'Prepare the sample for spatial analysis.',
    citations: [citationId],
    assumptions: [],
    unresolved: [],
    steps: [{
      stepId: brandId<'PlanStepId'>('step-1'),
      title: 'Dispense sample',
      dependencies: [],
      skillRevisionId,
      operationKind: 'device',
      operationResource: 'dispense',
      deviceId,
      deviceCapability: 'dispense',
      requiresApproval: true,
      requiredInputs: ['sample'],
      parameters: { volume: { value: 10, unit: 'µL' } },
      citations: [citationId],
      expectedOutputs: ['dispensed-sample'],
    }],
    ...overrides,
  }
}

describe('validateExperimentPlan', () => {
  it('accepts a cited plan with active Skill, installed operation, inputs, units, and capability', () => {
    expect(validateExperimentPlan(plan(), context())).toEqual({
      planId: plan().planId,
      revision: 1,
      valid: true,
      issues: [],
    })
  })

  it('rejects unresolved information, bare numeric parameters, and inactive Skills', () => {
    const invalid = plan({
      unresolved: ['sample concentration'],
      steps: [{
        ...plan().steps[0]!,
        parameters: { volume: 10 },
      }],
    })
    const result = validateExperimentPlan(invalid, context({ skillStatuses: new Map([[skillRevisionId, 'DRAFT']]) }))

    expect(result.valid).toBe(false)
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'UNRESOLVED_INFORMATION',
      'PARAMETER_UNIT_REQUIRED',
      'SKILL_NOT_ACTIVE',
    ]))
  })

  it('rejects dependency cycles before a plan can be reviewed', () => {
    const first = plan().steps[0]!
    const second = { ...first, stepId: brandId<'PlanStepId'>('step-2'), dependencies: [first.stepId] }
    const cyclic = plan({ steps: [{ ...first, dependencies: [second.stepId] }, second] })

    const result = validateExperimentPlan(cyclic, context())

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DEPENDENCY_CYCLE' }),
    ]))
  })

  it('rejects missing inputs, uninstalled operations, and unavailable device capabilities', () => {
    const result = validateExperimentPlan(plan(), context({
      availableInputs: new Set(),
      installedOperations: new Set(),
      deviceCapabilities: new Map([[deviceId, ['image']]]),
    }))

    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'REQUIRED_INPUT_MISSING',
      'OPERATION_NOT_INSTALLED',
      'DEVICE_CAPABILITY_UNAVAILABLE',
    ]))
  })

  it('rejects non-draft plans and step citations that are not carried by the plan', () => {
    const otherCitation = brandId<'CitationId'>('citation-2')
    const invalid = plan({
      status: 'VALIDATED',
      citations: [citationId],
      steps: [{ ...plan().steps[0]!, citations: [otherCitation] }],
    })
    const result = validateExperimentPlan(invalid, context({
      availableCitations: new Set([citationId, otherCitation]),
      requiredCitations: new Set([otherCitation]),
    }))

    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'PLAN_STATUS_INVALID',
      'CITATION_SOURCE_MISSING',
      'CITATION_NOT_IN_PLAN',
    ]))
  })

  it('enforces declared Skill parameter constraints', () => {
    const invalid = plan({
      steps: [{
        ...plan().steps[0]!,
        parameters: { volume: { value: 0, unit: 'mL' }, mode: 'fast' },
      }],
    })
    const result = validateExperimentPlan(invalid, context())

    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'PARAMETER_CONSTRAINT_VIOLATION',
      'PARAMETER_UNDECLARED',
    ]))
  })
})
