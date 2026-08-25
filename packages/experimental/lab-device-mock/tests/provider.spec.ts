import { describe, expect, it } from 'vitest'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { MockDeviceProvider } from '../src/index.ts'

describe('MockDeviceProvider', () => {
  it('enforces a lease and makes execution idempotent', async () => {
    const provider = new MockDeviceProvider({ devices: [{ id: 'device-1', name: 'test device', capabilities: ['dispense'] }] })
    const deviceId = brandId<'DeviceId'>('device-1')
    const runId = brandId<'RunId'>('run-1')
    const operationId = brandId<'OperationId'>('operation-1')

    await expect(provider.execute({
      deviceId,
      runId,
      operationId,
      idempotencyKey: 'same-operation',
      parameters: {},
    })).rejects.toThrow(/not reserved/)

    await provider.reserve(deviceId, runId)
    const first = await provider.execute({ deviceId, runId, operationId, idempotencyKey: 'same-operation', parameters: {} })
    const second = await provider.execute({ deviceId, runId, operationId, idempotencyKey: 'same-operation', parameters: {} })
    expect(second).toBe(first)
    expect(provider.status(deviceId)).toMatchObject({ reserved: true, healthy: true })
  })
})
