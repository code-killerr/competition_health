import { useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabUiContext } from './LabUiContext.ts'
import css from './LabConversationChrome.module.css'

/** Injected services for the additive Session header action. */
export interface LabConversationHeaderInjected {
  readonly ui: LabUiContext
  readonly openWorkbench: () => void
}

type Props = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<'labWorkbench'> & InjectFace<LabConversationHeaderInjected>

/** Show Project/Experiment context and keep the real Session header intact. */
export function LabConversationHeaderAction(props: Props): JSX.Element | null {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  if (selection.activeProjectId === undefined && selection.activeExperimentId === undefined) return null
  return <div className={css.headerAction}><span>{selection.activeProjectId ?? props.t('noProject')}</span>{selection.activeExperimentId !== undefined && <span>{props.t('experiments')}: {selection.activeExperimentId}</span>}<button type='button' onClick={props.openWorkbench}>{props.t('viewWorkbench')}</button></div>
}
