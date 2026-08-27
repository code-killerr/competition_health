import { describe, expect, it } from 'vitest'
import { LocalKnowledgeProvider } from '../src/index.ts'

describe('Knowledge SOP drafts', () => {
  it('requires confirmed citations before review and projects a published step into FTS5', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    await provider.importDocument({
      source: { kind: 'bytes', name: 'procedure.txt', bytes: new TextEncoder().encode('alpha protocol calibrate\n') },
    })
    const [citation] = await provider.search({ query: 'alpha' })
    expect(citation).toBeDefined()
    if (citation === undefined) throw new Error('test fixture did not produce a citation')

    const step = {
      order: 1,
      title: 'Calibrate the sample',
      instruction: 'Calibrate the sample before the run.',
      requiredInputs: ['sample'],
      completionCriteria: ['calibration is recorded'],
      citations: [citation.citationId],
      missingFields: [],
    } as const
    const draft = await provider.createSopDraft({ title: 'Alpha protocol', steps: [step], updatedBy: 'author' })
    expect(draft.draft.status).toBe('DRAFT')
    expect(draft.blockers.join('; ')).toMatch(/unconfirmed/)
    await expect(provider.publishSopDraft({ draftId: draft.draft.draftId, publishedBy: 'reviewer' })).rejects.toThrow(/unconfirmed|reviewed/)

    await provider.confirmFact({ citationId: citation.citationId, confirmedBy: 'reviewer' })
    const reviewed = await provider.updateSopDraft({ draftId: draft.draft.draftId, title: draft.draft.title, steps: [step], updatedBy: 'reviewer' })
    expect(reviewed.draft.status).toBe('REVIEWED')
    expect(reviewed.blockers).toEqual([])

    const published = await provider.publishSopDraft({ draftId: draft.draft.draftId, publishedBy: 'reviewer' })
    expect(published.draft.status).toBe('PUBLISHED')
    const publishedResults = (await provider.search({ query: 'calibrate', confirmed: true })).filter(result => result.provenance === 'SOP_PUBLISHED')
    expect(publishedResults).toMatchObject([
      { provenance: 'SOP_PUBLISHED', sopDraftId: draft.draft.draftId, confirmed: true },
    ])
    await expect(provider.publishSopDraft({ draftId: draft.draft.draftId, publishedBy: 'reviewer' })).resolves.toMatchObject({ draft: { status: 'PUBLISHED' } })
    await provider.dispose()
  })

  it('reports an unknown citation as a review blocker', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const draft = await provider.createSopDraft({
      title: 'Incomplete SOP',
      steps: [{ order: 1, title: 'Step', instruction: 'Do it', requiredInputs: [], completionCriteria: [], citations: ['citation-unknown' as never], missingFields: [] }],
    })
    expect(draft.blockers.join('; ')).toMatch(/unknown citation/)
    await provider.dispose()
  })
})
