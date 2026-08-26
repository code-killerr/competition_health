/** 实验自动化平台 Web Facade；浏览器只能通过本服务访问实验能力。 */

import { Context, Service } from '@deepseek-ai/cordis'
import { brandId, type ExperimentId, type ExperimentPlan, type ExperimentRequest } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { ImportStatusResult } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import type { PlanProposalResult, PlanningContext } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { ExecutionStepSpec, RunView } from '@deepseek-ai/dsh-experimental-lab-runtime'
import type { Session } from '@deepseek-ai/dsh-session'
import type { LabWebCommand, LabWebCommandResult } from './protocol.ts'

export * as Http from './http.ts'
export { parseLabWebCommand } from './protocol.ts'

export type * from './protocol.ts'

/** Web Consumer 的状态快照。 */
export interface LabMvpWebSnapshot {
  readonly knowledge: readonly ImportStatusResult[]
  readonly devices: readonly DeviceView[]
  readonly planningContext?: PlanningContext
  readonly planReviews: readonly PlanProposalResult[]
  readonly run?: RunView
  readonly report?: Readonly<Record<string, unknown>>
}

/** Web Consumer Facade 服务。 */
export class LabMvpWebService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'labMvpWeb')
  }

  /** 返回供 Web 层序列化的当前实验状态。
 * @param experimentId - experiment whose run state is projected.
 * @param planningContext - optional planning context to include.
 * @returns - serializable device, planning, and runtime state.
 */
  async snapshot(experimentId: ExperimentId, planningContext?: PlanningContext): Promise<LabMvpWebSnapshot> {
    const knowledge = await this.ctx.labKnowledge.listImportStatuses()
    const devices = this.ctx.labDevices.listDevices().map(device => ({
      ...device,
      capabilities: device.capabilities.map(capability => ({ ...capability, parameters: { ...capability.parameters } })),
    }))
    const planReviews = this.ctx.labPlanning.listProposals(experimentId)
    const run = this.ctx.labRuntime.getRun(experimentId)
    const report = run?.runId === undefined ? undefined : await this.ctx.labRuntime.buildReport(run.runId)
    return {
      knowledge,
      devices,
      ...planningContext === undefined ? {} : { planningContext },
      planReviews,
      ...run === undefined ? {} : { run },
      ...report === undefined ? {} : { report },
    }
  }

  /** 执行一个已解析的 Web 命令，并返回可序列化的领域结果。 */
  async dispatch(command: LabWebCommand): Promise<LabWebCommandResult> {
    switch (command.command) {
      case 'snapshot':
        return { kind: 'snapshot', value: await this.snapshot(command.experimentId) }
      case 'knowledge-import':
        return {
          kind: 'knowledge-import',
          value: await this.ctx.labKnowledge.importDocument({
            source: { kind: 'bytes', name: command.name, bytes: command.bytes },
            metadata: command.metadata,
          }),
        }
      case 'knowledge-search':
        return {
          kind: 'knowledge-search',
          value: {
            results: await this.ctx.labKnowledge.search(command.request),
            conflicts: await this.ctx.labKnowledge.listConflicts(command.request.experimentId),
          },
        }
      case 'experiment-create':
        await this.ctx.labRuntime.createExperiment(toRuntimeRequest(command.request))
        this.sessionFor(command)?.append('lab/experiment/requested', {
          version: 1,
          experimentId: command.request.experimentId,
          objective: command.request.objective,
          sessionId: command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous'),
        })
        return { kind: 'snapshot', value: await this.snapshot(command.request.experimentId) }
      case 'planning-context':
        return { kind: 'planning-context', value: await this.ctx.labPlanning.buildContext(command.request) }
      case 'plan-propose':
        return { kind: 'plan-proposal', value: await this.proposePlan(command) }
      case 'plan-validate':
        return { kind: 'plan-proposal', value: await this.ctx.labPlanning.validatePlan(command.planId) }
      case 'plan-approve':
        return { kind: 'plan-proposal', value: await this.approvePlan(command) }
      case 'plan-reject':
        return { kind: 'plan-rejection', value: await this.rejectPlan(command) }
      case 'skill-validate':
        return { kind: 'skill-revision', value: await this.validateSkill(command) }
      case 'skill-approve':
        return { kind: 'skill-revision', value: await this.approveSkill(command) }
      case 'skill-activate':
        return { kind: 'skill-revision', value: await this.activateSkill(command) }
      case 'run-start':
        return { kind: 'run', value: await this.startRun(command) }
      case 'run-step':
        return { kind: 'run', value: await this.advanceRun(command) }
      case 'run-confirm':
        return { kind: 'run', value: await this.confirmRunStep(command) }
      case 'run-stop':
        return { kind: 'run', value: await this.stopRun(command) }
      case 'run-report':
        return { kind: 'report', value: await this.reportRun(command) }
    }
  }

  private async proposePlan(command: Extract<LabWebCommand, { command: 'plan-propose' }>): Promise<PlanProposalResult> {
    const result = await this.ctx.labPlanning.propose(command.input)
    this.sessionFor(command)?.append('lab/plan/proposed', {
      version: 1,
      experimentId: result.plan.experimentId,
      planId: result.plan.planId,
      revision: result.plan.revision,
      ...result.plan.supersedesPlanId === undefined ? {} : { supersedesPlanId: result.plan.supersedesPlanId },
      citationIds: result.plan.citations,
      skillRevisionIds: result.skillRevisions.map(revision => revision.revisionId),
    })
    return result
  }

  private async approvePlan(command: Extract<LabWebCommand, { command: 'plan-approve' }>): Promise<PlanProposalResult> {
    const proposal = await this.ctx.labPlanning.validatePlan(command.planId)
    if (proposal.plan.experimentId !== command.experimentId) throw new Error('plan experimentId does not match request')
    if (!proposal.validation.valid || proposal.plan.status !== 'VALIDATED') throw new Error('only a validated plan can be approved')
    const skillRevisionIds = proposal.plan.steps.map(step => step.skillRevisionId)
    const skillSnapshots = await this.ctx.labSkills.snapshotForRun(skillRevisionIds)
    const executionSteps = proposal.plan.steps.map(step => this.executionStep(step))
    await this.ctx.labRuntime.approvePlan({
      experimentId: command.experimentId,
      planId: command.planId,
      approvedBy: command.approvedBy,
      skillRevisionIds,
      executionSteps,
      skillSnapshots,
    })
    const result = await this.ctx.labPlanning.approvePlan(command.planId, command.approvedBy)
    this.sessionFor(command)?.append('lab/plan/approved', {
      version: 1,
      experimentId: command.experimentId,
      planId: command.planId,
      approvedBy: command.approvedBy,
      skillRevisionIds,
    })
    return result
  }

  private async rejectPlan(command: Extract<LabWebCommand, { command: 'plan-reject' }>): Promise<PlanProposalResult> {
    const result = await this.ctx.labPlanning.rejectPlan(command.planId, command.reason)
    this.sessionFor(command)?.append('lab/plan/rejected', {
      version: 1,
      experimentId: result.plan.experimentId,
      planId: command.planId,
      rejectedBy: command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous'),
      reason: command.reason,
    })
    return result
  }

  private async validateSkill(command: Extract<LabWebCommand, { command: 'skill-validate' }>): Promise<Awaited<ReturnType<typeof this.ctx.labSkills.validateDraft>>> {
    const revision = await this.ctx.labSkills.validateDraft(command.revisionId)
    this.sessionFor(command)?.append('lab/skill/validated', {
      version: 1,
      skillRevisionId: revision.revisionId,
      validatedBy: command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous'),
    })
    return revision
  }

  private async approveSkill(command: Extract<LabWebCommand, { command: 'skill-approve' }>): Promise<Awaited<ReturnType<typeof this.ctx.labSkills.approveDraft>>> {
    const revision = await this.ctx.labSkills.approveDraft(command.revisionId, command.approvedBy)
    this.sessionFor(command)?.append('lab/skill/approved', {
      version: 1,
      skillRevisionId: revision.revisionId,
      approvedBy: command.approvedBy,
    })
    return revision
  }

  private async activateSkill(command: Extract<LabWebCommand, { command: 'skill-activate' }>): Promise<Awaited<ReturnType<typeof this.ctx.labSkills.activateRevision>>> {
    const revision = await this.ctx.labSkills.activateRevision(command.revisionId)
    this.sessionFor(command)?.append('lab/skill/activated', {
      version: 1,
      skillRevisionId: revision.revisionId,
      activatedBy: command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous'),
    })
    return revision
  }

  private async startRun(command: Extract<LabWebCommand, { command: 'run-start' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.startRun(command.experimentId, command.planId)
    await this.persistRun(command, run)
    return run
  }

  private async advanceRun(command: Extract<LabWebCommand, { command: 'run-step' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.executeNextStep(command.runId)
    await this.persistRun(command, run)
    return run
  }

  private async confirmRunStep(command: Extract<LabWebCommand, { command: 'run-confirm' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.confirmStep(command.runId, command.evidence, command.confirmedBy, command.stepId, command.operationId)
    await this.persistRun(command, run)
    return run
  }

  private async stopRun(command: Extract<LabWebCommand, { command: 'run-stop' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.stopRun(command.runId, command.requestedBy)
    await this.persistRun(command, run)
    return run
  }

  private async reportRun(command: Extract<LabWebCommand, { command: 'run-report' }>): Promise<Readonly<Record<string, unknown>>> {
    const report = await this.ctx.labRuntime.buildReport(command.runId)
    const run = this.ctx.labRuntime.getRun(brandId<'ExperimentId'>(String(report.experimentId ?? '')))
    if (run !== undefined) await this.persistRun(command, run)
    return report
  }

  private sessionFor(command: LabWebCommand): Session | undefined {
    if (command.sessionId === undefined) return undefined
    const sessions = this.ctx.get('sessions')
    if (sessions === undefined) throw new Error('session service is unavailable for this Web command')
    const session = sessions.get(command.sessionId)
    if (session === undefined) throw new Error(`session "${command.sessionId}" is not available`)
    return session
  }

  private async persistRun(command: LabWebCommand, run: RunView): Promise<void> {
    const session = this.sessionFor(command)
    if (session === undefined) return
    const runId = run.runId
    const runStatus = run.runStatus
    if (runId === undefined || runStatus === undefined) throw new Error('runtime returned a run without a state')
    for (const observation of run.observations) {
      session.append('lab/run/observation', {
        version: 1,
        experimentId: run.experimentId,
        runId,
        stepId: observation.stepId,
        operationId: observation.operationId,
        valid: observation.valid,
        evidence: observation.evidence,
        status: observation.status,
        ...observation.error === undefined ? {} : { error: observation.error },
        ...observation.replanRequested === undefined ? {} : { replanRequested: observation.replanRequested },
      })
    }
    session.append('lab/run/state', {
      version: 1,
      experimentId: run.experimentId,
      runId,
      to: runStatus,
      ...command.sessionId === undefined ? {} : { requestedBy: command.sessionId },
    })
    session.append('lab/run/feedback', {
      version: 1,
      experimentId: run.experimentId,
      runId,
      status: run.feedback.status,
      valid: run.feedback.valid,
      summary: run.feedback.summary,
      issues: run.feedback.issues,
      replanRequested: run.feedback.replanRequested,
      ...run.replanRequest === undefined ? {} : { replanRequest: { stepId: run.replanRequest.stepId, reason: run.replanRequest.reason } },
    })
    const cache = this.ctx.get('labExperimentCache')
    if (cache === undefined) throw new Error('laboratory cache service is unavailable for this Web command')
    session.append('lab/cache/projected', { version: 1, projection: run.cache })
    await cache.project(run.cache)
  }

  private executionStep(step: ExperimentPlan['steps'][number]): ExecutionStepSpec {
    const revision = this.ctx.labSkills.resolveRevision(step.skillRevisionId)
    if (revision === undefined || revision.status !== 'ACTIVE') throw new Error(`Skill revision ${step.skillRevisionId} is not ACTIVE`)
    return {
      stepId: step.stepId,
      skillRevisionId: step.skillRevisionId,
      operationKind: step.operationKind,
      operationResource: step.operationResource,
      parameters: step.parameters,
      requiresApproval: step.requiresApproval,
      expectedEvidence: step.expectedOutputs,
      failurePolicy: revision.failurePolicy,
      ...step.deviceId === undefined ? {} : { deviceId: step.deviceId },
    }
  }
}

function toRuntimeRequest(request: ExperimentRequest): import('@deepseek-ai/dsh-experimental-lab-runtime').ExperimentRequest {
  return {
    experimentId: request.experimentId,
    objective: request.objective,
    expectedOutputs: request.expectedOutputs,
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
export const inject = ['labKnowledge', 'labDevices', 'labPlanning', 'labSkills', 'labRuntime']

/** 安装 Web Consumer 服务。 */
export function apply(ctx: Context): void {
  void ctx.plugin(LabMvpWebService)
}
