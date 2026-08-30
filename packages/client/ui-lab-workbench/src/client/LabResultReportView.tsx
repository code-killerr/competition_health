import type { JSX } from 'react'
import type { LabReportView } from './api.ts'
import css from './LabResultReportView.module.css'

/** Localized labels for the structured Result and report view. */
export interface LabResultReportLabels {
  readonly title: string
  readonly criteria: string
  readonly method: string
  readonly verdict: string
  readonly plan: string
  readonly run: string
  readonly evidence: string
  readonly actor: string
  readonly assessedAt: string
  readonly observations: string
  readonly artifacts: string
  readonly humanQc: string
  readonly noValue: string
  readonly noCriteria: string
}

/** Render Host-owned assessment and report records without exposing raw JSON as the primary UI. */
export function LabResultReportView(props: { readonly report: LabReportView; readonly labels: LabResultReportLabels }): JSX.Element {
  const assessment = props.report.assessment
  const labels = props.labels
  return <section className={css.root} aria-label={labels.title} data-lab-result-report><header><h2>{labels.title}</h2><span>{assessment?.status ?? labels.noValue}</span></header><div className={css.grid}><Field label={labels.plan} value={props.report.planId} /><Field label={labels.run} value={props.report.runId} /><Field label={labels.verdict} value={assessment?.verdict ?? labels.noValue} /><Field label={labels.method} value={assessment?.method ?? labels.noValue} /><Field label={labels.actor} value={assessment?.assessedBy ?? labels.noValue} /><Field label={labels.assessedAt} value={assessment?.assessedAt === undefined ? labels.noValue : String(assessment.assessedAt)} /><Field label={labels.evidence} value={String(assessment?.evidenceIds.length ?? props.report.artifacts.length)} /><Field label={labels.observations} value={String(props.report.observations.length)} /><Field label={labels.artifacts} value={String(props.report.artifacts.length)} /></div><section className={css.criteria}><h3>{labels.criteria}</h3>{props.report.criteria?.length === 0 || props.report.criteria === undefined ? <p>{labels.noCriteria}</p> : props.report.criteria.map(item => <div key={item}>{item}</div>)}</section>{assessment?.humanQcRequired === true && <p className={css.gate}>{labels.humanQc}</p>}</section>
}

function Field({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.field}><span>{label}</span><strong>{value}</strong></div>
}

