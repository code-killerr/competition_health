## 1. Domain model and parser protocol

- [ ] 1.1 Extend the Knowledge domain types with PDF source metadata, `ParseRun`, parser capability, Document IR schema version, parser configuration digest, OCR source, coordinates, warnings, stable error details and explicit retryability.
- [ ] 1.2 Keep source, parsed block, candidate fact, SOP draft, SOP revision and published knowledge as separate typed records; ensure derived records point back to the source version and parse run.
- [ ] 1.3 Define the versioned parser result envelope with `schemaVersion`, `parseRunId`, `sourceVersionId`, content hash, parser metadata, page count, status, warnings, errors and output references.
- [ ] 1.4 Define the stable parser/index error catalog, including `PARSER_UNAVAILABLE`, `PDF_INVALID`, `PDF_CORRUPT`, `PDF_PASSWORD_PROTECTED`, `PDF_UNSUPPORTED`, `PDF_EMPTY`, `OCR_REQUIRED`, `OCR_FAILED`, `PDF_PARSE_TIMEOUT`, `PDF_RESOURCE_LIMIT`, `PDF_OUTPUT_INVALID`, `PDF_IO_ERROR` and `INDEX_FAILED`, with phase and retry semantics.

## 2. Local Docling ingestion

- [ ] 2.1 Add the production Docling adapter behind the existing `DocumentParser` seam; invoke the local Python/Docling runtime through Harness Host `ctx.subprocess` and sandbox restrictions.
- [ ] 2.2 Add parser capability detection for Docling availability, version, supported input types, OCR availability, model/runtime readiness and effective resource limits; do not add an undeclared system-command fallback.
- [ ] 2.3 Implement bounded PDF intake validation for upload bytes or authorized Storage references: size, extension, MIME type, PDF signature, path isolation and resource limits.
- [ ] 2.4 Persist the immutable PDF source before creating a parse run; make repeated imports with the same content hash idempotent and avoid partial source versions.
- [ ] 2.5 Convert Docling output to the internal Document IR and `ParsedDocumentBlock`, preserving page, title path, reading order, text, block kind, source spans, table/cell relations, warnings and layout metadata.
- [ ] 2.6 Store coordinates with bounding box, coordinate system, page width/height and rotation when available; preserve page/text citations when coordinates are unavailable.
- [ ] 2.7 Detect no-text or scan-only PDFs and return `OCR_REQUIRED` when no OCR adapter is configured; do not silently treat image content as confirmed text.
- [ ] 2.8 Use conservative table extraction: only emit structured tables after deterministic validation, otherwise preserve page text and emit `TABLE_STRUCTURE_UNCERTAIN`.

## 3. Persistence, lifecycle and rebuilds

- [ ] 3.1 Add idempotent SQLite migrations for source/parser metadata, parse runs, structured warnings/errors, provenance and SOP identifiers without breaking existing CSV/fixture Parser data.
- [ ] 3.2 Implement the import lifecycle for queued, parsing, indexing, ready, OCR-required and failed states, with parse-run attempt count, timestamps and operator-visible status.
- [ ] 3.3 Make block persistence, FTS5 indexing, optional embedding indexing and other derived projections transactional or staged; do not expose a mixture of partial new and old records.
- [ ] 3.4 Implement explicit retry from immutable bytes and rebuild of deleted/stale derived projections using the recorded parser version/configuration; never require CSV recreation.
- [ ] 3.5 Add stale-projection detection using source content hash, parse-run identity, parser/configuration digest and index/projection version.

## 4. SOP draft and platform-native human review

- [ ] 4.1 Add SOP draft/revision request/result types and Knowledge Service/Provider methods for generation, inspection, completion, conflict resolution, validation, approval and publication.
- [ ] 4.2 Implement cited structured draft generation through the existing Harness Agent/preset/LLM adapter; every non-missing/non-assumption field must reference existing PDF blocks.
- [ ] 4.3 Validate generated output deterministically for schema, citation existence, citation source version, parameter units, required fields, conflict markers and assumption markers before persistence.
- [ ] 4.4 Persist immutable revisions with field-level changes, prior revision, evidence links, operator, timestamp, notes and Session/Approval audit references.
- [ ] 4.5 Expose a platform-native review flow through the existing Web/Knowledge Facade: page preview, coordinate highlight when available, candidate fields, warnings, conflicts, confirm/edit/reject/missing/assumption actions and publication blockers.
- [ ] 4.6 Keep CSV as an independent test/import/export format only; do not make CSV export, editing or re-import a prerequisite for human review or batch completion.
- [ ] 4.7 Make completion, approval and publication operations idempotent, and ensure retries cannot create duplicate revisions or duplicate publication projections.
- [ ] 4.8 Gate publication on required fields, valid citations, resolved conflicts, deterministic validation and explicit human approval; exclude draft/rejected/unconfirmed content from confirmed planning retrieval.

## 5. File ingestion, indexing and retrieval

- [ ] 5.1 Extend the Knowledge tool Consumer and typed Web Facade with bounded PDF/CSV/TSV/text file import, source/version status, parser capability, parse-run inspection, retry/rebuild and provenance responses; keep Knowledge commands/DTOs in a dedicated protocol module so the parallel project line does not edit the same implementation file.
- [ ] 5.2 Keep browser/HTTP intake byte-based or authorized-Storage-based, validate type/size before Provider dispatch and preserve one immutable source identity across retries.
- [ ] 5.3 Define trusted Host embedding configuration for provider, endpoint, model, credential reference, vector dimension, timeout, retry and keyword/vector weights; fail clearly for incomplete configuration and report explicit FTS5-only mode when absent.
- [ ] 5.4 Implement the configured Embedding Adapter behind the Knowledge Provider, including credential resolution, provider/model metadata, vector dimension validation and no implicit reuse of the chat LLM.
- [ ] 5.5 Extend SQLite derived metadata for embedding model/dimension/status, generate vectors for new or rebuilt blocks and detect stale projections after provider/model/config changes.
- [ ] 5.6 Implement hybrid ranking over normalized FTS5 and cosine scores with document/version/confirmation/conflict filters; accept project source/version scope as input without importing project persistence.
- [ ] 5.7 Ensure retrieval results carry source version, parse run, block/page/coordinate provenance, SOP revision, confirmation/conflict status, provenance type, retrieval mode and component/final scores.
- [ ] 5.8 Keep deterministic FTS5-only retrieval available when embedding is absent or unavailable, and ensure confirmed planning retrieval returns only confirmed facts or published SOP projections.
- [ ] 5.9 Publish a versioned Knowledge Consumer fixture covering capability status, opaque source/version/citation IDs, citation-bearing retrieval and published SOP records for `lab-harness-native-workspace`.

## 6. Knowledge workspace Consumer

- [ ] 6.1 Implement a dedicated Knowledge workspace contributor/package using public Harness workspace/layout slots; it owns its page body but does not register the global sidebar, project list or Agent conversation composer.
- [ ] 6.2 Add browser file selection and drag/drop for PDF, CSV, TSV and text sources with size/type validation, progress/error state and no Provider/database imports in client code.
- [ ] 6.3 Add document/version list, parser/index lifecycle, OCR-required/failed states, retry/rebuild actions, citation detail and conflict detail.
- [ ] 6.4 Add retrieval query and results views with confirmation filters, retrieval mode, scores, source/page/block provenance and explicit empty/error states.
- [ ] 6.5 Add PDF-derived SOP draft/revision review with page/block evidence, coordinate highlight when available, missing/assumption/conflict actions and explicit approval/publication blockers.
- [ ] 6.6 Keep Knowledge source upload separate from ordinary Agent message attachments and expose a stable workspace slot ID plus capability-unavailable state for parallel composition.

## 7. Verification and documentation

- [ ] 7.1 Add keyless tests for valid text PDF import, repeated content identity, page/title/block citations, coordinate metadata, uncertain tables, no-text PDFs and all non-retryable source errors.
- [ ] 7.2 Add keyless tests for Docling unavailable, timeout, resource limit, temporary IO, output validation, FTS5 failure, optional embedding failure, dimension mismatch, rollback and retry/rebuild behavior.
- [ ] 7.3 Add keyless retrieval tests for CSV/TSV/text/PDF inputs, FTS5-only mode, fake embedding hybrid ranking, source filters, confirmation/conflict filters and citation-bearing results.
- [ ] 7.4 Add fake-Agent tests for cited draft generation, uncited output rejection, invalid citation rejection, human completion, conflict resolution, idempotent review retry, approval and publication gating.
- [ ] 7.5 Add a composed keyless test that imports at least one real PDF from `docs/change_plan/pdf_knowledge/`, creates a cited SOP draft, completes/publishes it through the service boundary and retrieves the published step with PDF citations.
- [ ] 7.6 Add browser/Facade tests for file upload, lifecycle status, retrieval and inline evidence review without a CSV round trip or Harness Agent conversation dependency.
- [ ] 7.7 Run the shared contract fixture against `lab-harness-native-workspace`, then run a joint smoke that mounts this Knowledge workspace, scopes a project to imported sources and supplies cited confirmed results to planning.
- [ ] 7.8 Document supported files, Docling runtime/capability configuration, embedding optionality, FTS5 fallback, OCR limitation, error codes, retry behavior, review workflow and the two-line ownership boundary in English and Chinese documentation.
- [ ] 7.9 Record selected Docling runtime/package versions, embedding adapter configuration and Node 24/Host verification in the implementation Agent Note; stop with explicit capability errors when optional runtime capabilities are unavailable.
