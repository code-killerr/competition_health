/** Runtime 结果验证器；只依据锁定步骤声明和结构化证据做确定性判断。 */

import type { ExecutionStepSpec, RuntimeObservation } from './types.ts'

/** 结果验证结论及其可审计问题。 */
export interface RuntimeValidationResult {
  readonly valid: boolean
  readonly issues: readonly string[]
}

/** 验证步骤完成时是否提供了声明要求的证据引用。
 * @param step - locked execution step.
 * @param evidence - evidence references returned by an executor or human.
 * @returns - deterministic validation result.
 */
export function validateRuntimeEvidence(step: ExecutionStepSpec, evidence: readonly string[]): RuntimeValidationResult {
  const issues: string[] = []
  if (evidence.length === 0) issues.push('completed step must provide at least one evidence reference')
  for (const expected of step.expectedEvidence) {
    if (!evidence.includes(expected)) issues.push(`required evidence "${expected}" was not provided`)
  }
  return { valid: issues.length === 0, issues }
}

/** 将验证结果写入观察对象，避免各 Executor 重复拼接字段。
 * @param observation - observation to enrich.
 * @param result - deterministic validation result.
 * @returns - observation with validation state and failure details.
 */
export function validatedObservation(
  observation: RuntimeObservation,
  result: RuntimeValidationResult,
): RuntimeObservation {
  return {
    ...observation,
    valid: result.valid,
    ...result.valid ? {} : { status: 'FAILED' as const, error: result.issues.join('; ') },
  }
}
