import type { JSX } from 'react'
import type { LabEvidenceRecord, LabExperimentRecord, LabPlanReview, LabReportView, LabRun } from './api.ts'
import type { LabExperimentSessionRecord } from './api.ts'
import css from './LabExperimentDetailView.module.css'

/** Localized labels for the Experiment detail projection. */
export interface LabExperimentDetailLabels {
  readonly title: string
  readonly objective: string
  readonly status: string
  readonly sessions: string
  readonly createdInSession: string
  readonly derivedFrom: string
  readonly plan: string
  readonly planRevision: string
  readonly planStatus: string
  readonly steps: string
  readonly skills: string
  readonly unresolved: string
  readonly runs: string
  readonly evidence: string
  readonly result: string
  readonly noValue: string
  readonly noPlan: string
  readonly noAssessment: string
  readonly noSessions: string
  readonly noRuns: string
  readonly noEvidence: string
  readonly openSession: string
  readonly sessionRole: string
}

/** Host-backed Experiment list/detail projection; it does not mutate records. */
export interface LabExperimentDetailViewProps {
  readonly experiment: LabExperimentRecord
  readonly sessions: readonly LabExperimentSessionRecord[]
  readonly review?: LabPlanReview | undefined
  readonly runs: readonly LabRun[]
  readonly report?: LabReportView | undefined
  readonly evidence: readonly LabEvidenceRecord[]
  readonly labels: LabExperimentDetailLabels
  readonly onOpenSession?: ((sessionId: string) => void) | undefined
}

/** Render one Experiment's provenance, plan review, runs, result and evidence. */
export function LabExperimentDetailView(props: LabExperimentDetailViewProps): JSX.Element {
  const { labels } = props
  const plan = props.review?.plan
  const assessment = props.report?.assessment
  return (
    <section className={css.root} aria-label={labels.title} data-lab-experiment-detail>
      <header className={css.header}><div><h2>{props.experiment.title}</h2><p>{props.experiment.objective}</p></div><span>{props.experiment.status}</span></header>
      <div className={css.grid}>
        <Card label={labels.objective} value={props.experiment.objective} />
        <Card label={labels.status} value={props.experiment.status} />
        <Card label={labels.createdInSession} value={props.experiment.createdInSessionId} />
        <Card label={labels.derivedFrom} value={props.experiment.derivedFromExperimentId ?? labels.noValue} />
      </div>
      <DetailBlock title={labels.sessions}>
        {props.sessions.length === 0 ? <p>{labels.noSessions}</p> : props.sessions.map(session => <div className={css.row} key={session.sessionId}><span>{session.sessionId}</span><span>{labels.sessionRole}: {session.role}</span>{props.onOpenSession !== undefined && <button type='button' onClick={() => { props.onOpenSession?.(session.sessionId) }}>{labels.openSession}</button>}</div>)}
      </DetailBlock>
      <DetailBlock title={labels.plan}>
        {plan === undefined ? <p>{labels.noPlan}</p> : <div className={css.detailGrid}><Card label={labels.planRevision} value={String(plan.revision ?? labels.noValue)} /><Card label={labels.planStatus} value={plan.status ?? labels.noValue} /><Card label={labels.steps} value={String(plan.steps?.length ?? 0)} /><Card label={labels.skills} value={String(props.review?.skillRevisions?.length ?? 0)} /><Card label={labels.unresolved} value={plan.unresolved?.length === 0 ? labels.noValue : (plan.unresolved ?? []).join(', ') || labels.noValue} /></div>}
      </DetailBlock>
      <DetailBlock title={labels.runs}>
        {props.runs.length === 0 ? <p>{labels.noRuns}</p> : props.runs.map(run => <div className={css.row} key={run.runId ?? String(run.updatedAt)}><span>{run.runId ?? labels.noValue}</span><span>{run.runStatus ?? labels.noValue}</span></div>)}
      </DetailBlock>
      <DetailBlock title={labels.result}>
        {assessment === undefined ? <p>{labels.noAssessment}</p> : <div className={css.detailGrid}><Card label={labels.status} value={assessment.status} /><Card label={labels.result} value={assessment.verdict ?? labels.noValue} /><Card label={labels.evidence} value={String(assessment.evidenceIds.length)} /></div>}
      </DetailBlock>
      <DetailBlock title={labels.evidence}>
        {props.evidence.length === 0 && (props.report?.artifacts.length ?? 0) === 0 ? <p>{labels.noEvidence}</p> : <div className={css.row}><span>{props.evidence.length}</span><span>{(props.report?.artifacts.length ?? 0)} {labels.evidence}</span></div>}
      </DetailBlock>
    </section>
  )
}

function DetailBlock({ title, children }: { readonly title: string; readonly children: JSX.Element | JSX.Element[] }): JSX.Element {
  return <section className={css.block}><h3>{title}</h3>{children}</section>
}

function Card({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.card}><span>{label}</span><strong>{value}</strong></div>
}
