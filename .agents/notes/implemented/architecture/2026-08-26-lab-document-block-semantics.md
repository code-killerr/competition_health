# Agent Note: Knowledge blocks preserve table row semantics

Status: implemented

English | [中文](2026-08-26-lab-document-block-semantics.zh.md)

## Problem

Knowledge retrieval must preserve enough document structure for a citation to identify a table row or a page block. Treating CSV rows as opaque lines loses column context, while assuming that every first row is a header drops valid headerless data. PDF extraction also needs to remain an explicit provider choice rather than an implicit text fallback.

## Decision

`ParsedDocumentBlock` carries `kind`, `page`, `titlePath`, `tableHeaders`, and `tableRow`. `LocalKnowledgeProvider` persists the table fields with each block and returns them in `KnowledgeSearchResult`. Built-in CSV and TSV parsing keeps every non-blank row, assigns stable `columnN` headers, formats column/value pairs for FTS, and handles quoted delimiters and newlines. Malformed quoted fields fail the import before publication. A configured `DocumentParser` remains responsible for PDF text, page, title, and real table extraction; a PDF without that parser remains an explicit failed import.

## Alternatives considered

**Treat delimited rows as plain text.** This loses column identity in citations and makes table results indistinguishable from prose, so normalized table metadata is retained.

**Always consume the first row as headers.** Headerless CSV is valid input and existing laboratory data uses it, so the built-in parser keeps all rows and uses stable generated column names.

**Bundle a PDF engine in the local Provider.** This would force a heavy runtime dependency and make parser failures less explicit, so PDF extraction stays behind the configured parser interface.

## Consequences

Table search results expose enough metadata for a consumer to render a row and cite its logical location. External parsers can provide domain-specific headers and page blocks without changing the Provider schema. Consumers must distinguish generated `columnN` headers from headers supplied by a document parser. The local Provider still does not publish extracted PDF text without a configured parser.

## Testing

Focused Provider tests cover quoted CSV fields, quoted newlines, TSV rows, stable table metadata, malformed table failure, persisted page/title fields, and the existing PDF parser failure/success paths. The PDF knowledge-data test imports the local corpus through the configured parser seam and verifies document-scoped retrieval.
