/** Projects 一级页面；只展示 Host 返回的项目记录并发起明确的创建动作。 */

import { useEffect, useRef, useSyncExternalStore, useState } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabUiContext } from './LabUiContext.ts'
import type { LabRun } from './api.ts'
import css from './LabProjectsView.module.css'

/** 页面使用的最小 Project 展示记录。 */
export interface LabProjectSummary {
  readonly projectId: string
  readonly workspaceId: string
  readonly name: string
  readonly description: string
  readonly status: 'ACTIVE' | 'ARCHIVED'
  readonly sessionCount: number
  readonly experimentCount: number
  readonly activeRunCount?: number
  readonly failedRunCount?: number
  readonly pendingApprovalCount?: number
  readonly currentStepId?: string
  readonly runs?: readonly LabProjectRunSummary[]
}

/** Run identity used by the global monitoring projection. */
export interface LabProjectRunSummary {
  readonly experimentId: string
  readonly runId: string
  readonly status: NonNullable<LabRun['runStatus']>
  readonly currentStepId?: string
  readonly updatedAt?: number
}

/** Project 页面宿主动作。 */
export interface LabProjectsInjected {
  readonly ui: LabUiContext
  readonly listProjects: () => Promise<readonly LabProjectSummary[]>
  readonly createProject: (workspaceId: string) => Promise<LabProjectSummary>
  readonly openProjectView?: () => void
}

type Props = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & InjectFace<LabProjectsInjected>

/** Render the Project application view without requiring a Session. */
export function LabProjectsView(props: Props): JSX.Element {
  const projects = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const workspaces = props.useWorkspaces(state => state.items)
  const [items, setItems] = useState<readonly LabProjectSummary[]>([])
  const [workspaceId, setWorkspaceId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | undefined>()
  const workspaceInitialized = useRef(false)

  const selectProject = (project: LabProjectSummary): void => {
    props.ui.selectWorkspace(project.workspaceId)
    props.ui.selectProject(project.projectId)
    props.openProjectView?.()
  }

  useEffect(() => {
    if (workspaceInitialized.current || workspaceId !== '' || workspaces[0] === undefined) return
    workspaceInitialized.current = true
    const initialWorkspaceId = String(workspaces[0].workspaceId)
    setWorkspaceId(initialWorkspaceId)
    props.ui.selectWorkspace(initialWorkspaceId)
  }, [props.ui, workspaceId, workspaces])

  const refresh = async (): Promise<void> => {
    setStatus('loading')
    setError(undefined)
    try {
      const nextItems = await props.listProjects()
      setItems(nextItems)
      setStatus('idle')
    } catch (reason) {
      setStatus('error')
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  useEffect(() => { void refresh() }, []) // 页面首次打开读取 Host 当前列表。

  const create = async (): Promise<void> => {
    if (workspaceId === '') return
    setStatus('loading')
    setError(undefined)
    try {
      const created = await props.createProject(workspaceId)
      setItems(current => [created, ...current])
      selectProject(created)
      setStatus('idle')
    } catch (reason) {
      setStatus('error')
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return (
    <section className={css.page} aria-label={props.t('labProjectsTitle')} data-lab-projects>
      <div className={css.glow} aria-hidden="true" />
      <header className={css.header}>
        <div>
          <span className={css.kicker}>{props.t('labProjectsKicker')}</span>
          <h1>{props.t('labProjectsTitle')}</h1>
          <p>{props.t('labProjectsSubtitle')}</p>
        </div>
        <div className={css.selection}>
          <span>{props.t('labProjectsSelected')}</span>
          <strong>{projects.activeProjectId ?? props.t('labProjectsNone')}</strong>
        </div>
      </header>

      {error !== undefined && <div className={css.error} role="status">{error}</div>}

      <div className={css.layout}>
        <section className={css.createCard} aria-labelledby="lab-project-create-title">
          <span className={css.cardIndex}>01</span>
          <h2 id="lab-project-create-title">{props.t('labProjectsCreate')}</h2>
          <p>{props.t('labProjectsCreateHint')}</p>
          <label className={css.field}>
            <span>{props.t('labProjectsWorkspace')}</span>
            <select
              value={workspaceId}
              onChange={(event) => { const nextWorkspaceId = event.currentTarget.value; setWorkspaceId(nextWorkspaceId); props.ui.selectWorkspace(nextWorkspaceId) }}
              disabled={workspaces.length === 0}
            >
              {workspaces.length === 0 && <option value="">{props.t('labProjectsNoWorkspace')}</option>}
              {workspaces.map((workspace) => {
                const id = String(workspace.workspaceId)
                const label = workspace.title
                return <option key={id} value={id}>{label}</option>
              })}
            </select>
          </label>
          <button type="button" className={css.primary} disabled={status === 'loading' || workspaceId === ''} onClick={() => { void create() }}>
            {props.t('labProjectsCreateAction')}
          </button>
        </section>

        <section className={css.listCard} aria-labelledby="lab-project-list-title">
          <div className={css.listHeader}>
            <div>
              <span className={css.cardIndex}>02</span>
              <h2 id="lab-project-list-title">{props.t('labProjectsList')}</h2>
            </div>
            <button type="button" className={css.textButton} onClick={() => { void refresh() }} disabled={status === 'loading'}>{props.t('labProjectsRefresh')}</button>
          </div>
          {items.length === 0 && status !== 'loading' ? <p className={css.empty}>{props.t('labProjectsEmpty')}</p> : (
            <div className={css.projectList}>
              {items.map(project => (
                <button key={project.projectId} type="button" className={css.projectRow} onClick={() => { selectProject(project) }}>
                  <span className={css.projectOrb} aria-hidden="true" />
                  <span className={css.projectMain}><strong>{project.name}</strong><small>{project.workspaceId}</small></span>
                  <span className={css.projectStats}>{props.t('labProjectsSessions')}: {project.sessionCount} · {props.t('labProjectsExperiments')}: {project.experimentCount}</span>
                  <span className={project.status === 'ACTIVE' ? css.active : css.archived}>{project.status === 'ACTIVE' ? props.t('labProjectsActive') : props.t('labProjectsArchived')}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
