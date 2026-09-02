import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabProjectRunSummary, LabProjectSummary } from './LabProjectsView.tsx'
import type { LabConfigurationCapability } from './api.ts'
import type { LabQueryState } from './adapter.ts'
import type { LabUiContext } from './LabUiContext.ts'
import css from './LabOperationsView.module.css'

export interface LabOperationsInjected {
  readonly kind: 'monitor' | 'configuration'
  readonly ui: LabUiContext
  readonly listProjects: () => Promise<readonly LabProjectSummary[]>
  /** Optional typed monitor query; legacy fixtures may provide listProjects only. */
  readonly listProjectsState?: () => Promise<LabQueryState<readonly LabProjectSummary[]>>
  readonly listConfigurationCapabilities?: () => Promise<LabQueryState<readonly LabConfigurationCapability[]>>
  readonly openAppView: (viewId: string) => void
  readonly openProject?: (project: LabProjectSummary) => void | Promise<void>
}

type Props = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & InjectFace<LabOperationsInjected>

/** Render global execution status or the registered configuration destinations. */
export function LabOperationsView(props: Props): JSX.Element {
  const [projects, setProjects] = useState<readonly LabProjectSummary[]>([])
  const [projectsState, setProjectsState] = useState<LabQueryState<readonly LabProjectSummary[]> | { readonly state: 'loading' }>({ state: 'loading' })
  useEffect(() => {
    let current = true
    setProjectsState({ state: 'loading' })
    const load = props.listProjectsState === undefined
      ? props.listProjects().then(value => ({ state: 'ready' as const, value }))
      : props.listProjectsState()
    void load.then(value => {
      if (!current) return
      setProjectsState(value)
      setProjects(value.state === 'ready' ? value.value : [])
    }).catch(() => {
      if (current) {
        setProjects([])
        setProjectsState({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: props.t('monitorHostUnavailable'), retryable: true })
      }
    })
    return () => { current = false }
  }, [props.listProjects, props.listProjectsState, props.t])

  if (props.kind === 'configuration') return <ConfigurationView props={props} />
  if (projectsState.state === 'loading') return <main className={css.root} aria-label={props.t('executionMonitor')}><div className={css.unavailable}>{props.t('monitorLoading')}</div></main>
  if (projectsState.state === 'empty') return <main className={css.root} aria-label={props.t('executionMonitor')}><div className={css.unavailable} role="status">{props.t('monitorNoProjects')}</div></main>
  if (projectsState.state !== 'ready') return <main className={css.root} aria-label={props.t('executionMonitor')}><div className={css.unavailable} role="status">{projectsState.message || props.t('monitorHostUnavailable')}</div></main>
  const active = projects.filter(project => project.status === 'ACTIVE')
  const activeRuns = aggregateCount(projects, project => project.activeRunCount)
  const failedRuns = aggregateCount(projects, project => project.failedRunCount)
  const pendingApprovals = aggregateCount(projects, project => project.pendingApprovalCount)
  const displayCount = (value: number | undefined): string => value === undefined ? props.t('notAvailable') : String(value)
  const recentRuns = projects.flatMap(project => (project.runs ?? []).map(run => ({ project, run }))).sort((left, right) => (right.run.updatedAt ?? 0) - (left.run.updatedAt ?? 0))
  const openRun = (project: LabProjectSummary, run: LabProjectRunSummary): void => {
    const select = (): void => {
      if (props.openProject === undefined) {
        props.ui.selectWorkspace(project.workspaceId)
        props.ui.selectProject(project.projectId)
      }
      props.ui.selectExperiment(run.experimentId)
      props.ui.selectRun(run.runId)
      props.ui.openProjectPage(run.status === 'COMPLETED' ? 'evidence' : 'execution')
      if (props.openProject === undefined) props.openAppView('lab-project')
    }
    if (props.openProject === undefined) select()
    else void Promise.resolve(props.openProject(project)).then(select)
  }
  return (
    <main className={css.root} aria-label={props.t('executionMonitor')}>
      <header className={css.header}><div><span className={css.kicker}>{props.t('monitorKicker')}</span><h1>{props.t('executionMonitor')}</h1><p>{props.t('monitorDescription')}</p></div></header>
      <section className={css.section}><h2>{props.t('monitorSummary')}</h2><div className={css.grid}>
        <div className={css.card}><span>{props.t('projects')}</span><strong>{projects.length}</strong></div>
        <div className={css.card}><span>{props.t('activeProjects')}</span><strong>{active.length}</strong></div>
        <div className={css.card}><span>{props.t('activeRuns')}</span><strong>{displayCount(activeRuns)}</strong></div>
        <div className={css.card}><span>{props.t('failedRuns')}</span><strong>{displayCount(failedRuns)}</strong></div>
        <div className={css.card}><span>{props.t('pendingApproval')}</span><strong>{displayCount(pendingApprovals)}</strong></div>
      </div></section>
      <section className={css.section}><h2>{props.t('monitorProjects')}</h2>{projects.length === 0
        ? <div className={css.unavailable}>{props.t('monitorNoProjects')}</div>
        : projects.map(project => <button key={project.projectId} type="button" className={css.row} onClick={() => { void props.openProject?.(project); if (props.openProject === undefined) { props.ui.selectWorkspace(project.workspaceId); props.ui.selectProject(project.projectId); props.openAppView('lab-project') } }}><strong>{project.name}</strong><span>{displayCount(project.activeRunCount)} {props.t('activeRuns')} · {displayCount(project.failedRunCount)} {props.t('failedRuns')} · {displayCount(project.pendingApprovalCount)} {props.t('pendingApproval')}</span></button>)}</section>
      <section className={css.section}><h2>{props.t('monitorRuns')}</h2>{recentRuns.length === 0
        ? <div className={css.unavailable}>{props.t('monitorNoRuns')}</div>
        : recentRuns.slice(0, 8).map(({ project, run }) => <button key={`${project.projectId}:${run.runId}`} type="button" className={css.runRow} onClick={() => { openRun(project, run) }}><strong>{run.runId}</strong><span>{project.name} · {run.status}{run.currentStepId === undefined ? '' : ` · ${props.t('currentStep')}: ${run.currentStepId}`}</span></button>)}</section>
      {projects.every(project => project.activeRunCount === undefined) && <div className={css.unavailable}>{props.t('monitorHostPending')}</div>}
    </main>
  )
}

function aggregateCount(projects: readonly LabProjectSummary[], read: (project: LabProjectSummary) => number | undefined): number | undefined {
  const values = projects.map(read)
  const known = values.filter((value): value is number => value !== undefined)
  return known.length === values.length ? known.reduce((total, value) => total + value, 0) : undefined
}

function ConfigurationView({ props }: { readonly props: Props }): JSX.Element {
  type CapabilityState = { readonly state: 'loading' } | LabQueryState<readonly LabConfigurationCapability[]>
  const [capabilityState, setCapabilityState] = useState<CapabilityState | undefined>()
  useEffect(() => {
    if (props.listConfigurationCapabilities === undefined) { setCapabilityState(undefined); return }
    let current = true
    setCapabilityState({ state: 'loading' })
    void props.listConfigurationCapabilities().then(value => { if (current) setCapabilityState(value) }).catch(() => { if (current) setCapabilityState({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: props.t('capabilityUnavailable'), retryable: false }) })
    return () => { current = false }
  }, [props.listConfigurationCapabilities, props.t])
  const capabilities: readonly {
    readonly key: 'knowledge' | 'agentConfiguration' | 'workflowConfiguration' | 'devices' | 'peopleConfiguration'
    readonly viewId?: 'lab-knowledge' | 'lab-devices'
    readonly available: boolean
  }[] = [
    { key: 'knowledge', viewId: 'lab-knowledge', available: true },
    { key: 'agentConfiguration', available: false },
    { key: 'workflowConfiguration', available: false },
    { key: 'devices', viewId: 'lab-devices', available: true },
    { key: 'peopleConfiguration', available: false },
  ]
  const records = capabilityState?.state === 'ready' ? capabilityState.value : []
  const byKind = (kind: LabConfigurationCapability['kind']): LabConfigurationCapability | undefined => records.find(item => item.kind === kind)
  const kindFor = (key: typeof capabilities[number]['key']): LabConfigurationCapability['kind'] | undefined => key === 'agentConfiguration' ? 'agent' : key === 'workflowConfiguration' ? 'workflow' : key === 'devices' ? 'devices' : key === 'peopleConfiguration' ? 'people' : undefined
  const capabilityText = (key: typeof capabilities[number]['key'], baseAvailable: boolean): JSX.Element => {
    const record = kindFor(key) === undefined ? undefined : byKind(kindFor(key)!)
    if (capabilityState?.state === 'loading') return <span>{props.t('capabilityLoading')}</span>
    if (record === undefined) return <span>{baseAvailable ? props.t('capabilityAvailable') : props.t('capabilityUnavailable')}</span>
    return <span>{record.name} · {record.status}{record.version === undefined ? '' : ` · ${props.t('capabilityVersion')}: ${record.version}`}{record.recordCount === undefined ? '' : ` · ${props.t('capabilityRecords')}: ${record.recordCount}`}{record.detail === undefined ? '' : ` · ${record.detail}`}{record.allowedActions.length === 0 ? ` · ${props.t('capabilityReadOnly')}` : ` · ${props.t('capabilityActions')}: ${record.allowedActions.join(', ')}`}</span>
  }
  return <main className={css.root} aria-label={props.t('configuration')}>
    <header className={css.header}><div><span className={css.kicker}>{props.t('configurationKicker')}</span><h1>{props.t('configuration')}</h1><p>{props.t('configurationDescription')}</p></div></header>
    <section className={css.section} data-lab-configuration><h2>{props.t('configurationGroup')}</h2><div className={css.capabilityGrid}>
      {capabilities.map(capability => (
        <article key={capability.key} className={css.capabilityCard} data-capability-state={capability.available ? 'available' : 'unavailable'}>
          <div><h3>{props.t(capability.key)}</h3><p>{capabilityText(capability.key, capability.available)}</p></div>
          <button type="button" className={css.action} disabled={!capability.available} onClick={() => { if (capability.viewId !== undefined) props.openAppView(capability.viewId) }}>
            {props.t(capability.key)}
          </button>
        </article>
      ))}
    </div></section>
    <div className={css.unavailable} role="status">{props.t('configurationUnavailable')}</div>
  </main>
}
