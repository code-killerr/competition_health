/** Lab Skill 的声明式定义和 Provider 接口。 */

import type {
  CitationId,
  LabSkillId,
  LabSkillStatus,
  OperationKind,
  SkillRevisionId,
  SkillSnapshot,
} from '@deepseek-ai/dsh-experimental-lab-domain'

/** Skill 中的一条受控操作绑定。 */
export interface LabOperationBinding {
  readonly kind: OperationKind
  readonly resourceRef: string
  readonly installed: boolean
}

/** Agent 可以生成的声明式 Skill 草案。 */
export interface LabSkillDraft {
  readonly skillId: LabSkillId
  readonly revisionId: SkillRevisionId
  readonly status: Extract<LabSkillStatus, 'DRAFT'>
  readonly name: string
  readonly purpose: string
  readonly citations: readonly CitationId[]
  readonly operations: readonly LabOperationBinding[]
}

/** 通过确定性校验并经批准的 Skill 修订。 */
export interface LabSkillRevision extends Omit<LabSkillDraft, 'status'> {
  readonly status: LabSkillStatus
  readonly definitionHash: string
  readonly approvedBy?: string
}

/** Lab Skill Provider 的完整能力接缝。 */
export interface LabSkillProvider {
  readonly name: string
  createDraft(draft: LabSkillDraft): Promise<LabSkillRevision>
  validateDraft(revisionId: SkillRevisionId): Promise<LabSkillRevision>
  approveDraft(revisionId: SkillRevisionId, approvedBy: string): Promise<LabSkillRevision>
  activateRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision>
  resolveRevision(revisionId: SkillRevisionId): LabSkillRevision | undefined
  snapshotForRun(revisionIds: readonly SkillRevisionId[]): Promise<readonly SkillSnapshot[]>
  retireRevision(revisionId: SkillRevisionId): Promise<LabSkillRevision>
  dispose?(): Promise<void> | void
}
