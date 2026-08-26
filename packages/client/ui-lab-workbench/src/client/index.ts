/** 实验自动化工作台的浏览器插件；通过 `shell.overlay` 叠加到现有 Web 壳。 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { LabWorkbench } from './LabWorkbench.tsx'
import {
  sendLabCommand,
  textToBase64,
  toSnapshot,
  type LabCommand,
  type LabExperimentRequest,
  type LabPlan,
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
  let latestExperimentId = 'experiment-1'
  let workbenchActions: BoundActions<typeof store> | undefined
  const withSession = (command: LabCommand): LabCommand => {
    const sessionId = ctx.sessions.list.getSnapshot().current
    return sessionId === undefined ? command : { ...command, sessionId }
  }

  const register = (): (() => void) => ctx.slots.register({
    name: 'shell.overlay',
    id: 'lab-workbench',
    locale: NS,
    store,
    inject: (actions: BoundActions<typeof store>): LabWorkbenchInjected => {
      workbenchActions = actions
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

      const agentPlan = async (request: LabExperimentRequest): Promise<void> => {
        latestExperimentId = request.experimentId
        actions.setPending('agent-plan')
        actions.setError(undefined)
        try {
          const sessionId = ctx.sessions.list.getSnapshot().current
          if (sessionId === undefined) throw new Error('当前没有可用的 Agent 会话')
          const session = ctx.sessions.binding(sessionId)?.session
          if (session === undefined) throw new Error('当前 Agent 会话尚未完成绑定')
          const prompt = [
            '请为实验自动化工作台规划实验步骤。',
            '只读取知识库和设备事实，使用 lab_plan_context 后调用 lab_plan_propose 提交结构化计划和 Skill 草案。',
            '不要批准计划、激活 Skill、启动运行或执行设备。所有计划步骤必须包含引用、依赖、输入、输出和必要的人工确认。',
            `实验请求 JSON：${JSON.stringify(request)}`,
          ].join('\n')
          const result = await session.prompt([{ type: 'text', text: prompt }], 'queue')
          if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
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
        search,
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

  ctx.slots.inject('shell.overlay', register)

  ctx.effect(() => {
      const timer = window.setInterval(() => {
      const actions = workbenchActions
      if (actions === undefined) return
        void sendLabCommand(withSession({ command: 'snapshot', experimentId: latestExperimentId })).then((result) => {
        applyResult(actions, { command: 'snapshot', experimentId: latestExperimentId }, result.value)
      }).catch(() => {
        // 轮询失败保留在下次主动操作中，避免覆盖用户当前错误提示。
      })
    }, 4_000)
    return () => { window.clearInterval(timer) }
  }, 'ui-lab-workbench: snapshot polling')
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
  if (command.command === 'planning-context') {
    actions.setPlanningContext(asRecord(value))
  }
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
