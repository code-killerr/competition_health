/** 实验受控运行时 Service Definition；Provider 负责 ExecutionGraph 和持久状态。 */

import { Context, Service } from '@deepseek-ai/cordis'
import {
  LabDuplicateProviderError,
  LabProviderUnavailableError,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { ExperimentId, OperationId, PlanId, PlanStepId, RunId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ApprovePlanRequest,
  ExperimentRequest,
  LabRuntimeProvider,
  RunView,
} from './types.ts'

export type * from './types.ts'
export { validateRuntimeEvidence, validatedObservation, type RuntimeValidationResult } from './validation.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    labRuntime: LabRuntimeService
  }
}

/** 受控实验运行时，只允许从已注册 Provider 进入执行。 */
export class LabRuntimeService extends Service {
  private provider: LabRuntimeProvider | undefined

  constructor(ctx: Context) {
    super(ctx, 'labRuntime')
  }

  /** 注册本进程唯一的 Runtime Provider。
 * @param provider - provider that owns controlled execution state.
 * @returns - disposer for the registered provider.
 */
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

  /** 创建实验请求。
 * @param request - experiment request to register.
 * @returns - completion after the request is stored.
 */
  createExperiment(request: ExperimentRequest): Promise<void> {
    return this.requireProvider().createExperiment(request)
  }

  /** 记录计划及 Skill 的人工批准。
 * @param request - approved plan, Skill revisions, and optional execution graph inputs.
 * @returns - completion after approval is stored.
 */
  approvePlan(request: ApprovePlanRequest): Promise<void> {
    return this.requireProvider().approvePlan(request)
  }

  /** 从批准的计划启动运行。
 * @param experimentId - experiment to run.
 * @param planId - approved plan revision.
 * @returns - newly created or existing run view.
 */
  startRun(experimentId: ExperimentId, planId: PlanId): Promise<RunView> {
    return this.requireProvider().startRun(experimentId, planId)
  }

  /** 提交人工步骤证据，或批准需要人工门禁的设备步骤。
 * @param runId - run receiving the evidence.
 * @param evidence - evidence strings supplied by a human or operation.
 * @param confirmedBy - accountable confirmer.
 * @param stepId - optional step identity for a waiting operation.
 * @param operationId - optional operation identity for an idempotent confirmation.
 * @returns - updated run view.
 */
  confirmStep(
    runId: RunId,
    evidence: readonly string[],
    confirmedBy: string,
    stepId?: PlanStepId,
    operationId?: OperationId,
  ): Promise<RunView> {
    return this.requireProvider().confirmStep(runId, evidence, confirmedBy, stepId, operationId)
  }

  /** 推进当前执行图步骤；设备步骤只能通过 Lab Device Service 执行。
 * @param runId - run whose current graph step should advance.
 * @returns - updated run view.
 */
  executeNextStep(runId: RunId): Promise<RunView> {
    return this.requireProvider().executeNextStep(runId)
  }

  /** 请求安全停止。
 * @param runId - run to stop.
 * @param requestedBy - actor requesting the stop.
 * @returns - stopped run view.
 */
  stopRun(runId: RunId, requestedBy: string): Promise<RunView> {
    return this.requireProvider().stopRun(runId, requestedBy)
  }

  /** 读取运行状态。
 * @param experimentId - experiment whose run is requested.
 * @returns - run view, when one exists.
 */
  getRun(experimentId: ExperimentId): RunView | undefined {
    return this.requireProvider().getRun(experimentId)
  }

  /** 生成带证据的实验报告。
 * @param runId - run to report.
 * @returns - structured report fields and observations.
 */
  buildReport(runId: RunId): Promise<Readonly<Record<string, unknown>>> {
    return this.requireProvider().buildReport(runId)
  }

  private requireProvider(): LabRuntimeProvider {
    if (this.provider === undefined) throw new LabProviderUnavailableError('lab-runtime')
    return this.provider
  }
}

export default LabRuntimeService
