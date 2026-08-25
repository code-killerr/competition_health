## ADDED Requirements

### Requirement: The system SHALL ingest versioned laboratory source material

The Knowledge Service SHALL accept configured CSV, PDF and other supported document inputs, preserve the original bytes by content identity, record a document version and expose parsing and indexing status. A failed parser or indexer SHALL produce a queryable failure status instead of silently publishing incomplete text.

#### Scenario: Importing a supported document

- **WHEN** a user submits a supported document with metadata
- **THEN** the service records its content identity, version, source metadata and processing status, and returns an import identifier

#### Scenario: Parsing fails

- **WHEN** the configured parser cannot read a submitted document
- **THEN** the import remains non-published, exposes the failure reason and does not return the document as confirmed knowledge

### Requirement: The system SHALL provide citation-bearing hybrid retrieval

The Knowledge Service SHALL combine structured filters with keyword and optional embedding retrieval. Every returned item SHALL include the document version, block or page location, source text or artifact reference, confirmation status and retrieval score. Retrieval SHALL not depend on a fixed experiment name or hardcoded fixture.

#### Scenario: Retrieving relevant knowledge

- **WHEN** an Agent submits an experiment request and retrieval constraints
- **THEN** the service returns ranked evidence that satisfies the constraints and includes enough citation data to reconstruct the source

#### Scenario: No evidence meets the constraints

- **WHEN** the query has no usable confirmed evidence
- **THEN** the service returns an explicit no-match or insufficient-evidence result and does not invent a protocol fact

### Requirement: The system SHALL track conflicts and human confirmation

The Knowledge Service SHALL represent contradictory facts, unresolved assumptions and human confirmations separately. A fact with unresolved conflict or required human confirmation SHALL be marked as such in retrieval results and SHALL remain distinguishable from confirmed knowledge.

#### Scenario: Conflicting source facts are found

- **WHEN** two source versions provide incompatible values for the same normalized fact
- **THEN** the service records a conflict with both citations and prevents the conflicting fact from being treated as confirmed

#### Scenario: A user confirms a fact

- **WHEN** an authorized user confirms a fact with a cited source and decision metadata
- **THEN** the service records the confirmation and subsequent retrieval marks that fact with its confirmed status and citation

### Requirement: The system SHALL keep indexes and experiment projections rebuildable

Keyword indexes, embedding indexes and current experiment knowledge projections SHALL be derived data. Rebuilding them from immutable source material, metadata, session events and authoritative domain records SHALL produce an equivalent searchable result without requiring hardcoded demo fixtures.

#### Scenario: Rebuilding a derived index

- **WHEN** the provider deletes and rebuilds its keyword or embedding index
- **THEN** previously imported source versions and confirmed facts remain available and retrieval can return equivalent citations

