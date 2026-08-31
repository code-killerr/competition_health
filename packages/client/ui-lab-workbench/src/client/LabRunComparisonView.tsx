import type { JSX } from 'react'
import type { LabParameterValue, LabRunComparisonView as LabRunComparisonRecord } from './api.ts'
import css from './LabRunComparisonView.module.css'

/** Localized labels for Run comparison. */
export interface LabRunComparisonLabels {
  readonly title: string
  readonly left: string
  readonly right: string
  readonly status: string
  readonly duration: string
  readonly parameters: string
  readonly steps: string
  readonly observations: string
  readonly artifacts: string
  readonly artifactMetadata: string
  readonly valid: string
  readonly operation: string
  readonly artifactIds: string
  readonly noValue: string
}

/** Render a Host-provided comparison of two terminal Runs. */
export function LabRunComparisonView(props: { readonly comparison: LabRunComparisonRecord; readonly labels: LabRunComparisonLabels }): JSX.Element {
  const { comparison, labels } = props
  return <section className={css.root} aria-label={labels.title} data-lab-run-comparison>
    <h3>{labels.title}</h3>
    <div className={css.grid}>
      <span>{labels.left}: {comparison.leftRunId}</span>
      <span>{labels.right}: {comparison.rightRunId}</span>
      <span>{labels.status}: {comparison.status.left ?? labels.noValue} / {comparison.status.right ?? labels.noValue}</span>
      <span>{labels.duration}: {formatDuration(comparison.durationMs.left)} / {formatDuration(comparison.durationMs.right)}</span>
      <span>{labels.artifacts}: {comparison.artifactCounts.left} / {comparison.artifactCounts.right}</span>
    </div>
    <div className={css.columns}>
      <ComparisonColumn title={labels.left} parameters={comparison.parameters.left} observations={comparison.observations.map(item => item.left).filter((item): item is NonNullable<typeof item> => item !== undefined)} artifacts={comparison.artifactMetadata.left} labels={labels} duration={comparison.durationMs.left} />
      <ComparisonColumn title={labels.right} parameters={comparison.parameters.right} observations={comparison.observations.map(item => item.right).filter((item): item is NonNullable<typeof item> => item !== undefined)} artifacts={comparison.artifactMetadata.right} labels={labels} duration={comparison.durationMs.right} />
    </div>
    <section className={css.steps} aria-label={labels.steps}>
      <h4>{labels.steps}</h4>
      {comparison.stepStatuses.map(step => <div key={step.stepId}><strong>{step.stepId}</strong><span>{labels.left}: {step.left ?? labels.noValue}</span><span>{labels.right}: {step.right ?? labels.noValue}</span></div>)}
    </section>
  </section>
}

function ComparisonColumn(props: { readonly title: string; readonly duration: number; readonly parameters: readonly { readonly stepId: string; readonly values: Readonly<Record<string, LabParameterValue>> }[]; readonly observations: readonly { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] }[]; readonly artifacts: readonly { readonly artifactId: string; readonly displayName: string; readonly kind: string; readonly mediaType: string; readonly size: number; readonly digest: string; readonly createdAt: number }[]; readonly labels: LabRunComparisonLabels }): JSX.Element {
  return <div className={css.column}>
    <h4>{props.title}</h4>
    <section><strong>{props.labels.duration}</strong><p>{formatDuration(props.duration)}</p></section>
    <section><strong>{props.labels.parameters}</strong>{props.parameters.length === 0 ? <p>{props.labels.noValue}</p> : props.parameters.map(parameter => <p key={parameter.stepId}>{parameter.stepId}: {Object.entries(parameter.values).map(([name, value]) => name + '=' + formatParameter(value)).join(', ') || props.labels.noValue}</p>)}</section>
    <section><strong>{props.labels.observations}</strong>{props.observations.length === 0 ? <p>{props.labels.noValue}</p> : props.observations.map(observation => <p key={observation.operationId}>{observation.operationId}: {observation.status}, {props.labels.valid}={String(observation.valid)}, {props.labels.artifactIds}={observation.artifactIds.join(', ') || props.labels.noValue}</p>)}</section>
    <section><strong>{props.labels.artifactMetadata}</strong>{props.artifacts.length === 0 ? <p>{props.labels.noValue}</p> : props.artifacts.map(artifact => <p key={artifact.artifactId}>{artifact.artifactId} · {artifact.displayName} · {artifact.kind} · {artifact.mediaType} · {artifact.size} B · {artifact.digest}</p>)}</section>
  </div>
}

function formatDuration(value: number): string {
  return value + ' ms'
}

function formatParameter(value: LabParameterValue): string {
  if (typeof value === 'object' && value !== null && 'unit' in value) return String(value.value) + ' ' + value.unit
  return String(value)
}
