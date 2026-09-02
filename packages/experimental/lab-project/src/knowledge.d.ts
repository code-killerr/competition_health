/** Read-only Knowledge Consumer seam used by the project and conversation line. */
import type { KnowledgeConflict, KnowledgeDocumentId, KnowledgeDocumentVersionId, KnowledgeSearchRequest, KnowledgeSearchResult } from '@deepseek-ai/dsh-experimental-lab-domain';
import type { ImportStatusResult } from '@deepseek-ai/dsh-experimental-lab-knowledge';
/** Capability state exposed while the parallel Knowledge line is available or unavailable. */
export type KnowledgeCapabilityState = 'available' | 'unavailable';
/** Read-only capability status; no minimum version is required by the Harness line. */
export interface KnowledgeCapabilityStatus {
    readonly state: KnowledgeCapabilityState;
    readonly reason?: string;
}
/** Service methods required by the Harness-facing Knowledge Consumer adapter. */
export interface KnowledgeFacade {
    listImportStatuses(): Promise<readonly ImportStatusResult[]>;
    search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>;
    listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>;
}
/** Published SOP identity returned by a Knowledge Consumer. */
export interface PublishedSopRecord {
    readonly sopRevisionId: string;
    readonly documentId: KnowledgeDocumentId;
    readonly versionId: KnowledgeDocumentVersionId;
    readonly citationIds: readonly string[];
    readonly status: 'PUBLISHED';
}
/** Public, read-only Knowledge contract consumed by project and Agent context code. */
export interface LabKnowledgeConsumer {
    capability(): Promise<KnowledgeCapabilityStatus> | KnowledgeCapabilityStatus;
    listImportStatuses(): Promise<readonly ImportStatusResult[]>;
    search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>;
    listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>;
    listPublishedSops?(): Promise<readonly PublishedSopRecord[]>;
}
/** Adapt the existing Knowledge Service or Facade without exposing its Provider or storage implementation.
 * @param service - Knowledge facade to adapt.
 * @returns - read-only Harness Knowledge consumer.
 */
export declare function createLabKnowledgeConsumer(service: KnowledgeFacade): LabKnowledgeConsumer;
/** Deterministic Knowledge Consumer for keyless project and Agent tests. */
export declare class FakeLabKnowledgeConsumer implements LabKnowledgeConsumer {
    private readonly status;
    private readonly imports;
    private readonly results;
    private readonly conflicts;
    private readonly sops;
    /**
     * @param fixture - fixed capability and retrieval records used by tests or local demos.
     */
    constructor(fixture?: FakeKnowledgeFixture);
    /** Return the configured capability state without external IO. */
    capability(): KnowledgeCapabilityStatus;
    /** Return the fixture's import records in deterministic order. */
    listImportStatuses(): Promise<readonly ImportStatusResult[]>;
    /** Return fixture results narrowed by explicit document/version scope. */
    search(request: KnowledgeSearchRequest): Promise<readonly KnowledgeSearchResult[]>;
    /** Return fixture conflicts, optionally narrowed by experiment identity. */
    listConflicts(experimentId?: KnowledgeSearchRequest['experimentId']): Promise<readonly KnowledgeConflict[]>;
    /** Return published SOP records supplied by the fixture. */
    listPublishedSops(): Promise<readonly PublishedSopRecord[]>;
}
/** Deterministic fixture for the public Knowledge Consumer seam. */
export interface FakeKnowledgeFixture {
    readonly capability?: KnowledgeCapabilityStatus;
    readonly imports?: readonly ImportStatusResult[];
    readonly results?: readonly KnowledgeSearchResult[];
    readonly conflicts?: readonly KnowledgeConflict[];
    readonly publishedSops?: readonly PublishedSopRecord[];
}
//# sourceMappingURL=knowledge.d.ts.map