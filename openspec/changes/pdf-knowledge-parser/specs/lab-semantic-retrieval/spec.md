## ADDED Requirements

### Requirement: Optional embedding retrieval SHALL be configured through a trusted Host adapter

The Knowledge Host SHALL support an optional Embedding Adapter with explicit endpoint/provider, model identity, credential reference, vector dimension and timeout/retry policy. Adapter credentials and endpoints SHALL be resolved from trusted Host configuration or credential references such as the existing `.env` layer; browser code and persisted Session messages SHALL never contain embedding secrets.

#### Scenario: Embedding adapter is configured

- **WHEN** the Host starts with a valid embedding adapter configuration
- **THEN** the Knowledge Provider reports the configured provider/model status and can generate vectors for new or rebuilt source blocks

#### Scenario: Embedding adapter is absent

- **WHEN** no embedding adapter is configured
- **THEN** the Knowledge Provider remains available in explicit FTS5-only mode and reports that semantic retrieval is unavailable

#### Scenario: Embedding credentials are invalid

- **WHEN** an embedding request fails because the configured credential or endpoint is invalid
- **THEN** the derived embedding projection is marked failed with a stable reason and the system does not call the chat model as an implicit substitute

### Requirement: Retrieval SHALL combine keyword and optional embedding evidence

When embeddings are available, the Knowledge Provider SHALL combine normalized SQLite FTS5 keyword scores and embedding similarity scores, apply document/version/project confirmation and conflict filters before ranking, and return stable citation-bearing results. When embeddings are unavailable, the same request SHALL return deterministic FTS5 results with an explicit retrieval mode.

#### Scenario: Hybrid retrieval finds semantic evidence

- **WHEN** a query has no exact keyword match but its embedding is similar to an indexed confirmed block
- **THEN** the result includes that block with a positive score, citation and retrieval mode indicating embedding or hybrid evidence

#### Scenario: Hybrid retrieval finds keyword and vector evidence

- **WHEN** a query matches both FTS5 and an embedding vector
- **THEN** the result score reflects the configured weights and the result remains traceable to its source block

#### Scenario: FTS5-only fallback

- **WHEN** the adapter is absent or a non-confirmed derived vector index is unavailable
- **THEN** the query returns deterministic FTS5 results or an explicit no-match result without inventing semantic matches

### Requirement: Derived vector indexes SHALL be rebuildable

Embedding rows SHALL be treated as derived data linked to immutable source versions. The Provider SHALL record enough provider/model metadata to detect incompatible vectors, support index rebuild from preserved source bytes/blocks, and avoid mixing vectors from different dimensions or model identities in one active index.

#### Scenario: Rebuilding after model change

- **WHEN** the configured embedding model or dimension changes
- **THEN** the Provider marks the old derived index stale, rebuilds it from source blocks and exposes the rebuild status

#### Scenario: Source re-import after embedding failure

- **WHEN** an embedding call fails for one source version
- **THEN** source bytes and keyword indexing remain recoverable, the vector failure is queryable and a rebuild can retry without re-uploading the source

### Requirement: Retrieval configuration SHALL not introduce a mandatory remote vector database

The first implementation SHALL use the existing local SQLite/FTS5 database and an optional local vector projection. A remote vector database SHALL not be required for the opt-in prototype or its keyless tests.

#### Scenario: Keyless development composition

- **WHEN** the prototype is started without an embedding key
- **THEN** file import, FTS5 retrieval and citation display remain testable without network calls or model charges
