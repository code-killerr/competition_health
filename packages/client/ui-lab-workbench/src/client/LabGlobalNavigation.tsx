/** Harness 一级应用导航；页面状态由 Layout 和 LabUiContext 共同维护。 */

import { useEffect, useSyncExternalStore, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarNavigationOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { JSX } from 'react'
import type { LabProjectSummary } from './LabProjectsView.tsx'
import type { LabUiContext } from './LabUiContext.ts'
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

/** Render the root application navigation. */
export function LabGlobalNavigation(props: Props): JSX.Element {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const [projects, setProjects] = useState<readonly LabProjectSummary[]>([])
  useEffect(() => {
    let current = true
    void props.listProjects().then(value => { if (current) setProjects(value) }).catch(() => { if (current) setProjects([]) })
    return () => { current = false }
  }, [props.listProjects])

  const open = (viewId: string): void => { props.openAppView(viewId); props.expandSidebar() }
  const openProject = (project: LabProjectSummary): void => {
    props.ui.selectWorkspace(project.workspaceId)
    props.ui.selectProject(project.projectId)
    props.ui.openProjectPage('overview')
    open('lab-project')
  }

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
        {props.wide && projects.map(project => (
          <button key={project.projectId} type="button" className={project.projectId === selection.activeProjectId ? css.projectActive : css.project} onClick={() => { openProject(project) }}>
            <span className={css.projectDot} aria-hidden="true" />
            <span className={css.projectName}>{project.name}</span>
            <span className={css.projectMeta} aria-label={`${project.experimentCount} ${props.t('experiments')}`}>
              {project.activeRunCount !== undefined && project.activeRunCount > 0 ? project.activeRunCount : project.experimentCount}
            </span>
            {(project.failedRunCount ?? 0) > 0 && <span className={css.projectAlert} aria-label={props.t('failedRuns')}>!</span>}
            {(project.pendingApprovalCount ?? 0) > 0 && <span className={css.projectPending} aria-label={props.t('pendingApproval')}>•</span>}
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
