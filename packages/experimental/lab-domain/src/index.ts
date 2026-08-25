/** 实验自动化平台第一阶段共享领域协议。 */

export * from './types.ts'
export * from './validation.ts'

/** 实验能力尚未注册 Provider 时的明确错误。 */
export class LabProviderUnavailableError extends Error {
  readonly code = 'LAB_PROVIDER_UNAVAILABLE' as const
  readonly capability: string

  constructor(capability: string) {
    super(`no provider is registered for laboratory capability "${capability}"`)
    this.capability = capability
    this.name = 'LabProviderUnavailableError'
  }
}

/** 同一实验能力重复注册 Provider 时的错误。 */
export class LabDuplicateProviderError extends Error {
  readonly code = 'LAB_DUPLICATE_PROVIDER' as const
  readonly capability: string

  constructor(capability: string) {
    super(`a provider is already registered for laboratory capability "${capability}"`)
    this.capability = capability
    this.name = 'LabDuplicateProviderError'
  }
}
