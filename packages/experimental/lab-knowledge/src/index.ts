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
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ConfirmFactRequest,
  ImportDocumentRequest,
  ImportDocumentResult,
  ImportStatusResult,
  KnowledgeProvider,
  RecordConflictRequest,
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

  /** 注册本进程唯一的知识 Provider。 */
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

  /** 登记资料并返回版本状态。 */
  importDocument(request: ImportDocumentRequest): Promise<ImportDocumentResult> {
    return this.requireProvider().importDocument(request)
  }

  /** 读取资料导入状态。 */
  getImportStatus(documentId: KnowledgeDocumentId, versionId?: KnowledgeDocumentVersionId): Promise<ImportStatusResult | undefined> {
    return this.requireProvider().getImportStatus(documentId, versionId)
  }

  /** 执行带上下文过滤和引用的知识检索。 */
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]> {
    return this.requireProvider().search(request)
  }

  /** 列出冲突事实。 */
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]> {
    return this.requireProvider().listConflicts(experimentId)
  }

  /** 登记一条待人工处理的知识冲突。 */
  recordConflict(request: RecordConflictRequest): Promise<KnowledgeConflict> {
    return this.requireProvider().recordConflict(request)
  }

  /** 确认一条带来源的事实。 */
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
