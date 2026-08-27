## 1. MVP domain and Provider contract

- [x] 1.1 Add branded SOP draft/step identifiers, draft status, cited step fields and publication result types to the experimental lab domain; verify the domain typecheck and existing lifecycle tests pass.
- [x] 1.2 Extend the Knowledge Service/Provider interface with draft creation, inspection, update and publication methods while keeping existing import/search/confirm methods source-compatible; verify the Knowledge package typecheck passes.
- [x] 1.3 Extend search results and import status DTOs with MVP provenance/error fields needed by the workbench; verify existing tool and Web protocol tests still compile.

## 2. SQLite source and SOP persistence

- [x] 2.1 Add compact Provider-owned SQLite tables for SOP drafts and steps with citation/source-version references and status; verify a fresh `:memory:` database creates and reads the records.
- [x] 2.2 Implement cited draft creation and inspection, rejecting unknown citations and preserving source/version identities; verify focused Provider tests cover valid and invalid citations.
- [x] 2.3 Implement draft update and publication validation for required fields, cited blocks and draft status; verify incomplete publication is rejected and complete publication is idempotent.
- [x] 2.4 Project published SOP steps into confirmed FTS5 retrieval with explicit published provenance; verify a published step is searchable and an unpublished step is excluded from confirmed search.

## 3. Web command and workbench loop

- [x] 3.1 Add typed `/api/lab` commands and parser validation for SOP draft creation, update, inspection and publication; verify protocol tests reject malformed IDs, empty fields and unknown command payloads.
- [x] 3.2 Extend the Web Facade dispatch and snapshot projection for SOP records and publication results; verify the Facade tests complete the import/search/draft/publish sequence without accessing Provider internals.
- [x] 3.3 Replace text-only Knowledge import with browser file-byte selection for PDF, CSV, TSV and text while retaining the existing base64 command transport; verify the browser API test sends file bytes and surfaces import errors.
- [x] 3.4 Extend the opt-in workbench Knowledge stage with import status, citation search, draft editing and publish controls; verify the component test renders the complete MVP loop and blocks publication when required fields are missing.

## 4. Focused verification and handoff

- [x] 4.1 Add Provider tests for content-hash deduplication, configured PDF parser citations, parser-unavailable failure, FTS5-only retrieval and SOP publication gating; verify the focused Knowledge test suite passes.
- [x] 4.2 Add a composed keyless test using one real PDF fixture with the deterministic parser, then publish a cited SOP and retrieve its published step; verify the test does not require a model key or network.
- [ ] 4.3 Run the MVP package tests, typecheck and OpenSpec validation; verify no production `pdf-knowledge-parser` artifacts or unrelated packages are modified.

