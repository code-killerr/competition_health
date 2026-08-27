/** 实验自动化工作台的浏览器插件；通过 `conversation.view` 接入现有会话视图。 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { LabWorkbench } from './LabWorkbench.tsx'
import { LabNavigation } from './LabNavigation.tsx'
import {
  sendLabProjectCommand,
  sendLabCommand,
  textToBase64,
  toSnapshot,
  type LabCommand,
  type LabExperimentRequest,
  type LabPlan,
  type LabProjectCommand,
  type LabProjectView,
  type LabSopDraft,
  type LabSkillDraft,
} from './api.ts'
import { en, zh, type LabWorkbenchKey } from './locales.ts'
import { createLabWorkbenchStore } from './store.ts'
import type { LabWorkbenchInjected } from './LabWorkbench.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 实验工作台的阶段与操作文案。 */
    labWorkbench: LabWorkbenchKey
  }
}

export type { LabWorkbenchKey } from './locales.ts'

const NS = 'labWorkbench'

/** 工作台所需的客户端 Service。 */
export const inject = ['slots', 'locale', 'sessions']

/** 注册实验工作台及其唯一状态实例。 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-lab-workbench: dictionaries')

  const store = createLabWorkbenchStore()

  const register = (): (() => void) => ctx.slots.register({
    name: 'conversation.view',
    id: 'lab-workbench',
    order: 20,
    locale: NS,
    store,
    inject: (sessionId: SessionId, actions: BoundActions<typeof store>): LabWorkbenchInjected => {
      let latestExperimentId = 'experiment-1'
      const withSession = (command: LabCommand): LabCommand => ({ ...command, sessionId })
      const withProjectSession = (command: LabProjectCommand): LabProjectCommand => ({ ...command, sessionId })
      const run = async (label: string, command: LabCommand): Promise<void> => {
        actions.setPending(label)
        actions.setError(undefined)
        try {
          const result = await sendLabCommand(withSession(command))
          applyResult(actions, command, result.value)
          if (command.command !== 'snapshot' && command.command !== 'knowledge-search') await refresh(latestExperimentId)
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : String(error))
        } finally {
          actions.setPending(undefined)
        }
      }

      const refresh = async (experimentId: string): Promise<void> => {
        latestExperimentId = experimentId
        await run('snapshot', { command: 'snapshot', experimentId })
      }

      const importSource = async (name: string, content: string, title: string): Promise<void> => {
        await run('knowledge-import', {
          command: 'knowledge-import',
          name,
          bytesBase64: textToBase64(content),
          ...title.trim() === '' ? {} : { metadata: { title: title.trim() } },
        })
        await refresh(latestExperimentId)
      }

      const importFile = async (file: File): Promise<void> => {
        const bytes = new Uint8Array(await file.arrayBuffer())
        await run('knowledge-import', {
          command: 'knowledge-import',
          name: file.name,
          bytesBase64: bytesToBase64(bytes),
          metadata: { sourceType: file.type || 'application/octet-stream' },
        })
        await refresh(latestExperimentId)
      }

      const createSop = (title: string, citationId: string, instruction: string): Promise<void> => run('knowledge-sop-create', {
        command: 'knowledge-sop-create',
        title,
        steps: [{ order: 1, title, instruction, requiredInputs: [], completionCriteria: [], citations: [citationId], missingFields: [] }],
      })

      const reviewSop = (draft: LabSopDraft): Promise<void> => {
        if (draft.draftId === undefined) return Promise.reject(new Error('当前没有可审核的 SOP 草案'))
        return run('knowledge-sop-update', {
          command: 'knowledge-sop-update',
          draftId: draft.draftId,
          title: draft.title ?? '',
          steps: (draft.steps ?? []).map(step => ({
            order: step.order ?? 0,
            title: step.title ?? '',
            instruction: step.instruction ?? '',
            requiredInputs: step.requiredInputs ?? [],
            completionCriteria: step.completionCriteria ?? [],
            citations: step.citations ?? [],
            missingFields: step.missingFields ?? [],
          })),
        })
      }

      const publishSop = (draftId: string): Promise<void> => run('knowledge-sop-publish', { command: 'knowledge-sop-publish', draftId, publishedBy: 'workbench-reviewer' })

      const projectRun = async (label: string, command: LabProjectCommand): Promise<void> => {
        actions.setPending(label)
        actions.setError(undefined)
        try {
          const result = await sendLabProjectCommand(withProjectSession(command))
          if (Array.isArray(result.value)) {
            actions.setProjectViews(result.value.map(toProjectView))
          } else {
            const view = toProjectView(result.value)
            actions.setProjectView(view)
            actions.setSelectedSourceKeysText(view.sources.map(source => `${String(source.documentId ?? '')}:${String(source.versionId ?? '')}`).join('\\n'))
            actions.setSelectedDeviceIdsText(view.devices.map(device => String(device.deviceId ?? device.id ?? '')).filter(value => value !== '').join(', '))
          }
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : String(error))
        } finally {
          actions.setPending(undefined)
        }
      }

      const listProjects = (): Promise<void> => projectRun('project-list', { command: 'project-list' })
      const openProject = (projectId: string): Promise<void> => projectRun('project-open', { command: 'project-open', projectId })
      const createProject = (projectId: string, name: string): Promise<void> => projectRun('project-create', { command: 'project-create', projectId, name })
      const updateProjectScope = (
        projectId: string,
        sources: readonly { readonly documentId: string; readonly versionId: string }[],
        deviceIds: readonly string[],
      ): Promise<void> => projectRun('project-scope-update', { command: 'project-scope-update', projectId, sources, deviceIds })
      const associateSession = (projectId: string, targetSessionId: string, title?: string): Promise<void> => projectRun('project-session-associate', {
        command: 'project-session-associate',
        projectId,
        targetSessionId,
        ...title === undefined ? {} : { title },
      })
      const renameSession = (projectId: string, targetSessionId: string, title: string): Promise<void> => projectRun('project-session-rename', {
        command: 'project-session-rename',
        projectId,
        targetSessionId,
        title,
      })


      const search = async (query: string, experimentId: string): Promise<void> => {
        latestExperimentId = experimentId
        actions.setPending('knowledge-search')
        actions.setError(undefined)
        try {
          const result = await sendLabCommand(withSession({ command: 'knowledge-search', request: { query, experimentId } }))
          const value = asRecord(result.value)
          actions.setSearch(
            Array.isArray(value.results) ? value.results as never[] : [],
            Array.isArray(value.conflicts) ? value.conflicts as never[] : [],
          )
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : String(error))
        } finally {
          actions.setPending(undefined)
        }
      }

      const requestAction = async (label: string, request: LabExperimentRequest, command: LabCommand): Promise<void> => {
        latestExperimentId = request.experimentId
        await run(label, command)
      }

      const createExperiment = (request: LabExperimentRequest): Promise<void> => requestAction('experiment-create', request, { command: 'experiment-create', request })
      const buildContext = (request: LabExperimentRequest): Promise<void> => requestAction('planning-context', request, { command: 'planning-context', request })
      const proposeLocalPlan = async (request: LabExperimentRequest, content: string): Promise<void> => {
        try {
          const value = JSON.parse(content) as unknown
          const object = asRecord(value)
          if (!Array.isArray(object.skillDrafts) || !isRecord(object.plan)) throw new Error('本地计划 JSON 必须包含 plan 对象和 skillDrafts 数组')
          await requestAction('plan-propose', request, {
            command: 'plan-propose',
            input: {
              request,
              plan: object.plan as LabPlan,
              skillDrafts: object.skillDrafts as LabSkillDraft[],
            },
          })
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : String(error))
        }
      }

      const agentPlan = async (projectId: string, request: LabExperimentRequest, submit: (text: string) => void): Promise<void> => {
        latestExperimentId = request.experimentId
        actions.setPending('agent-plan')
        actions.setError(undefined)
        try {
          const contextResult = await sendLabProjectCommand(withProjectSession({ command: 'project-planning-context', projectId, request }))
          if (contextResult.kind !== 'project-context') throw new Error('项目规划上下文返回了无效结果')
          const context = asRecord(contextResult.value)
          actions.setPlanningContext(asRecord(context.planningContext))
          const prompt = [
            '请为实验自动化工作台规划实验步骤。',
            '只使用上面的项目规划上下文，调用 lab_project_plan_context 后调用 lab_plan_propose 提交结构化计划和 Skill 草案。',
            '不要批准计划、激活 Skill、启动运行或执行设备。所有计划步骤必须包含引用、依赖、输入、输出和必要的人工确认。',
            `实验请求 JSON：${JSON.stringify(request)}`,
          ].join('\n')
          submit(prompt)
          actions.setNotice(zh.noticeAgent)
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : String(error))
        } finally {
          actions.setPending(undefined)
        }
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
        importSource,
        importFile,
        listProjects,
        openProject,
        createProject,
        updateProjectScope,
        associateSession,
        renameSession,
        search,
        createSop,
        reviewSop,
        publishSop,
        createExperiment,
        buildContext,
        agentPlan,
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

  const registerNavigation = (): (() => void) => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'lab-navigation',
    order: 20,
    locale: NS,
  }, LabNavigation)
  ctx.slots.inject('sidebar.footer.action', registerNavigation)

}

function applyResult(actions: BoundActions<ReturnType<typeof createLabWorkbenchStore>>, command: LabCommand, value: unknown): void {
  if (command.command === 'snapshot' || command.command === 'experiment-create') {
    actions.setSnapshot(toSnapshot(value))
    return
  }
  if (command.command === 'knowledge-search') {
    const object = asRecord(value)
    actions.setSearch(
      Array.isArray(object.results) ? object.results as never[] : [],
      Array.isArray(object.conflicts) ? object.conflicts as never[] : [],
    )
    return
  }
  if (command.command.startsWith('knowledge-sop-')) {
    const object = asRecord(value)
    if (isRecord(object.draft)) actions.setSopDraft(object.draft as LabSopDraft)
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
