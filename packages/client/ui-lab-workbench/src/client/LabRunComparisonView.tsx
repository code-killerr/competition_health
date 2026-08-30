import type { JSX } from 'react'
import type { LabRunComparisonView as LabRunComparisonRecord } from './api.ts'
import css from './LabRunComparisonView.module.css'

/** Localized labels for Run comparison. */
export interface LabRunComparisonLabels {
  readonly title: string
  readonly left: string
  readonly right: string
  readonly status: string
  readonly steps: string
  readonly artifacts: string
  readonly noValue: string
}

/** Render a Host-provided comparison of two terminal Runs. */
export function LabRunComparisonView(props: { readonly comparison: LabRunComparisonRecord; readonly labels: LabRunComparisonLabels }): JSX.Element {
  const { comparison, labels } = props
  return <section className={css.root} aria-label={labels.title} data-lab-run-comparison><h3>{labels.title}</h3><div className={css.grid}><span>{labels.left}: {comparison.leftRunId}</span><span>{labels.right}: {comparison.rightRunId}</span><span>{labels.status}: {comparison.status.left ?? labels.noValue} / {comparison.status.right ?? labels.noValue}</span><span>{labels.artifacts}: {comparison.artifactCounts.left} / {comparison.artifactCounts.right}</span></div><div className={css.steps}>{comparison.stepStatuses.map(step => <div key={step.stepId}><strong>{step.stepId}</strong><span>{labels.left}: {step.left ?? labels.noValue}</span><span>{labels.right}: {step.right ?? labels.noValue}</span></div>)}</div></section>
}

