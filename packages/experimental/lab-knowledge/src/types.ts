/** Knowledge Service 的请求、结果和 Provider 接口。 */

import type {
  CitationId,
  KnowledgeConflict,
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
  KnowledgeImportStatus,
  ExperimentId,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeSource,
  KnowledgeSopDraft,
  KnowledgeSopDraftId,
  KnowledgeSopStep,
} from '@deepseek-ai/dsh-experimental-lab-domain'

/** 登记一份知识资料。 */
export interface ImportDocumentRequest {
  readonly source: KnowledgeSource
  readonly metadata?: Readonly<Record<string, string>>
}

/** 资料导入任务的状态。 */
export interface ImportDocumentResult {
  readonly documentId: KnowledgeDocumentId
  readonly versionId: KnowledgeDocumentVersionId
  readonly status: KnowledgeImportStatus
  readonly metadata?: Readonly<Record<string, string>>
  readonly errorCode?: string
}

/** 查询导入状态。 */
export interface ImportStatusResult extends ImportDocumentResult {
  readonly error?: string
}

/** 创建一个带引用的 SOP 草案。 */
export interface CreateSopDraftRequest {
  readonly title: string
  readonly steps: readonly Omit<KnowledgeSopStep, 'stepId'>[]
  readonly updatedBy?: string
}

/** 更新一个仍处于草案或审核状态的 SOP。 */
export interface UpdateSopDraftRequest {
  readonly draftId: KnowledgeSopDraftId
  readonly title: string
  readonly steps: readonly Omit<KnowledgeSopStep, 'stepId'>[]
  readonly updatedBy?: string
}

/** 发布一个已经完成审核的 SOP。 */
export interface PublishSopDraftRequest {
  readonly draftId: KnowledgeSopDraftId
  readonly publishedBy: string
}

/** SOP 操作结果及当前发布阻塞原因。 */
export interface SopDraftResult {
  readonly draft: KnowledgeSopDraft
  readonly blockers: readonly string[]
}

/** 事实确认请求。 */
export interface ConfirmFactRequest {
  readonly citationId: CitationId
  readonly confirmedBy: string
  readonly note?: string
}

/** 登记一条需要人工处理的知识冲突。 */
export interface RecordConflictRequest {

  readonly experimentId?: ExperimentId
  readonly citationIds: readonly CitationId[]
  readonly summary: string
}

/** Knowledge Provider 的完整能力接缝。 */
export interface KnowledgeProvider {
  readonly name: string
  importDocument(request: ImportDocumentRequest): Promise<ImportDocumentResult>
  getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined>
  listImportStatuses(): Promise<readonly ImportStatusResult[]>
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>
  createSopDraft(request: CreateSopDraftRequest): Promise<SopDraftResult>
  getSopDraft(draftId: KnowledgeSopDraftId): Promise<SopDraftResult | undefined>
  listSopDrafts(): Promise<readonly SopDraftResult[]>
  updateSopDraft(request: UpdateSopDraftRequest): Promise<SopDraftResult>
  publishSopDraft(request: PublishSopDraftRequest): Promise<SopDraftResult>
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>
  recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict>
  confirmFact(request: ConfirmFactRequest): Promise<void>
  rebuildIndex(): Promise<void>
  dispose?(): Promise<void> | void
}
