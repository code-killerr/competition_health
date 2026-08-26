/** 实验受控 Runtime 的本地进程内 Provider。 */

import { Context } from '@deepseek-ai/cordis'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type {
  ExperimentCacheProjection,
  ExperimentId,
  OperationId,
  OperationKind,
  PlanId,
  PlanParameter,
  PlanStepId,
  RunId,
  SkillRevisionId,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceOperationRequest, LabDeviceProvider } from '@deepseek-ai/dsh-experimental-lab-device'
import type {
  ApprovePlanRequest,
  ExecutionGraph,
  ExecutionStepSpec,
  ExperimentRequest,
  LabRuntimeProvider,
  RunView,
  RuntimeObservation,
} from '@deepseek-ai/dsh-experimental-lab-runtime'

/** Cordis 插件名称。 */
export const name = 'lab-runtime-local'
/** 依赖 Runtime 和 Lab Device Service。 */
export const inject = ['labRuntime', 'labDevices']

type DeviceGateway = Pick<LabDeviceProvider, 'healthCheck' | 'reserve' | 'execute' | 'stop' | 'release'>

interface ApprovedPlan {
  readonly request: ApprovePlanRequest
  readonly executionGraph: ExecutionGraph
}

interface StoredExperiment {
  readonly request: ExperimentRequest
  approvedPlan?: ApprovedPlan
  run?: RunView
}

/** 可测试的本地 Runtime Provider。 */
export class LocalLabRuntimeProvider implements LabRuntimeProvider {
  /** Provider name exposed to the Runtime Service. */
  readonly name = 'local-memory'
  private readonly experiments = new Map<ExperimentId, StoredExperiment>()
  private runCounter = 0
  private readonly executors: ReadonlyMap<ControlledOperationKind, OperationExecutor>

  constructor(private readonly devices?: DeviceGateway) {
    this.executors = new Map([
      ['device', (experiment, run, step) => this.executeDeviceStep(experiment, run, step)],
      ['human', (experiment, run, step) => this.waitForConfirmation(experiment, run, step)],
      ['approval', (experiment, run, step) => this.waitForConfirmation(experiment, run, step)],
    ])
  }

  /** 登记一个实验请求。
 * @param request - experiment request to store.
 */
  async createExperiment(request: ExperimentRequest): Promise<void> {
    await Promise.resolve()
    if (request.objective.trim().length === 0) throw new Error('experiment objective must be non-blank')
    if (this.experiments.has(request.experimentId)) throw new Error('experiment "' + request.experimentId + '" already exists')
    this.experiments.set(request.experimentId, { request })
  }

  /** 将批准计划和 Skill 快照冻结为不可变 ExecutionGraph。
 * @param request - approved plan and immutable execution inputs.
 */
  async approvePlan(request: ApprovePlanRequest): Promise<void> {
    await Promise.resolve()
    const experiment = this.requireExperiment(request.experimentId)
    if (request.planId.trim().length === 0) throw new Error('plan id must be non-blank')
    if (request.approvedBy.trim().length === 0) throw new Error('plan approval requires an accountable reviewer')
    if (request.skillRevisionIds.length === 0) throw new Error('plan approval requires at least one Skill revision')
    if (experiment.run !== undefined) throw new Error('a plan cannot be changed after a run has started')

    const steps = [...request.executionSteps ?? []]
    const snapshots = [...request.skillSnapshots ?? []]
    this.validateGraphInputs(request.skillRevisionIds, steps, snapshots)
    const executionGraph: ExecutionGraph = {
      version: 1,
      planId: request.planId,
      skillSnapshots: snapshots.map(snapshot => ({ ...snapshot, status: 'ACTIVE' as const })),
      steps: steps.map(step => cloneStep(step)),
    }
    const approvedPlan: ApprovedPlan = {
      request: {
        experimentId: request.experimentId,
        planId: request.planId,
        approvedBy: request.approvedBy,
        skillRevisionIds: [...request.skillRevisionIds],
        ...steps.length === 0 ? {} : { executionSteps: steps.map(step => cloneStep(step)) },
        ...snapshots.length === 0 ? {} : { skillSnapshots: snapshots.map(snapshot => ({ ...snapshot })) },
      },
      executionGraph,
    }
    experiment.approvedPlan = approvedPlan
  }

  /** 从已批准计划创建一个锁定运行实例。
 * @param experimentId - experiment to run.
 * @param planId - approved plan revision.
 * @returns - newly created run view.
 */
  async startRun(experimentId: ExperimentId, planId: PlanId): Promise<RunView> {
    await Promise.resolve()
    const experiment = this.requireExperiment(experimentId)
    const approvedPlan = experiment.approvedPlan
    if (approvedPlan?.request.planId !== planId) throw new Error('only the approved plan revision can start a run')
    if (experiment.run !== undefined) throw new Error('an experiment already has an active or completed run')

    const runId = brandId<'RunId'>('run-' + String(++this.runCounter))
    const firstStep = approvedPlan.executionGraph.steps[0]
    const runStatus = firstStep === undefined ? 'WAITING_CONFIRMATION' : initialStatus(firstStep)
    const view = this.view(
      experimentId,
      planId,
      runId,
      'LOCKED',
      runStatus,
      approvedPlan.executionGraph,
      [],
      firstStep?.stepId,
      approvedPlan.request.skillRevisionIds,
    )
    experiment.run = view
    return cloneRun(view)
  }

  /** 推进当前执行图中的一个受控步骤。
 * @param runId - run whose current graph step should advance.
 * @returns - updated run view.
 */
  async executeNextStep(runId: RunId): Promise<RunView> {
    await Promise.resolve()
    const experiment = this.findByRun(runId)
    const run = this.requireRun(experiment)
    if (isTerminal(run.runStatus)) throw new Error('run is already in a terminal state')
    const step = this.currentStep(run)
    if (step === undefined) throw new Error('run has no execution steps')

    const approvalObservation = run.observations.find(observation =>
      observation.stepId === step.stepId && (observation.status === 'WAITING' || observation.status === 'COMPLETED') && observation.valid,
    )
    if (step.requiresApproval && approvalObservation === undefined) {
      const waiting: RuntimeObservation = {
        stepId: step.stepId,
        operationId: operationIdFor(requireRunId(run), step.stepId, 'approval'),
        valid: true,
        evidence: [],
        status: 'WAITING',
      }
      const next = this.view(
        run.experimentId,
        run.planId,
        requireRunId(run),
        'LOCKED',
        'WAITING_CONFIRMATION',
        run.executionGraph,
        [...run.observations, waiting],
        step.stepId,
        run.cache.skillRevisionIds,
      )
      experiment.run = next
      return cloneRun(next)
    }

    const executor = isControlledOperation(step.operationKind) ? this.executors.get(step.operationKind) : undefined
    if (executor === undefined) {
      const observation = failedObservation(step, requireRunId(run), 'operation kind "' + step.operationKind + '" is not executable by Lab Runtime')
      return this.finishFailedStep(experiment, run, step, observation)
    }
    return executor(experiment, run, step)
  }

  /** 确认人工步骤，或批准带人工门禁的设备步骤。
 * @param runId - run receiving evidence.
 * @param evidence - evidence strings supplied by a human or operation.
 * @param confirmedBy - accountable confirmer.
 * @param stepId - optional step identity for a waiting operation.
 * @param operationId - optional idempotency identity.
 * @returns - updated run view.
 */
  async confirmStep(
    runId: RunId,
    evidence: readonly string[],
    confirmedBy: string,
    stepId?: PlanStepId,
    operationId?: OperationId,
  ): Promise<RunView> {
    await Promise.resolve()
    if (evidence.length === 0) throw new Error('step confirmation requires evidence')
    if (confirmedBy.trim().length === 0) throw new Error('step confirmation requires an accountable actor')
    const experiment = this.findByRun(runId)
    const run = this.requireRun(experiment)
    if (run.runStatus !== 'WAITING_CONFIRMATION') throw new Error('run is not waiting for confirmation')

    const current = this.currentStep(run)
    if (current === undefined) {
      const next = this.view(
        run.experimentId,
        run.planId,
        requireRunId(run),
        'LOCKED',
        'COMPLETED',
        run.executionGraph,
        run.observations,
        undefined,
        run.cache.skillRevisionIds,
      )
      experiment.run = next
      return cloneRun(next)
    }
    if (stepId !== undefined && stepId !== current.stepId) throw new Error('confirmation step does not match the current step')

    const waitingApproval = run.observations.find(observation =>
      observation.stepId === current.stepId && observation.status === 'WAITING' && observation.valid,
    )
    const confirmedOperationId = operationId ?? operationIdFor(requireRunId(run), current.stepId, waitingApproval === undefined ? 'manual' : 'approval')
    const confirmedObservation: RuntimeObservation = {
      stepId: current.stepId,
      operationId: confirmedOperationId,
      valid: true,
      evidence: [...evidence],
      status: 'COMPLETED',
    }

    if (current.requiresApproval && current.operationKind === 'device' && waitingApproval !== undefined) {
      const observations = run.observations.map(observation =>
        observation === waitingApproval ? confirmedObservation : observation,
      )
      const next = this.view(
        run.experimentId,
        run.planId,
        requireRunId(run),
        'LOCKED',
        'RUNNING',
        run.executionGraph,
        observations,
        current.stepId,
        run.cache.skillRevisionIds,
      )
      experiment.run = next
      return cloneRun(next)
    }

    const next = this.advance(
      run,
      current,
      [...run.observations.filter(observation => observation.stepId !== current.stepId), confirmedObservation],
    )
    experiment.run = next
    return cloneRun(next)
  }

  /** 将运行转为安全停止终态，并停止当前持有的设备租约。
 * @param runId - run to stop.
 * @param requestedBy - actor requesting the stop.
 * @returns - stopped run view.
 */
  async stopRun(runId: RunId, requestedBy: string): Promise<RunView> {
    if (requestedBy.trim().length === 0) throw new Error('stop request requires an accountable actor')
    const experiment = this.findByRun(runId)
    const run = this.requireRun(experiment)
    const current = this.currentStep(run)
    let observations = [...run.observations]
    const waitingExecution = current === undefined ? undefined : run.observations.find(observation =>
      observation.stepId === current.stepId && observation.status === 'WAITING' && !observation.valid,
    )
    if (waitingExecution !== undefined && current?.deviceId !== undefined && this.devices !== undefined) {
      await this.devices.stop({
        deviceId: current.deviceId,
        runId,
        operationId: waitingExecution.operationId,
      })
      await this.devices.release(current.deviceId, runId)
      observations = observations.map(observation =>
        observation === waitingExecution
          ? { ...observation, status: 'STOPPED', valid: false }
          : observation,
      )
    }
    const next = this.view(
      run.experimentId,
      run.planId,
      requireRunId(run),
      'LOCKED',
      'STOPPED',
      run.executionGraph,
      observations,
      current?.stepId,
      run.cache.skillRevisionIds,
    )
    experiment.run = next
    return cloneRun(next)
  }

  /** 按实验读取当前运行视图。
 * @param experimentId - experiment whose run is requested.
 * @returns - run view, when one exists.
 */
  getRun(experimentId: ExperimentId): RunView | undefined {
    const run = this.experiments.get(experimentId)?.run
    return run === undefined ? undefined : cloneRun(run)
  }

  /** 生成包含执行图和结构化观察的审计报告。
 * @param runId - run to report.
 * @returns - structured report fields and observations.
 */
  async buildReport(runId: RunId): Promise<Readonly<Record<string, unknown>>> {
    await Promise.resolve()
    const experiment = this.findByRun(runId)
    const run = this.requireRun(experiment)
    return {
      experimentId: run.experimentId,
      planId: run.planId,
      runId,
      status: run.runStatus,
      executionGraph: cloneGraph(run.executionGraph),
      observations: run.observations.map(observation => cloneObservation(observation)),
      evidenceMode: run.executionGraph.steps.length === 0 ? 'MANUAL' : 'CONTROLLED',
    }
  }

  /** 清理进程内状态。 */
  dispose(): void {
    this.experiments.clear()
  }

  private async waitForConfirmation(experiment: StoredExperiment, run: RunView, step: ExecutionStepSpec): Promise<RunView> {
    await Promise.resolve()
    const next = this.view(
      run.experimentId,
      run.planId,
      requireRunId(run),
      'LOCKED',
      'WAITING_CONFIRMATION',
      run.executionGraph,
      run.observations,
      step.stepId,
      run.cache.skillRevisionIds,
    )
    experiment.run = next
    return cloneRun(next)
  }
  private async executeDeviceStep(experiment: StoredExperiment, run: RunView, step: ExecutionStepSpec): Promise<RunView> {
    const operationId = operationIdFor(requireRunId(run), step.stepId, 'device')
    const deviceId = step.deviceId
    if (deviceId === undefined) {
      return this.finishFailedStep(experiment, run, step, failedObservation(step, requireRunId(run), 'device step requires a device id'))
    }
    if (this.devices === undefined) {
      return this.finishFailedStep(experiment, run, step, failedObservation(step, requireRunId(run), 'Lab Device Service is unavailable'))
    }

    let reserved = false
    let keepLease = false
    let failure: unknown
    let receipt: Awaited<ReturnType<DeviceGateway['execute']>> | undefined
    try {
      if (!await this.devices.healthCheck(deviceId)) {
        failure = new Error('device "' + deviceId + '" failed health check')
      } else {
        await this.devices.reserve(deviceId, requireRunId(run))
        reserved = true
        const request: DeviceOperationRequest = {
          deviceId,
          runId: requireRunId(run),
          operationId,
          idempotencyKey: requireRunId(run) + ':' + step.stepId,
          parameters: cloneParameters(step.parameters),
        }
        receipt = await this.devices.execute(request)
        keepLease = receipt.status === 'accepted'
      }
    } catch (error) {
      failure = error
    }
    if (reserved && !keepLease) {
      try {
        await this.devices.release(deviceId, requireRunId(run))
      } catch (releaseError) {
        failure = new Error(errorMessage(failure) + '; device release failed: ' + errorMessage(releaseError))
      }
    }
    if (failure !== undefined) {
      return this.finishFailedStep(experiment, run, step, failedObservation(step, requireRunId(run), errorMessage(failure)))
    }
    if (receipt === undefined) {
      return this.finishFailedStep(experiment, run, step, failedObservation(step, requireRunId(run), 'device did not return a receipt'))
    }
    if (receipt.status === 'completed') {
      const observation: RuntimeObservation = {
        stepId: step.stepId,
        operationId: receipt.operationId,
        valid: true,
        evidence: [...receipt.evidence],
        status: 'COMPLETED',
      }
      return this.advanceAndStore(experiment, run, step, observation)
    }
    if (receipt.status === 'accepted') {
      const observation: RuntimeObservation = {
        stepId: step.stepId,
        operationId: receipt.operationId,
        valid: false,
        evidence: [...receipt.evidence],
        status: 'WAITING',
      }
      const next = this.view(
        run.experimentId,
        run.planId,
        requireRunId(run),
        'LOCKED',
        'RUNNING',
        run.executionGraph,
        [...run.observations.filter(item => item.stepId !== step.stepId), observation],
        step.stepId,
        run.cache.skillRevisionIds,
      )
      experiment.run = next
      return cloneRun(next)
    }
    const status = receipt.status === 'stopped' ? 'STOPPED' : 'FAILED'
    const observation: RuntimeObservation = {
      stepId: step.stepId,
      operationId: receipt.operationId,
      valid: false,
      evidence: [...receipt.evidence],
      status,
      ...status === 'FAILED' ? { error: 'device operation failed' } : {},
    }
    if (status === 'STOPPED') {
      const next = this.view(
        run.experimentId,
        run.planId,
        requireRunId(run),
        'LOCKED',
        'STOPPED',
        run.executionGraph,
        [...run.observations.filter(item => item.stepId !== step.stepId), observation],
        step.stepId,
        run.cache.skillRevisionIds,
      )
      experiment.run = next
      return cloneRun(next)
    }
    return this.finishFailedStep(experiment, run, step, observation)
  }

  private finishFailedStep(
    experiment: StoredExperiment,
    run: RunView,
    step: ExecutionStepSpec,
    observation: RuntimeObservation,
  ): RunView {
    const nextStatus = step.failurePolicy === 'STOP' ? 'STOPPED' : 'BLOCKED'
    const next = this.view(
      run.experimentId,
      run.planId,
      requireRunId(run),
      'LOCKED',
      nextStatus,
      run.executionGraph,
      [...run.observations.filter(item => item.stepId !== step.stepId), observation],
      step.stepId,
      run.cache.skillRevisionIds,
    )
    experiment.run = next
    return cloneRun(next)
  }

  private advanceAndStore(experiment: StoredExperiment, run: RunView, step: ExecutionStepSpec, observation: RuntimeObservation): RunView {
    const next = this.advance(run, step, [
      ...run.observations.filter(item => item.stepId !== step.stepId),
      observation,
    ])
    experiment.run = next
    return cloneRun(next)
  }

  private advance(run: RunView, step: ExecutionStepSpec, observations: readonly RuntimeObservation[]): RunView {
    const index = run.executionGraph.steps.findIndex(candidate => candidate.stepId === step.stepId)
    const nextStep = run.executionGraph.steps[index + 1]
    const nextStatus = nextStep === undefined ? 'COMPLETED' : initialStatus(nextStep)
    return this.view(
      run.experimentId,
      run.planId,
      requireRunId(run),
      'LOCKED',
      nextStatus,
      run.executionGraph,
      observations,
      nextStep?.stepId,
      run.cache.skillRevisionIds,
    )
  }

  private validateGraphInputs(
    skillRevisionIds: readonly SkillRevisionId[],
    steps: readonly ExecutionStepSpec[],
    snapshots: readonly { readonly revisionId: SkillRevisionId; readonly status: string }[],
  ): void {
    const skillIds = new Set(skillRevisionIds)
    const stepIds = new Set<PlanStepId>()
    for (const step of steps) {
      if (stepIds.has(step.stepId)) throw new Error('duplicate execution step "' + step.stepId + '"')
      stepIds.add(step.stepId)
      if (!skillIds.has(step.skillRevisionId)) throw new Error('execution step "' + step.stepId + '" references an unapproved Skill revision')
      if (step.operationResource.trim().length === 0) throw new Error('execution step "' + step.stepId + '" requires an operation resource')
      if (step.operationKind === 'device' && step.deviceId === undefined) {
        throw new Error('device step "' + step.stepId + '" requires a device id')
      }
    }
    const snapshotIds = new Set<SkillRevisionId>()
    for (const snapshot of snapshots) {
      if (snapshot.status !== 'ACTIVE') throw new Error('Skill snapshot "' + snapshot.revisionId + '" is not ACTIVE')
      if (!skillIds.has(snapshot.revisionId)) throw new Error('Skill snapshot "' + snapshot.revisionId + '" is not approved')
      if (snapshotIds.has(snapshot.revisionId)) throw new Error('duplicate Skill snapshot "' + snapshot.revisionId + '"')
      snapshotIds.add(snapshot.revisionId)
    }
  }

  private currentStep(run: RunView): ExecutionStepSpec | undefined {
    const stepId = run.currentStepId
    return stepId === undefined ? undefined : run.executionGraph.steps.find(step => step.stepId === stepId)
  }

  private requireExperiment(experimentId: ExperimentId): StoredExperiment {
    const experiment = this.experiments.get(experimentId)
    if (experiment === undefined) throw new Error('unknown experiment "' + experimentId + '"')
    return experiment
  }

  private findByRun(runId: RunId): StoredExperiment {
    const experiment = [...this.experiments.values()].find(item => item.run?.runId === runId)
    if (experiment === undefined) throw new Error('unknown run "' + runId + '"')
    return experiment
  }

  private requireRun(experiment: StoredExperiment): RunView {
    if (experiment.run === undefined) throw new Error('run has not started')
    return experiment.run
  }

  private view(
    experimentId: ExperimentId,
    planId: PlanId,
    runId: RunId,
    planStatus: 'LOCKED',
    runStatus: RunView['runStatus'],
    executionGraph: ExecutionGraph,
    observations: readonly RuntimeObservation[],
    currentStepId: PlanStepId | undefined,
    skillRevisionIds: readonly SkillRevisionId[],
  ): RunView {
    if (runStatus === undefined) throw new Error('runtime view requires a run status')
    const updatedBy = brandId<'SessionId'>('lab-runtime-local:' + experimentId)
    const cache: ExperimentCacheProjection = {
      version: 1,
      experimentId,
      planId,
      runId,
      status: runStatus,
      knowledgeCitations: [],
      skillRevisionIds: [...skillRevisionIds],
      updatedBy,
    }
    return {
      experimentId,
      planId,
      runId,
      planStatus,
      runStatus,
      executionGraph: cloneGraph(executionGraph),
      observations: observations.map(observation => cloneObservation(observation)),
      ...currentStepId === undefined ? {} : { currentStepId },
      cache,
    }
  }
}

type ControlledOperationKind = Extract<OperationKind, 'device' | 'human' | 'approval'>
type OperationExecutor = (experiment: StoredExperiment, run: RunView, step: ExecutionStepSpec) => Promise<RunView>

function isControlledOperation(kind: OperationKind): kind is ControlledOperationKind {
  return kind === 'device' || kind === 'human' || kind === 'approval'
}
function requireRunId(run: RunView): RunId {
  const runId = run.runId
  if (runId === undefined) throw new Error('runtime view requires a run id')
  return runId
}
function initialStatus(step: ExecutionStepSpec): 'RUNNING' | 'WAITING_CONFIRMATION' {
  return step.operationKind === 'human' || step.operationKind === 'approval' || step.requiresApproval
    ? 'WAITING_CONFIRMATION'
    : 'RUNNING'
}

function isTerminal(status: RunView['runStatus']): boolean {
  return status === 'COMPLETED' || status === 'STOPPED' || status === 'FAILED' || status === 'BLOCKED'
}

function operationIdFor(runId: RunId, stepId: PlanStepId, kind: 'device' | 'manual' | 'approval'): OperationId {
  return brandId<'OperationId'>('operation-' + kind + '-' + runId + '-' + stepId)
}

function failedObservation(step: ExecutionStepSpec, runId: RunId, error: string): RuntimeObservation {
  return {
    stepId: step.stepId,
    operationId: operationIdFor(runId, step.stepId, 'device'),
    valid: false,
    evidence: [],
    status: 'FAILED',
    error,
  }
}

function cloneStep(step: ExecutionStepSpec): ExecutionStepSpec {
  return {
    stepId: step.stepId,
    skillRevisionId: step.skillRevisionId,
    operationKind: step.operationKind,
    operationResource: step.operationResource,
    parameters: cloneParameters(step.parameters),
    requiresApproval: step.requiresApproval,
    expectedEvidence: [...step.expectedEvidence],
    failurePolicy: step.failurePolicy,
    ...step.deviceId === undefined ? {} : { deviceId: step.deviceId },
  }
}

function cloneGraph(graph: ExecutionGraph): ExecutionGraph {
  return {
    version: 1,
    planId: graph.planId,
    skillSnapshots: graph.skillSnapshots.map(snapshot => ({ ...snapshot })),
    steps: graph.steps.map(step => cloneStep(step)),
  }
}

function cloneObservation(observation: RuntimeObservation): RuntimeObservation {
  return {
    stepId: observation.stepId,
    operationId: observation.operationId,
    valid: observation.valid,
    evidence: [...observation.evidence],
    status: observation.status,
    ...observation.error === undefined ? {} : { error: observation.error },
  }
}

function cloneRun(run: RunView): RunView {
  return {
    ...run,
    executionGraph: cloneGraph(run.executionGraph),
    observations: run.observations.map(observation => cloneObservation(observation)),
    ...run.currentStepId === undefined ? {} : { currentStepId: run.currentStepId },
    cache: {
      ...run.cache,
      knowledgeCitations: [...run.cache.knowledgeCitations],
      skillRevisionIds: [...run.cache.skillRevisionIds],
    },
  }
}

function cloneParameters(parameters: Readonly<Record<string, PlanParameter>>): Readonly<Record<string, PlanParameter>> {
  return { ...parameters }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 将本地 Runtime Provider 挂载到 Runtime Service。 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const provider = new LocalLabRuntimeProvider(ctx.labDevices)
    return ctx.labRuntime.registerProvider(provider)
  }, 'lab-runtime-local.provider')
}
