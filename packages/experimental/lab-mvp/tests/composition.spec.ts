import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import LabRuntimeService from '@deepseek-ai/dsh-experimental-lab-runtime'
import KnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import LabPlanningService from '@deepseek-ai/dsh-experimental-lab-planning'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import LabDeviceService from '@deepseek-ai/dsh-experimental-lab-device'
import { brandId, LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'
import * as LabMvp from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('lab-mvp composition', () => {
  it('mounts all four capability providers and the Web Consumer with explicit configuration', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(LabMvp, {
      knowledgePath: ':memory:',
      device: { devices: [{ id: 'device-1', name: 'test device', capabilities: ['dispense'] }] },
    })

    expect(ctx.labDevices.listDevices()).toMatchObject([
      { id: 'device-1', name: 'test device', healthy: true, reserved: false },
    ])
    expect(ctx.get('labKnowledge')).toBeDefined()
    expect(ctx.get('labPlanning')).toBeDefined()
    expect(ctx.get('labSkills')).toBeDefined()
    expect(ctx.get('labDevices')).toBeDefined()
    expect(ctx.get('labRuntime')).toBeDefined()
    expect(ctx.get('labMvpWeb')).toBeDefined()
    expect(() => ctx.labKnowledge.search({ query: 'none' })).not.toThrow()
  })

  it('fails loudly when any capability Provider is absent outside the bundle', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(KnowledgeService)
    await ctx.plugin(LabPlanningService)
    await ctx.plugin(LabSkillService)
    await ctx.plugin(LabDeviceService)
    await ctx.plugin(LabRuntimeService)
    expect(() => ctx.labKnowledge.search({ query: 'none' })).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labPlanning.buildContext({} as never)).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labSkills.resolveRevision(brandId<'SkillRevisionId'>('revision-1'))).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labDevices.listDevices()).toThrow(LabProviderUnavailableError)
    expect(() => ctx.labRuntime.getRun(brandId<'ExperimentId'>('experiment-1'))).toThrow(LabProviderUnavailableError)
  })
})
