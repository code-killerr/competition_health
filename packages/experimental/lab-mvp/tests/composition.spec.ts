import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as LabMvp from '../src/index.ts'
import * as LabDeviceMock from '@deepseek-ai/dsh-experimental-lab-device-mock'
import { LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'

describe('lab-mvp I0 composition', () => {
  it('mounts all four capability services and an opt-in Mock Device Provider', async () => {
    const ctx = new Context()
    await ctx.plugin(LabMvp)
    expect(() => ctx.labDevices.listDevices()).toThrow(LabProviderUnavailableError)

    await ctx.plugin(LabDeviceMock, {
      devices: [{ id: 'device-1', name: 'test device', capabilities: ['dispense'] }],
    })

    expect(ctx.get('labKnowledge')).toBeDefined()
    expect(ctx.get('labPlanning')).toBeDefined()
    expect(ctx.get('labSkills')).toBeDefined()
    expect(ctx.get('labDevices')).toBeDefined()
    expect(ctx.get('labRuntime')).toBeDefined()
    expect(ctx.labDevices.listDevices()).toMatchObject([
      { id: 'device-1', name: 'test device', healthy: true, reserved: false },
    ])
  })
})
