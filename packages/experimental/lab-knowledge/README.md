# @deepseek-ai/dsh-experimental-lab-knowledge
English | [中文](README.zh.md)

Service Definition for versioned laboratory material ingestion, citation-bearing retrieval, conflict tracking, and human confirmation.

The package intentionally does not choose a parser, database, or embedding implementation. The local Provider now owns configurable parser, SQLite/FTS5, optional embedding, confirmation, and conflict-record choices.

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
- No document fixture is embedded in the package.
