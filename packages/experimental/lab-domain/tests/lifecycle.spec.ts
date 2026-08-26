import { describe, expect, it } from 'vitest'
import {
  assertSkillTransition,
  validateExecutableStep,
  validateUnitValue,
} from '../src/index.ts'

describe('lab-domain lifecycle rules', () => {
  it('accepts only the ordered Lab Skill lifecycle transitions', () => {
    expect(() => { assertSkillTransition('DRAFT', 'VALIDATED') }).not.toThrow()
    expect(() => { assertSkillTransition('VALIDATED', 'ACTIVE') }).toThrow(/HUMAN_APPROVED/)
    expect(() => { assertSkillTransition('RETIRED', 'ACTIVE') }).toThrow(/cannot transition/)
  })

  it('blocks execution when a step does not resolve to an active installed operation', () => {
    expect(validateExecutableStep({
      skillStatus: 'ACTIVE',
      operationKind: 'device',
      operationInstalled: true,
    })).toEqual({ valid: true, issues: [] })

    expect(validateExecutableStep({
      skillStatus: 'DRAFT',
      operationKind: 'device',
      operationInstalled: true,
    })).toMatchObject({
      valid: false,
      issues: [{ code: 'SKILL_NOT_ACTIVE' }],
    })

    expect(validateExecutableStep({
      skillStatus: 'ACTIVE',
      operationKind: 'script',
      operationInstalled: false,
    })).toMatchObject({
      valid: false,
      issues: [{ code: 'OPERATION_NOT_INSTALLED' }],
    })
  })

  it('rejects unit values that could hide invalid experiment parameters', () => {
    expect(() => { validateUnitValue({ value: 2, unit: 'uL' }) }).not.toThrow()
    expect(() => { validateUnitValue({ value: Number.NaN, unit: 'uL' }) }).toThrow(/finite/)
    expect(() => { validateUnitValue({ value: 2, unit: ' ' }) }).toThrow(/unit/)
  })
})
