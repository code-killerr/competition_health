## MODIFIED Requirements

### Requirement: The system SHALL ingest versioned laboratory source material

The Knowledge Service SHALL accept configured CSV, PDF and other supported document inputs, preserve the original bytes by content identity, record a document version and expose parsing and indexing status. PDF imports SHALL record parser metadata and distinguish source evidence from derived SOP content. A failed parser or indexer SHALL produce a queryable failure status instead of silently publishing incomplete text.

#### Scenario: Importing a supported document

- **WHEN** a user submits a supported document with metadata
- **THEN** the service records its content identity, version, source metadata and processing status, and returns an import identifier

#### Scenario: Importing a PDF source

- **WHEN** a user submits a PDF source
- **THEN** the service preserves the original bytes, records page/block provenance for extracted content and keeps derived SOP status separate from the source document status

#### Scenario: Parsing fails

- **WHEN** the configured parser cannot read a submitted document
- **THEN** the import remains non-published, exposes the failure reason and does not return the document as confirmed knowledge

### Requirement: The system SHALL provide citation-bearing hybrid retrieval

The Knowledge Service SHALL combine structured filters with keyword and optional embedding retrieval. Every returned item SHALL include the document version, block or page location, source text or artifact reference, confirmation status, provenance type and retrieval score. Retrieval SHALL not depend on a fixed experiment name or hardcoded fixture. A confirmed planning query SHALL return only confirmed facts or published SOP projections and SHALL retain links back to the originating PDF citations.

#### Scenario: Retrieving relevant knowledge

- **WHEN** an Agent submits an experiment request and retrieval constraints
- **THEN** the service returns ranked evidence that satisfies the constraints and includes enough citation data to reconstruct the source

#### Scenario: Retrieving a published SOP step

- **WHEN** a confirmed planning query matches a published SOP step derived from a PDF
- **THEN** the result identifies the SOP revision and the originating PDF page/block citations, and marks the result as confirmed

#### Scenario: No evidence meets the constraints

- **WHEN** the query has no usable confirmed evidence
- **THEN** the service returns an explicit no-match or insufficient-evidence result and does not invent a protocol fact

### Requirement: The system SHALL keep authoritative knowledge separate from rebuildable projections

The Provider SHALL treat original source bytes, human SOP revisions and publication decisions as authoritative records. Parsed blocks, FTS5 rows, embedding vectors and retrieval projections SHALL be rebuildable records linked to their source version, parse run and projection version. Rebuilding or replacing a projection SHALL not modify source bytes or human revision history.

#### Scenario: Rebuilding search indexes

- **WHEN** an operator rebuilds FTS5 or optional embeddings for a PDF source
- **THEN** the rebuilt results retain the source version, parse run, block citations and confirmation/provenance status, while the source and SOP revisions remain unchanged

#### Scenario: Searching failed or stale projections

- **WHEN** a source version has a failed parse, incomplete index or stale projection
- **THEN** the service excludes it from confirmed planning retrieval and returns the processing state or an insufficient-evidence result rather than silently using partial data
