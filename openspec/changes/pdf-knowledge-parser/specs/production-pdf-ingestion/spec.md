## ADDED Requirements

### Requirement: The system SHALL ingest PDF bytes as immutable versioned source material

The Knowledge Service SHALL accept a PDF path or byte source, identify the document version by content identity, preserve the original bytes, record source metadata and parser metadata, and expose an import status. Reimporting the same content SHALL reuse the existing document version instead of creating a second source copy.

#### Scenario: Importing a text PDF

- **WHEN** a user submits a valid PDF source with name and metadata
- **THEN** the service persists the original bytes, returns document/version identifiers, records the parser and source format, and moves the version through parsing and indexing states

#### Scenario: Reimporting identical PDF bytes

- **WHEN** the same PDF content is submitted again under the same or a different display name
- **THEN** the service returns the existing content version and does not duplicate the immutable source bytes or indexed blocks

### Requirement: The system SHALL extract citation-addressable PDF blocks

The production PDF Parser SHALL emit non-empty text blocks with page number, deterministic document location and, when available, title path. A table SHALL be marked as structured only when its headers and rows pass deterministic extraction checks; otherwise the parser SHALL preserve readable page text and record a warning. Every indexed block SHALL retain its source document/version identity.

#### Scenario: Extracting page text and headings

- **WHEN** a text PDF contains readable page text and heading-like lines
- **THEN** the parser emits ordered blocks whose citations identify the page and block location and whose title paths preserve the detected heading context

#### Scenario: Encountering an uncertain table

- **WHEN** a page resembles a table but column alignment or headers cannot be determined reliably
- **THEN** the parser stores the page content as text blocks, records a parse warning and does not invent table columns or values

### Requirement: The system SHALL make parser and indexing failures explicit

The import lifecycle SHALL distinguish queued, parsing, indexing, ready, OCR-required and failed states, or an equivalent typed status. A damaged PDF, encrypted/unsupported file, empty extraction result or unavailable OCR capability SHALL remain non-published and SHALL expose an error code/message and relevant warnings. Failed input SHALL not enter confirmed retrieval.

#### Scenario: The source is a scanned PDF without OCR

- **WHEN** the parser finds no usable text and no OCR adapter is configured
- **THEN** the version enters an explicit OCR-required or failed state with an actionable reason and no searchable confirmed blocks are published

#### Scenario: Indexing fails after parsing

- **WHEN** block persistence, FTS5 indexing or optional embedding generation fails
- **THEN** the version records an indexing failure, rolls back incomplete derived records and keeps the original bytes available for retry

#### Scenario: Rebuilding after a failure

- **WHEN** the provider retries parsing or rebuilds derived indexes for an existing source version
- **THEN** it reads the immutable bytes, reproduces the parser metadata and either returns a complete ready result or retains an explicit failure without silently using partial data

### Requirement: The system SHALL persist a versioned parse run and document result

Every parse attempt SHALL create or update a `ParseRun` associated with exactly one immutable source version. The run SHALL record a run identifier, parser name and version, parser configuration digest, document IR schema version, attempt number, start and finish times, status, warnings, errors, page count and OCR source. The parser result SHALL be distinguishable from the source file and from later SOP or published-knowledge revisions.

#### Scenario: Inspecting a completed parse run

- **WHEN** a valid PDF finishes parsing
- **THEN** the service exposes the source version, parse run, parser version, IR schema version, page count, warnings and completion timestamps together with the citation-addressable blocks

#### Scenario: Re-running with a different parser version

- **WHEN** the same immutable PDF is parsed with a different parser version or configuration
- **THEN** the service creates a distinguishable parse run and derived result without changing the original bytes or silently replacing the earlier run's provenance

### Requirement: The system SHALL emit citation metadata sufficient for platform review

Each parsed block SHALL preserve its page, deterministic location, reading order and title path when available. When the parser provides layout information, the block SHALL also preserve a page-relative bounding box, coordinate system, page dimensions and rotation. Table blocks SHALL preserve table and cell relationships when available; uncertain structure SHALL be represented by a warning rather than invented rows or columns.

#### Scenario: Reviewing a block in the source PDF

- **WHEN** a reviewer selects a parsed block or a candidate SOP field
- **THEN** the service returns enough page and coordinate metadata for the platform to open the source page and highlight the cited region, or explicitly reports that the region is unavailable

#### Scenario: Parsing a layout without reliable coordinates

- **WHEN** the parser returns readable text but no reliable layout coordinates
- **THEN** the service retains the page/text citation, marks coordinate data as unavailable and records a layout warning without rejecting otherwise usable source text

### Requirement: The system SHALL validate PDF intake before creating searchable content

The import boundary SHALL validate the declared media type, file extension, PDF file signature and configured size/resource limits. It SHALL accept only browser-uploaded bytes or authorized Storage references and SHALL reject arbitrary local paths, shell arguments and untrusted PDF instructions. A rejected input SHALL not create confirmed blocks or a partial source version.

#### Scenario: Rejecting a non-PDF upload

- **WHEN** an upload has a PDF extension but its bytes do not have a valid PDF signature
- **THEN** the service returns `PDF_INVALID`, does not enqueue Docling and does not expose the upload as searchable knowledge

#### Scenario: Rejecting an oversized PDF

- **WHEN** a PDF exceeds the configured size or resource limit
- **THEN** the service returns `PDF_RESOURCE_LIMIT` with a non-retryable or actionable detail and does not start an unbounded parser process

### Requirement: The system SHALL expose parser capability and stable failure semantics

The Knowledge Provider SHALL expose whether the configured Docling runtime is available, its version, supported input types, OCR availability and effective resource limits. Parser and indexing failures SHALL use stable error codes with phase, retryability and structured details. The implementation SHALL not silently substitute an undeclared system command or publish partial output when Docling is unavailable.

#### Scenario: Docling is unavailable

- **WHEN** a user or operator queries parser capability while the configured Docling runtime cannot be started
- **THEN** the service reports unavailable capability and uses `PARSER_UNAVAILABLE` for attempted imports, with no searchable confirmed content

#### Scenario: A transient parser failure occurs

- **WHEN** Docling times out or a temporary IO/indexing failure occurs after the source bytes are stored
- **THEN** the service records the corresponding error code, phase, retryable flag and parse run identifier, keeps the immutable source available and permits an explicit retry

#### Scenario: An invalid source is submitted

- **WHEN** the source is encrypted, corrupt, unsupported or has no usable text and OCR is unavailable
- **THEN** the service records `PDF_PASSWORD_PROTECTED`, `PDF_CORRUPT`, `PDF_UNSUPPORTED`, `PDF_EMPTY` or `OCR_REQUIRED` as appropriate, marks the failure non-confirmed and does not treat it as a transient runtime failure

### Requirement: The system SHALL commit derived parse and index projections atomically

Parsed blocks, FTS5 entries, optional embeddings and other derived records SHALL be written to a temporary or transactional projection and become visible only after the complete operation succeeds. A failed parse or index operation SHALL not leave a queryable mixture of new and old derived records. All projections SHALL be rebuildable from the immutable source bytes and the recorded parser configuration.

#### Scenario: Indexing fails after block extraction

- **WHEN** FTS5 or optional embedding indexing fails after Docling has produced valid blocks
- **THEN** the service marks the run or version as indexing failure, removes or hides incomplete derived records and leaves the source bytes and parse result available for retry/rebuild

#### Scenario: Rebuilding a deleted projection

- **WHEN** an operator requests a rebuild for an existing source version
- **THEN** the service reconstructs the projection from immutable bytes and recorded parser metadata without requiring CSV or manually recreated input
