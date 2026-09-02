/** 实验自动化平台 Web Facade；浏览器只能通过本服务访问实验能力。 */

import { Context, Service } from '@deepseek-ai/cordis'
import { brandId, type ArtifactManifest, type DeviceId, type ExperimentId, type ExperimentPlan, type ExperimentRequest, type LabOperationId, type KnowledgeConflict, type KnowledgeSearchRequest, type KnowledgeSearchResult, type LabExperimentRecord, type LabProjectEvidenceProjection, type LabProjectId, type PlanParameter, type LabProgressResult, type LabScopedRecordIds, type LabWorkbenchDestination } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { LabExperimentCacheService } from '@deepseek-ai/dsh-experimental-lab-cache'
import type { ImportStatusResult } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import { createLabKnowledgeConsumer, type KnowledgeCapabilityStatus, type LabKnowledgeConsumer, type LabProjectWorkspaceRegistry } from '@deepseek-ai/dsh-experimental-lab-project'
import type { LabConfigurationCapabilityRecord, LabProjectContextView, LabProjectConversationCommand, LabProjectConversationResult, LabProjectPlanningContextView, LabProjectFileDownload, LabProjectFilePreview, LabProjectFileRecord, LabProjectFileRevisionEvent, LabRunComparison } from './project-protocol.ts'
import { LabProjectFileCatalog } from './project-files.ts'
import type { PlanProposalResult, PlanningContext } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { ExecutionStepSpec, LabRunReport, RunView } from '@deepseek-ai/dsh-experimental-lab-runtime'
import type { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { LabWebCommand, LabWebCommandResult } from './protocol.ts'
import { validateHostPresentationIntent, type LabHostPresentationIntent, type LabHostPresentationValidation } from './presentation.ts'

export * as Http from './http.ts'
export { parseLabWebCommand } from './protocol.ts'
export { parseLabProjectConversationCommand } from './project-protocol.ts'
export { validateHostPresentationIntent } from './presentation.ts'
export type { LabHostPresentationIntent, LabHostPresentationScope, LabHostPresentationValidation } from './presentation.ts'

export type * from './protocol.ts'
export type * from './project-protocol.ts'

/** Web Consumer 的状态快照。 */
export interface LabMvpWebSnapshot {
  readonly knowledge: readonly ImportStatusResult[]
  readonly knowledgeCapability: KnowledgeCapabilityStatus
  readonly devices: readonly DeviceView[]
  readonly planningContext?: PlanningContext
  readonly planReviews: readonly PlanProposalResult[]
  readonly run?: RunView
  readonly report?: LabRunReport
}

/** Agent 请求 Host 创建实验所需的最小输入。 */
export interface LabAgentExperimentCreateRequest {
  readonly operationId: LabOperationId
  readonly sessionId: SessionId
  readonly title: string
  readonly objective: string
  readonly expectedOutputs: readonly string[]
}

/** Agent 实验创建后的可重放进度结果。 */
export interface LabAgentExperimentProgress extends LabProgressResult {
  readonly state: 'registered' | 'already-registered' | 'blocked'
  readonly sessionId: SessionId
  readonly scopedIds: LabScopedRecordIds
  readonly projectId?: LabProjectId
  readonly registeredDestination?: { readonly projectId: LabProjectId; readonly experimentId: ExperimentId }
  readonly workbenchDestination?: LabWorkbenchDestination
}

/** Web Consumer Facade 服务。 */
export class LabMvpWebService extends Service {
  private readonly projectFileCatalog: LabProjectFileCatalog
  private readonly projectFileListeners = new Set<(event: LabProjectFileRevisionEvent) => void>()

  constructor(ctx: Context) {
    super(ctx, 'labMvpWeb')
    this.projectFileCatalog = new LabProjectFileCatalog(
      event => {
        for (const listener of [...this.projectFileListeners]) listener(event)
        void this.recordProjectFileRevision(event).catch(error => {
          this.ctx.logger.warn('lab project file revision could not be recorded: ' + (error instanceof Error ? error.message : String(error)))
        })
      },
      () => this.projectFileListeners.size > 0,
    )
    ctx.effect(() => () => { this.projectFileCatalog.dispose() }, 'lab-mvp-web: project file catalog')
  }

  /** Host 统一创建 Agent 实验，并将 Project 与 Runtime 绑定到同一 Experiment 身份。
   * @param request - Agent operation identity, current Session, and experiment metadata.
   * @returns - typed progress that tells the Agent what can happen next.
   */
  async createAgentExperiment(request: LabAgentExperimentCreateRequest): Promise<LabAgentExperimentProgress> {
    const project = await this.ctx.labProjects.projectForSession(request.sessionId)
    if (project === undefined) {
      return {
        state: 'blocked',
        sessionId: request.sessionId,
        scopedIds: {},
        reason: 'The current Session is not associated with a laboratory Project. Select or open a Workspace before creating an Experiment.',
        nextActor: 'human',
        allowedActions: ['select_workspace'],
        workbenchDestination: { view: 'lab-monitor' },
      }
    }
    const result = await this.ctx.labProjects.createExperiment({
      projectId: project.projectId,
      title: request.title,
      objective: request.objective,
      operationId: request.operationId,
      createdInSessionId: request.sessionId,
      createdBy: request.sessionId,
    })
    await this.ctx.labRuntime.createExperiment({
      experimentId: result.experiment.experimentId,
      objective: result.experiment.objective,
      expectedOutputs: [...request.expectedOutputs],
    })
    const session = this.sessionFor({ sessionId: request.sessionId })
    if (session !== undefined) {
      const experimentId = result.experiment.experimentId
      if (!session.events.some(event => event.type === 'lab/project/experiment-created' && event.data.experimentId === experimentId)) {
        session.append('lab/project/experiment-created', {
          version: 1,
          projectId: result.experiment.projectId,
          experimentId,
          title: result.experiment.title,
          objective: result.experiment.objective,
          createdInSessionId: request.sessionId,
        })
      }
      if (!session.events.some(event => event.type === 'lab/experiment/requested' && event.data.experimentId === experimentId)) {
        session.append('lab/experiment/requested', {
          version: 1,
          experimentId,
          objective: result.experiment.objective,
          sessionId: request.sessionId,
          operationId: request.operationId,
        })
      }
    }
    return {
      state: result.created ? 'registered' : 'already-registered',
      sessionId: request.sessionId,
      scopedIds: { projectId: result.experiment.projectId, experimentId: result.experiment.experimentId },
      projectId: result.experiment.projectId,
      reason: result.created ? 'The Host registered the Project Experiment and Runtime record with one Experiment ID.' : 'The Host replayed the same operation and returned the existing Project Experiment and Runtime identity.',
      nextActor: 'agent',
      allowedActions: ['lab_project_context', 'lab_plan_propose'],
      registeredDestination: { projectId: result.experiment.projectId, experimentId: result.experiment.experimentId },
      workbenchDestination: { view: 'lab-project', projectId: result.experiment.projectId, experimentId: result.experiment.experimentId },
    }
  }

  /** 订阅 Host 授权的 Project 文件 revision 通知。
   * @param listener - 收到文件 revision 时调用的监听器。
   * @returns - 取消订阅的函数。
   */
  subscribeProjectFileEvents(listener: (event: LabProjectFileRevisionEvent) => void): () => void {
    this.projectFileListeners.add(listener)
    return () => { this.projectFileListeners.delete(listener) }
  }

  /** Validate and record an Agent request to present a registered Host view.
   * @param sessionId - Session receiving the navigation evidence.
   * @param value - untrusted Agent presentation payload.
   * @returns - accepted typed intent or a stable rejection.
   */
  async presentForSession(sessionId: SessionId, value: unknown): Promise<LabHostPresentationValidation> {
    const active = await this.ctx.labProjects.projectForSession(sessionId)
    const projects = await this.ctx.labProjects.list()
    const experiments = projects.flatMap(project => project.experiments.map(experiment => ({
      projectId: String(project.project.projectId),
      experimentId: String(experiment.experimentId),
    })))
    const runs = projects.flatMap(project => project.experiments.flatMap(experiment => this.ctx.labRuntime.listRuns(experiment.experimentId).map(run => ({
      projectId: String(project.project.projectId),
      experimentId: String(experiment.experimentId),
      runId: String(run.runId),
    }))))
    const artifacts = projects.flatMap(project => project.experiments.flatMap(experiment => this.ctx.labRuntime.listRuns(experiment.experimentId).flatMap(run => run.artifacts)))
    const citations = active === undefined ? [] : active.projectId === undefined ? [] : (await this.ctx.labProjects.context(active.projectId, sessionId)).sources.map(source => ({
      projectId: String(source.projectId),
      documentId: String(source.documentId),
      versionId: String(source.versionId),
    }))
    const result = validateHostPresentationIntent(value, {
      ...active === undefined ? {} : { activeProjectId: String(active.projectId) },
      registeredViews: ['projects', 'knowledge', 'devices', 'project', 'experiment', 'run', 'evidence', 'citation'],
      projects: projects.map(project => String(project.project.projectId)),
      experiments,
      runs,
      artifacts,
      citations,
    })
    const sessions = this.ctx.get('sessions')
    const session = sessions?.get(sessionId)
    if (session !== undefined) {
      if (result.accepted) {
        const targetId = presentationTargetId(result.intent)
        session.append('lab/presentation/accepted', {
          version: 1,
          sessionId,
          view: result.intent.view,
          ...result.intent.projectId === undefined ? {} : { projectId: brandId<'LabProjectId'>(result.intent.projectId) },
          ...targetId === undefined ? {} : { targetId },
        })
      } else {
        session.append('lab/presentation/rejected', { version: 1, sessionId, code: result.code, message: result.message })
      }
    }
    return result
  }

  /** 返回供 Web 层序列化的当前实验状态。
 * @param experimentId - experiment whose run state is projected.
 * @param planningContext - optional planning context to include.
 * @returns - serializable device, planning, and runtime state.
 */
  async snapshot(experimentId: ExperimentId, planningContext?: PlanningContext): Promise<LabMvpWebSnapshot> {
    const knowledgeSnapshot = await this.knowledgeSnapshot()
    const { knowledge, knowledgeCapability } = knowledgeSnapshot
    const devices = this.ctx.labDevices.listDevices().map(device => ({
      ...device,
      source: deviceSource(this.ctx.labDevices),
      capabilities: device.capabilities.map(capability => ({ ...capability, parameters: { ...capability.parameters } })),
    }))
    const planReviews = this.ctx.labPlanning.listProposals(experimentId)
    const run = this.ctx.labRuntime.listRuns(experimentId).at(-1)
    const report = run?.runId === undefined ? undefined : await this.ctx.labRuntime.buildReport(run.runId)
    return {
      knowledge,
      knowledgeCapability,
      devices,
      ...planningContext === undefined ? {} : { planningContext },
      planReviews,
      ...run === undefined ? {} : { run },
      ...report === undefined ? {} : { report },
    }
  }

  /** Return global Knowledge records without requiring an Experiment selection. */
  async knowledgeSnapshot(): Promise<import('./protocol.ts').LabWebKnowledgeSnapshotView> {
    const knowledgeConsumer = this.knowledgeConsumer()
    const knowledgeCapability = await knowledgeConsumer.capability()
    const knowledge = knowledgeCapability.state === 'available' ? await knowledgeConsumer.listImportStatuses() : []
    return { knowledge, knowledgeCapability }
  }

  /** Execute a parsed Web command.
   * @param command - parsed Web command.
   * @returns - serializable command result.
   */
  async dispatch(command: LabWebCommand): Promise<LabWebCommandResult> {
    switch (command.command) {
      case 'snapshot':
        return { kind: 'snapshot', value: await this.snapshot(command.experimentId) }
      case 'knowledge-snapshot':
        return { kind: 'knowledge-snapshot', value: await this.knowledgeSnapshot() }
      case 'device-list':
        return { kind: 'device-list', value: this.ctx.labDevices.listDevices().map(device => ({ ...device, source: deviceSource(this.ctx.labDevices), capabilities: device.capabilities.map(capability => ({ ...capability, parameters: { ...capability.parameters } })) })) }
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
            capability: await this.knowledgeConsumer().capability(),
            results: await this.knowledgeConsumer().search(command.request),
            conflicts: await this.ctx.labKnowledge.listConflicts(command.request.experimentId),
          },
        }
      case 'knowledge-fact-confirm':
        await this.ctx.labKnowledge.confirmFact({ citationId: brandId<'CitationId'>(command.citationId), confirmedBy: command.confirmedBy, ...command.note === undefined ? {} : { note: command.note } })
        this.sessionFor(command)?.append('lab/knowledge/confirmed', {
          version: 1,
          citationId: brandId<'CitationId'>(command.citationId),
          confirmedBy: command.confirmedBy,
          ...command.note === undefined ? {} : { note: command.note },
        })
        return { kind: 'knowledge-fact-confirm', value: null }
      case 'knowledge-sop-create':
        return { kind: 'knowledge-sop', value: await this.ctx.labKnowledge.createSopDraft({ title: command.title, steps: command.steps, updatedBy: command.sessionId ?? 'lab-web:anonymous' }) }
      case 'knowledge-sop-get':
        return { kind: 'knowledge-sop', value: await this.ctx.labKnowledge.getSopDraft(command.draftId) }
      case 'knowledge-sop-list':
        return { kind: 'knowledge-sop', value: await this.ctx.labKnowledge.listSopDrafts() }
      case 'knowledge-sop-update':
        return { kind: 'knowledge-sop', value: await this.ctx.labKnowledge.updateSopDraft({ draftId: command.draftId, title: command.title, steps: command.steps, updatedBy: command.sessionId ?? 'lab-web:anonymous' }) }
      case 'knowledge-sop-publish':
        return { kind: 'knowledge-sop', value: await this.ctx.labKnowledge.publishSopDraft({ draftId: command.draftId, publishedBy: command.publishedBy }) }
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
  /** Execute a dedicated project/conversation command.
   * @param command - parsed project/conversation command.
   * @returns - serializable project conversation result.
   */
  async dispatchProject(command: LabProjectConversationCommand): Promise<LabProjectConversationResult> {
    const actor = command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous')
    switch (command.command) {
      case 'project-list':
        return { kind: 'project-list', value: await this.ctx.labProjects.list() }
      case 'project-create': {
        let value = await this.ctx.labProjects.create({
          ...command.workspaceId === undefined ? {} : { workspaceId: command.workspaceId },
          ...command.name === undefined ? {} : { name: command.name },
          ...command.description === undefined ? {} : { description: command.description },
          createdBy: actor,
        })
        if (command.sessionId !== undefined) {
          const attached = await this.ctx.labProjects.attachSession({
            projectId: value.project.projectId,
            sessionId: command.sessionId,
            attachedBy: actor,
          })
          if (attached.status === 'conflict') {
            throw new Error(
              'Session "' + String(command.sessionId) + '" does not belong to Project Workspace "' + String(value.project.workspaceId) + '"',
            )
          }
          value = attached.project
          this.sessionFor(command)?.append('lab/project/session-attached', {
            version: 1,
            projectId: value.project.projectId,
            sessionId: command.sessionId,
            title: value.sessions.find(session => session.sessionId === command.sessionId)?.title ?? 'Conversation',
          })
        }
        this.sessionFor(command)?.append('lab/project/created', {
          version: 1,
          projectId: value.project.projectId,
          workspaceId: value.project.workspaceId,
          name: value.project.name,
          sessionId: actor,
        })
        return { kind: 'project', value }
      }
      case 'project-open':
        return { kind: 'project', value: await this.ctx.labProjects.open(command.projectId) }
      case 'project-scope-update': {
        await this.validateProjectScope(command.sources, command.deviceIds)
        const value = await this.ctx.labProjects.updateScope(command.projectId, {
          sources: command.sources,
          deviceIds: command.deviceIds,
          selectedBy: actor,
        })
        this.sessionFor(command)?.append('lab/project/scope-updated', {
          version: 1,
          projectId: command.projectId,
          sources: command.sources,
          deviceIds: command.deviceIds,
          updatedBy: actor,
        })
        return { kind: 'project', value }
      }
      case 'project-session-create': {
        const project = await this.ctx.labProjects.open(command.projectId)
        const workspace = this.workspaceRegistry().get(project.project.workspaceId)
        if (workspace === undefined) throw new Error(`workspace "${project.project.workspaceId}" is unavailable for project Session creation`)
        const sessions = this.ctx.get('sessions')
        if (sessions === undefined) throw new Error('session service is unavailable for project Session creation')
        const created = sessions.create(undefined, { meta: { cwd: workspace.path } })
        const result = await this.ctx.labProjects.attachSession({
          projectId: command.projectId,
          sessionId: created.id,
          ...command.title === undefined ? {} : { title: command.title },
          attachedBy: actor,
        })
        if (result.status === 'conflict') throw new Error('new project Session did not resolve to the project Workspace')
        const value = result.project
        this.sessionFor(command)?.append('lab/project/session-attached', {
          version: 1,
          projectId: command.projectId,
          sessionId: created.id,
          title: value.sessions.find(session => session.sessionId === created.id)?.title ?? 'Conversation',
        })
        return { kind: 'project', value }
      }
      case 'project-session-attach': {
        this.assertTargetSession(command.targetSessionId)
        const result = await this.ctx.labProjects.attachSession({
          projectId: command.projectId,
          sessionId: command.targetSessionId,
          ...command.title === undefined ? {} : { title: command.title },
          attachedBy: actor,
        })
        if (result.status === 'conflict') return { kind: 'project-session-attach-conflict', value: result }
        const value = result.project
        this.sessionFor(command)?.append('lab/project/session-attached', {
          version: 1,
          projectId: command.projectId,
          sessionId: command.targetSessionId,
          title: value.sessions.find(session => session.sessionId === command.targetSessionId)?.title ?? 'Conversation',
        })
        return { kind: 'project', value }
      }
      case 'project-session-detach': {
        const value = await this.ctx.labProjects.detachSession(command.projectId, command.targetSessionId, actor)
        this.sessionFor(command)?.append('lab/project/session-detached', {
          version: 1,
          projectId: command.projectId,
          sessionId: command.targetSessionId,
          detachedBy: actor,
        })
        return { kind: 'project', value }
      }
      case 'project-archive': {
        const value = await this.ctx.labProjects.archive(command.projectId, actor)
        this.sessionFor(command)?.append('lab/project/archived', {
          version: 1,
          projectId: command.projectId,
          archivedBy: actor,
        })
        return { kind: 'project', value }
      }
      case 'project-session-rename': {
        this.assertTargetSession(command.targetSessionId)
        const value = await this.ctx.labProjects.renameSession(command.projectId, command.targetSessionId, command.title, actor)
        this.sessionFor(command)?.append('lab/project/session-renamed', {
          version: 1,
          projectId: command.projectId,
          sessionId: command.targetSessionId,
          title: command.title,
          renamedBy: actor,
        })
        return { kind: 'project', value }
      }
      case 'project-context':
        return { kind: 'project-context', value: await this.projectContext(command.projectId, command.sessionId) }
      case 'project-planning-context':
        return { kind: 'project-context', value: await this.projectPlanningContext(command.projectId, command.request, command.sessionId) }
      case 'experiment-list':
        return { kind: 'experiment-list', value: await this.ctx.labProjects.listExperiments(command.projectId) }
      case 'experiment-reviews':
        return { kind: 'experiment-reviews', value: this.ctx.labPlanning.listProposals(command.experimentId) }
      case 'experiment-open': {
        const experiment = await this.experimentInProject(command.projectId, command.experimentId)
        return { kind: 'experiment', value: experiment }
      }
      case 'experiment-create': {
        const result = await this.ctx.labProjects.createExperiment({
          projectId: command.projectId,
          title: command.title,
          objective: command.objective,
          createdInSessionId: actor,
          createdBy: actor,
        })
        await this.registerRuntimeExperiment(result.experiment)
        this.sessionFor(command)?.append('lab/project/experiment-created', {
          version: 1,
          projectId: command.projectId,
          experimentId: result.experiment.experimentId,
          title: result.experiment.title,
          objective: result.experiment.objective,
          createdInSessionId: actor,
        })
        this.sessionFor(command)?.append('lab/experiment/requested', {
          version: 1,
          experimentId: result.experiment.experimentId,
          objective: result.experiment.objective,
          sessionId: actor,
        })
        return { kind: 'experiment-project', value: result.project }
      }
      case 'experiment-derive': {
        const result = await this.ctx.labProjects.createExperiment({
          projectId: command.projectId,
          title: command.title,
          objective: command.objective,
          createdInSessionId: actor,
          createdBy: actor,
          derivedFromExperimentId: command.sourceExperimentId,
        })
        await this.registerRuntimeExperiment(result.experiment)
        this.sessionFor(command)?.append('lab/project/experiment-created', {
          version: 1,
          projectId: command.projectId,
          experimentId: result.experiment.experimentId,
          title: result.experiment.title,
          objective: result.experiment.objective,
          createdInSessionId: actor,
        })
        this.sessionFor(command)?.append('lab/experiment/requested', {
          version: 1,
          experimentId: result.experiment.experimentId,
          objective: result.experiment.objective,
          sessionId: actor,
        })
        return { kind: 'experiment-project', value: result.project }
      }
      case 'experiment-session-link': {
        const value = await this.ctx.labProjects.linkExperimentSession({
          projectId: command.projectId,
          experimentId: command.experimentId,
          sessionId: command.targetSessionId,
          role: command.role,
          linkedBy: actor,
        })
        this.sessionFor(command)?.append('lab/project/experiment-session-linked', {
          version: 1,
          projectId: command.projectId,
          experimentId: command.experimentId,
          sessionId: command.targetSessionId,
          role: command.role,
          linkedBy: actor,
        })
        return { kind: 'experiment-project', value }
      }
      case 'run-list':
        return { kind: 'run-list', value: this.ctx.labRuntime.listRuns(command.experimentId) }
      case 'run-open': {
        const run = this.ctx.labRuntime.getRun(command.runId)
        if (run === undefined) throw new Error(`run "${command.runId}" is not available`)
        return { kind: 'run', value: run }
      }
      case 'run-start': {
        const run = await this.ctx.labRuntime.startRun({
          experimentId: command.experimentId,
          planId: command.planId,
          launchingSessionId: actor,
        })
        await this.persistRun(command, run)
        return { kind: 'run', value: run }
      }
      case 'run-stop': {
        const run = await this.ctx.labRuntime.stopRun(command.runId, actor)
        await this.persistRun(command, run)
        return { kind: 'run', value: run }
      }
      case 'run-retry': {
        const run = await this.ctx.labRuntime.retryRun(command.runId, actor)
        await this.persistRun(command, run)
        return { kind: 'run', value: run }
      }
      case 'run-compare': {
        const left = this.ctx.labRuntime.getRun(command.leftRunId)
        const right = this.ctx.labRuntime.getRun(command.rightRunId)
        if (left === undefined || right === undefined) throw new Error('both Runs must be available for comparison')
        if (left.experimentId !== right.experimentId) throw new Error('Runs from different Experiments cannot be compared')
        if (!isTerminalRun(left) || !isTerminalRun(right)) throw new Error('only terminal Runs can be compared')
        return { kind: 'run-comparison', value: compareRuns(left, right) }
      }
      case 'run-report': {
        const value = await this.ctx.labRuntime.buildReport(command.runId)
        const run = this.ctx.labRuntime.getRun(command.runId)
        if (run !== undefined) await this.persistRun(command, run)
        await this.writeProjectFile(command, 'run-artifacts', 'report-' + String(command.runId) + '.json', JSON.stringify(value, null, 2))
        this.sessionFor(command)?.append('lab/run/verdict', {
          version: 1,
          experimentId: value.experimentId,
          runId: value.runId,
          status: value.assessment.status,
          ...value.assessment.verdict === undefined ? {} : { verdict: value.assessment.verdict },
          ...value.assessment.method === undefined ? {} : { method: value.assessment.method },
          evidenceIds: value.assessment.evidenceIds,
          ...value.assessment.assessedBy === undefined ? {} : { assessedBy: value.assessment.assessedBy },
          ...value.assessment.assessedAt === undefined ? {} : { assessedAt: value.assessment.assessedAt },
          humanQcRequired: value.assessment.humanQcRequired,
        })
        return { kind: 'run-report', value }
      }
      case 'artifact-list': {
        const run = this.ctx.labRuntime.getRun(command.runId)
        if (run === undefined) throw new Error(`run "${command.runId}" is not available`)
        return { kind: 'artifact-list', value: run.artifacts }
      }
      case 'artifact-open': {
        const run = this.ctx.labRuntime.getRun(command.runId)
        if (run === undefined) throw new Error(`run "${command.runId}" is not available`)
        const artifact = run.artifacts.find(item => item.artifactId === command.artifactId)
        if (artifact === undefined) throw new Error(`artifact "${command.artifactId}" is not available for run "${command.runId}"`)
        return { kind: 'artifact', value: { ...artifact, preview: { kind: 'unsupported' as const } } }
      }
      case 'project-file-list':
        return { kind: 'project-file-list', value: await this.listProjectFiles(command.projectId) }
      case 'project-file-open':
        return { kind: 'project-file-preview', value: await this.openProjectFile(command.projectId, command.projectFileId) }
      case 'project-file-download':
        return { kind: 'project-file-download', value: await this.downloadProjectFile(command.projectId, command.projectFileId) }
      case 'configuration-capabilities':
        return { kind: 'configuration-capabilities', value: await this.configurationCapabilities() }
      case 'presentation-intent': {
        if (command.sessionId === undefined) throw new Error('presentation-intent requires a Session')
        return { kind: 'presentation', value: await this.presentForSession(command.sessionId, command.intent) }
      }
    }
  }

  private async projectFileWorkspace(projectId: LabProjectId): Promise<string> {
    const project = await this.ctx.labProjects.open(projectId)
    if (project.project === undefined) throw new Error(`project "${projectId}" is unavailable`)
    const workspace = this.workspaceRegistry().get(project.project.workspaceId)
    if (workspace === undefined) throw new Error(`workspace "${project.project.workspaceId}" is unavailable`)
    return workspace.path
  }

  private async listProjectFiles(projectId: LabProjectId): Promise<readonly LabProjectFileRecord[]> {
    return this.projectFileCatalog.list(String(projectId), await this.projectFileWorkspace(projectId))
  }

  private async openProjectFile(projectId: LabProjectId, projectFileId: string): Promise<LabProjectFilePreview> {
    return this.projectFileCatalog.open(String(projectId), await this.projectFileWorkspace(projectId), projectFileId)
  }

  private async downloadProjectFile(projectId: LabProjectId, projectFileId: string): Promise<LabProjectFileDownload> {
    return this.projectFileCatalog.download(String(projectId), await this.projectFileWorkspace(projectId), projectFileId)
  }

  /** Return only capabilities and record counts that the mounted Host providers expose. */
  private async configurationCapabilities(): Promise<readonly LabConfigurationCapabilityRecord[]> {
    const capabilities: LabConfigurationCapabilityRecord[] = [
      { kind: 'agent', name: 'Harness Agent', status: 'unavailable', allowedActions: [] },
      { kind: 'people', name: 'People and permissions', status: 'unavailable', allowedActions: [] },
    ]
    try {
      const proposals = this.ctx.labPlanning.listProposals()
      capabilities.splice(1, 0, { kind: 'workflow', name: 'Workflow registry', status: 'available', allowedActions: ['validate'], recordCount: proposals.length })
    } catch {
      capabilities.splice(1, 0, { kind: 'workflow', name: 'Workflow registry', status: 'unavailable', allowedActions: [] })
    }
    try {
      const devices = this.ctx.labDevices.listDevices()
      capabilities.splice(2, 0, { kind: 'devices', name: 'Device registry', status: 'read-only', allowedActions: ['inspect', 'select-project-scope'], recordCount: devices.length, detail: 'Runtime configure/connect is not provided by the mounted device Provider.' })
    } catch {
      capabilities.splice(2, 0, { kind: 'devices', name: 'Device registry', status: 'unavailable', allowedActions: [] })
    }
    return capabilities
  }

  private knowledgeConsumer(): LabKnowledgeConsumer {
    return createLabKnowledgeConsumer(this.ctx.labKnowledge)
  }

  private workspaceRegistry(): LabProjectWorkspaceRegistry {
    const registry = this.ctx.get('workspaceRegistry') as LabProjectWorkspaceRegistry | undefined
    if (registry === undefined) throw new Error('workspace registry is unavailable')
    return registry
  }

  private async experimentInProject(projectId: LabProjectId, experimentId: ExperimentId): Promise<LabExperimentRecord> {
    const experiment = (await this.ctx.labProjects.listExperiments(projectId)).find(item => item.experimentId === experimentId)
    if (experiment === undefined) throw new Error(`experiment "${experimentId}" is not available in project "${projectId}"`)
    return experiment
  }

  /** 将项目实验登记到 Runtime，保持项目对象和可执行运行时使用同一实验身份。
   * @param experiment - project-owned experiment to register.
   * @returns - completion after the Runtime record is durable.
   */
  private async registerRuntimeExperiment(experiment: LabExperimentRecord): Promise<void> {
    await this.ctx.labRuntime.createExperiment({
      experimentId: experiment.experimentId,
      objective: experiment.objective,
      expectedOutputs: [],
    })
  }

  private async validateProjectScope(
    sources: readonly { readonly documentId: string; readonly versionId: string }[],
    deviceIds: readonly string[],
  ): Promise<void> {
    if (sources.length > 0) {
      const consumer = this.knowledgeConsumer()
      const capability = await consumer.capability()
      if (capability.state !== 'available') throw new Error(`Knowledge capability unavailable: ${capability.reason ?? 'provider is unavailable'}`)
      const statuses = await consumer.listImportStatuses()
      const available = new Set(statuses.filter(status => status.status === 'READY').map(status => `${status.documentId}:${status.versionId}`))
      for (const source of sources) {
        if (!available.has(`${source.documentId}:${source.versionId}`)) throw new Error(`Knowledge source "${source.documentId}:${source.versionId}" is not READY`)
      }
    }    const devices = new Set(this.ctx.labDevices.listDevices().map(device => device.id))
    for (const deviceId of deviceIds) {
      if (!devices.has(deviceId as DeviceId)) throw new Error(`device "${deviceId}" is not available`)
    }
  }

  private assertTargetSession(sessionId: SessionId): void {
    const sessions = this.ctx.get('sessions')
    if (sessions !== undefined && sessions.get(sessionId) === undefined) throw new Error(`session "${sessionId}" is not available`)
  }

  private async projectContext(projectId: LabProjectId, sessionId?: SessionId): Promise<LabProjectContextView> {
    const project = await this.ctx.labProjects.context(projectId, sessionId)
    const knowledgeCapability = await this.knowledgeConsumer().capability()
    if (sessionId !== undefined) {
      const session = this.sessionFor({ sessionId })
      if (session !== undefined) session.append('lab/agent/context-read', {
        version: 1,
        sessionId,
        kind: 'project',
        projectId,
        sourceIds: project.sources.map(source => ({ documentId: source.documentId, versionId: source.versionId })),
        deviceIds: project.devices.map(device => device.deviceId),
        sharedFactIds: project.sharedFacts.map(fact => String(fact.factId)),
        citationIds: project.sharedFacts.flatMap(fact => fact.citationIds),
        knowledgeState: knowledgeCapability.state,
        ...knowledgeCapability.reason === undefined ? {} : { knowledgeReason: knowledgeCapability.reason },
        unresolved: [],
      })
    }
    return {
      project,
      knowledgeCapability,
    }
  }

  private async projectPlanningContext(
    projectId: LabProjectId,
    request: ExperimentRequest,
    sessionId?: SessionId,
  ): Promise<LabProjectPlanningContextView> {
    const project = await this.ctx.labProjects.context(projectId, sessionId)
    const consumer = this.knowledgeConsumer()
    const knowledgeCapability = await consumer.capability()
    let citations: readonly KnowledgeSearchResult[] = []
    let conflicts: readonly KnowledgeConflict[] = []
    if (knowledgeCapability.state === 'available') {
      const searchRequest: KnowledgeSearchRequest = {
        query: request.objective,
        documentIds: project.sources.map(source => source.documentId),
        versionIds: project.sources.map(source => source.versionId),
        confirmed: true,
        experimentId: request.experimentId,
      }
      citations = await consumer.search(searchRequest)
      conflicts = await consumer.listConflicts(request.experimentId)
    }
    const selectedDevices = new Set(project.devices.map(device => device.deviceId))
    const devices = this.ctx.labDevices.listDevices().filter(device => selectedDevices.has(device.id))
    if (sessionId !== undefined) {
      const session = this.sessionFor({ sessionId })
      if (session !== undefined) session.append('lab/agent/context-read', {
        version: 1,
        sessionId,
        kind: 'planning',
        projectId,
        sourceIds: project.sources.map(source => ({ documentId: source.documentId, versionId: source.versionId })),
        deviceIds: devices.map(device => device.id),
        sharedFactIds: project.sharedFacts.map(fact => String(fact.factId)),
        citationIds: citations.map(citation => citation.citationId),
        knowledgeState: knowledgeCapability.state,
        ...knowledgeCapability.reason === undefined ? {} : { knowledgeReason: knowledgeCapability.reason },
        experimentId: request.experimentId,
        objective: request.objective,
        unresolved: request.unresolved,
      })
    }
    return {
      project,
      knowledgeCapability,
      planningContext: {
        experimentId: request.experimentId,
        objective: request.objective,
        queries: [request.objective],
        citations,
        conflicts,
        devices,
        assumptions: project.sharedFacts.map(fact => fact.content),
        unresolved: request.unresolved,
      } satisfies PlanningContext,
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
      validation: result.validation,
    })
    await this.projectEvidenceForSession(command, {
      version: 1,
      experimentId: result.plan.experimentId,
      kind: 'plan-proposal',
      referenceId: `${result.plan.planId}:r${result.plan.revision}`,
      status: result.plan.status,
      updatedAt: Date.now(),
    })
    await this.writeProjectFile(command, 'configuration', 'workflow/plan-' + String(result.plan.planId) + '.json', JSON.stringify(result, null, 2))
    for (const revision of result.skillRevisions) {
      await this.writeProjectFile(command, 'configuration', 'workflow/skill-' + String(revision.revisionId) + '.json', JSON.stringify(revision, null, 2))
    }
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
    await this.writeProjectFile(command, 'configuration', 'workflow/plan-' + String(result.plan.planId) + '.json', JSON.stringify(result, null, 2))
    for (const revision of result.skillRevisions ?? []) {
      await this.writeProjectFile(command, 'configuration', 'workflow/skill-' + String(revision.revisionId) + '.json', JSON.stringify(revision, null, 2))
    }
    this.sessionFor(command)?.append('lab/plan/approved', {
      version: 1,
      experimentId: command.experimentId,
      planId: command.planId,
      approvedBy: command.approvedBy,
      skillRevisionIds,
    })
    await this.projectEvidenceForSession(command, {
      version: 1,
      experimentId: result.plan.experimentId,
      kind: 'plan-approval',
      referenceId: `${result.plan.planId}:r${result.plan.revision}`,
      status: result.plan.status,
      updatedAt: Date.now(),
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
      validation: { valid: true, issues: [] },
    })
    await this.writeProjectFile(command, 'configuration', 'workflow/skill-' + String(revision.revisionId) + '.json', JSON.stringify(revision, null, 2))
    return revision
  }

  private async approveSkill(command: Extract<LabWebCommand, { command: 'skill-approve' }>): Promise<Awaited<ReturnType<typeof this.ctx.labSkills.approveDraft>>> {
    const revision = await this.ctx.labSkills.approveDraft(command.revisionId, command.approvedBy)
    this.sessionFor(command)?.append('lab/skill/approved', {
      version: 1,
      skillRevisionId: revision.revisionId,
      approvedBy: command.approvedBy,
    })
    await this.writeProjectFile(command, 'configuration', 'workflow/skill-' + String(revision.revisionId) + '.json', JSON.stringify(revision, null, 2))
    return revision
  }

  private async activateSkill(command: Extract<LabWebCommand, { command: 'skill-activate' }>): Promise<Awaited<ReturnType<typeof this.ctx.labSkills.activateRevision>>> {
    const revision = await this.ctx.labSkills.activateRevision(command.revisionId)
    this.sessionFor(command)?.append('lab/skill/activated', {
      version: 1,
      skillRevisionId: revision.revisionId,
      activatedBy: command.sessionId ?? brandId<'SessionId'>('lab-web:anonymous'),
    })
    await this.writeProjectFile(command, 'configuration', 'workflow/skill-' + String(revision.revisionId) + '.json', JSON.stringify(revision, null, 2))
    return revision
  }

  private async startRun(command: Extract<LabWebCommand, { command: 'run-start' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.startRun({
      experimentId: command.experimentId,
      planId: command.planId,
      ...command.sessionId === undefined ? {} : { launchingSessionId: command.sessionId },
    })
    await this.persistRun(command, run)
    return run
  }

  private async advanceRun(command: Extract<LabWebCommand, { command: 'run-step' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.executeNextStep(command.runId)
    await this.persistRun(command, run)
    return run
  }

  private async confirmRunStep(command: Extract<LabWebCommand, { command: 'run-confirm' }>): Promise<RunView> {
    const before = this.ctx.labRuntime.getRun(command.runId)
    const waiting = before?.observations.find(observation => observation.status === 'WAITING')
    const stepId = command.stepId ?? waiting?.stepId ?? before?.currentStepId
    const operationId = command.operationId ?? waiting?.operationId
    const run = await this.ctx.labRuntime.confirmStep(
      command.runId,
      command.evidence,
      command.confirmedBy,
      command.stepId,
      command.operationId,
    )
    await this.persistRun(command, run)
    if (stepId !== undefined && operationId !== undefined) this.sessionFor(command)?.append('lab/run/approval', {
      version: 1,
      experimentId: run.experimentId,
      runId: run.runId,
      stepId,
      operationId,
      approvedBy: command.confirmedBy,
      evidence: command.evidence,
    })
    return run
  }

  private async stopRun(command: Extract<LabWebCommand, { command: 'run-stop' }>): Promise<RunView> {
    const run = await this.ctx.labRuntime.stopRun(command.runId, command.requestedBy)
    await this.persistRun(command, run)
    return run
  }

  private async reportRun(command: Extract<LabWebCommand, { command: 'run-report' }>): Promise<LabRunReport> {
    const report = await this.ctx.labRuntime.buildReport(command.runId)
    const run = this.ctx.labRuntime.getRun(command.runId)
    if (run !== undefined) await this.persistRun(command, run)
    await this.writeProjectFile(command, 'run-artifacts', 'report-' + String(command.runId) + '.json', JSON.stringify(report, null, 2))
    this.sessionFor(command)?.append('lab/run/verdict', {
      version: 1,
      experimentId: report.experimentId,
      runId: report.runId,
      status: report.assessment.status,
      ...report.assessment.verdict === undefined ? {} : { verdict: report.assessment.verdict },
      ...report.assessment.method === undefined ? {} : { method: report.assessment.method },
      evidenceIds: report.assessment.evidenceIds,
      ...report.assessment.assessedBy === undefined ? {} : { assessedBy: report.assessment.assessedBy },
      ...report.assessment.assessedAt === undefined ? {} : { assessedAt: report.assessment.assessedAt },
      humanQcRequired: report.assessment.humanQcRequired,
    })
    return report
  }

  private sessionFor(command: { readonly sessionId?: SessionId }): Session | undefined {
    if (command.sessionId === undefined) return undefined
    const sessions = this.ctx.get('sessions')
    if (sessions === undefined) throw new Error('session service is unavailable for this Web command')
    const session = sessions.get(command.sessionId)
    if (session === undefined) throw new Error(`session "${command.sessionId}" is not available`)
    return session
  }

  private async persistRun(command: { readonly command?: string; readonly sessionId?: SessionId }, run: RunView): Promise<void> {
    const session = this.sessionFor(command)
    if (session === undefined) return
    const runId = run.runId
    const runStatus = run.runStatus
    if (runStatus === undefined) throw new Error('runtime returned a run without a state')
    for (const observation of run.observations) {
      const step = run.executionGraph.steps.find(candidate => candidate.stepId === observation.stepId)
      if (!session.events.some(event => event.type === 'lab/run/step' && event.data.runId === run.runId && event.data.operationId === observation.operationId)) {
        session.append('lab/run/step', {
          version: 1,
          experimentId: run.experimentId,
          runId: run.runId,
          stepId: observation.stepId,
          operationId: observation.operationId,
          status: observation.status,
          ...command.sessionId === undefined ? {} : { requestedBy: command.sessionId },
        })
      }
      if (step?.operationKind === 'device' && !session.events.some(event => event.type === 'lab/run/device-receipt' && event.data.runId === run.runId && event.data.operationId === observation.operationId)) {
        session.append('lab/run/device-receipt', {
          version: 1,
          experimentId: run.experimentId,
          runId: run.runId,
          stepId: observation.stepId,
          operationId: observation.operationId,
          status: observation.status === 'COMPLETED' ? 'completed' : observation.status === 'WAITING' ? 'accepted' : observation.status === 'STOPPED' ? 'stopped' : 'failed',
          evidence: observation.evidence,
        })
      }
      if (!session.events.some(event => event.type === 'lab/run/observation' && event.data.runId === run.runId && event.data.operationId === observation.operationId && event.data.status === observation.status)) session.append('lab/run/observation', {
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
    for (const artifact of run.artifacts) {
      if (session.events.some(event => event.type === 'lab/run/artifact' && event.data.artifactId === artifact.artifactId)) continue
      session.append('lab/run/artifact', {
        version: 1,
        experimentId: run.experimentId,
        runId: run.runId,
        artifactId: artifact.artifactId,
        kind: artifact.kind,
        displayName: artifact.displayName,
        mediaType: artifact.mediaType,
        size: artifact.size,
        digest: artifact.digest,
        createdAt: artifact.createdAt,
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
    session.append('lab/cache/projected', { version: 1, projection: run.cache })
    const cache = this.ctx.get('labExperimentCache') as LabExperimentCacheService
    await cache.project(run.cache)
    await this.projectEvidenceForSession(command, {
      version: 1,
      experimentId: run.experimentId,
      kind: command.command === 'run-report' ? 'report' : 'run',
      referenceId: runId,
      status: runStatus,
      updatedAt: Date.now(),
    })
    await this.writeProjectFile(
      command,
      'run-artifacts',
      'run-' + String(runId) + '.json',
      JSON.stringify(run, null, 2),
    )
  }

  private async projectEvidenceForSession(
    command: { readonly sessionId?: SessionId },
    details: Omit<LabProjectEvidenceProjection, 'projectId' | 'sessionId'>,
  ): Promise<void> {
    const sessionId = command.sessionId
    if (sessionId === undefined) return
    const project = await this.ctx.labProjects.projectForSession(sessionId)
    if (project === undefined) return
    const projection: LabProjectEvidenceProjection = {
      ...details,
      projectId: project.projectId,
      sessionId,
    }
    await this.ctx.labProjects.projectEvidence(projection)
    this.sessionFor(command)?.append('lab/project/evidence/projected', { version: 1, projection })
  }

  private async writeProjectFile(
    command: { readonly sessionId?: SessionId },
    group: 'configuration' | 'conversation-output' | 'run-artifacts',
    relativePath: string,
    content: string,
  ): Promise<void> {
    if (command.sessionId === undefined) return
    const project = await this.ctx.labProjects.projectForSession(command.sessionId)
    if (project === undefined) return
    await this.projectFileCatalog.write(
      String(project.projectId),
      await this.projectFileWorkspace(project.projectId),
      group,
      relativePath,
      content,
    )
  }

  private async recordProjectFileRevision(event: LabProjectFileRevisionEvent): Promise<void> {
    const project = await this.ctx.labProjects.open(brandId<'LabProjectId'>(event.projectId))
    if (project.project === undefined) return
    const sessions = this.ctx.get('sessions')
    if (sessions === undefined) return
    const sessionRecord = project.sessions.find(session => session.status === 'ACTIVE')
    if (sessionRecord === undefined) return
    const session = sessions.get(sessionRecord.sessionId)
    if (session === undefined) return
    session.append('lab/project/file-revision', {
      version: 1,
      projectId: brandId<'LabProjectId'>(event.projectId),
      projectFileId: event.projectFileId,
      group: event.group,
      revision: event.revision,
    })
    await sessions.flush(session)
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

function presentationTargetId(intent: LabHostPresentationIntent): string | undefined {
  return intent.artifactId ?? intent.runId ?? intent.experimentId ?? intent.projectId ?? intent.documentId
}

function compareRuns(left: RunView, right: RunView): LabRunComparison {
  const stepIds = new Set([
    ...left.executionGraph.steps.map(step => String(step.stepId)),
    ...right.executionGraph.steps.map(step => String(step.stepId)),
    ...left.observations.map(observation => String(observation.stepId)),
    ...right.observations.map(observation => String(observation.stepId)),
  ])
  return {
    leftRunId: left.runId,
    rightRunId: right.runId,
    status: { left: left.runStatus, right: right.runStatus },
    durationMs: { left: Math.max(0, left.updatedAt - left.createdAt), right: Math.max(0, right.updatedAt - right.createdAt) },
    parameters: { left: comparisonParameters(left), right: comparisonParameters(right) },
    stepStatuses: [...stepIds].map(stepId => ({
      stepId,
      left: left.observations.findLast(observation => String(observation.stepId) === stepId)?.status,
      right: right.observations.findLast(observation => String(observation.stepId) === stepId)?.status,
    })),
    observations: [...stepIds].map(stepId => {
      const leftObservation = comparisonObservation(left, stepId)
      const rightObservation = comparisonObservation(right, stepId)
      return {
        stepId,
        ...leftObservation === undefined ? {} : { left: leftObservation },
        ...rightObservation === undefined ? {} : { right: rightObservation },
      }
    }),
    artifactCounts: { left: left.artifacts.length, right: right.artifacts.length },
    artifactMetadata: { left: left.artifacts.map(comparisonArtifact), right: right.artifacts.map(comparisonArtifact) },
  }
}

function isTerminalRun(run: RunView): boolean {
  return run.runStatus === 'FAILED' || run.runStatus === 'COMPLETED' || run.runStatus === 'STOPPED'
}

function comparisonParameters(run: RunView): readonly { readonly stepId: string; readonly values: Readonly<Record<string, PlanParameter>> }[] {
  return run.executionGraph.steps.map(step => ({ stepId: String(step.stepId), values: step.parameters }))
}

function comparisonObservation(run: RunView, stepId: string): { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] } | undefined {
  const observation = run.observations.findLast(item => String(item.stepId) === stepId)
  return observation === undefined ? undefined : { operationId: observation.operationId, status: observation.status, valid: observation.valid, artifactIds: observation.artifactIds }
}

function comparisonArtifact(artifact: ArtifactManifest): Pick<ArtifactManifest, 'artifactId' | 'displayName' | 'kind' | 'mediaType' | 'size' | 'digest' | 'createdAt'> {
  return { artifactId: artifact.artifactId, displayName: artifact.displayName, kind: artifact.kind, mediaType: artifact.mediaType, size: artifact.size, digest: artifact.digest, createdAt: artifact.createdAt }
}

function toRuntimeRequest(request: ExperimentRequest): import('@deepseek-ai/dsh-experimental-lab-runtime').ExperimentRequest {
  return {
    experimentId: request.experimentId,
    objective: request.objective,
    expectedOutputs: request.expectedOutputs,
  }
}

function deviceSource(devices: { readonly providerName?: () => string }): 'mock' | 'real' {
  return devices.providerName?.() === 'mock' ? 'mock' : 'real'
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    labMvpWeb: LabMvpWebService
  }
}

/** Cordis 插件名称。 */
export const name = 'lab-mvp-web'
/** 依赖实验状态 Service。 */
export const inject = ['labKnowledge', 'labDevices', 'labPlanning', 'labSkills', 'labRuntime', 'labProjects', 'labExperimentCache']

/** 安装 Web Consumer 服务。 */
export function apply(ctx: Context): void {
  void ctx.plugin(LabMvpWebService)
}
