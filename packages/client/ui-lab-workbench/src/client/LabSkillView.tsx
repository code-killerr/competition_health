import type { JSX } from 'react'
import type { LabSkillRevision, LabValidation } from './api.ts'
import css from './LabSkillView.module.css'

/** Product-facing Skill lifecycle states. */
export type LabSkillReviewState = 'reuse' | 'draft' | 'validated' | 'approved' | 'active'

/** One field-level revision change returned by the Host projection. */
export interface LabSkillRevisionChange {
  readonly field: string
  readonly before?: string
  readonly after?: string
}

/** Localized labels and action names supplied by the composition owner. */
export interface LabSkillLabels {
  readonly title: string
  readonly status: string
  readonly purpose: string
  readonly revision: string
  readonly definition: string
  readonly validation: string
  readonly changes: string
  readonly noChanges: string
  readonly noValue: string
  readonly validate: string
  readonly approve: string
  readonly activate: string
  readonly actionUnavailable: string
  readonly valid: string
  readonly invalid: string
  readonly statusLabel: (value: LabSkillReviewState) => string
}

/** Review action emitted to the Host-owned Skill workflow. */
export type LabSkillReviewAction = 'validate' | 'approve' | 'activate'

/** Render a Skill revision and diff while keeping lifecycle ownership on Host. */
export interface LabSkillViewProps {
  readonly revision: LabSkillRevision
  readonly state: LabSkillReviewState
  readonly validation?: LabValidation | undefined
  readonly changes?: readonly LabSkillRevisionChange[] | undefined
  readonly labels: LabSkillLabels
  readonly onReviewAction?: ((action: LabSkillReviewAction) => void) | undefined
}

/** Display Skill reuse/review state and emit only explicit review intents. */
export function LabSkillView(props: LabSkillViewProps): JSX.Element {
  const labels = props.labels
  const canValidate = props.onReviewAction !== undefined && (props.state === 'draft' || props.state === 'reuse')
  const canApprove = props.onReviewAction !== undefined && props.state === 'validated' && props.validation?.valid === true
  const canActivate = props.onReviewAction !== undefined && props.state === 'approved'
  return (
    <section className={css.root} aria-label={labels.title} data-lab-skill>
      <header className={css.header}><div><h2>{props.revision.name ?? labels.noValue}</h2><span>{labels.revision}: {props.revision.revision ?? labels.noValue}</span></div><span className={css.badge}>{labels.statusLabel(props.state)}</span></header>
      <div className={css.summary}><Field label={labels.purpose} value={props.revision.purpose ?? labels.noValue} /><Field label={labels.definition} value={props.revision.definitionHash ?? labels.noValue} /><Field label={labels.validation} value={props.validation === undefined ? labels.noValue : props.validation.valid === true ? labels.valid : labels.invalid} /></div>
      <section className={css.diff} aria-label={labels.changes}><h3>{labels.changes}</h3>{props.changes === undefined || props.changes.length === 0 ? <p>{labels.noChanges}</p> : <ul>{props.changes.map(change => <li key={change.field}><strong>{change.field}</strong><span>{change.before ?? labels.noValue} → {change.after ?? labels.noValue}</span></li>)}</ul>}</section>
      <div className={css.actions}>
        <ReviewButton label={labels.validate} enabled={canValidate} onClick={() => { props.onReviewAction?.('validate') }} />
        <ReviewButton label={labels.approve} enabled={canApprove} onClick={() => { props.onReviewAction?.('approve') }} />
        <ReviewButton label={labels.activate} enabled={canActivate} onClick={() => { props.onReviewAction?.('activate') }} />
        {!canValidate && !canApprove && !canActivate && <span className={css.muted}>{labels.actionUnavailable}</span>}
      </div>
    </section>
  )
}

function Field({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.field}><span>{label}</span><strong>{value}</strong></div>
}

function ReviewButton({ label, enabled, onClick }: { readonly label: string; readonly enabled: boolean; readonly onClick: () => void }): JSX.Element {
  return <button type='button' disabled={!enabled} onClick={onClick}>{label}</button>
}
