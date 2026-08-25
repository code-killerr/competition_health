/** 实验 Lab Skill Service Definition；Provider 负责修订存储和资源解析。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SkillRevisionId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
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

  /** 注册本进程唯一的实验 Skill Provider。 */
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

  /** 保存 Agent 生成的声明式 Skill 草案。 */
  createDraft(draft: LabSkillDraft): Promise<LabSkillRevision> {
    return this.requireProvider().createDraft(draft)
  }

  /** 对草案执行确定性校验。 */
  validateDraft(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().validateDraft(revisionId)
  }

  /** 记录人工批准。 */
  approveDraft(revisionId: SkillRevisionId, approvedBy: string): Promise<LabSkillRevision> {
    return this.requireProvider().approveDraft(revisionId, approvedBy)
  }

  /** 激活已批准的 Skill 修订。 */
  activateRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().activateRevision(revisionId)
  }

  /** 读取修订。 */
  resolveRevision(revisionId: SkillRevisionId): LabSkillRevision | undefined {
    return this.requireProvider().resolveRevision(revisionId)
  }

  /** 为运行实例创建不可变 Skill 快照。 */
  snapshotForRun(revisionIds: readonly SkillRevisionId[]) {
    return this.requireProvider().snapshotForRun(revisionIds)
  }

  /** 退役一条修订。 */
  retireRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision> {
    return this.requireProvider().retireRevision(revisionId)
  }

  private requireProvider(): LabSkillProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-skill')
    return this.provider
  }
}

export default LabSkillService
