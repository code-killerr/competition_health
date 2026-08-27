# @deepseek-ai/dsh-experimental-lab-knowledge-local
English | [中文](README.zh.md)

Provider-owned local knowledge store for the first-round prototype. It keeps immutable source bytes and document metadata in SQLite, indexes text blocks with FTS5, returns versioned citations, and rebuilds the derived index.

The first increment accepts text-like files and CSV/TSV bytes. Delimited inputs preserve every non-blank row with stable column metadata, including quoted fields. PDF input is parsed by the opt-in local `DoclingAdapter`; without that adapter it remains a failed import and is never converted into guessed text.

## Local Docling PDF ingestion

The adapter runs a trusted Python runner through the Harness subprocess service. It does not call a remote PDF service and does not accept executable paths or shell arguments from browser or Agent input. The first-round deployment uses Python 3.13.x; configure the experimental `lab-mvp` bundle with `docling: {}` to use the packaged runner, or provide a deployment-owned `pythonCommand` and `runnerPath` for a Python 3.13 virtual environment. The environment must install `docling` separately; this TypeScript package does not bundle Python or Docling.

From the repository root, set the configured proxy and run `pnpm run docling:setup`. The command creates `.venv`, verifies Python 3.13.x, and installs the packaged `runtime/requirements.txt`. Then export `DOCLING_PYTHON="$PWD/.venv/bin/python"`, start the laboratory bundle, and run `pnpm run docling:smoke` to parse the first available local PDF fixture through the real adapter. The first Docling conversion can download model assets and initialize CPU models; the Adapter default timeout is 10 minutes and can be overridden by trusted deployment config, so keep the same proxy variables for the smoke run.

The packaged first-round runner uses Docling's fast text-layer path: it supports text PDFs, headings, and paragraphs without starting OCR or table-structure models. The Adapter protocol already accepts validated basic table rows for a later pipeline profile. It preserves the original PDF bytes and feeds page/block locations into the existing SQLite/FTS5 and citation flow. OCR-only PDFs return `DOCLING_NO_TEXT`; OCR, coordinate highlighting, table recovery, and model-based enrichment remain deferred. Parser failures expose stable `errorCode` values such as `PDF_INPUT_INVALID`, `DOCLING_RUNTIME_UNAVAILABLE`, `DOCLING_TIMEOUT`, `DOCLING_PROCESS_FAILED`, and `DOCLING_OUTPUT_INVALID` in the import status.

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
