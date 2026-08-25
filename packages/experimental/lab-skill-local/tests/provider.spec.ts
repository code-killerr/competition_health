import { describe, expect, it } from 'vitest'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { LocalLabSkillProvider } from '../src/index.ts'

function draft(installed: boolean) {
  return {
    skillId: brandId<'LabSkillId'>('skill-prepare-sample'),
    revisionId: brandId<'SkillRevisionId'>('revision-1'),
    status: 'DRAFT' as const,
    name: 'prepare-sample',
    purpose: 'Prepare a sample with an approved operation.',
    citations: [],
    operations: [{ kind: 'human' as const, resourceRef: 'human:prepare-sample', installed }],
  }
}

describe('LocalLabSkillProvider', () => {
  it('rejects a draft whose operation implementation is not installed', async () => {
    const provider = new LocalLabSkillProvider()
    const revision = await provider.createDraft(draft(false))

    await expect(provider.validateDraft(revision.revisionId)).rejects.toThrow(/not installed/)
    expect(provider.resolveRevision(revision.revisionId)?.status).toBe('DRAFT')
  })

  it('requires human approval before activation and returns an immutable active snapshot', async () => {
    const provider = new LocalLabSkillProvider()
    const created = await provider.createDraft(draft(true))
    const validated = await provider.validateDraft(created.revisionId)
    const approved = await provider.approveDraft(validated.revisionId, 'reviewer-1')
    const active = await provider.activateRevision(approved.revisionId)

    expect(active.status).toBe('ACTIVE')
    const snapshots = await provider.snapshotForRun([active.revisionId])
    expect(snapshots).toEqual([{
      skillId: active.skillId,
      revisionId: active.revisionId,
      status: 'ACTIVE',
      definitionHash: active.definitionHash,
    }])
    await expect(provider.approveDraft(active.revisionId, 'reviewer-2')).rejects.toThrow(/ACTIVE/)
  })
})
