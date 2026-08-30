import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { CommandRowOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './LabCommandCard.module.css'

/** Commands whose results are promoted to an Agent lifecycle card. */
export const LAB_COMMAND_NAMES = [
  'project-create', 'experiment-create', 'knowledge-search', 'capability-check',
  'plan-propose', 'plan-validate', 'plan-approve', 'skill-validate', 'skill-approve', 'skill-activate',
  'run-start', 'run-stop', 'run-retry', 'result-assess',
] as const

/** Injected navigation action for a command result card. */
export interface LabCommandCardInjected {
  readonly openWorkbench: () => void
}

type Props = PropsRuntime<'conversation.chat.commandview'> & PropsLocale<'labWorkbench'> & InjectFace<LabCommandCardInjected>

/** Render a laboratory command result through the native Conversation command row. */
export function LabCommandCard(props: Props): JSX.Element {
  const state = props.node.outcome === null ? 'running' : props.node.outcome.kind === 'error' ? 'failed' : 'completed'
  const commandName = props.node.name ?? 'unknown'
  const text = props.node.outcome?.text ?? (state === 'running' ? props.t('commandRunning') : state === 'failed' ? props.t('commandFailed') : props.t('commandCompleted'))
  const parameters = props.node.args?.trim() ?? ''
  return <article className={css.root} data-lab-command={commandName} data-state={state}>
    <div className={css.header}>
      <div><strong>{commandLabel(commandName, props.t)}</strong><span className={css.commandName}>{commandName}</span></div>
      <span>{props.t(state === 'running' ? 'commandRunning' : state === 'failed' ? 'commandFailed' : 'commandCompleted')}</span>
    </div>
    <dl className={css.fields}>
      <div><dt>{props.t('commandType')}</dt><dd>{commandCategory(commandName, props.t)}</dd></div>
      <div><dt>{props.t('commandResult')}</dt><dd data-error={state === 'failed' || undefined}>{text}</dd></div>
      {props.node.outcome?.sourceEventSeq !== undefined && <div><dt>{props.t('commandSourceEvent')}</dt><dd>{String(props.node.outcome.sourceEventSeq)}</dd></div>}
    </dl>
    {parameters !== '' && <details className={css.parameters}>
      <summary>{props.t('commandParameters')}</summary>
      <pre>{parameters}</pre>
    </details>}
    <button type='button' onClick={props.openWorkbench}>{props.t('viewWorkbench')}</button>
  </article>
}

export type { CommandRowOwnerProps }

function commandLabel(name: string, t: Props['t']): string {
  const labels: Record<string, Parameters<Props['t']>[0]> = {
    'project-create': 'commandProjectCreate',
    'experiment-create': 'commandExperimentCreate',
    'knowledge-search': 'commandKnowledgeSearch',
    'capability-check': 'commandCapabilityCheck',
    'plan-propose': 'commandPlanPropose',
    'plan-validate': 'commandPlanValidate',
    'plan-approve': 'commandPlanApprove',
    'skill-validate': 'commandSkillValidate',
    'skill-approve': 'commandSkillApprove',
    'skill-activate': 'commandSkillActivate',
    'run-start': 'commandRunStart',
    'run-stop': 'commandRunStop',
    'run-retry': 'commandRunRetry',
    'result-assess': 'commandResultAssess',
  }
  const key = labels[name]
  return key === undefined ? t('command') : t(key)
}

function commandCategory(name: string, t: Props['t']): string {
  if (name.startsWith('project-') || name.startsWith('experiment-')) return t('commandProjectCategory')
  if (name.startsWith('knowledge-') || name === 'capability-check') return t('commandKnowledgeCategory')
  if (name.startsWith('plan-') || name.startsWith('skill-')) return t('commandPlanningCategory')
  if (name.startsWith('run-') || name === 'result-assess') return t('commandExecutionCategory')
  return t('command')
}
