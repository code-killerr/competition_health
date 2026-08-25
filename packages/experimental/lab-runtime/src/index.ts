/** 实验受控运行时 Service Definition；Provider 负责 ExecutionGraph 和持久状态。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ExperimentId, PlanId, RunId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ApprovePlanRequest,
  ExperimentRequest,
  LabRuntimeProvider,
  RunView,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labRuntime: LabRuntimeService
  }
}

/** 受控实验运行时，只允许从已批准计划进入执行。 */
export class LabRuntimeService extends Service {
  private provider: LabRuntimeProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labRuntime')
  }

  /** 注册本进程唯一的 Runtime Provider。 */
  registerProvider(provider: LabRuntimeProvider): () => void {
    if (this.provider !== undefined) throw new LabDuplicateProviderError('lab-runtime')
    const dispose = this.ctx.effect(() => {
      this.provider = provider
      return () => {
        if (this.provider === provider) this.provider = undefined
        return provider.dispose?.()
      }
    }, 'labRuntime.registerProvider()')
    return () => void dispose()
  }

  /** 创建实验请求。 */
  createExperiment(request: ExperimentRequest): Promise<void> {
    return this.requireProvider().createExperiment(request)
  }

  /** 记录计划及 Skill 的人工批准。 */
  approvePlan(request: ApprovePlanRequest): Promise<void> {
    return this.requireProvider().approvePlan(request)
  }

  /** 从批准的计划启动运行。 */
  startRun(experimentId: ExperimentId, planId: PlanId): Promise<RunView> {
    return this.requireProvider().startRun(experimentId, planId)
  }

  /** 提交人工步骤证据。 */
  confirmStep(runId: RunId, evidence: readonly string[], confirmedBy: string): Promise<RunView> {
    return this.requireProvider().confirmStep(runId, evidence, confirmedBy)
  }

  /** 请求安全停止。 */
  stopRun(runId: RunId, requestedBy: string): Promise<RunView> {
    return this.requireProvider().stopRun(runId, requestedBy)
  }

  /** 读取运行状态。 */
  getRun(experimentId: ExperimentId): RunView | undefined {
    return this.requireProvider().getRun(experimentId)
  }

  /** 生成带证据的实验报告。 */
  buildReport(runId: RunId): Promise<Readonly<Record<string, unknown>>> {
    return this.requireProvider().buildReport(runId)
  }

  private requireProvider(): LabRuntimeProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-runtime')
    return this.provider
  }
}

export default LabRuntimeService
