/** 实验运行时的计划锁定、运行状态和 Provider 接口。 */

import type {
  ExperimentCacheProjection,
  ExperimentId,
  PlanId,
  PlanStatus,
  RunId,
  RunStatus,
  SkillRevisionId,
} from '@deepseek-ai/dsh-experimental-lab-domain'

/** 用户实验需求。 */
export interface ExperimentRequest {
  readonly experimentId: ExperimentId
  readonly objective: string
  readonly expectedOutputs: readonly string[]
}

/** 计划批准请求。 */
export interface ApprovePlanRequest {
  readonly experimentId: ExperimentId
  readonly planId: PlanId
  readonly approvedBy: string
  readonly skillRevisionIds: readonly SkillRevisionId[]
}

/** 运行状态视图。 */
export interface RunView {
  readonly experimentId: ExperimentId
  readonly planId: PlanId
  readonly runId?: RunId
  readonly planStatus: PlanStatus
  readonly runStatus?: RunStatus
  readonly cache: ExperimentCacheProjection
}

/** Runtime Provider 的最小 Service Definition。 */
export interface LabRuntimeProvider {
  readonly name: string
  createExperiment(request: ExperimentRequest): Promise<void>
  approvePlan(request: ApprovePlanRequest): Promise<void>
  startRun(experimentId: ExperimentId, planId: PlanId): Promise<RunView>
  confirmStep(runId: RunId, evidence: readonly string[], confirmedBy: string): Promise<RunView>
  stopRun(runId: RunId, requestedBy: string): Promise<RunView>
  getRun(experimentId: ExperimentId): RunView | undefined
  buildReport(runId: RunId): Promise<Readonly<Record<string, unknown>>>
  dispose?(): Promise<void> | void
}
