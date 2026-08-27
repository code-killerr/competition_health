## 1. Docling runtime contract and configuration

- [x] 1.1 Define trusted Docling runner configuration, capability status and stable parser error types without exposing executable arguments to browser or Agent inputs.
- [x] 1.2 Define the Host-to-Docling subprocess request/response contract for an input PDF and versioned JSON output, including bounded stdout/stderr handling.
- [x] 1.3 Add import-time capability detection for the configured Python/Docling runner, supported PDF input and actionable unavailable states.

## 2. Local Docling Adapter

- [x] 2.1 Implement the local Docling Adapter behind the existing `DocumentParser` interface using the Host subprocess seam; defer sandbox policy tuning.
- [x] 2.2 Write the PDF bytes to an isolated temporary input, invoke only configured runner arguments and remove temporary process artifacts after completion.
- [x] 2.3 Validate and parse Docling JSON output, rejecting malformed or empty output with a classified parser error.
- [x] 2.4 Convert Docling headings, paragraphs and basic validated tables into `ParsedDocumentBlock` records with page, title path and stable locations.
- [x] 2.5 Map unavailable runtime, invalid PDF, timeout, non-zero process exit, no-text PDF and invalid-output cases to visible import failures without silent text fallback.

## 3. Knowledge and Web composition

- [x] 3.1 Add the Docling Adapter configuration to the opt-in laboratory bundle and inject it into `lab-knowledge-local` without changing the default Web profile.
- [x] 3.2 Preserve the existing immutable source, content-hash deduplication, import lifecycle, SQLite/FTS5 indexing and citation projection for Docling-produced blocks.
- [x] 3.3 Extend the typed Knowledge Facade response with actionable PDF parse status and stable parser error codes while keeping the current file-byte transport.
- [x] 3.4 Verify the browser workbench can upload a PDF, display parsing progress/failure, search a ready PDF and show page/title citations without Provider imports.

## 4. Verification

- [x] 4.1 Add adapter tests using a deterministic fake subprocess for valid text, headings, basic tables, malformed output, timeout, non-zero exit and empty content.
- [x] 4.2 Add Provider tests proving Docling-produced blocks are indexed, content-hash reimports are idempotent and parser failures do not create confirmed searchable content.
- [x] 4.3 Add an environment-gated smoke using a real PDF fixture and the locally available Docling runtime; when the runtime is unavailable, verify the explicit capability failure path.
- [x] 4.4 Add Web/Facade tests for capability status, PDF import lifecycle, retryable/non-retryable error responses and citation projection.
- [x] 4.5 Run the focused tests, related package typecheck and OpenSpec validation; record any unrelated repository-wide gate failure separately.

## 5. Documentation and handoff

- [x] 5.1 Document the supported PDF scope, Python/Docling setup, trusted configuration, no-OCR limitation and failure recovery in English and Chinese package documentation.
- [x] 5.2 Record the selected Docling/Python runtime versions, smoke command and deferred production features in the change handoff note.

## 6. Runnable local runtime

- [x] 6.1 Add a project-local Python 3.13 virtual-environment setup command that installs the packaged Docling requirements through the configured proxy.
- [x] 6.2 Add a one-command real-runtime smoke entry that selects the project interpreter and exercises the existing Adapter against a local PDF fixture.
