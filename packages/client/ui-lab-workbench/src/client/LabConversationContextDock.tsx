import { useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabUiContext } from './LabUiContext.ts'
import css from './LabConversationChrome.module.css'

/** Optional Host-backed context counts shown beside the real composer. */
export interface LabConversationContextSource {
  readonly workspaceName?: string
  readonly workspaceDirectory?: string
  readonly knowledgeCount?: number
  readonly deviceCount?: number
}

/** Injected services for the additive input dock. */
export interface LabConversationContextInjected {
  readonly ui: LabUiContext
  readonly context?: (() => LabConversationContextSource) | undefined
}

type Props = PropsRuntime<'conversation.input.dock'> & PropsLocale<'labWorkbench'> & InjectFace<LabConversationContextInjected>

/** Render inherited Project scope and Session-local attachments without another composer. */
export function LabConversationContextDock(props: Props): JSX.Element {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const context = props.context?.() ?? {}
  return <div className={css.contextDock} data-lab-conversation-context>
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
  </div>
}
