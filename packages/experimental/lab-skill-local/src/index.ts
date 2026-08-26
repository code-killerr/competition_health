/** 实验自动化 Lab Skill 的进程内 Provider，并桥接到 Harness ctx.skills。 */

import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  assertSkillTransition,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  LabOperationResource,
  LabOperationResourceInput,
  LabOperationResourceKind,
  LabSkillDraft,
  LabSkillProvider,
  LabSkillRevision,
} from '@deepseek-ai/dsh-experimental-lab-skill'
import type { SkillRevisionId, SkillSnapshot } from '@deepseek-ai/dsh-experimental-lab-domain'
import {
  isSkillName,
  type SkillCandidate,
  type SkillDefinition,
  type SkillLookupOptions,
  type SkillProvider,
  type SkillProviderControl,
} from '@deepseek-ai/dsh-skill'

const DEFAULT_PROVIDER_NAME = 'lab-skill-local'
const DEFAULT_RANK = 300

/** 本地 Provider 的可配置项。 */
export interface Config {
  /** 注册到 Harness ctx.skills 的 Provider 名称。 */
  readonly providerName?: string
  /** 与其他 Harness Skill Provider 合并时使用的优先级。 */
  readonly rank?: number
}

/** Loader 使用的本地 Provider 配置 schema。 */
export const Config: z<Config> = z.object({
  providerName: z.string().min(1).default(DEFAULT_PROVIDER_NAME),
  rank: z.number().default(DEFAULT_RANK),
})

/** Cordis 插件名称。 */
export const name = 'lab-skill-local'
/** 依赖实验 Skill Service 和 Harness Skill Registry。 */
export const inject = ['labSkills', 'skills']

/** 进程内实验 Skill Provider；后续可替换为持久化实现。 */
export class LocalLabSkillProvider implements LabSkillProvider {
  readonly name = 'local-memory'
  private readonly revisions = new Map<SkillRevisionId, LabSkillRevision>()
  private readonly resources = new Map<string, LabOperationResource>()
  private invalidateCatalog: (() => void) | undefined

  /** 登记模型生成的脚本或 API 候选资源。 */
  async registerCandidateResource(resource: LabOperationResourceInput): Promise<LabOperationResource> {
    await Promise.resolve()
    if (resource.resourceRef.trim().length === 0) throw new Error('candidate resource reference must be non-blank')
    if (resource.content.trim().length === 0) throw new Error('candidate resource content must be non-blank')
    const key = resourceKey(resource.kind, resource.resourceRef)
    if (this.resources.has(key)) throw new Error(`candidate resource "${resource.kind}:${resource.resourceRef}" already exists`)
    const stored: LabOperationResource = {
      kind: resource.kind,
      resourceRef: resource.resourceRef.trim(),
      content: resource.content,
      status: 'CANDIDATE',
    }
    this.resources.set(key, stored)
    return cloneResource(stored)
  }

  /** 将候选资源登记为已安装实现；不会执行资源内容。 */
  async installResource(kind: LabOperationResourceKind, resourceRef: string): Promise<LabOperationResource> {
    await Promise.resolve()
    const key = resourceKey(kind, resourceRef)
    const resource = this.resources.get(key)
    if (resource === undefined) throw new Error(`unknown candidate resource "${kind}:${resourceRef}"`)
    const installed = { ...resource, status: 'INSTALLED' as const }
    this.resources.set(key, installed)
    return cloneResource(installed)
  }

  /** 返回候选或已安装资源的副本。 */
  resolveResource(kind: LabOperationResourceKind, resourceRef: string): LabOperationResource | undefined {
    const resource = this.resources.get(resourceKey(kind, resourceRef))
    return resource === undefined ? undefined : cloneResource(resource)
  }

  /** 保存一份新的 DRAFT 修订。 */
  async createDraft(draft: LabSkillDraft): Promise<LabSkillRevision> {
    await Promise.resolve()

    if (this.revisions.has(draft.revisionId)) throw new Error(`Lab Skill revision "${draft.revisionId}" already exists`)
    const issues = validateDraft(draft, false)
    if (issues.length > 0) throw validationError(issues)
    const revision: LabSkillRevision = {
      ...cloneDraft(draft),
      definitionHash: definitionHash(draft),
    }
    this.revisions.set(revision.revisionId, revision)
    return cloneRevision(revision)
  }

  /** 将 DRAFT 校验为可进入人工审批的 VALIDATED 修订。 */
  async validateDraft(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    await Promise.resolve()
    const revision = this.requireRevision(revisionId)
    assertSkillTransition(revision.status, 'VALIDATED')
    const issues = validateDraft(revision, true, operation => !isResourceKind(operation.kind) || this.resolveResource(operation.kind, operation.resourceRef)?.status === 'INSTALLED')
    if (issues.length > 0) throw validationError(issues)
    return this.replace(revision, { status: 'VALIDATED' })
  }

  /** 记录人工批准，不允许跳过确定性校验。 */
  async approveDraft(revisionId: SkillRevisionId, approvedBy: string): Promise<LabSkillRevision> {
    await Promise.resolve()
    const revision = this.requireRevision(revisionId)
    assertSkillTransition(revision.status, 'HUMAN_APPROVED')
    if (approvedBy.trim().length === 0) throw new Error('Lab Skill approval requires an accountable reviewer')
    return this.replace(revision, { status: 'HUMAN_APPROVED', approvedBy: approvedBy.trim() })
  }

  /** 激活人工批准的修订；同一 Skill 名称只能有一个活动修订。 */
  async activateRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    await Promise.resolve()
    const revision = this.requireRevision(revisionId)
    assertSkillTransition(revision.status, 'ACTIVE')
    const active = [...this.revisions.values()].find(candidate => candidate.status === 'ACTIVE' && candidate.name === revision.name)
    if (active !== undefined) throw new Error(`Lab Skill "${revision.name}" already has an ACTIVE revision`)
    return this.replace(revision, { status: 'ACTIVE' })
  }

  /** 解析一条修订的当前状态。 */
  resolveRevision(revisionId: SkillRevisionId): LabSkillRevision | undefined {
    const revision = this.revisions.get(revisionId)
    return revision === undefined ? undefined : cloneRevision(revision)
  }

  /** 只允许 ACTIVE 修订进入运行快照。 */
  async snapshotForRun(revisionIds: readonly SkillRevisionId[]): Promise<readonly SkillSnapshot[]> {
    await Promise.resolve()
    return revisionIds.map((revisionId) => {
      const revision = this.requireRevision(revisionId)
      if (revision.status !== 'ACTIVE') throw new Error(`Lab Skill revision "${revisionId}" is ${revision.status}, not ACTIVE`)
      return {
        skillId: revision.skillId,
        revisionId: revision.revisionId,
        status: 'ACTIVE' as const,
        definitionHash: revision.definitionHash,
      }
    })
  }

  /** 退役已激活修订。 */
  async retireRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    await Promise.resolve()
    const revision = this.requireRevision(revisionId)
    assertSkillTransition(revision.status, 'RETIRED')
    return this.replace(revision, { status: 'RETIRED' })
  }

  /** 释放进程内 Provider 持有的修订。 */
  dispose(): void {
    this.revisions.clear()
    this.resources.clear()
    this.invalidateCatalog = undefined
  }

  /** 将 ACTIVE 修订转换为 Harness ctx.skills Provider。
   * @param config Provider 名称和排序配置。
   * @param control 让注册表在修订变化时失效。
   * @returns Harness Skill Provider。
   */
  asHarnessProvider(config: Required<Config>, control: SkillProviderControl): SkillProvider {
    this.invalidateCatalog = control.invalidate
    return {
      name: config.providerName,
      list: async (_options: SkillLookupOptions): Promise<readonly SkillCandidate[]> => {
        await Promise.resolve()
        return [...this.revisions.values()]
          .filter(revision => revision.status === 'ACTIVE')
          .map(revision => candidateFor(revision, config.providerName, config.rank))
      },
      get: async (candidate: SkillCandidate, _options: SkillLookupOptions): Promise<SkillDefinition | undefined> => {
        await Promise.resolve()
        const locator = candidate.locator
        if (!isRevisionLocator(locator)) return undefined
        const revision = this.revisions.get(locator.revisionId)
        return revision === undefined || revision.status !== 'ACTIVE' ? undefined : definitionFor(revision, config.providerName)
      },
    }
  }

  private requireRevision(revisionId: SkillRevisionId): LabSkillRevision {
    const revision = this.revisions.get(revisionId)
    if (revision === undefined) throw new Error(`unknown Lab Skill revision "${revisionId}"`)
    return revision
  }

  private replace(revision: LabSkillRevision, change: Partial<Pick<LabSkillRevision, 'status' | 'approvedBy'>>): LabSkillRevision {
    const next = { ...revision, ...change }
    this.revisions.set(next.revisionId, next)
    this.invalidateCatalog?.()
    return cloneRevision(next)
  }
}

/** 将本地实验 Skill Provider 挂载到两个既有 Service 接缝。 */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = {
    providerName: config.providerName ?? DEFAULT_PROVIDER_NAME,
    rank: config.rank ?? DEFAULT_RANK,
  }
  const provider = new LocalLabSkillProvider()
  ctx.effect(() => {
    const labDispose = ctx.labSkills.registerProvider(provider)
    const harnessDispose = ctx.skills.registerProvider(control => provider.asHarnessProvider(resolved, control))
    return () => {
      harnessDispose()
      labDispose()
      provider.dispose()
    }
  }, 'lab-skill-local.providers')
}

function validateDraft(
  draft: Pick<LabSkillDraft, 'name' | 'purpose' | 'applicability' | 'inputs' | 'outputs' | 'parameterConstraints' | 'completionConditions' | 'failurePolicy' | 'operations'>,
  requireInstalled: boolean,
  resourceInstalled: (operation: LabSkillDraft['operations'][number]) => boolean = () => true,
): readonly string[] {
  const issues: string[] = []
  if (!isSkillName(draft.name)) issues.push(`name "${draft.name}" must use kebab-case`)
  if (draft.purpose.trim().length === 0) issues.push('purpose must be non-blank')
  issues.push(...stringListIssues(draft.applicability, 'applicability', false))
  issues.push(...stringListIssues(draft.inputs, 'inputs', false))
  issues.push(...stringListIssues(draft.outputs, 'outputs', false))
  issues.push(...stringListIssues(draft.completionConditions, 'completionConditions', true))
  for (const [name, constraint] of Object.entries(draft.parameterConstraints)) {
    if (name.trim().length === 0 || constraint.trim().length === 0) issues.push('parameterConstraints entries must have non-blank names and values')
  }
  if (draft.operations.length === 0) issues.push('at least one operation is required')
  draft.operations.forEach((operation, index) => {
    if (operation.resourceRef.trim().length === 0) issues.push(`operations[${index}].resourceRef must be non-blank`)
    if (requireInstalled && !operation.installed) issues.push('operation ' + operation.resourceRef + ' is not installed')
    if (requireInstalled && isResourceKind(operation.kind) && !resourceInstalled(operation)) issues.push('operation ' + operation.resourceRef + ' has no installed resource')
  })
  return issues
}

function stringListIssues(values: readonly string[], field: string, required: boolean): readonly string[] {
  const issues: string[] = []
  if (required && values.length === 0) issues.push(field + ' must contain at least one completion condition')
  values.forEach((value, index) => {
    if (value.trim().length === 0) issues.push(field.concat('[', index.toString(), '] must be non-blank'))
  })
  return issues
}

function isResourceKind(kind: LabSkillDraft['operations'][number]['kind']): kind is LabOperationResourceKind {
  return kind === 'script' || kind === 'api'
}

function resourceKey(kind: LabOperationResourceKind, resourceRef: string): string {
  return `${kind}:${resourceRef.trim()}`
}

function cloneResource(resource: LabOperationResource): LabOperationResource {
  return { ...resource }
}

function validationError(issues: readonly string[]): Error {
  return new Error(`Lab Skill validation failed: ${issues.join('; ')}`)
}

function definitionHash(draft: LabSkillDraft): string {
  const value = JSON.stringify({
    skillId: draft.skillId,
    revisionId: draft.revisionId,
    name: draft.name,
    purpose: draft.purpose,
    citations: draft.citations,
    applicability: draft.applicability,
    inputs: draft.inputs,
    outputs: draft.outputs,
    parameterConstraints: draft.parameterConstraints,
    completionConditions: draft.completionConditions,
    failurePolicy: draft.failurePolicy,
    operations: draft.operations,
  })
  return createHash('sha256').update(value).digest('hex')
}

function cloneDraft(draft: LabSkillDraft): LabSkillDraft {
  return {
    ...draft,
    citations: [...draft.citations],
    applicability: [...draft.applicability],
    inputs: [...draft.inputs],
    outputs: [...draft.outputs],
    parameterConstraints: { ...draft.parameterConstraints },
    completionConditions: [...draft.completionConditions],
    operations: draft.operations.map(operation => ({ ...operation })),
  }
}

function cloneRevision(revision: LabSkillRevision): LabSkillRevision {
  return {
    ...revision,
    citations: [...revision.citations],
    applicability: [...revision.applicability],
    inputs: [...revision.inputs],
    outputs: [...revision.outputs],
    parameterConstraints: { ...revision.parameterConstraints },
    completionConditions: [...revision.completionConditions],
    operations: revision.operations.map(operation => ({ ...operation })),
  }
}

function candidateFor(revision: LabSkillRevision, providerName: string, rank: number): SkillCandidate {
  return {
    name: revision.name,
    description: revision.purpose,
    invocation: { modelInvocable: true, userInvocable: false },
    provider: providerName,
    source: 'custom',
    rank,
    locator: { revisionId: revision.revisionId },
  }
}

function definitionFor(revision: LabSkillRevision, providerName: string): SkillDefinition {
  return {
    name: revision.name,
    description: revision.purpose,
    invocation: { modelInvocable: true, userInvocable: false },
    provider: providerName,
    source: 'custom',
    content: [
      `# ${revision.name}`,
      '',
      revision.purpose,
      'Applicability: ' + revision.applicability.join(', '),
      'Inputs: ' + revision.inputs.join(', '),
      'Outputs: ' + revision.outputs.join(', '),
      'Completion conditions: ' + revision.completionConditions.join('; '),
      'Failure policy: ' + revision.failurePolicy,
      '',
      'Approved operations:',
      ...revision.operations.map(operation => `- ${operation.kind}: ${operation.resourceRef}`),
    ].join('\n'),
  }
}

function isRevisionLocator(value: unknown): value is { readonly revisionId: SkillRevisionId } {
  if (typeof value !== 'object' || value === null || !('revisionId' in value)) return false
  const revisionId = value.revisionId
  return typeof revisionId === 'string'
}
