import { describe, expect, it, vi } from 'vitest'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { createLabKnowledgeConsumer, FakeLabKnowledgeConsumer } from '../src/knowledge.ts'
import { createKnowledgeContractFixture } from '@deepseek-ai/dsh-lab-knowledge-fixtures'

describe('LabKnowledgeConsumer', () => {
  it('keeps unavailable Knowledge explicit without a minimum-version gate', async () => {
    const unavailable = new FakeLabKnowledgeConsumer({ capability: { state: 'unavailable', reason: 'provider is loading' } })
    expect(unavailable.capability()).toMatchObject({ state: 'unavailable', reason: 'provider is loading' })
  })

  it('filters deterministic fixture retrieval by selected source and confirmation', async () => {
    const consumer = new FakeLabKnowledgeConsumer({
      results: [
        { citationId: brandId<'CitationId'>('citation-1'), documentId: brandId<'KnowledgeDocumentId'>('doc-1'), versionId: brandId<'KnowledgeDocumentVersionId'>('version-1'), location: 'page 1', excerpt: 'confirmed', score: 1, confirmed: true, conflicted: false },
        { citationId: brandId<'CitationId'>('citation-2'), documentId: brandId<'KnowledgeDocumentId'>('doc-2'), versionId: brandId<'KnowledgeDocumentVersionId'>('version-2'), location: 'page 2', excerpt: 'unconfirmed', score: 0.5, confirmed: false, conflicted: false },
      ],
    })
    await expect(consumer.search({ query: 'confirmed', documentIds: [brandId<'KnowledgeDocumentId'>('doc-1')], confirmed: true, limit: 10 })).resolves.toMatchObject([{ citationId: 'citation-1' }])
  })

  it('shares capability, source/version, citation and published-SOP records with the MVP fixture', async () => {
    const consumer = new FakeLabKnowledgeConsumer(createKnowledgeContractFixture())
    expect(consumer.capability()).toMatchObject({ state: 'available' })
    await expect(consumer.listImportStatuses()).resolves.toMatchObject([{ documentId: 'document-pdf-fixture', versionId: 'version-pdf-fixture', status: 'READY' }])
    await expect(consumer.search({ query: 'confirmed', confirmed: true })).resolves.toMatchObject([{ citationId: 'citation-pdf-fixture', documentId: 'document-pdf-fixture', versionId: 'version-pdf-fixture', confirmed: true }])
    await expect(consumer.listPublishedSops?.()).resolves.toMatchObject([{ sopRevisionId: 'sop-fixture-r1', citationIds: ['citation-pdf-fixture'], status: 'PUBLISHED' }])
  })

  it('adapts the typed Knowledge Facade and reports provider failures as unavailable', async () => {
    const facade = {
      listImportStatuses: vi.fn().mockRejectedValue(new Error('knowledge unavailable')),
      search: vi.fn().mockResolvedValue([]),
      listConflicts: vi.fn().mockResolvedValue([]),
    }
    const consumer = createLabKnowledgeConsumer(facade)
    await expect(consumer.capability()).resolves.toMatchObject({ state: 'unavailable', reason: 'knowledge unavailable' })
  })
})
