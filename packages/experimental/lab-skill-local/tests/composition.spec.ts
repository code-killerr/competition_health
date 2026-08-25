import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import * as LocalLabSkill from '../src/index.ts'

describe('lab-skill-local Harness composition', () => {
  it('publishes only ACTIVE revisions through ctx.skills', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(LabSkillService)
    const fiber = await ctx.plugin(LocalLabSkill)
    const draft = await ctx.labSkills.createDraft({
      skillId: brandId<'LabSkillId'>('skill-prepare-sample'),
      revisionId: brandId<'SkillRevisionId'>('revision-1'),
      status: 'DRAFT',
      name: 'prepare-sample',
      purpose: 'Prepare a sample with an approved operation.',
      citations: [],
      operations: [{ kind: 'human', resourceRef: 'human:prepare-sample', installed: true }],
    })

    expect(await ctx.skills.list()).toEqual([])
    const validated = await ctx.labSkills.validateDraft(draft.revisionId)
    const approved = await ctx.labSkills.approveDraft(validated.revisionId, 'reviewer-1')
    await ctx.labSkills.activateRevision(approved.revisionId)

    expect(await ctx.skills.list()).toMatchObject([{
      name: 'prepare-sample',
      provider: 'lab-skill-local',
      invocation: { modelInvocable: true, userInvocable: false },
    }])
    expect(await ctx.skills.get('prepare-sample')).toMatchObject({
      name: 'prepare-sample',
      content: expect.stringContaining('human:prepare-sample'),
    })

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })
})
