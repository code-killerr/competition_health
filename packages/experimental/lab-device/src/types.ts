/** 设备能力、租约、命令回执和 Provider 接口。 */

import type { DeviceId, OperationId, RunId, UnitValue } from '@deepseek-ai/dsh-experimental-lab-domain'

/** 设备可以接受的声明式能力。 */
export interface DeviceCapability {
  readonly name: string
  readonly parameters: Readonly<Record<string, string>>
}

/** 设备台账视图。 */
export interface DeviceView {
  readonly id: DeviceId
  readonly name: string
  readonly capabilities: readonly DeviceCapability[]
  readonly healthy: boolean
  readonly reserved: boolean
}

/** 设备操作请求，只允许 Runtime 提交已校验的操作标识。 */
export interface DeviceOperationRequest {
  readonly deviceId: DeviceId
  readonly runId: RunId
  readonly operationId: OperationId
  readonly idempotencyKey: string
  readonly parameters: Readonly<Record<string, UnitValue | string | number | boolean>>
}

/** 设备操作回执。 */
export interface DeviceReceipt {
  readonly operationId: OperationId
  readonly idempotencyKey: string
  readonly status: 'accepted' | 'completed' | 'failed' | 'stopped'
  readonly evidence: readonly string[]
}

/** 设备接入 Provider 的完整能力接缝。 */
export interface LabDeviceProvider {
  readonly name: string
  listDevices(): readonly DeviceView[]
  healthCheck(deviceId: DeviceId): Promise<boolean>
  reserve(deviceId: DeviceId, runId: RunId): Promise<void>
  execute(request: DeviceOperationRequest): Promise<DeviceReceipt>
  status(deviceId: DeviceId): DeviceView | undefined
  stop(request: Pick<DeviceOperationRequest, 'deviceId' | 'runId' | 'operationId'>): Promise<DeviceReceipt>
  release(deviceId: DeviceId, runId: RunId): Promise<void>
  dispose?(): Promise<void> | void
}
