# Agent Note: The Knowledge MVP keeps PDF parsing behind a configured parser

Status: implemented

English | [中文](2026-08-27-knowledge-mvp-parser-seam.zh.md)

## Problem

The first Knowledge slice must prove that real laboratory sources can become cited, reviewable SOP steps without making production PDF parsing, OCR, embeddings, or a native workspace prerequisites for the demo.

## Decision

The MVP extends the existing `lab-knowledge-local` Provider, `lab-mvp-web` protocol, and opt-in `ui-lab-workbench` overlay. PDF bytes use the configured `DocumentParser` seam; CSV, TSV, and text keep the local parser path. SQLite stores source blocks and compact SOP drafts, FTS5 returns deterministic citations, and publication projects reviewed SOP steps into confirmed retrieval with explicit `SOP_PUBLISHED` provenance.

The first slice reports parser-unavailable and empty-input failures instead of claiming that a PDF is ready. SOP drafts keep source-version identities, required fields, missing-field blockers, and review status. Only a reviewed, fully cited draft can be published; published steps are immutable in this MVP.

## Alternatives considered

**Bundling Docling into the first slice.** This would make the demo depend on a new runtime and deployment path before the import-to-SOP workflow is validated. The configured parser seam keeps that runtime decision explicit for the production change.

**Calling `pdftotext` as a fallback.** A host command would create undeclared behavior and lose the structured page, title, and block citation data required by the Knowledge workflow. Parser absence therefore remains an actionable failure.

**Building the Harness-native workspace first.** The existing overlay and typed `/api/lab` path already exercise the required user journey. The native workspace can consume the same Provider methods after the MVP proves the workflow.

## Consequences

The demo can run keylessly with deterministic PDF fixture bytes and a fixture parser, while a clean deployment without a PDF adapter fails visibly. FTS5 is the first retrieval baseline; optional embedding and hybrid-ranking work remain outside this slice. The compact SOP record is suitable for the prototype but does not provide revision history or full audit records. The source-version references and explicit provenance leave a clear extension point for stale-projection handling and production review history.

