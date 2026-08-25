import { describe, expect, it } from 'vitest'
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
    })

    expect(imported.status).toBe('READY')
    const before = await provider.search({ query: 'alpha', limit: 5 })
    expect(before).toHaveLength(1)
    expect(before[0]).toMatchObject({ location: 'row:2', confirmed: false })

    await provider.confirmFact({ citationId: before[0]!.citationId, confirmedBy: 'reviewer' })
    await provider.rebuildIndex()
    await expect(provider.search({ query: 'alpha' })).resolves.toMatchObject([
      { citationId: before[0]!.citationId, confirmed: true },
    ])
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
      { location: 'page:2/block:1', excerpt: 'spatial protocol' },
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
      citationIds: [alpha[0]!.citationId, beta[0]!.citationId],
      summary: 'two values require review',
    })
    await expect(provider.listConflicts()).resolves.toMatchObject([
      { summary: 'two values require review', status: 'OPEN', citationIds: [alpha[0]!.citationId, beta[0]!.citationId] },
    ])
    await provider.dispose()
  })
})
