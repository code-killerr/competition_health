import { describe, expect, it } from 'vitest'
import { LocalKnowledgeProvider } from '../src/index.ts'
import {
  availablePdfKnowledgeFixtures,
  createPdfKnowledgeFixtureParser,
  readPdfKnowledgeFixture,
} from './pdf-knowledge-fixtures.ts'

describe('PDF to published SOP loop', () => {
  it('imports one real PDF fixture, publishes a cited SOP, and retrieves the published step', async () => {
    const [fixture] = availablePdfKnowledgeFixtures()
    expect(fixture).toBeDefined()
    if (fixture === undefined) throw new Error('no PDF knowledge fixture is available')
    const provider = new LocalKnowledgeProvider({ path: ':memory:', documentParser: createPdfKnowledgeFixtureParser() })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: fixture.fileName, bytes: await readPdfKnowledgeFixture(fixture) },
      metadata: { dataset: 'pdf-knowledge', title: fixture.title },
    })
    expect(imported.status).toBe('READY')
    const [citation] = await provider.search({ query: fixture.searchQuery })
    expect(citation).toBeDefined()
    if (citation === undefined) throw new Error('PDF fixture did not produce a citation')

    const step = {
      order: 1,
      title: `${fixture.searchQuery} preparation`,
      instruction: `Follow the ${fixture.searchQuery} preparation instructions from the cited source.`,
      requiredInputs: [],
      completionCriteria: ['operator records completion'],
      citations: [citation.citationId],
      missingFields: [],
    } as const
    const draft = await provider.createSopDraft({ title: fixture.title, steps: [step] })
    await provider.confirmFact({ citationId: citation.citationId, confirmedBy: 'fixture-reviewer' })
    const reviewed = await provider.updateSopDraft({ draftId: draft.draft.draftId, title: draft.draft.title, steps: [step], updatedBy: 'fixture-reviewer' })
    expect(reviewed.draft.status).toBe('REVIEWED')
    const published = await provider.publishSopDraft({ draftId: draft.draft.draftId, publishedBy: 'fixture-reviewer' })
    expect(published.draft.status).toBe('PUBLISHED')
    const publishedResults = (await provider.search({ query: fixture.searchQuery, confirmed: true })).filter(result => result.provenance === 'SOP_PUBLISHED')
    expect(publishedResults).toMatchObject([
      { provenance: 'SOP_PUBLISHED', sopDraftId: draft.draft.draftId, confirmed: true },
    ])
    await provider.dispose()
  })
})
