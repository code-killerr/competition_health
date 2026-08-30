import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabProjectSummary } from './LabProjectsView.tsx'
import type { LabUiContext } from './LabUiContext.ts'
import css from './LabOperationsView.module.css'

export interface LabOperationsInjected {
  readonly kind: 'monitor' | 'configuration'
  readonly ui: LabUiContext
  readonly listProjects: () => Promise<readonly LabProjectSummary[]>
  readonly openAppView: (viewId: string) => void
}

type Props = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & InjectFace<LabOperationsInjected>

/** Render global execution status or the registered configuration destinations. */
export function LabOperationsView(props: Props): JSX.Element {
  const [projects, setProjects] = useState<readonly LabProjectSummary[]>([])
  useEffect(() => {
    let current = true
    void props.listProjects().then(value => { if (current) setProjects(value) }).catch(() => { if (current) setProjects([]) })
    return () => { current = false }
  }, [props.listProjects])

  if (props.kind === 'configuration') return <ConfigurationView props={props} />
  const active = projects.filter(project => project.status === 'ACTIVE')
  const activeRuns = projects.reduce((total, project) => total + (project.activeRunCount ?? 0), 0)
  const failedRuns = projects.reduce((total, project) => total + (project.failedRunCount ?? 0), 0)
  const pendingApprovals = projects.reduce((total, project) => total + (project.pendingApprovalCount ?? 0), 0)
  return (
    <main className={css.root} aria-label={props.t('executionMonitor')}>
      <header className={css.header}><div><span className={css.kicker}>{props.t('monitorKicker')}</span><h1>{props.t('executionMonitor')}</h1><p>{props.t('monitorDescription')}</p></div></header>
      <section className={css.section}><h2>{props.t('monitorSummary')}</h2><div className={css.grid}>
        <div className={css.card}><span>{props.t('projects')}</span><strong>{projects.length}</strong></div>
        <div className={css.card}><span>{props.t('activeProjects')}</span><strong>{active.length}</strong></div>
        <div className={css.card}><span>{props.t('activeRuns')}</span><strong>{activeRuns}</strong></div>
        <div className={css.card}><span>{props.t('failedRuns')}</span><strong>{failedRuns}</strong></div>
        <div className={css.card}><span>{props.t('pendingApproval')}</span><strong>{pendingApprovals}</strong></div>
      </div></section>
      <section className={css.section}><h2>{props.t('monitorProjects')}</h2>{projects.length === 0
        ? <div className={css.unavailable}>{props.t('monitorNoProjects')}</div>
        : projects.map(project => <button key={project.projectId} type="button" className={css.row} onClick={() => { props.ui.selectProject(project.projectId); props.ui.openProjectPage('overview'); props.openAppView('lab-project') }}><strong>{project.name}</strong><span>{project.activeRunCount ?? 0} {props.t('activeRuns')} · {project.failedRunCount ?? 0} {props.t('failedRuns')} · {project.pendingApprovalCount ?? 0} {props.t('pendingApproval')}</span></button>)}</section>
      {projects.every(project => project.activeRunCount === undefined) && <div className={css.unavailable}>{props.t('monitorHostPending')}</div>}
    </main>
  )
}

function ConfigurationView({ props }: { readonly props: Props }): JSX.Element {
  return <main className={css.root} aria-label={props.t('configuration')}>
    <header className={css.header}><div><span className={css.kicker}>{props.t('configurationKicker')}</span><h1>{props.t('configuration')}</h1><p>{props.t('configurationDescription')}</p></div></header>
    <section className={css.section}><h2>{props.t('configurationGroup')}</h2><div className={css.actions}>
      <button type="button" className={css.action} onClick={() => { props.openAppView('lab-knowledge') }}>{props.t('knowledge')}</button>
      <button type="button" className={css.action} disabled>{props.t('agentConfiguration')}</button>
      <button type="button" className={css.action} disabled>{props.t('workflowConfiguration')}</button>
      <button type="button" className={css.action} onClick={() => { props.openAppView('lab-devices') }}>{props.t('devices')}</button>
      <button type="button" className={css.action} disabled>{props.t('peopleConfiguration')}</button>
    </div></section>
    <div className={css.unavailable}>{props.t('configurationUnavailable')}</div>
  </main>
}
