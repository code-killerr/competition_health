/** 实验 Lab Skill Service Definition；Provider 负责修订存储和资源解析。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SkillRevisionId, SkillSnapshot } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  LabOperationResource,
  LabOperationResourceInput,
  LabOperationResourceKind,
  LabSkillDraft,
  LabSkillProvider,
  LabSkillRevision,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labSkills: LabSkillService
  }
}

/** 实验 Skill 服务，隔离动作定义与 Harness 指令 Skill。 */
export class LabSkillService extends Service {
  private provider: LabSkillProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labSkills')
  }

  /** 注册本进程唯一的实验 Skill Provider。
 * @param provider - provider that owns Skill revisions.
 * @returns - disposer for the registered provider.
 */
  registerProvider(provider: LabSkillProvider): () => void {
    if (this.provider !== undefined) throw new LabDuplicateProviderError('lab-skill')
    const dispose = this.ctx.effect(() => {
      this.provider = provider
      return () => {
        if (this.provider === provider) this.provider = undefined
        return provider.dispose?.()
      }
    }, 'labSkills.registerProvider()')
    return () => void dispose()
  }

  /** 登记模型生成的脚本或 API 候选资源。
 * @param resource - candidate resource content and stable reference.
 * @returns - stored candidate resource.
 */
  registerCandidateResource(resource: LabOperationResourceInput): Promise<LabOperationResource> {
    return this.requireProvider().registerCandidateResource(resource)
  }

  /** 将已登记候选资源标记为可供 Skill 校验使用。
 * @param kind - candidate resource kind.
 * @param resourceRef - stable resource reference.
 * @returns - installed resource.
 */
  installResource(kind: LabOperationResourceKind, resourceRef: string): Promise<LabOperationResource> {
    return this.requireProvider().installResource(kind, resourceRef)
  }

  /** 查询候选或已安装资源。
 * @param kind - resource kind.
 * @param resourceRef - stable resource reference.
 * @returns - resource, when registered.
 */
  resolveResource(kind: LabOperationResourceKind, resourceRef: string): LabOperationResource | undefined {
    return this.requireProvider().resolveResource(kind, resourceRef)
  }

  /** 保存 Agent 生成的声明式 Skill 草案。
 * @param draft - Agent-generated declarative Skill draft.
 * @returns - stored Skill revision.
 */
  createDraft(draft: LabSkillDraft): Promise<LabSkillRevision> {
    return this.requireProvider().createDraft(draft)
  }

  /** 对草案执行确定性校验。
 * @param revisionId - draft revision to validate.
 * @returns - validated Skill revision.
 */
  validateDraft(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().validateDraft(revisionId)
  }

  /** 记录人工批准。
 * @param revisionId - revision to approve.
 * @param approvedBy - accountable reviewer identity.
 * @returns - human-approved Skill revision.
 */
  approveDraft(revisionId: SkillRevisionId, approvedBy: string): Promise<LabSkillRevision> {
    return this.requireProvider().approveDraft(revisionId, approvedBy)
  }

  /** 激活已批准的 Skill 修订。
 * @param revisionId - approved revision to activate.
 * @returns - active Skill revision.
 */
  activateRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().activateRevision(revisionId)
  }

  /** 读取修订。
 * @param revisionId - revision to resolve.
 * @returns - matching Skill revision, when present.
 */
  resolveRevision(revisionId: SkillRevisionId): LabSkillRevision | undefined {
    return this.requireProvider().resolveRevision(revisionId)
  }

  /** 为运行实例创建不可变 Skill 快照。
 * @param revisionIds - active revisions to snapshot.
 * @returns - immutable Skill snapshots for a run.
 */
  snapshotForRun(revisionIds: readonly SkillRevisionId[]): Promise<readonly SkillSnapshot[]> {
    return this.requireProvider().snapshotForRun(revisionIds)
  }

  /** 退役一条修订。
 * @param revisionId - active revision to retire.
 * @returns - retired Skill revision.
 */
  retireRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().retireRevision(revisionId)
  }

  private requireProvider(): LabSkillProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-skill')
    return this.provider
  }
}

export default LabSkillService
