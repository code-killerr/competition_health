import type { JSX } from 'react'
import type { LabResultAssessmentRecord, LabRun } from './api.ts'
import css from './LabRunResultView.module.css'

/** Product-facing Run states used by the workbench. */
export type LabRunDisplayState = 'queued' | 'running' | 'waiting' | 'failed' | 'replanning' | 'completed'

/** Product-facing Result assessment states supplied by the Host projection. */
export type LabResultDisplayState = 'pending' | 'passed' | 'failed' | 'human-qc'

/** Localized labels supplied by the composition owner. */
export interface LabRunResultLabels {
  readonly runTitle: string
  readonly resultTitle: string
  readonly runStatus: string
  readonly resultStatus: string
  readonly currentStep: string
  readonly feedback: string
  readonly replanReason: string
  readonly verdict: string
  readonly evidence: string
  readonly assessedBy: string
  readonly assessedAt: string
  readonly humanQcGate: string
  readonly noValue: string
  readonly statusLabel: (value: LabRunDisplayState | LabResultDisplayState) => string
}

/** Read-only Run and Result projection; no browser action advances execution or writes a verdict. */
export interface LabRunResultViewProps {
  readonly run: LabRun
  readonly assessment?: LabResultAssessmentRecord | undefined
  readonly labels: LabRunResultLabels
}

/** Show authoritative Run progress and evidence-backed Result assessment. */
export function LabRunResultView(props: LabRunResultViewProps): JSX.Element {
  const labels = props.labels
  const runState = getRunDisplayState(props.run)
  const resultState = getResultDisplayState(props.assessment)
  return (
    <section className={css.root} aria-label={labels.runTitle} data-lab-run-result>
      <header className={css.header}><h2>{labels.runTitle}</h2><span className={css.badge}>{labels.statusLabel(runState)}</span></header>
      <div className={css.grid}>
        <section className={css.panel}><h3>{labels.runStatus}</h3><Field label={labels.currentStep} value={props.run.currentStepId ?? labels.noValue} /><Field label={labels.feedback} value={props.run.feedback?.summary ?? labels.noValue} />{props.run.replanRequest !== undefined && <Field label={labels.replanReason} value={props.run.replanRequest.reason} />}</section>
        <section className={css.panel}><h3>{labels.resultTitle}</h3><Field label={labels.resultStatus} value={labels.statusLabel(resultState)} /><Field label={labels.verdict} value={props.assessment?.verdict ?? labels.noValue} /><Field label={labels.evidence} value={String(props.assessment?.evidenceIds.length ?? 0)} />{props.assessment?.assessedBy !== undefined && <Field label={labels.assessedBy} value={props.assessment.assessedBy} />}{props.assessment?.assessedAt !== undefined && <Field label={labels.assessedAt} value={String(props.assessment.assessedAt)} />}{resultState === 'human-qc' && <p className={css.gate}>{labels.humanQcGate}</p>}</section>
      </div>
    </section>
  )
}

/** Map Host Run fields to a display state without changing the Run record. */
export function getRunDisplayState(run: LabRun): LabRunDisplayState {
  if (run.replanRequest !== undefined || run.feedback?.replanRequested === true) return 'replanning'
  if (run.runStatus === 'CREATED') return 'queued'
  if (run.runStatus === 'RUNNING') return 'running'
  if (run.runStatus === 'WAITING_CONFIRMATION' || run.runStatus === 'BLOCKED') return 'waiting'
  if (run.runStatus === 'FAILED' || run.runStatus === 'STOPPED') return 'failed'
  return 'completed'
}

/** Map the Host assessment status; absence remains pending rather than a computed verdict. */
export function getResultDisplayState(assessment: LabResultAssessmentRecord | undefined): LabResultDisplayState {
  if (assessment === undefined || assessment.status === 'PENDING') return 'pending'
  if (assessment.status === 'PASSED') return 'passed'
  if (assessment.status === 'FAILED') return 'failed'
  return 'human-qc'
}

function Field({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.field}><span>{label}</span><strong>{value}</strong></div>
}
