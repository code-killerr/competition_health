# @deepseek-ai/dsh-experimental-lab-knowledge-local
English | [中文](README.zh.md)

Provider-owned local knowledge store for the first-round prototype. It keeps immutable source bytes and document metadata in SQLite, indexes text blocks with FTS5, returns versioned citations, and rebuilds the derived index.

The first increment accepts text-like files and CSV/TSV bytes. Delimited inputs preserve every non-blank row with stable column metadata, including quoted fields. PDF input is retained as a failed import when no configured parser is available; it is never converted into guessed text.

## Model Experience

### Controlled laboratory context

#### What the model sees

The model sees approved plans, controlled run states, and bounded observations through the package typed service or `lab_*` tools.

#### Token effect

Only requested plan fields, current-step status, and bounded evidence are returned; local storage details remain host-side.

#### KV Cache effect

Stable experiment, plan, Skill revision, and run identifiers keep repeated step results compact and prefix-friendly.

## Known Limitations and Deferred Work

- This experimental package provides local typed contracts and does not claim production persistence, recovery, or hardware integration.
- The SQLite API is synchronous after opening and is intended for the local prototype.
