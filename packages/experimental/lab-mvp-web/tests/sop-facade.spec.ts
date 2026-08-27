import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { LabMvpWebService } from '../src/index.ts'
import { parseLabWebCommand } from '../src/protocol.ts'

describe('LabMvpWebService SOP dispatch', () => {
  it('forwards draft creation and publication through the Knowledge Service', async () => {
    const ctx = new Context()
    const draft = {
      draft: { draftId: 'sop-draft-1', title: 'Protocol', status: 'REVIEWED', steps: [], sourceVersionIds: [], blockers: [] },
      blockers: [],
    }
    const knowledge = {
      createSopDraft: vi.fn().mockResolvedValue(draft),
      confirmFact: vi.fn().mockResolvedValue(undefined),
      publishSopDraft: vi.fn().mockResolvedValue({ ...draft, draft: { ...draft.draft, status: 'PUBLISHED' } }),
    }
    ctx.provide('labKnowledge', knowledge)
    const service = new LabMvpWebService(ctx)
    const create = parseLabWebCommand({
      command: 'knowledge-sop-create',
      title: 'Protocol',
      steps: [{ order: 1, title: 'Step', instruction: 'Do it', citations: ['citation-1'] }],
    })
    await expect(service.dispatch(create)).resolves.toMatchObject({ kind: 'knowledge-sop', value: draft })
    await expect(service.dispatch(parseLabWebCommand({ command: 'knowledge-fact-confirm', citationId: 'citation-1', confirmedBy: 'reviewer' }))).resolves.toMatchObject({ kind: 'knowledge-fact-confirm' })
    await expect(service.dispatch(parseLabWebCommand({ command: 'knowledge-sop-publish', draftId: 'sop-draft-1', publishedBy: 'reviewer' }))).resolves.toMatchObject({ kind: 'knowledge-sop' })
    expect(knowledge.createSopDraft).toHaveBeenCalledWith(expect.objectContaining({ title: 'Protocol' }))
    expect(knowledge.confirmFact).toHaveBeenCalledWith({ citationId: 'citation-1', confirmedBy: 'reviewer' })
    expect(knowledge.publishSopDraft).toHaveBeenCalledWith({ draftId: 'sop-draft-1', publishedBy: 'reviewer' })
  })
})
