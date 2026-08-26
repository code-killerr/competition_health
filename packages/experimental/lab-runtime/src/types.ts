/** 实验运行时的计划锁定、运行状态和受控步骤 Provider 接口。 */

import type {
  DeviceId,
  ExperimentCacheProjection,
  ExperimentId,
  OperationId,
  OperationKind,
  PlanId,
  PlanParameter,
  PlanStepId,
  PlanStatus,
  RunId,
  RunStatus,
  SkillRevisionId,
  SkillSnapshot,
} from '@deepseek-ai/dsh-experimental-lab-domain'

/** 用户实验需求。 */
export interface ExperimentRequest {
  readonly experimentId: ExperimentId
  readonly objective: string
  readonly expectedOutputs: readonly string[]
}

/** 受控步骤失败后的处理策略。 */
export type RuntimeFailurePolicy = 'BLOCK' | 'STOP' | 'REPLAN'

/** ExecutionGraph 中锁定的声明式步骤。 */
export interface ExecutionStepSpec {
  readonly stepId: PlanStepId
  readonly skillRevisionId: SkillRevisionId
  readonly operationKind: OperationKind
  readonly operationResource: string
  readonly deviceId?: DeviceId
  readonly parameters: Readonly<Record<string, PlanParameter>>
  readonly requiresApproval: boolean
  readonly expectedEvidence: readonly string[]
  readonly failurePolicy: RuntimeFailurePolicy
}

/** 从批准计划和 Skill 快照生成的不可变执行输入。 */
export interface ExecutionGraph {
  readonly version: 1
  readonly planId: PlanId
  readonly skillSnapshots: readonly SkillSnapshot[]
  readonly steps: readonly ExecutionStepSpec[]
}

/** 一次受控步骤执行或人工确认的结构化观察。 */
export interface RuntimeObservation {
  readonly stepId: PlanStepId
  readonly operationId: OperationId
  readonly valid: boolean
  readonly evidence: readonly string[]
  readonly status: 'WAITING' | 'COMPLETED' | 'FAILED' | 'STOPPED'
  readonly error?: string
  readonly replanRequested?: boolean
}

/** 一次运行反馈，供报告、Web Consumer 和后续重规划入口复用。 */
export interface RuntimeFeedback {
  readonly status: RunStatus
  readonly valid: boolean
  readonly summary: string
  readonly issues: readonly string[]
  readonly replanRequested: boolean
}

/** 需要 Planner 重新生成计划的结构化请求。 */
export interface ReplanRequest {
  readonly runId: RunId
  readonly stepId: PlanStepId
  readonly reason: string
}

/** 计划批准请求。 */
export interface SkillSnapshotInput extends Omit<SkillSnapshot, 'status'> {
  readonly status: string
}

/** Plan approval request and optional immutable execution inputs. */
export interface ApprovePlanRequest {
  readonly experimentId: ExperimentId
  readonly planId: PlanId
  readonly approvedBy: string
  readonly skillRevisionIds: readonly SkillRevisionId[]
  readonly executionSteps?: readonly ExecutionStepSpec[]
  readonly skillSnapshots?: readonly SkillSnapshotInput[]
}

/** Runtime 权威状态的可持久化快照；缓存投影不包含在此接口中。 */
export interface RuntimeExperimentState {
  readonly request: ExperimentRequest
  approvedPlan?: {
    readonly request: ApprovePlanRequest
    readonly executionGraph: ExecutionGraph
  }
  run?: RunView
}

/** 可替换的 Runtime 状态仓储；生产实现使用 SQLite，测试可使用内存实现。 */
export interface LabRuntimeStateStore {
  load(): Promise<readonly RuntimeExperimentState[]>
  save(state: RuntimeExperimentState): Promise<void>
  dispose?(): Promise<void> | void
}

/** 运行状态视图。 */
export interface RunView {
  readonly experimentId: ExperimentId
  readonly planId: PlanId
  readonly runId?: RunId
  readonly planStatus: PlanStatus
  readonly runStatus?: RunStatus
  readonly executionGraph: ExecutionGraph
  readonly observations: readonly RuntimeObservation[]
  readonly currentStepId?: PlanStepId
  readonly cache: ExperimentCacheProjection
  readonly feedback: RuntimeFeedback
  readonly replanRequest?: ReplanRequest
}

/** Runtime Provider 的最小 Service Definition。 */
export interface LabRuntimeProvider {
  readonly name: string
  createExperiment(request: ExperimentRequest): Promise<void>
  approvePlan(request: ApprovePlanRequest): Promise<void>
  startRun(experimentId: ExperimentId, planId: PlanId): Promise<RunView>
  confirmStep(
    runId: RunId,
    evidence: readonly string[],
    confirmedBy: string,
    stepId?: PlanStepId,
    operationId?: OperationId,
  ): Promise<RunView>
  executeNextStep(runId: RunId): Promise<RunView>
  stopRun(runId: RunId, requestedBy: string): Promise<RunView>
  getRun(experimentId: ExperimentId): RunView | undefined
  buildReport(runId: RunId): Promise<Readonly<Record<string, unknown>>>
  dispose?(): Promise<void> | void
}
