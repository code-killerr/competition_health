# @deepseek-ai/dsh-experimental-lab-knowledge-local

Provider-owned local knowledge store for the first-round prototype. It keeps immutable source bytes and document metadata in SQLite, indexes text blocks with FTS5, returns versioned citations, and rebuilds the derived index.

The first increment accepts text-like files and CSV bytes. PDF input is retained as a failed import when no configured parser is available; it is never converted into guessed text.

## Model Experience

The Provider itself does not add tools or prompts. The Knowledge Consumer receives bounded excerpts with document version, location, confirmation state, and score.

### Token impact

Search results are bounded by the request limit and include citations required for plan review.

### KV-cache impact

FTS and optional embedding indexes are rebuildable provider data. They are not model context or a second source of experiment truth.

## Known Limitations and Deferred Work

- EmbeddingAdapter is optional; when configured, vectors are persisted in a rebuildable SQLite table and combined with FTS5 scores using configured weights.
- DocumentParser is optional; it can provide PDF/page/table blocks, while unsupported PDF input remains an explicit failed import.
- The SQLite API is synchronous after opening and is intended for the local prototype.
