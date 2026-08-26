import { describe, expect, it } from 'vitest'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { LocalKnowledgeProvider, type DocumentParser, type EmbeddingAdapter } from '../src/index.ts'

describe('LocalKnowledgeProvider', () => {
  it('ingests bytes, searches cited blocks, confirms a fact, and rebuilds FTS', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const imported = await provider.importDocument({
      source: {
        kind: 'bytes',
        name: 'notes.csv',
        bytes: new TextEncoder().encode('name,value\nalpha,42\nbeta,7\n'),
      },
      metadata: { study: 'ATAC', owner: 'lab' },
    })

    expect(imported.status).toBe('READY')
    expect(imported.metadata).toMatchObject({ study: 'ATAC', owner: 'lab', sourceKind: 'bytes', sourceName: 'notes.csv' })
    await expect(provider.getImportStatus(imported.documentId, imported.versionId)).resolves.toMatchObject({ metadata: imported.metadata })
    const before = await provider.search({ query: 'alpha', limit: 5 })
    expect(before).toHaveLength(1)
    expect(before[0]).toMatchObject({ location: 'row:2', kind: 'table', tableHeaders: ['column1', 'column2'], tableRow: 2, confirmed: false })

    await provider.confirmFact({ citationId: before[0]!.citationId, confirmedBy: 'reviewer' })
    await provider.rebuildIndex()
    await expect(provider.search({ query: 'alpha' })).resolves.toMatchObject([
      { citationId: before[0]!.citationId, confirmed: true },
    ])
    await provider.dispose()
  })

  it('normalizes quoted CSV and TSV rows with stable table metadata', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const csv = await provider.importDocument({
      source: {
        kind: 'bytes',
        name: 'quoted.csv',
        bytes: new TextEncoder().encode('name,notes\n"alpha","value,with comma"\n"beta","line 1\nline 2"\n'),
      },
    })
    expect(csv.status).toBe('READY')
    await expect(provider.search({ query: 'alpha' })).resolves.toMatchObject([
      {
        location: 'row:2',
        excerpt: 'column1: alpha | column2: value,with comma',
        kind: 'table',
        tableHeaders: ['column1', 'column2'],
        tableRow: 2,
      },
    ])
    const tsv = await provider.importDocument({
      source: { kind: 'bytes', name: 'values.tsv', bytes: new TextEncoder().encode('alpha\t42\nbeta\t7\n') },
    })
    expect(tsv.status).toBe('READY')
    await expect(provider.search({ query: 'beta', documentIds: [tsv.documentId] })).resolves.toMatchObject([
      { location: 'row:2', kind: 'table', tableRow: 2, tableHeaders: ['column1', 'column2'] },
    ])
    await provider.dispose()
  })

  it('records malformed table parsing as a failed import', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: 'malformed.csv', bytes: new TextEncoder().encode('name,value\n"broken,42\n') },
    })
    expect(imported.status).toBe('FAILED')
    expect((await provider.getImportStatus(imported.documentId, imported.versionId))?.error).toMatch(/unterminated quoted table field/)
    await provider.dispose()
  })
  it('rejects parser table blocks without normalized metadata', async () => {
    const parser: DocumentParser = {
      name: 'invalid-table-parser',
      supports: name => name.endsWith('.csv'),
      parse: async () => [{ location: 'row:1', content: 'invalid', kind: 'table' }],
    }
    const provider = new LocalKnowledgeProvider({ path: ':memory:', documentParser: parser })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: 'invalid.csv', bytes: new TextEncoder().encode('invalid') },
    })
    expect(imported.status).toBe('FAILED')
    expect((await provider.getImportStatus(imported.documentId, imported.versionId))?.error).toMatch(/table blocks require/)
    await provider.dispose()
  })
  it('keeps unsupported PDF parsing as an explicit failed import', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: 'reference.pdf', bytes: new Uint8Array([37, 80, 68, 70]) },
    })
    expect(imported.status).toBe('FAILED')
    expect((await provider.getImportStatus(imported.documentId, imported.versionId))?.error).toMatch(/parser/)
    await provider.dispose()
  })

  it('uses a configured parser for PDF blocks and preserves structured locations', async () => {
    const parser: DocumentParser = {
      name: 'test-pdf-parser',
      supports: name => name.endsWith('.pdf'),
      parse: async () => [{ location: 'page:2/block:1', page: 2, kind: 'text', titlePath: ['Methods'], content: 'spatial protocol' }],
    }
    const provider = new LocalKnowledgeProvider({ path: ':memory:', documentParser: parser })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: 'reference.pdf', bytes: new Uint8Array([37, 80, 68, 70]) },
    })
    expect(imported.status).toBe('READY')
    await expect(provider.search({ query: 'spatial' })).resolves.toMatchObject([
      { location: 'page:2/block:1', excerpt: 'spatial protocol', kind: 'text', page: 2, titlePath: ['Methods'] },
    ])
    await provider.dispose()
  })

  it('applies filters, optional embeddings, confirmation records, and conflict records', async () => {
    const embedding: EmbeddingAdapter = {
      embed: async text => text.includes('alpha') ? [1, 0] : [0, 1],
    }
    const provider = new LocalKnowledgeProvider({ path: ':memory:', embeddingAdapter: embedding })
    await provider.importDocument({
      source: { kind: 'bytes', name: 'facts.csv', bytes: new TextEncoder().encode('alpha,42\nbeta,7\n') },
    })

    const alpha = await provider.search({ query: 'alpha', confirmed: false })
    const beta = await provider.search({ query: 'beta', confirmed: false })
    expect(alpha).toHaveLength(1)
    expect(beta).toHaveLength(1)
    await provider.confirmFact({ citationId: alpha[0]!.citationId, confirmedBy: 'reviewer', note: 'checked' })
    await expect(provider.search({ query: 'alpha', confirmed: false })).resolves.toEqual([])
    await expect(provider.search({ query: 'alpha', confirmed: true })).resolves.toMatchObject([
      { citationId: alpha[0]!.citationId, confirmed: true },
    ])

    await provider.recordConflict({
      experimentId: brandId<'ExperimentId'>('experiment-a'),
      citationIds: [alpha[0]!.citationId, beta[0]!.citationId],
      summary: 'two values require review',
    })
    await expect(provider.listConflicts()).resolves.toMatchObject([
      { summary: 'two values require review', status: 'OPEN', experimentId: 'experiment-a', citationIds: [alpha[0]!.citationId, beta[0]!.citationId] },
    ])
    await expect(provider.listConflicts(brandId<'ExperimentId'>('experiment-b'))).resolves.toEqual([])
    await expect(provider.search({ query: 'alpha' })).resolves.toMatchObject([
      { citationId: alpha[0]!.citationId, confirmed: false, conflicted: true },
    ])
    await expect(provider.confirmFact({ citationId: beta[0]!.citationId, confirmedBy: 'reviewer' })).rejects.toThrow(/OPEN/)
    await provider.dispose()
  })
})
