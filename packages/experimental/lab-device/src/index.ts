/** 实验设备 Service Definition；Provider 负责具体硬件、API 或模拟设备。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceId, RunId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  DeviceOperationRequest,
  DeviceReceipt,
  DeviceView,
  LabDeviceProvider,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labDevices: LabDeviceService
  }
}

/** 实验设备服务，保证设备命令只能通过已注册 Provider 进入。 */
export class LabDeviceService extends Service {
  private provider: LabDeviceProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labDevices')
  }

  /** 注册本进程唯一的设备 Provider。
 * @param provider - provider that owns device operations.
 * @returns - disposer for the registered provider.
 */
  registerProvider(provider: LabDeviceProvider): () => void {
    if (this.provider !== undefined) throw new LabDuplicateProviderError('lab-device')
    const dispose = this.ctx.effect(() => {
      this.provider = provider
      return () => {
        if (this.provider === provider) this.provider = undefined
        return provider.dispose?.()
      }
    }, 'labDevices.registerProvider()')
    return () => void dispose()
  }

  /** 查询设备及能力，只读。
 * @returns - current device views and capabilities.
 */
  listDevices(): readonly DeviceView[] {
    return this.requireProvider().listDevices()
  }

  /** 返回当前 Provider 名称，供 Host 展示真实接入来源。 */
  providerName(): string {
    return this.requireProvider().name
  }

  /** 检查设备健康状态。
 * @param deviceId - device to check.
 * @returns - whether the device is healthy.
 */
  healthCheck(deviceId: DeviceId): Promise<boolean> {
    return this.requireProvider().healthCheck(deviceId)
  }

  /** 为一个运行实例申请设备租约。
 * @param deviceId - device to lease.
 * @param runId - run that owns the lease.
 * @returns - completion after the lease is acquired.
 */
  reserve(deviceId: DeviceId, runId: RunId): Promise<void> {
    return this.requireProvider().reserve(deviceId, runId)
  }

  /** 提交已由 Runtime 校验的设备操作。
 * @param request - validated device operation request.
 * @returns - provider receipt for the operation.
 */
  execute(request: DeviceOperationRequest): Promise<DeviceReceipt> {
    return this.requireProvider().execute(request)
  }

  /** 查询设备当前状态。
 * @param deviceId - device to inspect.
 * @returns - current device view, when registered.
 */
  status(deviceId: DeviceId): DeviceView | undefined {
    return this.requireProvider().status(deviceId)
  }

  /** 请求安全停止。
 * @param request - device operation to stop.
 * @returns - provider receipt for the stop request.
 */
  stop(request: Pick<DeviceOperationRequest, 'deviceId' | 'runId' | 'operationId'>): Promise<DeviceReceipt> {
    return this.requireProvider().stop(request)
  }

  /** 释放运行实例持有的设备租约。
 * @param deviceId - device whose lease is released.
 * @param runId - run that owns the lease.
 * @returns - completion after the lease is released.
 */
  release(deviceId: DeviceId, runId: RunId): Promise<void> {
    return this.requireProvider().release(deviceId, runId)
  }

  private requireProvider(): LabDeviceProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-device')
    return this.provider
  }
}

export default LabDeviceService
