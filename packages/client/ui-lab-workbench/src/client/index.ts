/** 实验自动化工作台的浏览器插件；通过根级 app.view 与真实 Harness Conversation 组合。 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { LabGlobalNavigation } from './LabGlobalNavigation.tsx'
import type { LabGlobalNavigationInjected } from './LabGlobalNavigation.tsx'
import { LabProjectsView } from './LabProjectsView.tsx'
import type { LabProjectRunSummary, LabProjectSummary, LabProjectsInjected } from './LabProjectsView.tsx'
import { LabProjectShellView } from './LabProjectShellView.tsx'
import type { LabProjectShellInjected } from './LabProjectShellView.tsx'
import { LabDevicesView } from './LabDevicesView.tsx'
import type { LabDevicesInjected } from './LabDevicesView.tsx'
import { LabUiContext } from './LabUiContext.ts'
import type { LabCitationSelection } from './LabUiContext.ts'
import { LabApiError, sendLabCommand, sendLabProjectCommand } from './api.ts'
import type { LabDevice, LabPlanReview, LabRun } from './api.ts'
import { en, zh, type LabWorkbenchKey } from './locales.ts'
import type { LabQueryState } from './adapter.ts'
import { LabConversationHeaderAction } from './LabConversationHeaderAction.tsx'
import type { LabConversationHeaderInjected } from './LabConversationHeaderAction.tsx'
import { LabConversationContextDock } from './LabConversationContextDock.tsx'
import type { LabConversationContextInjected } from './LabConversationContextDock.tsx'
import { LabCommandCard, LAB_COMMAND_NAMES } from './LabCommandCard.tsx'
import type { LabCommandCardInjected } from './LabCommandCard.tsx'
import { LabLifecycleNodeView } from './LabLifecycleNodeView.tsx'
import type { LabLifecycleNodeInjected } from './LabLifecycleNodeView.tsx'
import { consumeLabPresentationIntent } from './LabPresentationConsumer.ts'
import type { LabPresentationTarget } from './LabPresentationConsumer.ts'
import { LabOperationsView } from './LabOperationsView.tsx'
import type { LabOperationsInjected } from './LabOperationsView.tsx'
import { createLabHostAdapter } from './host-adapter.ts'

export { LabWorkbenchError } from './adapter.ts'
export type { LabAdapterErrorCode, LabProjectFileAdapter, LabProjectFileEventListener, LabQueryState, LabWorkbenchAdapter, LabWorkbenchActions, LabWorkbenchQueries, LabKnowledgeScopeView } from './adapter.ts'
export { createLabHostAdapter } from './host-adapter.ts'
export type { LabHostAdapterDependencies } from './host-adapter.ts'
export type { LabProjectFileDownload, LabProjectFileGroup, LabProjectFilePreview, LabProjectFileRecord, LabProjectFileRevisionEvent } from './api.ts'
export type { LabConfigurationCapability } from './api.ts'
export { createLabFixtureAdapter, LAB_FIXTURE_IDS, parseLabFixtureEvents, serializeLabFixtureEvents } from './fixtures/adapter.ts'
export type { LabFixtureAdapter, LabFixtureScenario } from './fixtures/adapter.ts'
export { validateLabPresentationIntent } from './lifecycle.ts'
export type { LabAgentLifecycleProjection, LabPresentationErrorCode, LabPresentationIntent, LabPresentationScope, LabPresentationValidation, LabPresentationView } from './lifecycle.ts'
export { consumeLabPresentationIntent } from './LabPresentationConsumer.ts'
export type { LabPresentationTarget } from './LabPresentationConsumer.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 实验工作台的页面与 Agent 上下文文案。 */
    labWorkbench: LabWorkbenchKey
  }
}

export type { LabWorkbenchKey } from './locales.ts'
export { LabUiContext } from './LabUiContext.ts'
export { LabCitationLink } from './LabCitationLink.tsx'
export type { LabCitationLinkProps, LabCitationOrigin } from './LabCitationLink.tsx'
export { LabAgentLifecycleView } from './LabAgentLifecycleView.tsx'
export type { LabAgentLifecycleViewProps, LabLifecycleLabels } from './LabAgentLifecycleView.tsx'
export { LabWorkflowView } from './LabWorkflowView.tsx'
export type { LabWorkflowLabels, LabWorkflowViewProps } from './LabWorkflowView.tsx'
export { LabSkillView } from './LabSkillView.tsx'
export type { LabSkillLabels, LabSkillReviewAction, LabSkillReviewState, LabSkillRevisionChange, LabSkillViewProps } from './LabSkillView.tsx'
export { LabRunResultView, getResultDisplayState, getRunDisplayState } from './LabRunResultView.tsx'
export type { LabResultDisplayState, LabRunDisplayState, LabRunResultLabels, LabRunResultViewProps } from './LabRunResultView.tsx'
export { LabConversationHeaderAction } from './LabConversationHeaderAction.tsx'
export type { LabConversationHeaderInjected } from './LabConversationHeaderAction.tsx'
export { LabConversationContextDock } from './LabConversationContextDock.tsx'
export type { LabConversationContextInjected, LabConversationContextSource } from './LabConversationContextDock.tsx'
export { LabCommandCard, LAB_COMMAND_NAMES } from './LabCommandCard.tsx'
export type { LabCommandCardInjected } from './LabCommandCard.tsx'
export { LabLifecycleNodeView } from './LabLifecycleNodeView.tsx'
export type { LabLifecycleNodeInjected } from './LabLifecycleNodeView.tsx'
export type { LabProjectSummary, LabProjectsInjected } from './LabProjectsView.tsx'
export { LabExperimentDetailView } from './LabExperimentDetailView.tsx'
export type { LabExperimentDetailLabels, LabExperimentDetailViewProps } from './LabExperimentDetailView.tsx'
export { LabRunDetailView } from './LabRunDetailView.tsx'
export type { LabRunDetailLabels, LabRunDetailViewProps } from './LabRunDetailView.tsx'
export { LabRunComparisonView } from './LabRunComparisonView.tsx'
export type { LabRunComparisonLabels } from './LabRunComparisonView.tsx'
export { LabArtifactPreview } from './LabArtifactPreview.tsx'
export type { LabArtifactPreviewLabels, LabArtifactPreviewValue } from './LabArtifactPreview.tsx'
export { LabProjectFileView } from './LabProjectFileView.tsx'
export type { LabProjectFileLabels } from './LabProjectFileView.tsx'
export { LabResultReportView } from './LabResultReportView.tsx'
export type { LabResultReportLabels } from './LabResultReportView.tsx'
export type { LabDevicesInjected, LabDevicesUi } from './LabDevicesView.tsx'
export type { LabCitationSelection } from './LabUiContext.ts'

const NS = 'labWorkbench'

/** Host-owned Project scope actions consumed by the independent Knowledge view. */
export interface LabProjectActions {
  /** Toggle one Knowledge source in a Project's Host-owned source scope. */
  readonly toggleSource: (projectId: string, source: { readonly documentId: string; readonly versionId: string }) => Promise<void>
}

/** Typed navigation service for Agent and conversation presentation consumers. */
export interface LabPresentationController {
  /** Open Knowledge and preserve the authorized citation target for the page. */
  readonly openCitation: (citation: LabCitationSelection) => void
  /** Validate and consume an Agent presentation request before changing client selection. */
  readonly present: (value: unknown, scope: import('./lifecycle.ts').LabPresentationScope) => import('./lifecycle.ts').LabPresentationValidation
}

/** 工作台所需的客户端 Service。 */
export const inject = ['slots', 'locale', 'sessions', 'layout', 'workspaces', 'connection']

/** 注册 LABWEAVE 页面，并让真实 Harness Conversation 作为三栏中间唯一输入面。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-lab-workbench: dictionaries')

  const ui = new LabUiContext()
  const connection = ctx.get('connection') as { readonly subscribeHostEvents?: LabHostEventSubscription } | undefined
  const adapter = createLabHostAdapter({
    ...connection?.subscribeHostEvents === undefined ? {} : { subscribeHostEvents: connection.subscribeHostEvents as LabHostEventSubscription },
  })
  ctx.effect(() => ctx.reflect.provide('labUi', ui), 'ui-lab-workbench: presentation selection')
  ctx.effect(() => ctx.reflect.provide('labAdapter', adapter), 'ui-lab-workbench: Host adapter')
  const projectActions: LabProjectActions = { toggleSource: toggleProjectSource }
  ctx.effect(() => ctx.reflect.provide('labProjectActions', projectActions), 'ui-lab-workbench: project scope actions')
  const presentation: LabPresentationController = {
    openCitation: citation => {
      ui.openCitation(citation)
      ctx.layout.openAppView('lab-knowledge')
    },
    present: (value, scope) => consumeLabPresentationIntent(value, scope, {
      ui,
      openAppView: viewId => { ctx.layout.openAppView(viewId) },
    } satisfies LabPresentationTarget),
  }
  ctx.effect(() => ctx.reflect.provide('labPresentation', presentation), 'ui-lab-workbench: presentation controller')

  const registerProjects = (): (() => void) => ctx.slots.register({
    name: 'app.view',
    id: 'lab-projects',
    conversationMode: 'lab-workspace',
    order: 10,
    locale: NS,
    inject: (): LabProjectsInjected => ({
      ui,
      listProjects: listProjectSummaries,
      createProject: async workspaceId => projectSummary(await adapter.createProject({ workspaceId })),
      openProjectView: () => { ctx.layout.openAppView('lab-project') },
    }),
  }, LabProjectsView)
  ctx.slots.inject('app.view', registerProjects)

  const registerProjectShell = (): (() => void) => ctx.slots.register({
    name: 'app.view',
    id: 'lab-project',
    order: 11,
    conversationMode: 'lab-workspace',

    locale: NS,
    inject: (): LabProjectShellInjected => ({
      ui,
      loadProject: adapter.openProject,
      listRuns: adapter.listRuns,
      listArtifacts: adapter.listArtifacts,
      loadRunReport: adapter.buildReport,
      openArtifact: async (runId, artifactId) => requireReady(await adapter.openArtifact(runId, artifactId)),
      loadExperimentReviews,
      compareRuns: adapter.compareRuns,
      retryRun: async runId => adapter.retryRun({ runId, actor: currentActor(ctx) }),
      confirmStep: input => adapter.confirmStep({ runId: input.runId, evidence: [], confirmedBy: currentActor(ctx), ...input.stepId === undefined ? {} : { stepId: input.stepId } }),
      stopRun: runId => adapter.stopRun({ runId, requestedBy: currentActor(ctx) }),
      listProjectFiles: adapter.listProjectFiles,
      openProjectFile: adapter.openProjectFile,
      downloadProjectFile: adapter.downloadProjectFile,
      subscribeProjectFileEvents: adapter.subscribeProjectFileEvents,
      openCitation: citation => { presentation.openCitation(citation) },
      openSession: (sessionId) => { ctx.sessions.open(sessionId as SessionId) },
    }),
  }, LabProjectShellView)
  ctx.slots.inject('app.view', registerProjectShell)

  const registerMonitor = (): (() => void) => ctx.slots.register({
    name: 'app.view', id: 'lab-monitor', order: 8, default: true, conversationMode: 'lab-workspace', locale: NS,
    inject: (): LabOperationsInjected => ({ kind: 'monitor', ui, listProjects: listProjectSummaries, openAppView: viewId => { ctx.layout.openAppView(viewId) } }),
  }, LabOperationsView)
  ctx.slots.inject('app.view', registerMonitor)

  const registerConfiguration = (): (() => void) => ctx.slots.register({
    name: 'app.view', id: 'lab-config', order: 9, conversationMode: 'replace', locale: NS,
    inject: (): LabOperationsInjected => ({ kind: 'configuration', ui, listProjects: listProjectSummaries, ...adapter.listConfigurationCapabilities === undefined ? {} : { listConfigurationCapabilities: adapter.listConfigurationCapabilities }, openAppView: viewId => { ctx.layout.openAppView(viewId) } }),
  }, LabOperationsView)
  ctx.slots.inject('app.view', registerConfiguration)

  const registerDevices = (): (() => void) => ctx.slots.register({
    name: 'app.view',
    id: 'lab-devices',
    order: 13,
    locale: NS,
    inject: (): LabDevicesInjected => ({
      ui,
      source: 'real',
      loadDevices: listDevices,
    }),
  }, LabDevicesView)
  ctx.slots.inject('app.view', registerDevices)

  const registerGlobalNavigation = (): (() => void) => ctx.slots.register({
    name: 'sidebar.navigation',
    id: 'lab-global-navigation',
    order: 10,
    locale: NS,
    inject: (): LabGlobalNavigationInjected => ({
      openAppView: (viewId) => { ctx.layout.openAppView(viewId) },
      ui,
      listProjects: listProjectSummaries,
    }),
  }, LabGlobalNavigation)
  ctx.slots.inject('sidebar.navigation', registerGlobalNavigation)

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'lab-context-action',
    order: 30,
    locale: NS,
    inject: (): LabConversationHeaderInjected => ({ ui, openWorkbench: () => { ctx.layout.openAppView('lab-project') } }),
  }, LabConversationHeaderAction))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'lab-context-dock',
    order: 10,
    locale: NS,
    inject: (): LabConversationContextInjected => ({ ui, loadRunContext }),
  }, LabConversationContextDock))
  for (const commandName of LAB_COMMAND_NAMES) {
    ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
      name: 'conversation.chat.commandview',
      key: commandName,
      locale: NS,
      inject: (): LabCommandCardInjected => ({ openWorkbench: () => { ctx.layout.openAppView('lab-project') } }),
    }, LabCommandCard))
  }
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'lab-lifecycle',
    locale: NS,
    inject: (): LabLifecycleNodeInjected => ({
      openDetail: event => { openLifecycleDetail(event, ui, ctx) },
      openCitation: citation => { presentation.openCitation(citation) },
    }),
  }, LabLifecycleNodeView))

}

type LabHostEventSubscription = (listener: (envelope: { readonly payload: unknown }) => void) => () => void

function openLifecycleDetail(event: import('./lifecycle.ts').LabAgentLifecycleProjection, ui: LabUiContext, ctx: ClientContext): void {
  if (event.kind === 'execution') {
    if (event.run.runId !== undefined) ui.selectRun(event.run.runId)
    ui.openProjectPage('execution')
  } else if (event.kind === 'result-assessment') {
    ui.selectRun(event.runId)
    ui.openProjectPage('evidence')
  } else if (event.kind === 'report') {
    ui.openProjectPage('evidence')
  } else {
    ui.openProjectPage('planning')
  }
  // The application view is intentionally selected after the typed UI state.
  // The workbench then reloads the owning Host records for that selection.
  ctx.layout.openAppView('lab-project')
}

async function listDevices(experimentId: string): Promise<LabQueryState<readonly LabDevice[]>> {
  try {
    void experimentId
    const result = await sendLabCommand({ command: 'device-list' })
    if (result.kind !== 'device-list') return hostQueryFailure('设备列表响应格式无效')
    return { state: 'ready', value: result.value }
  } catch (error) {
    return hostQueryFailure(error)
  }
}

function currentActor(ctx: ClientContext): string {
  const current = ctx.sessions.list.getSnapshot().current
  return current === undefined ? 'lab-web:anonymous' : String(current)
}

async function requireReady<T>(state: LabQueryState<T>): Promise<T> {
  if (state.state === 'ready') return state.value
  throw new LabApiError(state.code, state.message)
}

async function listProjectSummaries(): Promise<readonly LabProjectSummary[]> {
  const result = await sendLabProjectCommand({ command: 'project-list' })
  if (result.kind !== 'project-list' || !Array.isArray(result.value)) throw new LabApiError('INVALID_RESPONSE', '项目列表响应格式无效')
  return Promise.all(result.value.map(async value => {
    const summary = projectSummary(value)
    const experiments = array(asRecord(value).experiments).flatMap(item => {
      const record = asRecord(item)
      return typeof record.experimentId === 'string' ? [record.experimentId] : []
    })
    const states = await Promise.all(experiments.map(async experimentId => ({ experimentId, state: await listExperimentRuns(experimentId) })))
    if (states.some(({ state }) => state.state !== 'ready')) return summary
    const runs = states.flatMap(({ experimentId, state }) => state.state === 'ready'
      ? state.value.flatMap(run => run.runId === undefined || run.runStatus === undefined ? [] : [{
        experimentId,
        runId: run.runId,
        status: run.runStatus,
        ...(run.currentStepId === undefined ? {} : { currentStepId: run.currentStepId }),
        ...(run.updatedAt === undefined ? {} : { updatedAt: run.updatedAt }),
      } satisfies LabProjectRunSummary])
      : [])
    const active = runs.filter(run => run.status === 'CREATED' || run.status === 'WAITING_CONFIRMATION' || run.status === 'RUNNING' || run.status === 'BLOCKED')
    const activeRunCount = active.length
    const failedRunCount = runs.filter(run => run.status === 'FAILED').length
    const pendingApprovalCount = runs.filter(run => run.status === 'WAITING_CONFIRMATION').length
    const currentStepId = active.find(run => run.currentStepId !== undefined)?.currentStepId
    return currentStepId === undefined
      ? { ...summary, activeRunCount, failedRunCount, pendingApprovalCount, runs }
      : { ...summary, activeRunCount, failedRunCount, pendingApprovalCount, currentStepId, runs }
  }))
}

async function toggleProjectSource(projectId: string, source: { readonly documentId: string; readonly versionId: string }): Promise<void> {
  const current = await sendLabProjectCommand({ command: 'project-open', projectId })
  if (current.kind !== 'project') throw new LabApiError('INVALID_RESPONSE', '项目范围响应格式无效')
  const existing = current.value.sources.some(item => item.documentId === source.documentId && item.versionId === source.versionId)
  const sources = current.value.sources.flatMap(item => item.documentId !== undefined && item.versionId !== undefined
    ? [{ documentId: item.documentId, versionId: item.versionId }]
    : [])
  const nextSources = existing
    ? sources.filter(item => item.documentId !== source.documentId || item.versionId !== source.versionId)
    : [...sources, source]
  const deviceIds = current.value.devices.flatMap(item => {
    const deviceId = item.deviceId ?? item.id
    return deviceId === undefined ? [] : [deviceId]
  })
  const updated = await sendLabProjectCommand({ command: 'project-scope-update', projectId, sources: nextSources, deviceIds })
  if (updated.kind !== 'project') throw new LabApiError('INVALID_RESPONSE', '项目范围更新响应格式无效')
}

async function listExperimentRuns(experimentId: string): Promise<LabQueryState<readonly LabRun[]>> {
  try {
    const result = await sendLabProjectCommand({ command: 'run-list', experimentId })
    if (result.kind !== 'run-list') return hostQueryFailure('Run 列表响应格式无效')
    return { state: 'ready', value: result.value }
  } catch (error) {
    return hostQueryFailure(error)
  }
}

async function loadRunContext(experimentId: string, runId: string): Promise<{ readonly runStatus?: string; readonly currentStepId?: string }> {
  const result = await listExperimentRuns(experimentId)
  if (result.state !== 'ready') return {}
  const run = result.value.find(item => item.runId === runId)
  return run === undefined ? {} : {
    ...run.runStatus === undefined ? {} : { runStatus: run.runStatus },
    ...run.currentStepId === undefined ? {} : { currentStepId: run.currentStepId },
  }
}

async function loadExperimentReviews(experimentId: string): Promise<LabQueryState<readonly LabPlanReview[]>> {
  try {
    const result = await sendLabProjectCommand({ command: 'experiment-reviews', experimentId })
    if (result.kind !== 'experiment-reviews') return hostQueryFailure('实验计划审查响应格式无效')
    return { state: 'ready', value: result.value }
  } catch (error) {
    return hostQueryFailure(error)
  }
}

function hostQueryFailure<T>(error: unknown): LabQueryState<T> {
  return { state: 'failed', code: 'PROVIDER_UNAVAILABLE', message: error instanceof Error ? error.message : String(error), retryable: true }
}

function projectSummary(value: unknown): LabProjectSummary {
  const object = asRecord(value)
  const project = asRecord(object.project)
  const sessions = array(object.sessions)
  const experiments = array(object.experiments)
  const projectId = stringField(project.projectId, 'project.projectId')
  const workspaceId = stringField(project.workspaceId, 'project.workspaceId')
  const status = project.status === 'ARCHIVED' ? 'ARCHIVED' : project.status === 'ACTIVE' ? 'ACTIVE' : undefined
  if (status === undefined) throw new LabApiError('INVALID_RESPONSE', '项目状态无效')
  return {
    projectId,
    workspaceId,
    name: stringField(project.name, 'project.name'),
    description: typeof project.description === 'string' ? project.description : '',
    status,
    sessionCount: sessions.length,
    experimentCount: experiments.length,
  }
}

function stringField(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new LabApiError('INVALID_RESPONSE', path + ' 缺少有效字符串')
  return value
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}
