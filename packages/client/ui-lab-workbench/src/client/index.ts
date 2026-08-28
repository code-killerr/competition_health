/** 实验自动化工作台的浏览器插件；通过 `conversation.view` 接入现有会话视图。 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { LabWorkbench } from './LabWorkbench.tsx'
import { LabGlobalNavigation } from './LabGlobalNavigation.tsx'
import type { LabGlobalNavigationInjected } from './LabGlobalNavigation.tsx'
import { LabProjectsView } from './LabProjectsView.tsx'
import type { LabProjectSummary, LabProjectsInjected } from './LabProjectsView.tsx'
import { LabUiContext } from './LabUiContext.ts'
import {
  LabApiError,
  sendLabProjectCommand,
  sendLabCommand,
  toSnapshot,
  type LabCommand,
  type LabExperimentRequest,
  type LabPlan,
  type LabProjectCommand,
  type LabProjectView,
  type LabSkillDraft,
} from './api.ts'
import { en, zh, type LabWorkbenchKey } from './locales.ts'
import { createLabWorkbenchStore } from './store.ts'
import type { LabWorkbenchInjected } from './LabWorkbench.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** 独立 Knowledge workspace 的公共挂载点。 */
    'lab.knowledge.workspace': { kind: 'single'; scope: 'session'; owner: import('./LabWorkbench.tsx').LabKnowledgeWorkspaceOwnerProps }
  }
  interface LocaleNamespaceMap {
    /** 实验工作台的阶段与操作文案。 */
    labWorkbench: LabWorkbenchKey
  }
}

export type { LabWorkbenchKey } from './locales.ts'
export type { LabKnowledgeWorkspaceOwnerProps } from './LabWorkbench.tsx'
export { LabUiContext } from './LabUiContext.ts'
export type { LabProjectSummary, LabProjectsInjected } from './LabProjectsView.tsx'

const NS = 'labWorkbench'

/** 工作台所需的客户端 Service。 */
export const inject = ['slots', 'locale', 'sessions', 'layout', 'workspaces']

/** 注册实验工作台及其唯一状态实例。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-lab-workbench: dictionaries')

  const store = createLabWorkbenchStore()
  const ui = new LabUiContext()
  ctx.effect(() => ctx.reflect.provide('labUi', ui), 'ui-lab-workbench: presentation selection')

  const pageInjected = (): LabProjectsInjected => ({
    ui,
    listProjects: listProjectSummaries,
    createProject: createProjectSummary,
  })
  const registerProjects = (): (() => void) => ctx.slots.register({
    name: 'app.view',
    id: 'lab-projects',
    order: 10,
    locale: NS,
    inject: pageInjected,
  }, LabProjectsView)
  ctx.slots.inject('app.view', registerProjects)

  const registerGlobalNavigation = (): (() => void) => ctx.slots.register({
    name: 'sidebar.navigation',
    id: 'lab-global-navigation',
    order: 10,
    locale: NS,
    inject: (): LabGlobalNavigationInjected => ({ openAppView: (viewId) => { ctx.layout.openAppView(viewId) } }),
  }, LabGlobalNavigation)
  ctx.slots.inject('sidebar.navigation', registerGlobalNavigation)

  const register = (): (() => void) => ctx.slots.register({
    name: 'conversation.view',
    id: 'lab-workbench',
    order: 20,
    locale: NS,
    children: {
      'lab.knowledge.workspace': { kind: 'single', scope: 'session' },
    },
    store,
    inject: (sessionId: SessionId, actions: BoundActions<typeof store>): LabWorkbenchInjected => {
      let latestExperimentId: string | undefined
      const withSession = (command: LabCommand): LabCommand => ({ ...command, sessionId })
      const withProjectSession = (command: LabProjectCommand): LabProjectCommand => ({ ...command, sessionId })
      const run = async (label: string, command: LabCommand): Promise<void> => {
        actions.setPending(label)
        actions.setError(undefined)
        try {
          const result = await sendLabCommand(withSession(command))
          applyResult(actions, command, result.value)
          if (command.command !== 'snapshot' && command.command !== 'knowledge-search' && latestExperimentId !== undefined) await refresh(latestExperimentId)
        } catch (error) {
          actions.setError(formatError(error))
        } finally {
          actions.setPending(undefined)
        }
      }

      const refresh = async (experimentId: string): Promise<void> => {
        latestExperimentId = experimentId
        await run('snapshot', { command: 'snapshot', experimentId })
      }


      const projectRun = async (label: string, command: LabProjectCommand): Promise<unknown> => {
        actions.setPending(label)
        actions.setError(undefined)
        try {
          const result = await sendLabProjectCommand(withProjectSession(command))
          if (Array.isArray(result.value)) {
            actions.setProjectViews(result.value.map(toProjectView))
            return result.value
          } else {
            const view = toProjectView(result.value)
            const project = view.project ?? {}
            const projectId = typeof project.projectId === 'string' ? project.projectId : undefined
            const projectName = typeof project.name === 'string' ? project.name : undefined
            if (projectId !== undefined) actions.setProjectId(projectId)
            if (projectName !== undefined) actions.setProjectName(projectName)
            actions.setProjectView(view)
            actions.setSelectedSourceKeysText(view.sources.map(source => `${stringValue(source.documentId)}:${stringValue(source.versionId)}`).join('\n'))
            actions.setSelectedDeviceIdsText(view.devices.map(device => stringValue(device.deviceId, stringValue(device.id))).filter(value => value !== '').join(', '))
            return result.value
          }
        } catch (error) {
          actions.setError(formatError(error))
        } finally {
          actions.setPending(undefined)
        }
      }

      const listProjects = async (): Promise<void> => { await projectRun('project-list', { command: 'project-list' }) }
      const openSession = (targetSessionId: string): void => { ctx.sessions.open(targetSessionId as SessionId) }
      const createSession = async (projectId: string, title?: string): Promise<void> => {
        const value = await projectRun('project-session-create', {
          command: 'project-session-create',
          projectId,
          ...title === undefined ? {} : { title },
        })
        if (value === undefined || Array.isArray(value)) return
        const sessions = toProjectView(value).sessions
        const created = sessions.at(-1)
        if (created !== undefined && typeof created.sessionId === 'string') openSession(created.sessionId)
      }
      const openProject = async (projectId: string): Promise<void> => { await projectRun('project-open', { command: 'project-open', projectId }) }
      const createProject = async (name: string): Promise<void> => {
        await projectRun('project-create', { command: 'project-create', name })
      }
      const updateProjectScope = async (
        projectId: string,
        sources: readonly { readonly documentId: string; readonly versionId: string }[],
        deviceIds: readonly string[],
      ): Promise<void> => { await projectRun('project-scope-update', { command: 'project-scope-update', projectId, sources, deviceIds }) }
      const associateSession = async (projectId: string, targetSessionId: string, title?: string): Promise<void> => { await projectRun('project-session-attach', {
        command: 'project-session-attach',
        projectId,
        targetSessionId,
        ...title === undefined ? {} : { title },
      }) }
      const renameSession = async (projectId: string, targetSessionId: string, title: string): Promise<void> => { await projectRun('project-session-rename', {
        command: 'project-session-rename',
        projectId,
        targetSessionId,
        title,
      }) }



      const requestAction = async (label: string, request: LabExperimentRequest, command: LabCommand): Promise<void> => {
        latestExperimentId = request.experimentId
        await run(label, command)
      }

      const createExperiment = (request: LabExperimentRequest): Promise<void> => requestAction('experiment-create', request, { command: 'experiment-create', request })
      const buildContext = (request: LabExperimentRequest): Promise<void> => requestAction('planning-context', request, { command: 'planning-context', request })
      const proposeLocalPlan = async (request: LabExperimentRequest, content: string): Promise<void> => {
        let input: {
          readonly request: LabExperimentRequest
          readonly plan: LabPlan
          readonly skillDrafts: LabSkillDraft[]
        }
        try {
          const value = JSON.parse(content) as unknown
          const object = asRecord(value)
          if (!Array.isArray(object.skillDrafts) || !isRecord(object.plan)) throw new Error('本地计划 JSON 必须包含 plan 对象和 skillDrafts 数组')
          input = {
            request,
            plan: object.plan,
            skillDrafts: object.skillDrafts as LabSkillDraft[],
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          actions.setError(formatError(new LabApiError('INVALID_OUTPUT', message)))
          return
        }
        await requestAction('plan-propose', request, {
          command: 'plan-propose',
          input,
        })
      }
      const validatePlan = (planId: string): Promise<void> => run('plan-validate', { command: 'plan-validate', planId })
      const approvePlan = (experimentId: string, planId: string, approvedBy: string): Promise<void> => run('plan-approve', { command: 'plan-approve', experimentId, planId, approvedBy })
      const validateSkill = (revisionId: string): Promise<void> => run('skill-validate', { command: 'skill-validate', revisionId })
      const approveSkill = (revisionId: string, approvedBy: string): Promise<void> => run('skill-approve', { command: 'skill-approve', revisionId, approvedBy })
      const activateSkill = (revisionId: string): Promise<void> => run('skill-activate', { command: 'skill-activate', revisionId })
      const startRun = (experimentId: string, planId: string): Promise<void> => run('run-start', { command: 'run-start', experimentId, planId })
      const executeStep = (runId: string): Promise<void> => run('run-step', { command: 'run-step', runId })
      const confirmStep = (runId: string, evidence: string, confirmedBy: string, stepId?: string): Promise<void> => run('run-confirm', {
        command: 'run-confirm',
        runId,
        evidence: splitLines(evidence),
        confirmedBy,
        ...stepId === undefined || stepId.trim() === '' ? {} : { stepId },
      })
      const stopRun = (runId: string, requestedBy: string): Promise<void> => run('run-stop', { command: 'run-stop', runId, requestedBy })
      const report = (runId: string): Promise<void> => run('run-report', { command: 'run-report', runId })

      return {
        refresh,
        listProjects,
        openSession,
        createSession,
        openProject,
        createProject,
        updateProjectScope,
        associateSession,
        renameSession,
        createExperiment,
        buildContext,

        proposeLocalPlan,
        validatePlan,
        approvePlan,
        validateSkill,
        approveSkill,
        activateSkill,
        startRun,
        executeStep,
        confirmStep,
        stopRun,
        report,
      }
    },
  }, LabWorkbench)

  ctx.slots.inject('conversation.view', register)
}

function formatError(error: unknown): string {
  return error instanceof LabApiError ? error.code + ': ' + error.message : error instanceof Error ? error.message : String(error)
}

async function listProjectSummaries(): Promise<readonly LabProjectSummary[]> {
  const result = await sendLabProjectCommand({ command: 'project-list' })
  if (result.kind !== 'project-list' || !Array.isArray(result.value)) throw new LabApiError('INVALID_RESPONSE', '项目列表响应格式无效')
  return result.value.map(value => projectSummary(value))
}

async function createProjectSummary(workspaceId: string, name: string): Promise<LabProjectSummary> {
  const result = await sendLabProjectCommand({ command: 'project-create', workspaceId, name })
  if (result.kind !== 'project') throw new LabApiError('INVALID_RESPONSE', '项目创建响应格式无效')
  return projectSummary(result.value)
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
  if (typeof value !== 'string' || value.trim() === '') throw new LabApiError('INVALID_RESPONSE', `${path} 缺少有效字符串`)
  return value
}
function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}
function applyResult(actions: BoundActions<ReturnType<typeof createLabWorkbenchStore>>, command: LabCommand, value: unknown): void {
  if (command.command === 'snapshot' || command.command === 'experiment-create') {
    actions.setSnapshot(toSnapshot(value))
    return
  }
  if (command.command === 'planning-context') {
    actions.setPlanningContext(asRecord(value))
  }
}
function toProjectView(value: unknown): LabProjectView {
  const object = asRecord(value)
  return {
    project: asRecord(object.project),
    sources: array(object.sources).map(item => asRecord(item)),
    devices: array(object.devices).map(item => asRecord(item)),
    sessions: array(object.sessions).map(item => asRecord(item)),
    sharedFacts: array(object.sharedFacts).map(item => asRecord(item)),
    evidence: array(object.evidence).map(item => asRecord(item)),
  }
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function splitLines(value: string): readonly string[] {
  return value.split(/\r?\n/).map(item => item.trim()).filter(item => item !== '')
}
