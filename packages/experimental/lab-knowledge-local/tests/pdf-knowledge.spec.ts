import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { LocalKnowledgeProvider } from '../src/index.ts'
import {
  SPACE_ATAC_CSV,
  availablePdfKnowledgeFixtures,
  createPdfKnowledgeFixtureParser,
  readPdfKnowledgeFixture,
} from './pdf-knowledge-fixtures.ts'

describe('knowledge data switching', () => {
  it('keeps PDF, CSV, flow-confirmation, and mouse-brain inputs source-scoped', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:', documentParser: createPdfKnowledgeFixtureParser() })
    const imported: Array<{ readonly key: string; readonly documentId: string; readonly query: string }> = []

    const mouseBrain = await provider.importDocument({
      source: {
        kind: 'bytes',
        name: 'mouse-brain-request.txt',
        bytes: new TextEncoder().encode('sample=mouse brain\nobjective=spatial transcriptomics\n'),
      },
      metadata: { dataset: 'mouse-brain', role: 'experiment-request' },
    })
    expect(mouseBrain.status).toBe('READY')
    imported.push({ key: 'mouse-brain', documentId: mouseBrain.documentId, query: 'mouse' })

    const csv = await readFile(SPACE_ATAC_CSV)
    const spaceAtac = await provider.importDocument({
      source: { kind: 'bytes', name: 'space-atac-confirmation.csv', bytes: csv },
      metadata: { dataset: 'space-atac', role: 'protocol-and-flow-confirmation' },
    })
    expect(spaceAtac.status).toBe('READY')
    imported.push({ key: 'space-atac-flow-confirmation', documentId: spaceAtac.documentId, query: 'ATAC' })

    for (const fixture of availablePdfKnowledgeFixtures()) {
      const bytes = await readPdfKnowledgeFixture(fixture)
      expect(Buffer.from(bytes.subarray(0, 5)).toString('ascii')).toBe('%PDF-')
      expect(bytes.byteLength).toBeGreaterThan(100_000)
      const result = await provider.importDocument({
        source: { kind: 'bytes', name: fixture.fileName, bytes },
        metadata: { dataset: 'pdf-knowledge', role: 'test-fixture', title: fixture.title },
      })
      expect(result.status).toBe('READY')
      imported.push({ key: fixture.fileName, documentId: result.documentId, query: fixture.searchQuery })
    }

    for (const input of imported) {
      const results = await provider.search({ query: input.query, documentIds: [input.documentId], limit: 5 })
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(result => result.documentId === input.documentId)).toBe(true)
    }

    const pdfFixtureCount = availablePdfKnowledgeFixtures().length
    expect(imported).toHaveLength(2 + pdfFixtureCount)
    const runtimeSource = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
    expect(runtimeSource).not.toMatch(/SeekSpace|鼠脑|pdf_knowledge/)
    await provider.dispose()
  })
})
