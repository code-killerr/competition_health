/** 可配置 Mock Device Provider，只用于 I0 组合测试与后续 Runtime 验证。 */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceId, OperationId, RunId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  DeviceCapability,
  DeviceOperationRequest,
  DeviceReceipt,
  DeviceView,
  LabDeviceProvider,
} from '@deepseek-ai/dsh-experimental-lab-device'

/** 一个模拟设备的配置。 */
export interface MockDeviceConfig {
  /** 设备的稳定标识。 */
  readonly id: string
  /** 展示名称。 */
  readonly name: string
  /** 设备支持的操作能力名称。 */
  readonly capabilities?: string[]
  /** 启动时的健康状态。 */
  readonly healthy?: boolean
  /** 是否在执行阶段模拟通信失败。 */
  readonly communicationFailure?: boolean
}

/** Mock Provider 配置。默认不创建任何设备。 */
export interface Config {
  /** 启动时注册的模拟设备。 */
  readonly devices?: MockDeviceConfig[]
}

/** Loader 使用的 Mock Provider 配置 schema。 */
export const Config: z<Config> = z.object({
  devices: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    capabilities: z.array(z.string()).default([]),
    healthy: z.boolean().default(true),
    communicationFailure: z.boolean().default(false),
  })).default([]),
})

/** Cordis 插件名称。 */
export const name = 'lab-device-mock'
/** 依赖 Lab Device Service。 */
export const inject = ['labDevices']

interface MockDeviceState {
  readonly id: DeviceId
  /** 展示名称。 */
  readonly name: string
  readonly capabilities: readonly DeviceCapability[]
  healthy: boolean
  communicationFailure: boolean
  reservedBy: RunId | undefined
}

/** 基于内存状态的可配置设备 Provider，提供租约、幂等和停止语义。 */
export class MockDeviceProvider implements LabDeviceProvider {
  readonly name = 'mock'
  private readonly devices = new Map<DeviceId, MockDeviceState>()
  private readonly receipts = new Map<string, DeviceReceipt>()

  constructor(config: Config = {}) {
    for (const device of config.devices ?? []) {
      const id = brandId<'DeviceId'>(device.id)
      if (this.devices.has(id)) throw new Error(`duplicate mock device id "${device.id}"`)
      this.devices.set(id, {
        id,
        name: device.name,
        capabilities: (device.capabilities ?? []).map(name => ({ name, parameters: {} })),
        healthy: device.healthy ?? true,
        communicationFailure: device.communicationFailure ?? false,
        reservedBy: undefined,
      })
    }
  }

  /** 返回当前模拟设备列表。 */
  listDevices(): readonly DeviceView[] {
    return [...this.devices.values()].map(device => this.view(device))
  }

  /** 模拟健康检查。 */
  async healthCheck(deviceId: DeviceId): Promise<boolean> {
    await Promise.resolve()
    return this.requireDevice(deviceId).healthy
  }

  /** 为一个运行实例申请设备租约。 */
  async reserve(deviceId: DeviceId, runId: RunId): Promise<void> {
    await Promise.resolve()
    const device = this.requireDevice(deviceId)
    if (!device.healthy) throw new Error(`mock device "${deviceId}" is unhealthy`)
    if (device.reservedBy !== undefined && device.reservedBy !== runId) {
      throw new Error(`mock device "${deviceId}" is already reserved`)
    }
    device.reservedBy = runId
  }

  /** 执行已注册的模拟操作；同一幂等键只产生一条回执。 */
  async execute(request: DeviceOperationRequest): Promise<DeviceReceipt> {
    await Promise.resolve()
    const device = this.requireDevice(request.deviceId)
    if (device.reservedBy !== request.runId) throw new Error(`mock device "${request.deviceId}" is not reserved by this run`)
    const key = `${request.deviceId}:${request.idempotencyKey}`
    const prior = this.receipts.get(key)
    if (prior !== undefined) return prior
    if (device.communicationFailure) throw new Error(`mock device "${request.deviceId}" communication failed`)
    const receipt = this.receipt(request.operationId, request.idempotencyKey, 'completed', `mock-device:${request.deviceId}`)
    this.receipts.set(key, receipt)
    return receipt
  }

  /** 返回设备的实时视图。 */
  status(deviceId: DeviceId): DeviceView | undefined {
    const device = this.devices.get(deviceId)
    return device === undefined ? undefined : this.view(device)
  }

  /** 生成停止回执，不推进任何后继步骤。 */
  async stop(request: Pick<DeviceOperationRequest, 'deviceId' | 'runId' | 'operationId'>): Promise<DeviceReceipt> {
    await Promise.resolve()
    const device = this.requireDevice(request.deviceId)
    if (device.reservedBy !== request.runId) throw new Error(`mock device "${request.deviceId}" is not reserved by this run`)
    return this.receipt(request.operationId, `stop:${request.operationId}`, 'stopped', `mock-device:${request.deviceId}`)
  }

  /** 释放当前运行实例持有的租约。 */
  async release(deviceId: DeviceId, runId: RunId): Promise<void> {
    await Promise.resolve()
    const device = this.requireDevice(deviceId)
    if (device.reservedBy !== undefined && device.reservedBy !== runId) {
      throw new Error(`mock device "${deviceId}" is reserved by another run`)
    }
    device.reservedBy = undefined
  }

  private requireDevice(deviceId: DeviceId): MockDeviceState {
    const device = this.devices.get(deviceId)
    if (device === undefined) throw new Error(`unknown mock device "${deviceId}"`)
    return device
  }

  private view(device: MockDeviceState): DeviceView {
    return {
      id: device.id,
      name: device.name,
      capabilities: device.capabilities,
      healthy: device.healthy,
      reserved: device.reservedBy !== undefined,
    }
  }

  private receipt(operationId: OperationId, idempotencyKey: string, status: DeviceReceipt['status'], evidence: string): DeviceReceipt {
    return { operationId, idempotencyKey, status, evidence: [evidence] }
  }
}

/** 把 Mock Provider 注册到 Lab Device Service。 */
export function apply(ctx: Context, config: Config = {}): void {
  ctx.effect(() => {
    const provider = new MockDeviceProvider(config)
    return ctx.labDevices.registerProvider(provider)
  }, 'lab-device-mock.provider')
}
