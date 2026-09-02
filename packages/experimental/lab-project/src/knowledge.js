/** Read-only Knowledge Consumer seam used by the project and conversation line. */
/** Adapt the existing Knowledge Service or Facade without exposing its Provider or storage implementation.
 * @param service - Knowledge facade to adapt.
 * @returns - read-only Harness Knowledge consumer.
 */
export function createLabKnowledgeConsumer(service) {
    return {
        async capability() {
            try {
                await service.listImportStatuses();
                return { state: 'available' };
            }
            catch (error) {
                return {
                    state: 'unavailable',
                    reason: error instanceof Error ? error.message : String(error),
                };
            }
        },
        listImportStatuses: () => service.listImportStatuses(),
        search: request => service.search(request),
        listConflicts: experimentId => service.listConflicts(experimentId),
    };
}
/** Deterministic Knowledge Consumer for keyless project and Agent tests. */
export class FakeLabKnowledgeConsumer {
    status;
    imports;
    results;
    conflicts;
    sops;
    /**
     * @param fixture - fixed capability and retrieval records used by tests or local demos.
     */
    constructor(fixture = {}) {
        this.status = fixture.capability ?? { state: 'available' };
        this.imports = clone(fixture.imports ?? []);
        this.results = clone(fixture.results ?? []);
        this.conflicts = clone(fixture.conflicts ?? []);
        this.sops = clone(fixture.publishedSops ?? []);
    }
    /** Return the configured capability state without external IO. */
    capability() {
        return { ...this.status };
    }
    /** Return the fixture's import records in deterministic order. */
    listImportStatuses() {
        return Promise.resolve(this.status.state === 'available' ? clone(this.imports) : []);
    }
    /** Return fixture results narrowed by explicit document/version scope. */
    search(request) {
        const documentIds = request.documentIds === undefined ? undefined : new Set(request.documentIds);
        const versionIds = request.versionIds === undefined ? undefined : new Set(request.versionIds);
        const results = this.results.filter(result => (documentIds === undefined || documentIds.has(result.documentId))
            && (versionIds === undefined || versionIds.has(result.versionId))
            && (request.confirmed !== true || result.confirmed));
        return Promise.resolve(clone(results.slice(0, request.limit)));
    }
    /** Return fixture conflicts, optionally narrowed by experiment identity. */
    listConflicts(experimentId) {
        return Promise.resolve(clone(this.conflicts.filter(conflict => experimentId === undefined || conflict.experimentId === experimentId)));
    }
    /** Return published SOP records supplied by the fixture. */
    listPublishedSops() {
        return Promise.resolve(this.status.state === 'available' ? clone(this.sops) : []);
    }
}
function clone(value) {
    return structuredClone(value);
}
//# sourceMappingURL=knowledge.js.map