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

  it('rejects conflicting leases and operations from another run', async () => {
    const provider = new MockDeviceProvider({ devices: [{ id: 'device-1', name: 'test device' }] })
    const deviceId = brandId<'DeviceId'>('device-1')
    const firstRun = brandId<'RunId'>('run-1')
    const secondRun = brandId<'RunId'>('run-2')
    const operationId = brandId<'OperationId'>('operation-2')

    await provider.reserve(deviceId, firstRun)
    await expect(provider.reserve(deviceId, secondRun)).rejects.toThrow(/already reserved/)
    await expect(provider.execute({ deviceId, runId: secondRun, operationId, idempotencyKey: 'wrong-run', parameters: {} })).rejects.toThrow(/not reserved/)
    await provider.release(deviceId, firstRun)
  })

  it('reports configured health and separates stop from lease release', async () => {
    const unhealthy = new MockDeviceProvider({ devices: [{ id: 'device-unhealthy', name: 'unhealthy', healthy: false }] })
    const unhealthyId = brandId<'DeviceId'>('device-unhealthy')
    const runId = brandId<'RunId'>('run-health')
    await expect(unhealthy.healthCheck(unhealthyId)).resolves.toBe(false)
    await expect(unhealthy.reserve(unhealthyId, runId)).rejects.toThrow(/unhealthy/)

    const provider = new MockDeviceProvider({ devices: [{ id: 'device-1', name: 'test device' }] })
    const deviceId = brandId<'DeviceId'>('device-1')
    const operationId = brandId<'OperationId'>('operation-stop')
    await provider.reserve(deviceId, runId)
    await expect(provider.stop({ deviceId, runId, operationId })).resolves.toMatchObject({ status: 'stopped', operationId })
    expect(provider.status(deviceId)?.reserved).toBe(true)
    await provider.release(deviceId, runId)
    expect(provider.status(deviceId)?.reserved).toBe(false)
  })

  it('surfaces communication failure without returning a success receipt', async () => {
    const provider = new MockDeviceProvider({ devices: [{ id: 'device-1', name: 'test device', communicationFailure: true }] })
    const deviceId = brandId<'DeviceId'>('device-1')
    const runId = brandId<'RunId'>('run-failure')
    const operationId = brandId<'OperationId'>('operation-failure')
    await provider.reserve(deviceId, runId)
    await expect(provider.execute({ deviceId, runId, operationId, idempotencyKey: 'communication-failure', parameters: {} })).rejects.toThrow(/communication failed/)
    expect(provider.status(deviceId)).toMatchObject({ healthy: true, reserved: true })
  })
})
