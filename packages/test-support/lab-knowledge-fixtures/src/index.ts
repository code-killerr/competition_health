import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brandId, type KnowledgeSearchResult } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DocumentParser, ParsedDocumentBlock } from '@deepseek-ai/dsh-experimental-lab-knowledge-local'
import type { FakeKnowledgeFixture } from '@deepseek-ai/dsh-experimental-lab-project'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../')

/** Local source directory used by the PDF Knowledge data tests. */
export const PDF_KNOWLEDGE_ROOT = resolve(repositoryRoot, 'docs/change_plan/pdf_knowledge')

/** Space ATAC source used by protocol and flow-confirmation tests. */
export const SPACE_ATAC_CSV = resolve(repositoryRoot, 'docs/change_plan/Agent实验Workflow步骤输入输出与边界条件确认表_细化版 副本 - SeekSpace_空间ATAC.csv')

/** A PDF input and deterministic first-page evidence used by keyless tests. */
export interface PdfKnowledgeFixture {
  readonly fileName: string
  readonly title: string
  readonly searchQuery: string
  readonly evidence: string
}

/** PDF files available in the local Knowledge data directory. */
export const PDF_KNOWLEDGE_FIXTURES: readonly PdfKnowledgeFixture[] = [
  {
    fileName: '013-10 SeekOne® DD 单细胞ATAC-RNA-seq试剂盒使用说明书 20250117.pdf',
    title: 'SeekOne DD 单细胞 ATAC+RNA 双组学试剂盒操作说明书',
    searchQuery: 'SeekOne',
    evidence: 'SeekOne® DD 单细胞 ATAC+RNA 双组学试剂盒操作说明书',
  },
  {
    fileName: 'CG000527_Chromium_FixedRNAProfiling_MultiplexedSamples_UserG.pdf',
    title: 'Chromium Fixed RNA Profiling Reagent Kits for Multiplexed Samples',
    searchQuery: 'Chromium',
    evidence: 'Chromium Fixed RNA Profiling Reagent Kits for Multiplexed Samples',
  },
  {
    fileName: 'CG000632_DemonstratedProtocol_SamplePrep_from__FFPETissueSections_RevD.pdf',
    title: 'Sample Preparation from FFPE Tissue Sections for Chromium Fixed RNA Profiling',
    searchQuery: 'FFPE',
    evidence: 'Sample Preparation from FFPE Tissue Sections for Chromium Fixed RNA Profiling',
  },
  {
    fileName: 'CG000684_VisiumHDFFPETissuePrepHandbook_RevA.pdf',
    title: 'Visium HD Spatial Gene Expression FFPE Tissue Preparation',
    searchQuery: 'Visium',
    evidence: 'The Visium HD Spatial Gene Expression workflow is designed for FFPE tissue samples',
  },
  {
    fileName: 'SeekSpace单细胞空间ATAC转录组使用说明书-20260717.pdf',
    title: 'SeekSpace 单细胞空间 ATAC 转录组试剂盒操作说明书',
    searchQuery: 'ATAC',
    evidence: 'SeekSpace® 单细胞空间 ATAC 转录组试剂盒操作说明书',
  },
  {
    fileName: 'V1.1B-SeekSpace®单细胞空间转录组使用说明书（.pdf',
    title: 'SeekSpace 单细胞空间转录组使用说明书 V1.1B',
    searchQuery: 'SeekSpace',
    evidence: 'SeekSpace® 单细胞空间转录组使用说明书 V1.1B',
  },
]

/** Return the PDF fixtures present in this checkout.
 * @returns PDF fixtures whose source files exist in the checkout.
 */
export function availablePdfKnowledgeFixtures(): readonly PdfKnowledgeFixture[] {
  return PDF_KNOWLEDGE_FIXTURES.filter(fixture => existsSync(resolve(PDF_KNOWLEDGE_ROOT, fixture.fileName)))
}

/** Read one PDF fixture as immutable Knowledge input bytes.
 * @param fixture - Fixture metadata identifying the PDF file.
 * @returns The fixture file bytes.
 */
export async function readPdfKnowledgeFixture(fixture: PdfKnowledgeFixture): Promise<Uint8Array> {
  return await readFile(resolve(PDF_KNOWLEDGE_ROOT, fixture.fileName))
}

/**
 * Provide deterministic structured blocks for real PDF bytes.
 *
 * The parser checks the PDF signature and publishes one reproducible first-page
 * block; production extraction remains configured by the MVP runtime.
 */
/** Create a deterministic parser for the local PDF fixtures.
 * @returns A parser that emits reproducible first-page evidence.
 */
export function createPdfKnowledgeFixtureParser(): DocumentParser {
  return {
    name: 'pdf-knowledge-fixture-parser',
    supports: name => name.toLowerCase().endsWith('.pdf'),
    parse: input => Promise.resolve().then(() => {
      const header = readHeader(input.bytes)
      if (header !== '%PDF-') throw new Error('PDF fixture does not have a PDF signature')
      const fixture = PDF_KNOWLEDGE_FIXTURES.find(item => item.fileName === basename(input.name))
      if (fixture === undefined) throw new Error('unknown PDF knowledge fixture: ' + basename(input.name))
      return [structuredFixtureBlock(fixture)]
    }),
  }
}

/** Create shared public Knowledge records for Harness and Knowledge tests.
 * @returns A capability, READY import, confirmed citation, and published SOP fixture.
 */
export function createKnowledgeContractFixture(): FakeKnowledgeFixture {
  const documentId = brandId<'KnowledgeDocumentId'>('document-pdf-fixture')
  const versionId = brandId<'KnowledgeDocumentVersionId'>('version-pdf-fixture')
  const citationId = brandId<'CitationId'>('citation-pdf-fixture')
  const excerpt = 'Use the confirmed PDF source before preparing the sample.'
  const result: KnowledgeSearchResult = {
    citationId,
    documentId,
    versionId,
    location: 'page:1/block:1',
    excerpt,
    kind: 'text',
    page: 1,
    titlePath: ['PDF fixture'],
    confirmed: true,
    conflicted: false,
    provenance: 'SOURCE',
    score: 1,
  }
  return {
    capability: { state: 'available' },
    imports: [{
      documentId,
      versionId,
      status: 'READY',
      metadata: { sourceName: 'knowledge-fixture.pdf', dataset: 'pdf-knowledge' },
    }],
    results: [result],
    publishedSops: [{
      sopRevisionId: 'sop-fixture-r1',
      documentId,
      versionId,
      citationIds: [citationId],
      status: 'PUBLISHED',
    }],
  }
}

function structuredFixtureBlock(fixture: PdfKnowledgeFixture): ParsedDocumentBlock {
  return {
    location: 'page:1/block:1',
    content: fixture.evidence,
    kind: 'text',
    page: 1,
    titlePath: [fixture.title],
  }
}

function readHeader(bytes: Iterable<number>): string {
  const iterator = bytes[Symbol.iterator]()
  let header = ''
  for (let index = 0; index < 5; index += 1) {
    const next = iterator.next()
    if (next.done === true) break
    header += String.fromCharCode(next.value)
  }
  return header
}
