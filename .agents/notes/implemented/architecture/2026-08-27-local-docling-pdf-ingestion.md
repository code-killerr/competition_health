# Agent Note: Local Docling PDF ingestion

Status: implemented

English | [中文](2026-08-27-local-docling-pdf-ingestion.zh.md)

## Problem

The laboratory Knowledge Provider already owns immutable source bytes, SQLite/FTS5 indexing, citations, and SOP draft data, but the default experimental composition has no production PDF parser. Treating PDF bytes as ordinary text would produce untrustworthy knowledge and citations.

## Decision

The first PDF ingestion path uses a local Docling Python runner behind the existing `DocumentParser` interface. The Node Host writes the submitted bytes to a permission-restricted temporary directory, invokes a configured Python command with direct argv through the Harness subprocess service, validates a versioned JSON protocol, and removes the temporary directory after the run. Browser and Agent inputs cannot select executable paths or shell arguments.

The packaged runner uses Docling's fast text-layer path and emits text headings and paragraphs without OCR or table-structure model startup. The adapter also accepts validated basic table rows from a later pipeline profile, converting them to the existing `ParsedDocumentBlock` vocabulary with stable locations, page numbers, title paths, and table headers/row numbers. The Provider keeps the original bytes, content-hash identity, import lifecycle, SQLite/FTS5 index, citation projection, and exposes parser error codes through import status. Invalid input, unavailable runtime, timeout, process failure, malformed output, and no-text output fail explicitly; PDF bytes never silently fall back to text decoding.

The Docling runtime is opt-in in `lab-mvp` through `docling: {}`. Python and Docling remain deployment dependencies rather than npm-bundled dependencies. OCR-only documents, coordinate-aware review, complex table recovery, and sandbox policy tuning are deferred until a later production change.

## Alternatives considered

**Remote PDF parsing service** — rejected because the first round must keep document bytes and parsing local, without introducing network data handling or a paid service dependency.

**Direct PDF parsing in Node or `pdftotext`** — rejected because it does not provide the planned document structure and would create a second parser contract outside Docling.

**LLM-only PDF extraction** — rejected for the ingestion foundation because model output is less deterministic, adds per-document cost, and cannot replace a stable page/block source for citations and human confirmation.

**Treat PDF bytes as text when Docling is unavailable** — rejected because binary data would become searchable as if it were verified document content.

## Consequences

The repository now has a usable local PDF ingestion path when a deployment supplies Python 3.13.x and Docling, plus a deterministic unavailable-runtime path when it does not. The project setup command installs Docling 2.123.0 and SOCKS-capable httpx into `.venv`; the real-runtime smoke is available through `pnpm run docling:smoke` with `DOCLING_PYTHON` selected automatically. The Adapter default timeout is 10 minutes because the first local CPU model initialization can be slow, and remains deployment-configurable. The JSON adapter protocol is intentionally narrow; future coordinate, OCR, warning, parser-version persistence, table-model and richer review data can be added without changing the existing Knowledge Provider boundary.
