# @deepseek-ai/dsh-experimental-lab-knowledge

Service Definition for versioned laboratory material ingestion, citation-bearing retrieval, conflict tracking, and human confirmation.

The package intentionally does not choose a parser, database, or embedding implementation. The local Provider now owns configurable parser, SQLite/FTS5, optional embedding, confirmation, and conflict-record choices.

## Model Experience

The future knowledge tools will expose import status, cited evidence, conflicts, and confirmation state. This Service Definition itself adds no tools or prompt text.

### Token impact

Provider and Consumer determine the size of retrieved evidence; citations are required so the Agent can distinguish source facts from assumptions.

### KV-cache impact

Retrieval output should be request-scoped. Durable import and confirmation facts belong in Session events and Provider storage, not in a hidden prompt cache.

## Known Limitations and Deferred Work

- No document fixture is embedded in the package.
