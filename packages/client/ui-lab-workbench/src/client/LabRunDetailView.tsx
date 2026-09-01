import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import type { LabArtifactRecord, LabObservationRecord, LabParameterValue, LabReportView, LabResultAssessmentRecord, LabRun, LabRunComparisonView } from './api.ts'
import { LabRunResultView, type LabRunResultLabels } from './LabRunResultView.tsx'
import { LabRunComparisonView as LabRunComparisonPanel, type LabRunComparisonLabels } from './LabRunComparisonView.tsx'
import { LabResultReportView } from './LabResultReportView.tsx'
import type { LabResultReportLabels } from './LabResultReportView.tsx'
import css from './LabRunDetailView.module.css'

/** Localized labels for the Run detail projection. */
export interface LabRunDetailLabels {
  readonly title: string
  readonly overview: string
  readonly parameters: string
  readonly steps: string
  readonly executionGraph: string
  readonly evidence: string
  readonly logs: string
  readonly timeline: string
  readonly plan: string
  readonly currentStep: string
  readonly dependencies: string
  readonly operation: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly noValue: string
  readonly noSteps: string
  readonly noEvidence: string
  readonly noLogs: string
  readonly retry: string
  readonly retryOfRun: string
  readonly confirmStep: string
  readonly evidenceInput: string
  readonly stopRun: string
  readonly comparisonLabels: LabRunComparisonLabels
  readonly reportLabels: LabResultReportLabels
  readonly resultLabels: LabRunResultLabels
}

/** Host-backed Run list/detail projection; it never advances execution. */
export interface LabRunDetailViewProps {
  readonly run: LabRun
  readonly artifacts: readonly LabArtifactRecord[]
  readonly report?: LabReportView | undefined
  readonly assessment?: LabResultAssessmentRecord | undefined
  readonly comparison?: LabRunComparisonView | undefined
  readonly onRetry?: ((runId: string) => void | Promise<unknown>) | undefined
  readonly onConfirmStep?: ((input: { readonly runId: string; readonly evidence: readonly string[]; readonly stepId?: string; readonly operationId?: string }) => void | Promise<unknown>) | undefined
  readonly onStop?: ((runId: string) => void | Promise<unknown>) | undefined
  readonly labels: LabRunDetailLabels
}

/** Render Run overview, parameters, graph, evidence, logs, timeline and result. */
export function LabRunDetailView(props: LabRunDetailViewProps): JSX.Element {
  const { run, labels } = props
  const steps = run.executionGraph?.steps ?? []
  const observations = run.observations ?? []
  const parameters = steps.flatMap(step => Object.entries(step.parameters ?? {}).map(([name, value]) => ({ name, value })))
  const currentObservation = observations.find(observation => observation.stepId === run.currentStepId)
  const [evidence, setEvidence] = useState('')
  useEffect(() => { setEvidence('') }, [run.runId, run.currentStepId])
  const evidenceValue = evidence.trim()
  const canConfirmStep = run.runStatus === 'WAITING_CONFIRMATION' && run.runId !== undefined && props.onConfirmStep !== undefined && evidenceValue.length > 0
  const canStop = (run.runStatus === 'WAITING_CONFIRMATION' || run.runStatus === 'RUNNING' || run.runStatus === 'BLOCKED') && run.runId !== undefined && props.onStop !== undefined
  return (
    <section className={css.root} aria-label={labels.title} data-lab-run-detail>
      <header className={css.header}><div><h2>{run.runId ?? labels.noValue}</h2><p>{run.planId ?? labels.noValue}</p></div><span>{run.runStatus ?? labels.noValue}</span><div className={css.actions}>{run.runStatus === 'WAITING_CONFIRMATION' && <label><span>{labels.evidenceInput}</span><input aria-label={labels.evidenceInput} value={evidence} onChange={event => { setEvidence(event.currentTarget.value) }} /></label>}{(run.runStatus === 'WAITING_CONFIRMATION' || run.runStatus === 'RUNNING' || run.runStatus === 'BLOCKED') && <button type='button' disabled={!canStop} onClick={() => { if (run.runId !== undefined) void props.onStop?.(run.runId) }}>{labels.stopRun}</button>}{run.runStatus === 'WAITING_CONFIRMATION' && <button type='button' disabled={!canConfirmStep} onClick={() => { const input = buildConfirmInput(run, currentObservation, evidenceValue); if (input !== undefined) void props.onConfirmStep?.(input) }}>{labels.confirmStep}</button>}{run.runStatus === 'FAILED' && run.runId !== undefined && props.onRetry !== undefined && <button type='button' onClick={() => { void props.onRetry?.(run.runId!) }}>{labels.retry}</button>}</div></header>
      {run.retryOfRunId !== undefined && <p className={css.notice}>{labels.retryOfRun}: {run.retryOfRunId}</p>}
      <DetailBlock title={labels.overview}><div className={css.grid}><Card label={labels.plan} value={run.planId ?? labels.noValue} /><Card label={labels.currentStep} value={run.currentStepId ?? labels.noValue} /><Card label={labels.steps} value={String(steps.length)} /></div></DetailBlock>
      <DetailBlock title={labels.parameters}>{parameters.length === 0 ? <p>{labels.noValue}</p> : parameters.map(parameter => <div className={css.row} key={parameter.name}><span>{parameter.name}</span><strong>{formatParameter(parameter.value)}</strong></div>)}</DetailBlock>
      <DetailBlock title={labels.executionGraph}>{steps.length === 0 ? <p>{labels.noSteps}</p> : steps.map(step => <div className={css.row} key={step.stepId ?? step.title}><span>{step.title ?? step.stepId ?? labels.noValue}</span><span>{labels.dependencies}: {step.dependencies?.join(', ') || labels.noValue}</span><span>{labels.operation}: {step.operationKind ?? labels.noValue}</span></div>)}</DetailBlock>
      <DetailBlock title={labels.steps}>{observations.length === 0 ? <p>{labels.noSteps}</p> : observations.map(observation => <div className={css.row} key={observation.stepId}><span>{observation.stepId}</span><span>{observation.status}</span></div>)}</DetailBlock>
      <DetailBlock title={labels.evidence}>{props.artifacts.length === 0 ? <p>{labels.noEvidence}</p> : props.artifacts.map(artifact => <div className={css.row} key={artifact.artifactId}><span>{artifact.displayName}</span><span>{artifact.kind}</span></div>)}</DetailBlock>
      <DetailBlock title={labels.logs}>{observations.some(observation => observation.error !== undefined) ? observations.filter(observation => observation.error !== undefined).map(observation => <p key={observation.stepId}>{observation.error}</p>) : <p>{labels.noLogs}</p>}</DetailBlock>
      <DetailBlock title={labels.timeline}><div className={css.grid}><Card label={labels.createdAt} value={String(run.createdAt ?? labels.noValue)} /><Card label={labels.updatedAt} value={String(run.updatedAt ?? labels.noValue)} /></div></DetailBlock>
      <LabRunResultView run={run} assessment={props.assessment} labels={labels.resultLabels} />
      {props.comparison !== undefined && <LabRunComparisonPanel comparison={props.comparison} labels={labels.comparisonLabels} />}
      {props.report !== undefined && <LabResultReportView report={props.report} labels={labels.reportLabels} />}
      {props.report?.replanRequest !== undefined && <p className={css.notice}>{props.report.replanRequest.reason}</p>}
    </section>
  )
}

function DetailBlock({ title, children }: { readonly title: string; readonly children: ReactNode }): JSX.Element {
  return <section className={css.block}><h3>{title}</h3>{children}</section>
}

function formatParameter(value: LabParameterValue): string {
  if (typeof value === 'object' && value !== null && 'unit' in value) return String(value.value) + ' ' + value.unit
  return String(value)
}

function Card({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.card}><span>{label}</span><strong>{value}</strong></div>
}

function buildConfirmInput(run: LabRun, observation: LabObservationRecord | undefined, evidence: string): { readonly runId: string; readonly evidence: readonly string[]; readonly stepId?: string; readonly operationId?: string } | undefined {
  if (run.runId === undefined) return undefined
  return { runId: run.runId, evidence: [evidence], ...run.currentStepId === undefined ? {} : { stepId: run.currentStepId }, ...observation === undefined ? {} : { operationId: observation.operationId } }
}
