/** 实验自动化平台最小只读 Web Consumer。 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { ExperimentId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { PlanningContext } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { RunView } from '@deepseek-ai/dsh-experimental-lab-runtime'

/** Web Consumer 的状态快照。 */
export interface LabMvpWebSnapshot {
  readonly devices: readonly DeviceView[]
  readonly planningContext?: PlanningContext
  readonly run?: RunView
}

/** Web Consumer 服务。 */
export class LabMvpWebService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'labMvpWeb')
  }

  /** 返回供 Web 层序列化的当前实验状态。
 * @param experimentId - experiment whose run state is projected.
 * @param planningContext - optional planning context to include.
 * @returns - serializable device, planning, and runtime state.
 */
  snapshot(experimentId: ExperimentId, planningContext?: PlanningContext): LabMvpWebSnapshot {
    const devices = this.ctx.labDevices.listDevices().map(device => ({
      ...device,
      capabilities: device.capabilities.map(capability => ({ ...capability, parameters: { ...capability.parameters } })),
    }))
    const run = this.ctx.labRuntime.getRun(experimentId)
    return {
      devices,
      ...planningContext === undefined ? {} : { planningContext },
      ...run === undefined ? {} : { run },
    }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    labMvpWeb: LabMvpWebService
  }
}

/** Cordis 插件名称。 */
export const name = 'lab-mvp-web'
/** 依赖实验状态 Service。 */
export const inject = ['labDevices', 'labPlanning', 'labRuntime']

/** 安装 Web Consumer 服务。 */
export function apply(ctx: Context): void {
  void ctx.plugin(LabMvpWebService)
}
