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
