## Purpose

为实验自动化原型提供一条可演示、可检索、可人工确认的知识闭环，先验证真实资料能否支撑后续 SOP 和计划生成，再把生产级治理能力留给后续变更。

## ADDED Requirements

### Requirement: The MVP SHALL ingest supported source bytes by content identity

The Knowledge Service SHALL accept PDF, CSV, TSV and text bytes with a display name, preserve the source identity by content hash, and return an import status. Re-importing identical bytes SHALL reuse the existing source version. Browser imports SHALL use bytes rather than arbitrary local paths.

#### Scenario: Importing a supported source

- **WHEN** a user submits a supported PDF, CSV, TSV or text file
- **THEN** the service returns a document/version identity and an observable `QUEUED`, `PARSING`, `READY` or `FAILED` status

#### Scenario: Re-importing identical bytes

- **WHEN** the same bytes are submitted again with a different display name
- **THEN** the service returns the existing version and does not duplicate its searchable blocks

### Requirement: The MVP SHALL expose parser-dependent blocks and explicit failure

The service SHALL parse CSV, TSV and text through the existing local parser path and SHALL use a configured PDF parser when one is available. Parsed blocks SHALL retain a stable location, source version, page when available and title path when available. A missing or failing PDF parser SHALL produce a visible failure and SHALL not publish searchable confirmed content.

#### Scenario: Parsing a PDF with a configured parser

- **WHEN** a valid PDF is submitted and the configured parser returns non-empty blocks
- **THEN** the version becomes `READY` and search results expose the parser-provided page, location and title path

#### Scenario: PDF parser unavailable

- **WHEN** a PDF is submitted without an available parser
- **THEN** the version becomes `FAILED` with an actionable parser error and no confirmed retrieval result

#### Scenario: Empty or malformed input

- **WHEN** parsing returns no usable blocks or a delimited file is malformed
- **THEN** the version becomes `FAILED` and the stored error is visible through import status

### Requirement: The MVP SHALL provide deterministic FTS5 retrieval with citations

The Knowledge Service SHALL provide keyword retrieval over ready source blocks using SQLite FTS5. Each result SHALL include citation identity, document/version identity, location, excerpt, confirmation state and score. Confirmed retrieval SHALL exclude unconfirmed or conflicted source blocks and SHALL return an explicit empty result when no evidence matches.

#### Scenario: Searching imported knowledge

- **WHEN** a user searches for a term within imported sources
- **THEN** the service returns deterministic ranked results with source and block citations

#### Scenario: Searching only confirmed knowledge

- **WHEN** a planning consumer requests confirmed results
- **THEN** the service excludes unconfirmed or conflicted blocks and returns only eligible evidence

### Requirement: The MVP SHALL gate SOP publication on human confirmation

The service SHALL represent an SOP draft with cited source blocks, steps, missing fields and review status. A draft SHALL support human edits and SHALL enter planning retrieval only after explicit publication. Incomplete or rejected drafts SHALL remain excluded from confirmed retrieval.

#### Scenario: Creating a cited SOP draft

- **WHEN** a user creates a draft from one or more search citations
- **THEN** the service stores the draft steps and preserves the cited source/version identities

#### Scenario: Publishing a completed draft

- **WHEN** a human reviewer completes required fields and publishes the draft
- **THEN** the draft becomes published and its steps are returned as confirmed knowledge with links to the original citations

#### Scenario: Publishing an incomplete draft

- **WHEN** a reviewer attempts to publish a draft with missing required fields or unknown citations
- **THEN** publication is rejected with a blocking reason and the draft remains non-confirmed

### Requirement: The MVP Web Consumer SHALL expose the complete knowledge loop

The opt-in laboratory Web Consumer SHALL allow file-byte import, import status inspection, FTS5 query, citation display, SOP draft creation, human completion and publication through typed commands. The first version MAY use the existing laboratory overlay; it SHALL not require the Harness-native project workspace or Agent conversation to exercise the loop.

#### Scenario: Completing the loop in the workbench

- **WHEN** a user uploads a supported file, searches its content, creates a cited SOP draft, edits it and publishes it
- **THEN** the workbench shows each status transition and a subsequent confirmed search can retrieve the published SOP step

#### Scenario: Parser failure in the workbench

- **WHEN** the workbench imports a PDF while its parser is unavailable
- **THEN** it shows the failure status and retry/error information instead of displaying the PDF as ready knowledge
