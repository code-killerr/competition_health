import type { JSX, ReactNode } from 'react'
import type { LabCitationSelection } from './LabUiContext.ts'
import { LabCitationLink, type LabCitationOrigin } from './LabCitationLink.tsx'
import type { LabAgentLifecycleProjection, LabCitationReference } from './lifecycle.ts'
import css from './LabAgentLifecycleView.module.css'

/** Localized labels supplied by the composition owner. */
export interface LabLifecycleLabels {
  readonly title: string
  readonly goal: string
  readonly knowledge: string
  readonly capabilityGap: string
  readonly workflow: string
  readonly skill: string
  readonly execution: string
  readonly replan: string
  readonly resultAssessment: string
  readonly report: string
  readonly objective: string
  readonly missingInputs: string
  readonly sources: string
  readonly citations: string
  readonly unavailable: string
  readonly steps: string
  readonly unresolved: string
  readonly validation: string
  readonly revision: string
  readonly currentStep: string
  readonly reason: string
  readonly verdict: string
  readonly evidence: string
  readonly openCitation: string
  readonly citationUnavailable: string
  readonly empty: string
  readonly listSeparator: string
  readonly valid: string
  readonly invalid: string
  readonly status: (value: string) => string
}

/** Render the Agent's typed lifecycle projection for both the workbench and conversation cards. */
export interface LabAgentLifecycleViewProps {
  readonly events: readonly LabAgentLifecycleProjection[]
  readonly labels: LabLifecycleLabels
  readonly knowledgeAvailable: boolean
  readonly citationOrigin?: LabCitationOrigin
  readonly onCitationOpen?: ((citation: LabCitationSelection) => void) | undefined
}

/** Display-only lifecycle projection; all mutations remain owned by Host actions. */
export function LabAgentLifecycleView(props: LabAgentLifecycleViewProps): JSX.Element {
  return (
    <section className={css.root} aria-label={props.labels.title} data-lab-agent-lifecycle>
      <header className={css.header}><h2>{props.labels.title}</h2><span>{props.events.length}</span></header>
      <div className={css.list}>
        {props.events.map((event, index) => <LifecycleCard key={event.kind + '-' + index} event={event} props={props} />)}
      </div>
    </section>
  )
}

function LifecycleCard({ event, props }: { readonly event: LabAgentLifecycleProjection; readonly props: LabAgentLifecycleViewProps }): JSX.Element {
  const labels = props.labels
  if (event.kind === 'goal') return <Card title={labels.goal} status={labels.status(event.status)}><p>{event.objective}</p><Field label={labels.missingInputs} value={event.missingInputs.length === 0 ? labels.empty : event.missingInputs.join(labels.listSeparator)} /></Card>
  if (event.kind === 'knowledge') return <Card title={labels.knowledge} status={labels.status(event.status)}><Field label={labels.sources} value={String(event.sources.length)} /><Field label={labels.citations} value={String(event.citationIds.length)} />{event.message !== undefined && <p>{event.message}</p>}{(event.citations ?? []).map(citation => <Citation key={citation.documentId + ':' + citation.versionId + ':' + citation.location} citation={citation} props={props} />)}</Card>
  if (event.kind === 'capability-gap') return <Card title={labels.capabilityGap} status={labels.status(event.status)}><Field label={event.capability} value={event.missing.join(labels.listSeparator)} /><p>{event.message}</p></Card>
  if (event.kind === 'workflow-proposal') return <Card title={labels.workflow} status={labels.status(event.status)}><Field label={labels.steps} value={String(event.workflow.steps.length)} /><Field label={labels.revision} value={String(event.workflow.revision)} /><Field label={labels.unresolved} value={event.workflow.unresolved.length === 0 ? labels.empty : event.workflow.unresolved.join(labels.listSeparator)} />{event.validation !== undefined && <Field label={labels.validation} value={event.validation.valid === true ? labels.valid : labels.invalid} />}</Card>
  if (event.kind === 'skill-proposal') return <Card title={labels.skill} status={labels.status(event.status)}><Field label={labels.revision} value={String(event.revision.revision ?? labels.empty)} /><Field label={labels.validation} value={event.validation?.valid === true ? labels.valid : event.validation === undefined ? labels.empty : labels.invalid} /><p>{event.revision.name ?? labels.empty}</p></Card>
  if (event.kind === 'execution') return <Card title={labels.execution} status={labels.status(event.status ?? labels.empty)}><Field label={labels.currentStep} value={event.run.currentStepId ?? labels.empty} /><Field label={labels.evidence} value={String(event.run.artifacts?.length ?? 0)} /></Card>
  if (event.kind === 'replan') return <Card title={labels.replan} status={labels.status(event.status)}><Field label={labels.reason} value={event.reason} />{event.replacementPlanId !== undefined && <Field label={labels.revision} value={event.replacementPlanId} />}</Card>
  if (event.kind === 'result-assessment') return <Card title={labels.resultAssessment} status={labels.status(event.status)}><Field label={labels.verdict} value={event.assessment.verdict ?? labels.empty} /><Field label={labels.evidence} value={String(event.assessment.evidenceIds.length)} /></Card>
  return <Card title={labels.report} status={labels.status(event.status)}><Field label={labels.evidence} value={String(event.evidence.length)} /><Field label={labels.revision} value={event.report.planId} /></Card>
}

function Citation({ citation, props }: { readonly citation: LabCitationReference; readonly props: LabAgentLifecycleViewProps }): JSX.Element {
  return <LabCitationLink citation={citation} origin={props.citationOrigin ?? 'conversation'} available={props.knowledgeAvailable} onOpen={props.onCitationOpen} label={props.labels.openCitation} unavailableLabel={props.labels.citationUnavailable} sourceName={citation.sourceName} />
}

function Card({ title, status, children }: { readonly title: string; readonly status: string; readonly children: ReactNode }): JSX.Element {
  return <article className={css.card}><div className={css.cardHeader}><h3>{title}</h3><span className={css.status}>{status}</span></div><div className={css.body}>{children}</div></article>
}

function Field({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.field}><span>{label}</span><strong>{value}</strong></div>
}
