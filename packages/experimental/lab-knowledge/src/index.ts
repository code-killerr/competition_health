/** 实验知识库 Service Definition；Provider 负责具体解析、存储和索引。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
  KnowledgeConflict,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeSopDraftId,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ConfirmFactRequest,
  ImportDocumentRequest,
  ImportDocumentResult,
  ImportStatusResult,
  KnowledgeProvider,
  CreateSopDraftRequest,
  PublishSopDraftRequest,
  RecordConflictRequest,
  SopDraftResult,
  UpdateSopDraftRequest,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labKnowledge: KnowledgeService
  }
}

/** 实验知识库服务，维护一个可替换 Provider 的能力接缝。 */
export class KnowledgeService extends Service {
  private provider: KnowledgeProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labKnowledge')
  }

  /** 注册本进程唯一的知识 Provider。
 * @param provider - provider that owns knowledge storage and retrieval.
 * @returns - disposer for the registered provider.
 */
  registerProvider(provider: KnowledgeProvider): () => void {
    if (this.provider !== undefined) throw new LabDuplicateProviderError('knowledge')
    const dispose = this.ctx.effect(() => {
      this.provider = provider
      return () => {
        if (this.provider === provider) this.provider = undefined
        return provider.dispose?.()
      }
    }, 'labKnowledge.registerProvider()')
    return () => void dispose()
  }

  /** 登记资料并返回版本状态。
 * @param request - immutable source registration request.
 * @returns - imported document version status.
 */
  importDocument(request: ImportDocumentRequest): Promise<ImportDocumentResult> {
    return this.requireProvider().importDocument(request)
  }

  /** 读取资料导入状态。
 * @param documentId - document to inspect.
 * @param versionId - optional version to inspect.
 * @returns - import status, when the document or version exists.
 */
  getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined> {
    return this.requireProvider().getImportStatus(documentId, versionId)
  }

  /** 列出所有资料的最近版本状态，供 Web Consumer 展示导入进度。
   * @returns - latest import status for each knowledge document.
   */
  listImportStatuses(): Promise<readonly ImportStatusResult[]> {
    return this.requireProvider().listImportStatuses()
  }

  /** 执行带上下文过滤和引用的知识检索。
 * @param request - query, filters, and result limits.
 * @returns - ranked citation results.
 */
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]> {
    return this.requireProvider().search(request)
  }

  /** 创建一个 SOP 草案。 */
  createSopDraft(request: CreateSopDraftRequest): Promise<SopDraftResult> {
    return this.requireProvider().createSopDraft(request)
  }

  /** 读取一个 SOP 草案。 */
  getSopDraft(draftId: KnowledgeSopDraftId): Promise<SopDraftResult | undefined> {
    return this.requireProvider().getSopDraft(draftId)
  }

  /** 列出所有 SOP 草案。 */
  listSopDrafts(): Promise<readonly SopDraftResult[]> {
    return this.requireProvider().listSopDrafts()
  }

  /** 更新一个 SOP 草案，并在无阻塞时提交审核。 */
  updateSopDraft(request: UpdateSopDraftRequest): Promise<SopDraftResult> {
    return this.requireProvider().updateSopDraft(request)
  }

  /** 发布一个已审核 SOP 草案。 */
  publishSopDraft(request: PublishSopDraftRequest): Promise<SopDraftResult> {
    return this.requireProvider().publishSopDraft(request)
  }

  /** 列出冲突事实。
 * @param experimentId - optional experiment scope.
 * @returns - recorded knowledge conflicts.
 */
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]> {
    return this.requireProvider().listConflicts(experimentId)
  }

  /** 登记一条待人工处理的知识冲突。
 * @param request - conflict details and cited facts.
 * @returns - persisted conflict record.
 */
  recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict> {
    return this.requireProvider().recordConflict(request)
  }

  /** 确认一条带来源的事实。
 * @param request - citation confirmation request.
 */
  confirmFact(request: ConfirmFactRequest): Promise<void> {
    return this.requireProvider().confirmFact(request)
  }

  /** 重建派生检索索引。 */
  rebuildIndex(): Promise<void> {
    return this.requireProvider().rebuildIndex()
  }

  private requireProvider(): KnowledgeProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('knowledge')
    return this.provider
  }
}

export default KnowledgeService
