import type { JSX } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { LabAgentLifecycleView } from './LabAgentLifecycleView.tsx'
import type { LabCitationSelection } from './LabUiContext.ts'
import type { LabAgentLifecycleProjection } from './lifecycle.ts'
import type { LabWorkbenchKey } from './locales.ts'
import css from './LabLifecycleNodeView.module.css'

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    /** Agent lifecycle projection persisted in the current Session. */
    'lab-lifecycle': LabAgentLifecycleProjection
  }
}

/** Typed actions exposed to a durable Agent lifecycle node. */
export interface LabLifecycleNodeInjected {
  /** Open the workbench detail that owns the projected lifecycle record. */
  readonly openDetail: (event: LabAgentLifecycleProjection) => void
  /** Present a Host-authorized citation in the Knowledge application view. */
  readonly openCitation: (citation: LabCitationSelection) => void
}

type Props = PropsRuntime<'conversation.chat.node', 'lab-lifecycle'>
  & PropsLocale<'labWorkbench'>
  & InjectFace<LabLifecycleNodeInjected>

/** Render one durable lifecycle projection through the native Conversation node seat. */
export function LabLifecycleNodeView(props: Props): JSX.Element {
  const event = props.node.data
  const labels = lifecycleLabels(props.t)
  return (
    <article className={css.root} data-lab-lifecycle-node={event.kind}>
      <LabAgentLifecycleView
        events={[event]}
        labels={labels}
        knowledgeAvailable={event.kind !== 'knowledge' || event.status !== 'unavailable'}
        citationOrigin='conversation'
        onCitationOpen={props.openCitation}
      />
      <button className={css.detail} type='button' onClick={() => { props.openDetail(event) }}>
        {props.t('viewWorkbench')}
      </button>
    </article>
  )
}

function lifecycleLabels(t: (key: LabWorkbenchKey) => string) {
  const statuses: Record<string, LabWorkbenchKey> = {
    clarifying: 'lifecycleStatusClarifying', ready: 'lifecycleStatusReady', retrieving: 'lifecycleStatusRetrieving',
    unavailable: 'lifecycleStatusUnavailable', waiting: 'lifecycleStatusWaiting', proposed: 'lifecycleStatusProposed',
    validated: 'lifecycleStatusValidated', approved: 'lifecycleStatusApproved', locked: 'lifecycleStatusLocked',
    draft: 'lifecycleStatusDraft', active: 'lifecycleStatusActive', queued: 'lifecycleStatusQueued',
    running: 'lifecycleStatusRunning', failed: 'lifecycleStatusFailed', stopped: 'lifecycleStatusStopped',
    replanning: 'lifecycleStatusReplanning', completed: 'lifecycleStatusCompleted', pending: 'lifecycleStatusPending',
    passed: 'lifecycleStatusPassed', 'human-qc': 'lifecycleStatusHumanQc',
  }
  return {
    title: t('lifecycleTitle'), goal: t('lifecycleGoal'), knowledge: t('lifecycleKnowledge'),
    capabilityGap: t('lifecycleCapabilityGap'), workflow: t('lifecycleWorkflow'), skill: t('lifecycleSkill'),
    execution: t('lifecycleExecution'), replan: t('lifecycleReplan'), resultAssessment: t('lifecycleResultAssessment'),
    report: t('lifecycleReport'), objective: t('lifecycleObjective'), missingInputs: t('lifecycleMissingInputs'),
    sources: t('lifecycleSources'), citations: t('lifecycleCitations'), unavailable: t('lifecycleUnavailable'),
    steps: t('lifecycleSteps'), unresolved: t('lifecycleUnresolved'), validation: t('lifecycleValidation'),
    revision: t('lifecycleRevision'), currentStep: t('lifecycleCurrentStep'), reason: t('lifecycleReason'),
    verdict: t('lifecycleVerdict'), evidence: t('lifecycleEvidence'), openCitation: t('lifecycleOpenCitation'),
    citationUnavailable: t('lifecycleCitationUnavailable'), empty: t('lifecycleEmpty'),
    listSeparator: t('lifecycleListSeparator'), valid: t('lifecycleValid'), invalid: t('lifecycleInvalid'),
    status: (value: string) => t(statuses[value] ?? 'lifecycleStatusUnknown'),
  }
}
