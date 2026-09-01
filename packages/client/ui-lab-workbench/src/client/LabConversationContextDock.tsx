import { useEffect, useState, useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabUiContext } from './LabUiContext.ts'
import type { LabProjectContextView } from './api.ts'
import type { LabQueryState } from './adapter.ts'
import css from './LabConversationChrome.module.css'

/** Optional Host-backed context counts shown beside the real composer. */
export interface LabConversationContextSource {
  readonly workspaceName?: string
  readonly workspaceDirectory?: string
  readonly knowledgeCount?: number
  readonly deviceCount?: number
  /** Host-provided display status for the selected Run. */
  readonly runStatus?: string
  /** Host-provided current step for the selected Run. */
  readonly currentStepId?: string
}

/** Injected services for the additive input dock. */
export interface LabConversationContextInjected {
  readonly ui: LabUiContext
  readonly context?: (() => LabConversationContextSource) | undefined
  /** Read the selected Run's display fields through the existing Host query. */
  readonly loadRunContext?: ((experimentId: string, runId: string) => Promise<LabConversationContextSource>) | undefined
  /** Read the active Project scope through the Host adapter. */
  readonly loadProjectContext?: ((projectId: string) => Promise<LabQueryState<LabProjectContextView>>) | undefined
}

type Props = PropsRuntime<'conversation.input.dock'> & PropsLocale<'labWorkbench'> & InjectFace<LabConversationContextInjected>

/** Render inherited Project scope and Session-local attachments without another composer. */
export function LabConversationContextDock(props: Props): JSX.Element {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const [runContext, setRunContext] = useState<LabConversationContextSource>({})
  const [projectContext, setProjectContext] = useState<LabConversationContextSource>({})
  useEffect(() => {
    const projectId = selection.activeProjectId
    if (projectId === undefined || props.loadProjectContext === undefined) {
      setProjectContext({})
      return
    }
    let current = true
    void props.loadProjectContext(projectId).then(result => {
      if (!current) return
      setProjectContext(result.state === 'ready'
        ? { knowledgeCount: result.value.project.sources.length, deviceCount: result.value.project.devices.length }
        : {})
    }).catch(() => {
      if (current) setProjectContext({})
    })
    return () => { current = false }
  }, [props.loadProjectContext, selection.activeProjectId])
  useEffect(() => {
    const experimentId = selection.activeExperimentId
    const runId = selection.activeRunId
    if (experimentId === undefined || runId === undefined || props.loadRunContext === undefined) {
      setRunContext({})
      return
    }
    let current = true
    void props.loadRunContext(experimentId, runId).then(value => {
      if (current) setRunContext(value)
    }).catch(() => {
      if (current) setRunContext({})
    })
    return () => { current = false }
  }, [props.loadRunContext, selection.activeExperimentId, selection.activeRunId])
  const context = { ...props.context?.(), ...projectContext, ...runContext }
  return <div className={css.contextDock} data-lab-conversation-context data-lab-agent-context>
    <div className={css.contextGroup} aria-label={props.t('projectScope')}>
      <strong>{props.t('projectScope')}</strong>
      <span>{props.t('currentProject')}: {selection.activeProjectId ?? props.t('noProject')}</span>
      <span>{props.t('workspace')}: {context.workspaceName ?? props.t('notAvailable')}</span>
      <span>{props.t('experiment')}: {selection.activeExperimentId ?? props.t('notAvailable')}</span>
      <span>{props.t('knowledge')}: {String(context.knowledgeCount ?? 0)}</span>
      <span>{props.t('devices')}: {String(context.deviceCount ?? 0)}</span>
    </div>
    <div className={css.contextGroup} aria-label={props.t('sessionLocal')}>
      <strong>{props.t('sessionLocal')}</strong>
      <span>{props.t('attachments')}: {String(props.input.imageIds.length)}</span>
      <span>{context.workspaceDirectory ?? props.t('notAvailable')}</span>
    </div>
    <div className={css.contextGroup} aria-label={props.t('executionMonitor')}>
      <strong>{props.t('executionMonitor')}</strong>
      <span>{props.t('runs')}: {selection.activeRunId ?? props.t('notAvailable')}</span>
      <span>{props.t('status')}: {context.runStatus ?? props.t('notAvailable')}</span>
      <span>{props.t('runCurrentStep')}: {context.currentStepId ?? props.t('notAvailable')}</span>
    </div>
  </div>
}
