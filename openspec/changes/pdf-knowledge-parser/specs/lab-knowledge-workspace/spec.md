## ADDED Requirements

### Requirement: The Knowledge workspace SHALL accept versioned source files

The browser Knowledge workspace SHALL allow a user to select one or more supported PDF, CSV, TSV or text files, submit their bytes and metadata through the typed Web Consumer, and display an immutable document/version identity. The workspace SHALL not require users to paste file contents into a textarea for normal ingestion.

#### Scenario: Importing a supported file

- **WHEN** a user selects a supported file and submits it with optional metadata
- **THEN** the Host records the original bytes by content identity, returns the document/version identity and displays the import status

#### Scenario: Re-importing identical bytes

- **WHEN** a user submits the same file bytes and name again
- **THEN** the Knowledge Provider returns the existing document version without creating duplicate source blocks

#### Scenario: Unsupported or oversized file

- **WHEN** a user submits a file outside the configured type or size policy
- **THEN** the browser rejects it before submission or displays a stable import error without writing a partial document version

### Requirement: The workspace SHALL expose parser and indexing lifecycle states

The workspace SHALL display queued, parsing, indexing, ready, OCR-required and failed states returned by the Knowledge Service. A failure SHALL include a stable reason suitable for retry or manual correction and SHALL not be shown as confirmed planning knowledge.

#### Scenario: PDF parser unavailable

- **WHEN** a PDF is submitted before the production PDF Parser is configured
- **THEN** the source remains stored with an explicit parser-unavailable failure and the UI offers status/error information rather than claiming successful retrieval

#### Scenario: Scanned PDF requires OCR

- **WHEN** the parser identifies a PDF with no reliable text layer
- **THEN** the version is marked OCR-required, remains non-confirmed and is excluded from confirmed planning retrieval

#### Scenario: Retrying a failed import

- **WHEN** a user requests a retry for a failed or OCR-required version after the required parser capability is available
- **THEN** parsing and derived indexing restart from the immutable original bytes without changing the source identity

### Requirement: Retrieval results SHALL retain source provenance

The workspace SHALL display search results with citation identity, document/version identity, page or block location, excerpt or artifact reference, provenance type, confirmation/conflict state and retrieval score. The workspace SHALL display open conflicts separately and SHALL not collapse conflicting facts into one unmarked value.

#### Scenario: Searching imported knowledge

- **WHEN** a user enters a query with optional project scope and confirmation filters
- **THEN** the workspace displays ranked citation-bearing results and an explicit empty state when no evidence matches

#### Scenario: Viewing a PDF-derived SOP

- **WHEN** a published SOP step is returned by retrieval
- **THEN** the result displays the SOP revision and links it back to the originating PDF version and page/block citations

#### Scenario: Open conflict is returned

- **WHEN** a citation belongs to an open knowledge conflict
- **THEN** the result is visibly marked conflicted and the planning context does not present it as confirmed evidence

### Requirement: Human completion and publication SHALL remain explicit

The workspace SHALL expose missing fields, assumptions, citations, conflicts and revision status for PDF-derived SOP drafts. It SHALL allow an authorized human to submit a new revision, validate it and publish it only through the existing Knowledge/Approval/Session flow. Draft or rejected revisions SHALL not be presented as confirmed planning knowledge.

#### Scenario: Completing a draft field

- **WHEN** a user fills a missing SOP field and supplies a valid citation or explicitly records an approved assumption
- **THEN** the system creates a new immutable revision and displays its updated completion state

#### Scenario: Publishing incomplete content

- **WHEN** a user attempts to publish a revision with missing required fields, invalid citations or open conflicts
- **THEN** publication is rejected with field-level blocking reasons and the revision remains non-confirmed

### Requirement: The Knowledge line SHALL publish a stable parallel-development contract

The Knowledge implementation SHALL publish a versioned typed Service/Facade contract and a stable workspace contribution identity. The contract SHALL expose capability status, immutable source/version identities, parser/index state, citation-bearing retrieval, conflict state, SOP revision/publication state and retryable errors. Source, version, citation and SOP identifiers SHALL be opaque to project and conversation consumers.

#### Scenario: Harness workspace consumes Knowledge capability

- **WHEN** the Harness workspace requests Knowledge capability status and receives a compatible version
- **THEN** it can mount the Knowledge workspace, associate returned source/version IDs with a project and pass those IDs as retrieval scope without importing the Provider or ranking implementation

#### Scenario: Knowledge capability is unavailable during parallel development

- **WHEN** the Harness workspace starts before the Knowledge contributor or required contract version is available
- **THEN** it receives an explicit unavailable/incompatible result and renders a bounded unavailable state rather than substituting mock data in production composition
