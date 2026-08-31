import {
  LabApiError,
  sendLabCommand,
  sendLabProjectCommand,
  type LabArtifactRecord,
  type LabCommand,
  type LabExperimentRecord,
  type LabPlanReview,
  type LabProjectCommand,
  type LabProjectView,
  type LabRun,
  type LabWorkflowRecord,
} from './api.ts'
import { LabWorkbenchError, type LabProjectFileAdapter, type LabQueryState, type LabWorkbenchAdapter } from './adapter.ts'

type HostEventEnvelope = { readonly payload: unknown }

/** Injectable transport functions used by the production Host adapter and its contract tests. */
export interface LabHostAdapterDependencies {
  readonly sendCommand?: (command: LabCommand) => ReturnType<typeof sendLabCommand>
  readonly sendProjectCommand?: (command: LabProjectCommand) => ReturnType<typeof sendLabProjectCommand>
  readonly subscribeHostEvents?: (listener: (envelope: HostEventEnvelope) => void) => () => void
}

/** Build the Host-backed adapter used by the LABWEAVE production composition. */
export function createLabHostAdapter(dependencies: LabHostAdapterDependencies = {}): LabWorkbenchAdapter & LabProjectFileAdapter {
  const sendCommand = dependencies.sendCommand ?? sendLabCommand
  const sendProjectCommand = dependencies.sendProjectCommand ?? sendLabProjectCommand
  const subscribeHostEvents = dependencies.subscribeHostEvents ?? (() => () => {})

  const adapter: LabWorkbenchAdapter & LabProjectFileAdapter = {
    listProjects: () => query(async () => {
      const result = await sendProjectCommand({ command: 'project-list' })
      if (result.kind !== 'project-list') throw invalid('项目列表响应格式无效')
      return result.value.flatMap(project => project.project === undefined ? [] : [project.project])
    }),
    openProject: projectId => query(async () => projectResult(await sendProjectCommand({ command: 'project-open', projectId }), 'project')),
    listExperiments: projectId => query(async () => {
      const result = await sendProjectCommand({ command: 'experiment-list', projectId })
      if (result.kind !== 'experiment-list') throw invalid('实验列表响应格式无效')
      return result.value
    }),
    openExperiment: (projectId, experimentId) => query(async () => {
      const result = await sendProjectCommand({ command: 'experiment-open', projectId, experimentId })
      if (result.kind !== 'experiment') throw invalid('实验详情响应格式无效')
      return result.value
    }),
    listRuns: experimentId => query(async () => {
      const result = await sendProjectCommand({ command: 'run-list', experimentId })
      if (result.kind !== 'run-list') throw invalid('Run 列表响应格式无效')
      return result.value
    }),
    compareRuns: (leftRunId, rightRunId) => query(async () => {
      const result = await sendProjectCommand({ command: 'run-compare', leftRunId, rightRunId })
      if (result.kind !== 'run-comparison') throw invalid('Run 比较响应格式无效')
      return result.value
    }),
    openRun: runId => query(async () => projectResult(await sendProjectCommand({ command: 'run-open', runId }), 'run')),
    listArtifacts: runId => query(async () => {
      const result = await sendProjectCommand({ command: 'artifact-list', runId })
      if (result.kind !== 'artifact-list') throw invalid('Artifact 列表响应格式无效')
      return result.value
    }),
    openArtifact: (runId, artifactId) => query(async () => projectResult(await sendProjectCommand({ command: 'artifact-open', runId, artifactId }), 'artifact')),
    buildReport: runId => query(async () => {
      const result = await sendProjectCommand({ command: 'run-report', runId })
      if (result.kind !== 'run-report') throw invalid('Run 报告响应格式无效')
      return result.value
    }),
    getWorkflow: experimentId => query(async () => {
      const reviews = await listReviews(sendProjectCommand, experimentId)
      const review = reviews.at(-1)
      return review === undefined ? unavailable('该实验尚无 Workflow/Plan 记录') : workflowFromReview(review)
    }),
    listSkillRevisions: experimentId => query(async () => {
      const reviews = await listReviews(sendProjectCommand, experimentId)
      return reviews.flatMap(review => review.skillRevisions ?? [])
    }),
    getResultAssessment: runId => query(async () => {
      const result = await adapter.buildReport(runId)
      if (result.state !== 'ready') return carryState(result)
      return result.value.assessment === undefined
        ? unavailable('该 Run 尚无 Host 结果判定')
        : result.value.assessment
    }),
    getKnowledgeScope: projectId => query(async () => {
      if (projectId === undefined) return unavailable('未选择 Project，Knowledge scope 不可用')
      const project = await projectResult(await sendProjectCommand({ command: 'project-open', projectId }), 'project')
      return { capability: { state: 'unavailable', reason: 'Knowledge capability 未通过 Project Facade 暴露' }, sources: project.sources, evidence: project.evidence }
    }),
    validatePlan: planId => query(async () => {
      const result = await sendCommand({ command: 'plan-validate', planId })
      if (result.kind !== 'plan-proposal') throw invalid('Plan 校验响应格式无效')
      return result.value.validation ?? unavailable('Host 未返回 Plan 校验结果')
    }),
    validateSkill: revisionId => query(async () => {
      const result = await sendCommand({ command: 'skill-validate', revisionId })
      if (result.kind !== 'skill-revision') throw invalid('Skill 校验响应格式无效')
      return unavailable(`Host 已返回 Skill revision ${result.value.revisionId ?? revisionId}，但 Facade 尚未暴露结构化校验结果`)
    }),
    createProject: async input => projectResult(await sendProjectCommand({ command: 'project-create', workspaceId: input.workspaceId, ...input.name === undefined ? {} : { name: input.name }, ...input.description === undefined ? {} : { description: input.description } }), 'project'),
    archiveProject: async projectId => projectResult(await sendProjectCommand({ command: 'project-archive', projectId }), 'project'),
    createExperiment: async input => experimentFromProjectAction(await sendProjectCommand({ command: 'experiment-create', projectId: input.projectId, title: input.title, objective: input.objective }), input.title, input.objective),
    deriveExperiment: async input => experimentFromProjectAction(await sendProjectCommand({ command: 'experiment-derive', projectId: input.projectId, sourceExperimentId: input.sourceExperimentId, title: input.title, objective: input.objective }), input.title, input.objective),
    linkExperimentSession: async input => projectResult(await sendProjectCommand({ command: 'experiment-session-link', projectId: input.projectId, experimentId: input.experimentId, targetSessionId: input.targetSessionId, role: input.role }), 'experiment-project'),
    approvePlan: async input => workflowFromReview(await agentReview(sendCommand, { command: 'plan-approve', experimentId: input.experimentId, planId: input.planId, approvedBy: input.approvedBy })),
    approveSkill: async input => agentRevision(sendCommand, { command: 'skill-approve', revisionId: input.revisionId, approvedBy: input.approvedBy }),
    activateSkill: async revisionId => agentRevision(sendCommand, { command: 'skill-activate', revisionId }),
    startRun: async input => projectResult(await sendProjectCommand({ command: 'run-start', experimentId: input.experimentId, planId: input.planId, ...input.sessionId === undefined ? {} : { sessionId: input.sessionId } }), 'run'),
    stopRun: async input => agentRun(sendCommand, { command: 'run-stop', runId: input.runId, requestedBy: input.requestedBy }),
    retryRun: async input => projectResult(await sendProjectCommand({ command: 'run-retry', runId: input.runId }), 'run'),
    confirmStep: async input => agentRun(sendCommand, { command: 'run-confirm', runId: input.runId, evidence: input.evidence, confirmedBy: input.confirmedBy, ...input.stepId === undefined ? {} : { stepId: input.stepId }, ...input.operationId === undefined ? {} : { operationId: input.operationId } }),
    listProjectFiles: projectId => query(async () => {
      const result = await sendProjectCommand({ command: 'project-file-list', projectId })
      if (result.kind !== 'project-file-list') throw invalid('Project 文件列表响应格式无效')
      return result.value
    }),
    openProjectFile: (projectId, projectFileId) => query(async () => {
      const result = await sendProjectCommand({ command: 'project-file-open', projectId, projectFileId })
      if (result.kind !== 'project-file-preview') throw invalid('Project 文件预览响应格式无效')
      return result.value
    }),
    downloadProjectFile: (projectId, projectFileId) => query(async () => {
      const result = await sendProjectCommand({ command: 'project-file-download', projectId, projectFileId })
      if (result.kind !== 'project-file-download') throw invalid('Project 文件下载响应格式无效')
      return result.value
    }),
    listConfigurationCapabilities: () => query(async () => {
      const result = await sendProjectCommand({ command: 'configuration-capabilities' })
      if (result.kind !== 'configuration-capabilities') throw invalid('配置 capability 响应格式无效')
      return result.value
    }),
    subscribeProjectFileEvents: listener => subscribeHostEvents(envelope => {
      const frame = envelope.payload
      if (!isProjectFileRevisionFrame(frame)) return
      listener({
          type: 'project-file-revision',
          projectId: frame.projectId,
          projectFileId: frame.projectFileId,
          group: frame.group,
          revision: frame.revision,
        })
      }),
  }
  return adapter
}

function isProjectFileRevisionFrame(value: unknown): value is {
  readonly type: 'host/project-file-revision'
  readonly projectId: string
  readonly projectFileId: string
  readonly group: 'configuration' | 'conversation-output' | 'run-artifacts'
  readonly revision: number
} {
  if (typeof value !== 'object' || value === null) return false
  const frame = value as Record<string, unknown>
  return frame.type === 'host/project-file-revision'
    && typeof frame.projectId === 'string'
    && typeof frame.projectFileId === 'string'
    && (frame.group === 'configuration' || frame.group === 'conversation-output' || frame.group === 'run-artifacts')
    && typeof frame.revision === 'number'
}

async function listReviews(sendProjectCommand: NonNullable<LabHostAdapterDependencies['sendProjectCommand']>, experimentId: string): Promise<readonly LabPlanReview[]> {
  const result = await sendProjectCommand({ command: 'experiment-reviews', experimentId })
  if (result.kind !== 'experiment-reviews') throw invalid('实验计划审查响应格式无效')
  return result.value
}

async function agentReview(sendCommand: NonNullable<LabHostAdapterDependencies['sendCommand']>, command: Extract<LabCommand, { command: 'plan-approve' }>): Promise<LabPlanReview> {
  const result = await sendCommand(command)
  if (result.kind !== 'plan-proposal') throw invalid('Plan 审批响应格式无效')
  return result.value
}

async function agentRevision(sendCommand: NonNullable<LabHostAdapterDependencies['sendCommand']>, command: Extract<LabCommand, { command: 'skill-approve' }> | Extract<LabCommand, { command: 'skill-activate' }>): Promise<Extract<Awaited<ReturnType<typeof sendLabCommand>>, { kind: 'skill-revision' }>['value']> {
  const result = await sendCommand(command)
  if (result.kind !== 'skill-revision') throw invalid('Skill 操作响应格式无效')
  return result.value
}

async function agentRun(sendCommand: NonNullable<LabHostAdapterDependencies['sendCommand']>, command: LabCommand): Promise<LabRun> {
  const result = await sendCommand(command as Extract<LabCommand, { command: 'run-stop' }> | Extract<LabCommand, { command: 'run-confirm' }>)
  if (result.kind !== 'run') throw invalid('Run 操作响应格式无效')
  return result.value
}

function projectResult(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, kind: 'project'): LabProjectView
function projectResult(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, kind: 'experiment-project'): LabProjectView
function projectResult(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, kind: 'run'): LabRun
function projectResult(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, kind: 'artifact'): LabArtifactRecord
function projectResult(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, kind: 'project' | 'experiment-project' | 'run' | 'artifact'): LabProjectView | LabRun | LabArtifactRecord {
  if (result.kind !== kind) throw invalid(`${kind} 响应格式无效`)
  return result.value
}

function experimentFromProjectAction(result: Awaited<ReturnType<typeof sendLabProjectCommand>>, title: string, objective: string): LabExperimentRecord {
  const project = projectResult(result, 'experiment-project')
  if (!('experiments' in project)) throw invalid('实验创建响应缺少 Project 实验记录')
  const experiment = project.experiments.find(item => item.title === title && item.objective === objective)
  if (experiment === undefined) throw invalid('实验创建响应缺少新建 Experiment')
  return experiment
}

function workflowFromReview(review: LabPlanReview): LabWorkflowRecord {
  const plan = review.plan
  if (plan.planId === undefined || plan.experimentId === undefined || plan.revision === undefined || plan.status === undefined || plan.steps === undefined) throw invalid('Plan 记录缺少 Workflow 所需字段')
  return { planId: plan.planId, experimentId: plan.experimentId, revision: plan.revision, status: plan.status, steps: plan.steps, skillRevisionIds: review.skillRevisions?.flatMap(item => item.revisionId === undefined ? [] : [item.revisionId]) ?? [], unresolved: plan.unresolved ?? [] }
}

function ready<T>(value: T): LabQueryState<T> { return { state: 'ready', value } }

function unavailable<T>(message: string): LabQueryState<T> { return { state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message, retryable: false } }

function invalid(message: string): LabApiError { return new LabApiError('INVALID_RESPONSE', message) }

async function query<T>(operation: () => Promise<T | LabQueryState<T>>): Promise<LabQueryState<T>> {
  try {
    const value = await operation()
    return isQueryState<T>(value) ? value : ready(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = error instanceof LabWorkbenchError ? error.code : error instanceof LabApiError && error.code === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'PROVIDER_UNAVAILABLE'
    return { state: 'failed', code, message, retryable: code !== 'PERMISSION_DENIED' }
  }
}

function carryState<T, U>(state: LabQueryState<T>): LabQueryState<U> {
  return state.state === 'ready' ? unavailable('Host 查询未返回所需记录') : state
}

function isQueryState<T>(value: T | LabQueryState<T>): value is LabQueryState<T> {
  return typeof value === 'object' && value !== null && 'state' in value && typeof value.state === 'string'
}
