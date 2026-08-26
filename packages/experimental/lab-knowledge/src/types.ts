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
}

/** 查询导入状态。 */
export interface ImportStatusResult extends ImportDocumentResult {
  readonly error?: string
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
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>
  recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict>
  confirmFact(request: ConfirmFactRequest): Promise<void>
  rebuildIndex(): Promise<void>
  dispose?(): Promise<void> | void
}
