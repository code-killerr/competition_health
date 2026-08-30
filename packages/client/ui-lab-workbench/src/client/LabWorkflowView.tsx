import type { JSX } from 'react'
import type { LabPlanStep, LabValidation, LabWorkflowRecord } from './api.ts'
import css from './LabWorkflowView.module.css'

/** Localized labels for the product-facing Workflow projection. */
export interface LabWorkflowLabels {
  readonly title: string
  readonly revision: string
  readonly status: string
  readonly steps: string
  readonly dependencies: string
  readonly inputs: string
  readonly outputs: string
  readonly skillRevision: string
  readonly operation: string
  readonly completion: string
  readonly failurePolicy: string
  readonly validation: string
  readonly unresolved: string
  readonly noValue: string
  readonly noSteps: string
  readonly valid: string
  readonly invalid: string
  readonly listSeparator: string
  readonly statusLabel: (value: string) => string
}

/** Render a Plan-derived Workflow graph without owning execution state. */
export interface LabWorkflowViewProps {
  readonly workflow: LabWorkflowRecord
  readonly validation?: LabValidation | undefined
  readonly labels: LabWorkflowLabels
}

/** Display the locked Plan/Skill execution graph and its review findings. */
export function LabWorkflowView(props: LabWorkflowViewProps): JSX.Element {
  const labels = props.labels
  return (
    <section className={css.root} aria-label={labels.title} data-lab-workflow>
      <header className={css.header}>
        <div><h2>{labels.title}</h2><span>{labels.revision}: {props.workflow.revision}</span></div>
        <span className={css.badge}>{labels.statusLabel(props.workflow.status)}</span>
      </header>
      <div className={css.summary}>
        <Summary label={labels.steps} value={String(props.workflow.steps.length)} />
        <Summary label={labels.skillRevision} value={String(props.workflow.skillRevisionIds.length)} />
        <Summary label={labels.unresolved} value={props.workflow.unresolved.length === 0 ? labels.noValue : props.workflow.unresolved.join(labels.listSeparator)} />
        {props.validation !== undefined && <Summary label={labels.validation} value={props.validation.valid === true ? labels.valid : labels.invalid} />}
      </div>
      {props.workflow.steps.length === 0 ? <p className={css.empty}>{labels.noSteps}</p> : <ol className={css.steps}>{props.workflow.steps.map((step, index) => <Step key={step.stepId ?? String(index)} step={step} index={index} labels={labels} />)}</ol>}
    </section>
  )
}

function Step({ step, index, labels }: { readonly step: LabPlanStep; readonly index: number; readonly labels: LabWorkflowLabels }): JSX.Element {
  return <li className={css.step}>
    <div className={css.stepMarker}>{index + 1}</div>
    <div className={css.stepBody}>
      <h3>{step.title ?? labels.noValue}</h3>
      <div className={css.fields}>
        <Summary label={labels.dependencies} value={list(step.dependencies, labels)} />
        <Summary label={labels.inputs} value={list(step.requiredInputs, labels)} />
        <Summary label={labels.outputs} value={list(step.expectedOutputs, labels)} />
        <Summary label={labels.skillRevision} value={step.skillRevisionId ?? labels.noValue} />
        <Summary label={labels.operation} value={operation(step, labels)} />
        <Summary label={labels.completion} value={list(step.completionCriteria, labels)} />
        <Summary label={labels.failurePolicy} value={step.failurePolicy === undefined ? labels.noValue : labels.statusLabel(step.failurePolicy)} />
      </div>
    </div>
  </li>
}

function Summary({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.summaryItem}><span>{label}</span><strong>{value}</strong></div>
}

function list(values: readonly string[] | undefined, labels: LabWorkflowLabels): string {
  return values === undefined || values.length === 0 ? labels.noValue : values.join(labels.listSeparator)
}

function operation(step: LabPlanStep, labels: LabWorkflowLabels): string {
  const kind = step.operationKind
  const resource = step.operationResource ?? step.deviceId ?? step.deviceCapability
  if (kind === undefined && resource === undefined) return labels.noValue
  return [kind, resource].filter((value): value is string => value !== undefined).join(': ')
}
