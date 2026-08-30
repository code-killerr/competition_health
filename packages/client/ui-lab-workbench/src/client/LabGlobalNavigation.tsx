/** Harness 一级应用导航；页面状态由 Layout 和 LabUiContext 共同维护。 */

import { useEffect, useSyncExternalStore, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarNavigationOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { JSX } from 'react'
import type { LabProjectSummary } from './LabProjectsView.tsx'
import type { LabPage, LabUiContext } from './LabUiContext.ts'
import css from './LabGlobalNavigation.module.css'

/** 导航项。 */
/** 一级导航的宿主动作。 */
export interface LabGlobalNavigationInjected {
  readonly openAppView: (viewId: string) => void
  readonly ui: LabUiContext
  readonly listProjects: () => Promise<readonly LabProjectSummary[]>
}

type Props = PropsRuntime<'sidebar.navigation'>
  & SidebarNavigationOwnerProps
  & PropsLocale<'labWorkbench'>
  & InjectFace<LabGlobalNavigationInjected>

type ProjectListState =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly value: readonly LabProjectSummary[] }
  | { readonly state: 'unavailable' }

const PROJECT_PAGES: readonly { readonly page: LabPage; readonly label: 'overview' | 'planning' | 'approval' | 'execution' | 'stepOrchestration' | 'evidencePage' | 'archive' }[] = [
  { page: 'overview', label: 'overview' },
  { page: 'planning', label: 'planning' },
  { page: 'approval', label: 'approval' },
  { page: 'execution', label: 'execution' },
  { page: 'steps', label: 'stepOrchestration' },
  { page: 'evidence', label: 'evidencePage' },
  { page: 'archive', label: 'archive' },
]

/** Render the root application navigation. */
export function LabGlobalNavigation(props: Props): JSX.Element {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const [projectsState, setProjectsState] = useState<ProjectListState>({ state: 'loading' })
  useEffect(() => {
    let current = true
    setProjectsState({ state: 'loading' })
    void props.listProjects().then(value => {
      if (current) setProjectsState({ state: 'ready', value })
    }).catch(() => {
      if (current) setProjectsState({ state: 'unavailable' })
    })
    return () => { current = false }
  }, [props.listProjects, selection.activeProjectId])

  useEffect(() => {
    if (projectsState.state !== 'ready') return
    const firstProject = projectsState.value[0]
    if (firstProject === undefined || projectsState.value.some(project => project.projectId === selection.activeProjectId)) return
    props.ui.selectWorkspace(firstProject.workspaceId)
    props.ui.selectProject(firstProject.projectId)
    props.ui.openProjectPage('overview')
  }, [projectsState, props.ui, selection.activeProjectId])

  const open = (viewId: string): void => { props.openAppView(viewId); props.expandSidebar() }
  const openProject = (project: LabProjectSummary, page: LabPage = 'overview'): void => {
    props.ui.selectWorkspace(project.workspaceId)
    props.ui.selectProject(project.projectId)
    props.ui.openProjectPage(page)
    open('lab-project')
  }
  const projects = projectsState.state === 'ready' ? projectsState.value : []
  const projectStatus = (project: LabProjectSummary): string => project.status === 'ACTIVE'
    ? props.t('lifecycleStatusActive')
    : props.t('archive')

  return (
    <nav className={css.root} aria-label={props.t('globalNavigation')}>
      <section className={css.group} aria-label={props.t('monitorGroup')}>
        {props.wide && <h2>{props.t('monitorGroup')}</h2>}
        <button type="button" className={css.item} aria-label={props.t('executionMonitor')} onClick={() => { open('lab-monitor') }}>
          <span className={css.mark} aria-hidden="true">↗</span>
          {props.wide && <span>{props.t('executionMonitor')}</span>}
        </button>
      </section>
      <section className={css.group} aria-label={props.t('projectsGroup')}>
        {props.wide && <h2>{props.t('projectsGroup')}</h2>}
        <button type="button" className={css.item} aria-label={props.t('projects')} onClick={() => { open('lab-projects') }}>
          <span className={css.mark} aria-hidden="true">P</span>
          {props.wide && <span>{props.t('projects')}</span>}
        </button>
        {props.wide && projectsState.state === 'loading' && <div className={css.navStatus} role="status">{props.t('projectsLoading')}</div>}
        {props.wide && projectsState.state === 'unavailable' && <div className={css.navStatus} role="status">{props.t('projectsUnavailable')}</div>}
        {props.wide && projects.map(project => (
          <div key={project.projectId} className={css.projectTree} data-project-id={project.projectId}>
            <button type="button" className={project.projectId === selection.activeProjectId ? css.projectActive : css.project} aria-label={project.name} onClick={() => { openProject(project) }}>
              <span className={css.projectDot} data-project-status={project.status} aria-hidden="true" />
              <span className={css.projectName}>{project.name}</span>
              <span className={css.projectMeta} aria-label={`${project.experimentCount} ${props.t('experiments')}`}>
                {project.activeRunCount !== undefined && project.activeRunCount > 0 ? project.activeRunCount : project.experimentCount}
              </span>
              {(project.failedRunCount ?? 0) > 0 && <span className={css.projectAlert} aria-label={props.t('failedRuns')}>!</span>}
              {(project.pendingApprovalCount ?? 0) > 0 && <span className={css.projectPending} aria-label={props.t('pendingApproval')}>•</span>}
            </button>
            <span className={css.projectStatus}>{projectStatus(project)}</span>
            {project.currentStepId !== undefined && <span className={css.projectStep}>{props.t('runCurrentStep')}: {project.currentStepId}</span>}
            <div className={css.projectDestinations} aria-label={`${project.name} ${props.t('projectNavigation')}`}>
              {PROJECT_PAGES.map(destination => (
                <button
                  key={destination.page}
                  type="button"
                  className={selection.activeProjectId === project.projectId && selection.projectPage === destination.page ? css.destinationActive : css.destination}
                  aria-label={`${project.name} ${props.t(destination.label)}`}
                  onClick={() => { openProject(project, destination.page) }}
                >
                  {props.t(destination.label)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!props.wide && projects.map(project => (
          <button key={project.projectId} type="button" className={css.railProject} aria-label={project.name} title={`${project.name} · ${projectStatus(project)}`} onClick={() => { openProject(project) }}>
            <span className={css.railProjectMark} data-project-status={project.status} aria-hidden="true">{project.name.slice(0, 1).toUpperCase()}</span>
          </button>
        ))}
      </section>
      <section className={css.group} aria-label={props.t('configurationGroup')}>
        {props.wide && <h2>{props.t('configurationGroup')}</h2>}
        {(['lab-knowledge', 'lab-config', 'lab-devices'] as const).map((id, index) => (
          <button key={id} type="button" className={css.item} aria-label={props.t(id === 'lab-knowledge' ? 'knowledge' : id === 'lab-devices' ? 'devices' : 'configuration')} onClick={() => { open(id) }}>
            <span className={css.mark} aria-hidden="true">{index === 0 ? 'K' : index === 1 ? '⚙' : 'D'}</span>
            {props.wide && <span>{props.t(id === 'lab-knowledge' ? 'knowledge' : id === 'lab-devices' ? 'devices' : 'configuration')}</span>}
          </button>
        ))}
      </section>
    </nav>
  )
}
