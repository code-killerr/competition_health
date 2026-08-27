/** Read-only Knowledge Consumer seam used by the project and conversation line. */

import type {
  KnowledgeConflict,
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ImportStatusResult } from '@deepseek-ai/dsh-experimental-lab-knowledge'

/** Capability state exposed while the parallel Knowledge line is available or unavailable. */
export type KnowledgeCapabilityState = 'available' | 'unavailable'

/** Read-only capability status; no minimum version is required by the Harness line. */
export interface KnowledgeCapabilityStatus {
  readonly state: KnowledgeCapabilityState
  readonly reason?: string
}

/** Service methods required by the Harness-facing Knowledge Consumer adapter. */
export interface KnowledgeFacade {
  listImportStatuses(): Promise<readonly ImportStatusResult[]>
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>
}

/** Published SOP identity returned by a Knowledge Consumer. */
export interface PublishedSopRecord {
  readonly sopRevisionId: string
  readonly documentId: KnowledgeDocumentId
  readonly versionId: KnowledgeDocumentVersionId
  readonly citationIds: readonly string[]
  readonly status: 'PUBLISHED'
}

/** Public, read-only Knowledge contract consumed by project and Agent context code. */
export interface LabKnowledgeConsumer {
  capability(): Promise<KnowledgeCapabilityStatus> | KnowledgeCapabilityStatus
  listImportStatuses(): Promise<readonly ImportStatusResult[]>
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>
  listPublishedSops?(): Promise<readonly PublishedSopRecord[]>
}

/** Adapt the existing Knowledge Service or Facade without exposing its Provider or storage implementation.
 * @param service - Knowledge facade to adapt.
 * @returns - read-only Harness Knowledge consumer.
 */
export function createLabKnowledgeConsumer(service: KnowledgeFacade): LabKnowledgeConsumer {
  return {
    async capability() {
      try {
        await service.listImportStatuses()
        return { state: 'available' }
      } catch (error) {
        return {
          state: 'unavailable',
          reason: error instanceof Error ? error.message : String(error),
        }
      }
    },
    listImportStatuses: () => service.listImportStatuses(),
    search: request => service.search(request),
    listConflicts: experimentId => service.listConflicts(experimentId),
  }
}

/** Deterministic Knowledge Consumer for keyless project and Agent tests. */
export class FakeLabKnowledgeConsumer implements LabKnowledgeConsumer {
  private readonly status: KnowledgeCapabilityStatus
  private readonly imports: readonly ImportStatusResult[]
  private readonly results: readonly KnowledgeSearchResult[]
  private readonly conflicts: readonly KnowledgeConflict[]
  private readonly sops: readonly PublishedSopRecord[]

  /**
   * @param fixture - fixed capability and retrieval records used by tests or local demos.
   */
  constructor(fixture: FakeKnowledgeFixture = {}) {
    this.status = fixture.capability ?? { state: 'available' }
    this.imports = clone(fixture.imports ?? [])
    this.results = clone(fixture.results ?? [])
    this.conflicts = clone(fixture.conflicts ?? [])
    this.sops = clone(fixture.publishedSops ?? [])
  }

  /** Return the configured capability state without external IO. */
  capability(): KnowledgeCapabilityStatus {
    return { ...this.status }
  }

  /** Return the fixture's import records in deterministic order. */
  listImportStatuses(): Promise<readonly ImportStatusResult[]> {
    return Promise.resolve(this.status.state === 'available' ? clone(this.imports) : [])
  }

  /** Return fixture results narrowed by explicit document/version scope. */
  search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]> {
    const documentIds = request.documentIds === undefined ? undefined : new Set(request.documentIds)
    const versionIds = request.versionIds === undefined ? undefined : new Set(request.versionIds)
    const results = this.results.filter(result =>
      (documentIds === undefined || documentIds.has(result.documentId))
      && (versionIds === undefined || versionIds.has(result.versionId))
      && (request.confirmed !== true || result.confirmed),
    )
    return Promise.resolve(clone(results.slice(0, request.limit)))
  }

  /** Return fixture conflicts, optionally narrowed by experiment identity. */
  listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]> {
    return Promise.resolve(clone(this.conflicts.filter(conflict =>
      experimentId === undefined || conflict.experimentId === experimentId,
    )))
  }

  /** Return published SOP records supplied by the fixture. */
  listPublishedSops(): Promise<readonly PublishedSopRecord[]> {
    return Promise.resolve(this.status.state === 'available' ? clone(this.sops) : [])
  }
}

/** Deterministic fixture for the public Knowledge Consumer seam. */
export interface FakeKnowledgeFixture {
  readonly capability?: KnowledgeCapabilityStatus
  readonly imports?: readonly ImportStatusResult[]
  readonly results?: readonly KnowledgeSearchResult[]
  readonly conflicts?: readonly KnowledgeConflict[]
  readonly publishedSops?: readonly PublishedSopRecord[]
}

function clone<T>(value: T): T {
  return structuredClone(value)
}
