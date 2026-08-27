## ADDED Requirements

### Requirement: The Knowledge Provider SHALL expose a configured local Docling capability

The experimental Knowledge composition SHALL accept trusted Docling runtime settings, detect whether the configured local runner can start during PDF import, and expose actionable availability and supported PDF information through the import result/status. The version is carried in the validated runner protocol for later persistence. Browser input and Agent output MUST NOT provide executable paths, shell options or arbitrary local paths.

#### Scenario: Docling capability is available

- **WHEN** the Host checks the configured Docling runner and it starts successfully
- **THEN** the capability reports available status, runner version and supported PDF input

#### Scenario: Docling capability is unavailable

- **WHEN** the configured runner is missing, cannot start or returns an invalid capability response
- **THEN** the capability reports an actionable unavailable state and no PDF is published as searchable content

### Requirement: The Knowledge Service SHALL parse valid text PDFs through the local Docling adapter

The service SHALL preserve the submitted PDF bytes by content identity, invoke the configured Docling adapter for PDF input, and convert valid output into `ParsedDocumentBlock` records containing stable location, page when available, title path when available, text content and basic table metadata.

#### Scenario: Importing a valid text PDF

- **WHEN** a valid PDF is uploaded and the local Docling adapter returns usable document output
- **THEN** the source version reaches `READY`, its blocks are searchable through FTS5, and search results retain the PDF page or block citation

#### Scenario: Re-importing the same PDF bytes

- **WHEN** identical PDF bytes are submitted again
- **THEN** the service reuses the existing content identity and does not duplicate searchable blocks

### Requirement: The parser SHALL preserve safe fallback semantics for unsupported document structure

The adapter SHALL emit a basic table only after deterministic structural validation. If a table cannot be validated, it SHALL preserve readable page text and report a warning; it MUST NOT invent columns or values. A scan-only PDF without an enabled OCR adapter SHALL remain non-ready.

#### Scenario: Table structure is uncertain

- **WHEN** Docling returns content whose table rows or columns cannot be mapped consistently
- **THEN** the service stores readable text with a table-uncertain warning and does not mark guessed table cells as confirmed facts

#### Scenario: PDF has no extractable text

- **WHEN** a PDF contains no usable text and no OCR adapter is configured
- **THEN** the import fails with an OCR-required or equivalent actionable status and creates no confirmed searchable blocks

### Requirement: PDF failures SHALL be observable and classified

The service SHALL distinguish invalid input, unavailable parser, timeout, resource limit, parser execution failure, invalid parser output and indexing failure. Every failure visible to the Web Facade SHALL include a stable error code, phase and retryability; failed imports SHALL retain their source identity for inspection and eligible retry.

#### Scenario: Invalid PDF input

- **WHEN** uploaded bytes do not have a valid PDF signature or cannot be read as a PDF
- **THEN** the service returns a non-retryable PDF input error and does not enqueue Docling

#### Scenario: Temporary parser failure

- **WHEN** the Docling process times out or exits with a temporary runtime failure after source storage
- **THEN** the service records a retryable parser error and allows retry from the stored immutable bytes

### Requirement: The Web Consumer SHALL expose the usable PDF ingestion loop

The opt-in laboratory Web Consumer SHALL allow a user to select PDF bytes, inspect capability and import status, retry eligible failures, search ready PDF content and open its page/block citations. It SHALL use the existing typed Facade and SHALL not import Docling, SQLite or Provider internals into browser code.

#### Scenario: User completes PDF ingestion

- **WHEN** a user selects a valid PDF while Docling is available
- **THEN** the workbench shows progress to `READY`, allows a query, and displays the returned citation and page information

#### Scenario: User sees parser unavailable

- **WHEN** a user selects a PDF while Docling is unavailable
- **THEN** the workbench shows the parser capability/error state and does not display the source as ready knowledge
