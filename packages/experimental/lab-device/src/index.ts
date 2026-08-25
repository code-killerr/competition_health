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

  /** 注册本进程唯一的设备 Provider。 */
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

  /** 查询设备及能力，只读。 */
  listDevices(): readonly DeviceView[] {
    return this.requireProvider().listDevices()
  }

  /** 检查设备健康状态。 */
  healthCheck(deviceId: DeviceId): Promise<boolean> {
    return this.requireProvider().healthCheck(deviceId)
  }

  /** 为一个运行实例申请设备租约。 */
  reserve(deviceId: DeviceId, runId: RunId): Promise<void> {
    return this.requireProvider().reserve(deviceId, runId)
  }

  /** 提交已由 Runtime 校验的设备操作。 */
  execute(request: DeviceOperationRequest): Promise<DeviceReceipt> {
    return this.requireProvider().execute(request)
  }

  /** 查询设备当前状态。 */
  status(deviceId: DeviceId): DeviceView | undefined {
    return this.requireProvider().status(deviceId)
  }

  /** 请求安全停止。 */
  stop(request: Pick<DeviceOperationRequest, 'deviceId' | 'runId' | 'operationId'>): Promise<DeviceReceipt> {
    return this.requireProvider().stop(request)
  }

  /** 释放运行实例持有的设备租约。 */
  release(deviceId: DeviceId, runId: RunId): Promise<void> {
    return this.requireProvider().release(deviceId, runId)
  }

  private requireProvider(): LabDeviceProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-device')
    return this.provider
  }
}

export default LabDeviceService
