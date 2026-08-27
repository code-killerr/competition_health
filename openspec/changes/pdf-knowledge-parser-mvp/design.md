## Context

The existing `lab-knowledge-local` Provider already owns SQLite, FTS5, content-hash source versions, CSV/TSV/text parsing, citations, conflicts and optional embeddings. `lab-mvp-web` exposes a typed `/api/lab` command path, and `ui-lab-workbench` already renders knowledge import and search stages. The repository does not currently provide a Docling runtime, so the MVP must keep PDF parsing behind the existing configured `DocumentParser` seam and report capability failure rather than silently claiming production parsing.

## Goals / Non-Goals

**Goals:**

- Deliver one vertical slice from source bytes to a published, citation-bearing SOP result.
- Reuse the current Provider, Web Facade and overlay instead of creating a second Knowledge stack.
- Keep source citations and the published/unpublished gate explicit enough for later planning integration.
- Keep the first implementation keyless and testable with the existing real-PDF fixture bytes and deterministic parser fixtures.

**Non-Goals:**

- No production Docling packaging, OCR, coordinate rendering or complex table recovery.
- No Embedding Adapter, vector projection or hybrid ranking in this change.
- No immutable multi-revision SOP history, full conflict-resolution workflow or Approval/Session audit integration.
- No Harness-native Knowledge workspace, global navigation, project persistence or Agent conversation replacement.

## Decisions

### 1. Keep the existing Provider and Web command path

The MVP extends `KnowledgeService`, `LocalKnowledgeProvider` and the existing `/api/lab` protocol. This keeps the opt-in `examples/lab-web` composition runnable and avoids a parallel database or facade. A dedicated protocol split is deferred until the Native Workspace line consumes a stable contract.

**Alternative considered:** create a new Knowledge Web package immediately. Rejected for the MVP because it would add composition and contract work before the user-visible loop is proven.

### 2. Use a compact SOP record with a publication gate

SOP drafts and steps are stored as Provider-owned records containing cited block IDs, editable fields, missing-field markers and status. Publication validates citation existence and required fields, then projects published steps into confirmed retrieval. The record is intentionally simpler than the later immutable revision model.

**Alternative considered:** reuse experimental plan or Skill records as SOP storage. Rejected because a knowledge draft is curated evidence, not an executable plan or Skill.

### 3. Keep PDF capability explicit

The Provider invokes only the configured `DocumentParser` for PDF input. The MVP does not install an undeclared system command or a hand-written PDF parser. Existing deterministic PDF fixture parsers prove byte identity, citations and persistence; a live PDF import without a configured parser remains a visible failed state until the production Docling change supplies the adapter.

**Alternative considered:** silently use `pdftotext` or a new ad-hoc parser. Rejected because it would make the prototype appear ready while hiding the missing runtime capability and would create a migration dead end.

### 4. Use existing FTS5 as the first retrieval mode

The MVP keeps the current FTS5 ranking and extends results with provenance for published SOP steps. Embedding configuration and hybrid score contracts remain in the existing production change. This gives deterministic offline tests and a clear baseline for later comparison.

### 5. Extend the existing overlay rather than wait for Native Workspace

The workbench gets byte-file selection, status/error rendering, citation search and a small SOP review panel. The current overlay remains opt-in and is not promoted to the default Web profile. The later `lab-harness-native-workspace` change can consume the same service methods without owning their implementation.

## Risks / Trade-offs

- [The MVP cannot parse PDFs in a clean checkout without a configured parser] → Show `FAILED` with parser-unavailable status and keep deterministic real-PDF fixture coverage; production Docling remains the next change.
- [A compact SOP record is not a durable collaboration history] → Preserve source citations and status now, and keep the original production change responsible for immutable revisions and audit records.
- [The overlay is not the final Harness-native workspace] → Keep browser access behind typed Web commands so the later contributor can replace only the presentation.
- [Published SOP projections can become stale after source changes] → Tie published steps to source version and reject unknown citations; full stale-projection detection remains deferred.

## Migration Plan

1. Add MVP SOP types and Provider methods while retaining existing import/search/confirm behavior.
2. Add compact SQLite tables and FTS5 projection for published SOP steps.
3. Add typed Web commands and extend the opt-in workbench with file import and review controls.
4. Add keyless tests for source deduplication, parser failure, cited retrieval, SOP publication gating and the composed real-PDF fixture flow.
5. Roll back by removing the MVP bundle commands/UI; existing CSV/text import, source blocks and the separate production change remain intact.
