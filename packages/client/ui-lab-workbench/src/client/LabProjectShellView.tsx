import { useEffect, useState, useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabArtifactPreview as LabArtifactPreviewRecord, LabArtifactRecord, LabPlanReview, LabProjectFilePreview, LabProjectFileRecord, LabProjectView, LabReportView, LabRun, LabRunComparisonView, LabSkillRevision, LabWorkflowRecord } from './api.ts'
import type { LabCitationSelection, LabUiContext } from './LabUiContext.ts'
import type { LabProjectFileAdapter, LabProjectFileEventListener, LabQueryState } from './adapter.ts'
import { LabExperimentDetailView, type LabExperimentDetailLabels } from './LabExperimentDetailView.tsx'
import { LabRunDetailView, type LabRunDetailLabels } from './LabRunDetailView.tsx'
import type { LabRunDisplayState, LabResultDisplayState, LabRunResultLabels } from './LabRunResultView.tsx'
import type { LabWorkbenchKey } from './locales.ts'
import type { LabRunComparisonLabels } from './LabRunComparisonView.tsx'
import { LabWorkflowView } from './LabWorkflowView.tsx'
import type { LabWorkflowLabels } from './LabWorkflowView.tsx'
import { LabSkillView } from './LabSkillView.tsx'
import type { LabSkillLabels, LabSkillReviewState } from './LabSkillView.tsx'
import { LabArtifactPreview } from './LabArtifactPreview.tsx'
import type { LabArtifactPreviewLabels } from './LabArtifactPreview.tsx'
import { LabProjectFileView, type LabProjectFileLabels } from './LabProjectFileView.tsx'
import { LabResultReportView, type LabResultReportLabels } from './LabResultReportView.tsx'
import css from './LabProjectShellView.module.css'

/** Host queries and the real Session opener supplied to the Project app view. */
export interface LabProjectShellInjected {
  readonly ui: LabUiContext
  readonly loadProject: (projectId: string) => Promise<LabQueryState<LabProjectView>>
  readonly listRuns: (experimentId: string) => Promise<LabQueryState<readonly LabRun[]>>
  readonly listArtifacts: (runId: string) => Promise<LabQueryState<readonly LabArtifactRecord[]>>
  readonly loadRunReport: (runId: string) => Promise<LabQueryState<LabReportView>>
  readonly openArtifact: (runId: string, artifactId: string) => Promise<LabArtifactRecord>
  readonly loadExperimentReviews: (experimentId: string) => Promise<LabQueryState<readonly LabPlanReview[]>>
  readonly compareRuns: (leftRunId: string, rightRunId: string) => Promise<LabQueryState<LabRunComparisonView>>
  readonly retryRun: (runId: string) => Promise<LabRun>
  readonly openCitation?: (citation: LabCitationSelection) => void
  readonly confirmStep?: (input: { readonly runId: string; readonly stepId?: string; readonly operationId?: string }) => void | Promise<unknown>
  readonly stopRun?: (runId: string) => void | Promise<unknown>
  readonly openSession: (sessionId: string) => void
  readonly listProjectFiles?: LabProjectFileAdapter['listProjectFiles']
  readonly openProjectFile?: LabProjectFileAdapter['openProjectFile']
  readonly downloadProjectFile?: LabProjectFileAdapter['downloadProjectFile']
  readonly subscribeProjectFileEvents?: (listener: LabProjectFileEventListener) => () => void
}

type Props = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & InjectFace<LabProjectShellInjected>

const PAGES = ['overview', 'planning', 'approval', 'execution', 'steps', 'evidence', 'files', 'archive'] as const
type Page = typeof PAGES[number]
type LoadingState = { readonly state: 'loading' }
type ProjectState = LoadingState | LabQueryState<LabProjectView>
type RunsState = LoadingState | LabQueryState<readonly LabRun[]>
type ArtifactsState = LoadingState | LabQueryState<readonly LabArtifactRecord[]>
type ProjectFilesState = LoadingState | LabQueryState<readonly LabProjectFileRecord[]>
type ReportState = LoadingState | LabQueryState<LabReportView>
type ReviewsState = LoadingState | LabQueryState<readonly LabPlanReview[]>

/** 在同一个 Harness Conversation 旁边渲染由 Project 所有的工作台。 */
export function LabProjectShellView(props: Props): JSX.Element {
  const selection = useSyncExternalStore(props.ui.subscribe.bind(props.ui), () => props.ui.snapshot())
  const [project, setProject] = useState<LabProjectView | undefined>()
  const [projectState, setProjectState] = useState<ProjectState>({ state: 'loading' })
  const [runs, setRuns] = useState<readonly LabRun[]>([])
  const [runsState, setRunsState] = useState<RunsState>({ state: 'empty', code: 'NO_RECORDS', message: '' })
  const [artifacts, setArtifacts] = useState<readonly LabArtifactRecord[]>([])
  const [artifactsState, setArtifactsState] = useState<ArtifactsState>({ state: 'empty', code: 'NO_RECORDS', message: '' })
  const [report, setReport] = useState<ReportState>({ state: 'empty', code: 'NO_RECORDS', message: '' })
  const [experimentReviews, setExperimentReviews] = useState<ReviewsState>({ state: 'loading' })
  const [comparison, setComparison] = useState<LabQueryState<LabRunComparisonView> | undefined>()
  const [fileRefresh, setFileRefresh] = useState(0)
  const [projectFiles, setProjectFiles] = useState<readonly LabProjectFileRecord[]>([])
  const [projectFilesState, setProjectFilesState] = useState<ProjectFilesState>({ state: 'empty', code: 'NO_RECORDS', message: '' })
  const [projectFileRefresh, setProjectFileRefresh] = useState(0)
  const page = destinationOf(selection.projectPage)

  useEffect(() => {
    const projectId = selection.activeProjectId
    if (projectId === undefined) { setProject(undefined); setProjectState({ state: 'empty', code: 'NO_RECORDS', message: '' }); return }
    setProjectState({ state: 'loading' })
    let current = true
    void props.loadProject(projectId).then(value => {
      if (current) {
        setProject(value.state === 'ready' ? value.value : undefined)
        setProjectState(value)
        const workspaceId = value.state === 'ready' ? value.value.project?.workspaceId : undefined
        if (workspaceId !== undefined && selection.activeWorkspaceId !== workspaceId) props.ui.selectWorkspace(workspaceId)
      }
    }).catch(reason => {
      if (current) setProjectState(failed(reason))
    })
    return () => { current = false }
  }, [props.loadProject, selection.activeProjectId])

  useEffect(() => {
    const experimentId = selection.activeExperimentId ?? project?.experiments[0]?.experimentId
    if (experimentId === undefined) { setRuns([]); setRunsState({ state: 'empty', code: 'NO_RECORDS', message: '' }); setArtifacts([]); setArtifactsState({ state: 'empty', code: 'NO_RECORDS', message: '' }); setReport({ state: 'empty', code: 'NO_RECORDS', message: '' }); setComparison(undefined); return }
    setRunsState({ state: 'loading' })
    let current = true
    void props.listRuns(experimentId).then(value => {
      if (!current) return
      setRunsState(value)
      setRuns(value.state === 'ready' ? value.value : [])
      setComparison(undefined)
      if (value.state === 'ready') {
        const terminalRuns = value.value.filter(item => item.runId !== undefined && (item.runStatus === 'COMPLETED' || item.runStatus === 'FAILED' || item.runStatus === 'STOPPED'))
        const [left, right] = terminalRuns
        if (left?.runId !== undefined && right?.runId !== undefined) void props.compareRuns(left.runId, right.runId).then(result => { if (current) setComparison(result) }).catch(reason => { if (current) setComparison(failed(reason)) })
      }
      const runId = selection.activeRunId ?? (value.state === 'ready' ? value.value[0]?.runId : undefined)
      if (runId === undefined) { setArtifacts([]); setArtifactsState({ state: 'empty', code: 'NO_RECORDS', message: '' }); setReport({ state: 'empty', code: 'NO_RECORDS', message: '' }); return }
      setArtifactsState({ state: 'loading' })
      setReport({ state: 'loading' })
      void props.loadRunReport(runId).then(reportState => { if (current) setReport(reportState) }).catch(reason => { if (current) setReport(failed(reason)) })
      return props.listArtifacts(runId).then(artifactState => { if (current) { setArtifactsState(artifactState); setArtifacts(artifactState.state === 'ready' ? artifactState.value : []) } })
    }).catch(reason => { if (current) { setRunsState(failed(reason)); setArtifactsState(failed(reason)) } })
    return () => { current = false }
  }, [fileRefresh, props.compareRuns, props.listArtifacts, props.listRuns, props.loadRunReport, project, selection.activeExperimentId, selection.activeRunId])

  useEffect(() => {
    const experimentId = selection.activeExperimentId ?? project?.experiments[0]?.experimentId
    if (experimentId === undefined) { setExperimentReviews({ state: 'empty', code: 'NO_RECORDS', message: '' }); return }
    setExperimentReviews({ state: 'loading' })
    let current = true
    void props.loadExperimentReviews(experimentId).then(value => { if (current) setExperimentReviews(value) }).catch(reason => { if (current) setExperimentReviews(failed(reason)) })
    return () => { current = false }
  }, [props.loadExperimentReviews, project, selection.activeExperimentId])

  useEffect(() => {
    const projectId = selection.activeProjectId
    const load = props.listProjectFiles
    if (projectId === undefined || load === undefined) {
      setProjectFiles([])
      setProjectFilesState({ state: 'empty', code: 'NO_RECORDS', message: '' })
      return
    }
    setProjectFilesState({ state: 'loading' })
    let current = true
    void load(projectId).then(value => {
      if (current) {
        setProjectFilesState(value)
        setProjectFiles(value.state === 'ready' ? value.value : [])
      }
    }).catch(reason => {
      if (current) {
        setProjectFilesState(failed(reason))
        setProjectFiles([])
      }
    })
    return () => { current = false }
  }, [props.listProjectFiles, projectFileRefresh, selection.activeProjectId])

  useEffect(() => {
    const projectId = selection.activeProjectId
    const subscribe = props.subscribeProjectFileEvents
    if (projectId === undefined || subscribe === undefined) return
    return subscribe((event) => {
      if (event.projectId === projectId) setProjectFileRefresh(value => value + 1)
    })
  }, [props.subscribeProjectFileEvents, selection.activeProjectId])

  const projectRecord = project?.project
  return (
    <section className={css.root} aria-label={props.t('projectShellTitle')} data-lab-project-shell>
      <header className={css.header}>
        <div>
          <span className={css.kicker}>{props.t('projectShellKicker')}</span>
          <h1>{projectRecord?.name ?? props.t('labProjectsNone')}</h1>
          <p>{projectRecord?.description ?? props.t('projectShellHint')}</p>
        </div>
        <div className={css.identity}>
          <span>{props.t('currentProject')}</span>
          <strong>{projectRecord?.projectId ?? props.t('projectNotSelected')}</strong>
        </div>
      </header>
      {projectState.state !== 'ready' && <StateNotice state={projectState} t={props.t} emptyMessage={props.t('stateNoProject')} />}
      <div className={css.workspaceLayout}>
        <nav className={css.projectNavigation} aria-label={props.t('projectNavigation')} data-lab-project-navigation>
          <span className={css.navigationKicker}>{props.t('projectNavigation')}</span>
          {PAGES.map((item) => (
            <button key={item} type='button' className={page === item ? css.tabActive : css.tab} aria-current={page === item ? 'page' : undefined} onClick={() => { props.ui.openProjectPage(item) }}>
              {props.t(destinationLabel(item))}
            </button>
          ))}
        </nav>
        <div className={css.workspaceContent}>
          {page === 'overview' && <Overview props={props} project={project} runs={runs} artifacts={artifacts} onNavigate={destination => { props.ui.openProjectPage(destination) }} />}
          {page === 'planning' && <Experiments props={props} project={project} runs={runs} report={report} reviews={experimentReviews} />}
          {page === 'approval' && <Experiments props={props} project={project} runs={runs} report={report} reviews={experimentReviews} />}
          {(page === 'execution' || page === 'steps') && <><StateNoticeWhenVisible state={runsState} t={props.t} emptyMessage={props.t('stateNoExperiment')} /><Runs props={props} runs={runs} artifacts={artifacts} report={report} comparison={comparison} /></>}
          {page === 'evidence' && <><StateNoticeWhenVisible state={artifactsState} t={props.t} emptyMessage={props.t('stateNoRun')} /><Evidence props={props} artifacts={artifacts} report={report} {...selection.activeArtifactId === undefined ? {} : { selectedArtifactId: selection.activeArtifactId }} /></>}
          {page === 'files' && <ProjectFiles props={props} projectId={selection.activeProjectId} files={projectFiles} filesState={projectFilesState} artifacts={artifacts} state={artifactsState} onRefresh={() => { setFileRefresh(value => value + 1); setProjectFileRefresh(value => value + 1) }} />}
          {page === 'archive' && <Archive props={props} report={report} />}
        </div>
      </div>
    </section>
  )
}

function Overview({ props, project, runs, artifacts, onNavigate }: { readonly props: Props; readonly project: LabProjectView | undefined; readonly runs: readonly LabRun[]; readonly artifacts: readonly LabArtifactRecord[]; readonly onNavigate: (page: Extract<Page, 'planning' | 'approval' | 'execution' | 'steps' | 'evidence'>) => void }): JSX.Element {
  const record = project?.project
  const stages = [
    { label: props.t('goalUnderstanding'), done: Boolean(record?.description), page: 'planning' as const },
    { label: props.t('materialsConfirmation'), done: (project?.sources.length ?? 0) > 0, page: 'planning' as const },
    { label: props.t('workflowGeneration'), done: (project?.experiments.length ?? 0) > 0, page: 'planning' as const },
    { label: props.t('planApprovalStage'), done: project?.evidence.some(item => item.kind === 'plan-approval') === true, page: 'approval' as const },
    { label: props.t('controlledExecution'), done: runs.length > 0, page: 'execution' as const },
    { label: props.t('qualityCheck'), done: artifacts.length > 0, page: 'steps' as const },
    { label: props.t('resultReport'), done: project?.evidence.some(item => item.kind === 'report') === true, page: 'evidence' as const },
  ]
  const next = stages.find(stage => !stage.done)
  return <div className={css.lifecycleOverview} data-lab-lifecycle-overview>
    <section className={css.lifecycleCard} data-lab-pending-action>
      <div className={css.sectionHeading}><div><span className={css.sectionKicker}>{props.t('agentDrivenLifecycle')}</span><h2>{props.t('currentPath')}</h2></div><strong>{next?.label ?? props.t('lifecycleComplete')}</strong></div>
      <ol className={css.stageRail}>{stages.map((stage, index) => <li key={stage.label} className={stage.done ? css.stageDone : index === stages.findIndex(item => item === next) ? css.stageCurrent : css.stagePending}><button type="button" onClick={() => { onNavigate(stage.page) }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{stage.label}</strong></button></li>)}</ol>
    </section>
    <section className={css.actionPanel}><h2>{props.t('nextActions')}</h2><div className={css.actionGrid}>
      <button type="button" onClick={() => { onNavigate('planning') }}><strong>{props.t('planning')}</strong><span>{props.t('planningAction')}</span></button>
      <button type="button" onClick={() => { onNavigate('approval') }}><strong>{props.t('approval')}</strong><span>{props.t('approvalAction')}</span></button>
      <button type="button" onClick={() => { onNavigate('execution') }}><strong>{props.t('execution')}</strong><span>{props.t('executionAction')}</span></button>
      <button type="button" onClick={() => { onNavigate('evidence') }}><strong>{props.t('evidencePage')}</strong><span>{props.t('evidenceAction')}</span></button>
    </div></section>
    <div className={css.notice}>{props.t('projectShellConversationNotice')}</div>
  </div>
}

function Experiments({ props, project, runs, report, reviews }: { readonly props: Props; readonly project: LabProjectView | undefined; readonly runs: readonly LabRun[]; readonly report: ReportState; readonly reviews: ReviewsState }): JSX.Element {
  const experiments = project?.experiments ?? []
  const selectedId = props.ui.snapshot().activeExperimentId ?? experiments[0]?.experimentId
  const selected = experiments.find(experiment => experiment.experimentId === selectedId)
  const review = reviews.state === 'ready' ? reviews.value.at(-1) : undefined
  const workflow = review === undefined ? undefined : toWorkflow(review)
  return <div className={css.experimentLayout}><div className={css.list}>{experiments.map(experiment => (
    <button key={experiment.experimentId} type='button' className={experiment.experimentId === selectedId ? css.rowActive : css.row} onClick={() => { props.ui.selectExperiment(experiment.experimentId); props.ui.openProjectPage('planning') }}>
      <strong>{experiment.title}</strong><span>{experiment.status}</span>
    </button>
  ))}</div>{selected === undefined ? <div className={css.notice}>{props.t('stateNoExperiment')}</div> : reviews.state !== 'ready' || review === undefined ? <StateNotice state={reviews} t={props.t} emptyMessage={props.t('stateNoExperiment')} /> : <div className={css.detailStack}>
    <LabExperimentDetailView experiment={selected} sessions={(project?.experimentSessions ?? []).filter(session => session.experimentId === selected.experimentId)} review={review} runs={runs} {...report.state === 'ready' ? { report: report.value } : {}} evidence={(project?.evidence ?? []).filter(item => item.experimentId === selected.experimentId)} labels={experimentLabels(props.t)} onOpenSession={props.openSession} />
    {workflow !== undefined && <LabWorkflowView workflow={workflow} validation={review.validation} labels={workflowLabels(props.t)} />}
    {(review.skillRevisions ?? []).map(skill => {
      const state = skillState(skill.status)
      return state === undefined ? null : <LabSkillView key={skill.revisionId ?? skill.skillId ?? skill.name} revision={skill} state={state} validation={review.validation} labels={skillLabels(props.t)} />
    })}
  </div>}</div>
}

function toWorkflow(review: LabPlanReview): LabWorkflowRecord | undefined {
  const plan = review.plan
  if (plan.planId === undefined || plan.experimentId === undefined || plan.revision === undefined || plan.status === undefined) return undefined
  const skillRevisionIds = (review.skillRevisions ?? []).map(skill => skill.revisionId).filter((value): value is string => value !== undefined)
  return { planId: plan.planId, experimentId: plan.experimentId, revision: plan.revision, status: plan.status, steps: plan.steps ?? [], skillRevisionIds, unresolved: plan.unresolved ?? [] }
}

function skillState(status: LabSkillRevision['status']): LabSkillReviewState | undefined {
  if (status === 'DRAFT') return 'draft'
  if (status === 'VALIDATED') return 'validated'
  if (status === 'HUMAN_APPROVED') return 'approved'
  if (status === 'ACTIVE') return 'active'
  return undefined
}
function experimentLabels(t: Props['t']): LabExperimentDetailLabels {
  return { title: t('experimentDetail'), objective: t('objective'), status: t('status'), sessions: t('projectSessions'), createdInSession: t('experimentCreatedInSession'), derivedFrom: t('experimentDerivedFrom'), plan: t('plan'), planRevision: t('experimentPlanRevision'), planStatus: t('experimentPlanStatus'), steps: t('steps'), skills: t('experimentSkills'), unresolved: t('unresolvedInputs'), runs: t('runs'), evidence: t('evidence'), result: t('result'), noValue: t('notAvailable'), noPlan: t('experimentNoPlan'), noAssessment: t('experimentNoAssessment'), noSessions: t('experimentNoSessions'), noRuns: t('experimentNoRuns'), noEvidence: t('experimentNoEvidence'), openSession: t('openSession'), sessionRole: t('experimentSessionRole') }
}

function workflowLabels(t: Props['t']): LabWorkflowLabels {
  return { title: t('experimentDetail'), revision: t('experimentPlanRevision'), status: t('experimentPlanStatus'), steps: t('steps'), dependencies: t('runDependencies'), inputs: t('knowledge'), outputs: t('result'), skillRevision: t('experimentSkills'), operation: t('runOperation'), completion: t('result'), failurePolicy: t('runFeedback'), validation: t('validate'), unresolved: t('unresolvedInputs'), noValue: t('notAvailable'), noSteps: t('runNoSteps'), valid: t('lifecycleStatusValidated'), invalid: t('lifecycleInvalid'), listSeparator: '、', statusLabel: value => value }
}

function skillLabels(t: Props['t']): LabSkillLabels {
  return { title: t('experimentSkills'), status: t('experimentPlanStatus'), purpose: t('objective'), revision: t('experimentPlanRevision'), definition: t('notAvailable'), validation: t('validate'), changes: t('runComparison'), noChanges: t('notAvailable'), noValue: t('notAvailable'), validate: t('skillValidate'), approve: t('skillApprove'), activate: t('skillActivate'), actionUnavailable: t('notAvailable'), valid: t('lifecycleStatusValidated'), invalid: t('lifecycleInvalid'), statusLabel: value => value }
}
function Runs({ props, runs, artifacts, report, comparison }: { readonly props: Props; readonly runs: readonly LabRun[]; readonly artifacts: readonly LabArtifactRecord[]; readonly report: ReportState; readonly comparison: LabQueryState<LabRunComparisonView> | undefined }): JSX.Element {
  const selectedId = props.ui.snapshot().activeRunId ?? runs[0]?.runId
  const selected = runs.find(run => run.runId === selectedId)
  return <div className={css.experimentLayout}><div className={css.list}>{runs.map(run => <button key={run.runId} type='button' className={run.runId === selectedId ? css.rowActive : css.row} onClick={() => { if (run.runId !== undefined) props.ui.selectRun(run.runId); props.ui.openProjectPage('execution') }}><strong>{run.runId ?? props.t('runs')}</strong><span>{run.runStatus ?? props.t('notAvailable')}</span></button>)}</div>{selected === undefined ? <div className={css.notice}>{props.t('stateNoRun')}</div> : <LabRunDetailView run={selected} artifacts={artifacts} {...report.state === 'ready' ? { report: report.value, assessment: report.value.assessment } : {}} {...comparison?.state === 'ready' ? { comparison: comparison.value } : {}} onRetry={props.retryRun} {...props.confirmStep === undefined ? {} : { onConfirmStep: props.confirmStep }} {...props.stopRun === undefined ? {} : { onStop: props.stopRun }} labels={runLabels(props.t)} />}</div>
}

function reportLabels(t: Props['t']): LabResultReportLabels {
  return { title: t('report'), experiment: t('experiment'), criteria: t('reportCriteria'), method: t('reportMethod'), verdict: t('lifecycleVerdict'), plan: t('plan'), run: t('runs'), evidence: t('evidence'), actor: t('reportActor'), assessedAt: t('reportAssessedAt'), observations: t('reportObservations'), artifacts: t('runArtifacts'), skillRevisions: t('experimentSkills'), citations: t('citations'), observationIds: t('reportObservationIds'), artifactIds: t('reportArtifactIds'), openCitation: t('lifecycleOpenCitation'), citationUnavailable: t('lifecycleCitationUnavailable'), humanQc: t('runHumanQcGate'), humanQcAction: t('reportHumanQcAction'), humanQcUnavailable: t('reportHumanQcUnavailable'), noValue: t('notAvailable'), noCriteria: t('reportNoCriteria') }
}

function runLabels(t: Props['t']): LabRunDetailLabels {
  const resultLabels: LabRunResultLabels = { runTitle: t('runDetail'), resultTitle: t('result'), runStatus: t('status'), resultStatus: t('status'), currentStep: t('runCurrentStep'), feedback: t('runFeedback'), replanReason: t('runReplanReason'), verdict: t('lifecycleVerdict'), evidence: t('evidence'), assessedBy: t('runAssessedBy'), assessedAt: t('runAssessedAt'), humanQcGate: t('runHumanQcGate'), noValue: t('notAvailable'), statusLabel: value => t(runStatusKey(value)) }
  const comparisonLabels: LabRunComparisonLabels = { title: t('runComparison'), left: t('runLeft'), right: t('runRight'), status: t('status'), duration: t('runDuration'), parameters: t('runParameters'), steps: t('steps'), observations: t('runObservations'), artifacts: t('runArtifacts'), artifactMetadata: t('runArtifactMetadata'), valid: t('runValidity'), operation: t('runOperation'), artifactIds: t('runArtifactIds'), noValue: t('notAvailable') }
  return { title: t('runDetail'), overview: t('runOverview'), parameters: t('runParameters'), steps: t('steps'), executionGraph: t('runExecutionGraph'), evidence: t('evidence'), logs: t('runLogs'), timeline: t('runTimeline'), plan: t('plan'), currentStep: t('runCurrentStep'), dependencies: t('runDependencies'), operation: t('runOperation'), createdAt: t('runCreatedAt'), updatedAt: t('runUpdatedAt'), noValue: t('notAvailable'), noSteps: t('runNoSteps'), noEvidence: t('experimentNoEvidence'), noLogs: t('runNoLogs'), retry: t('runRetry'), retryOfRun: t('runRetryOf'), confirmStep: t('confirmStep'), stopRun: t('stopRun'), comparisonLabels, reportLabels: reportLabels(t), resultLabels }
}

function runStatusKey(value: LabRunDisplayState | LabResultDisplayState): LabWorkbenchKey {
  const keys: Record<LabRunDisplayState | LabResultDisplayState, LabWorkbenchKey> = { queued: 'runDisplayQueued', running: 'runDisplayRunning', waiting: 'runDisplayWaiting', failed: 'runDisplayFailed', replanning: 'runDisplayReplanning', completed: 'runDisplayCompleted', pending: 'runDisplayPending', passed: 'runDisplayPassed', 'human-qc': 'runDisplayHumanQc' }
  return keys[value]
}

function Evidence({ props, artifacts, report, selectedArtifactId }: { readonly props: Props; readonly artifacts: readonly LabArtifactRecord[]; readonly report: ReportState; readonly selectedArtifactId?: string }): JSX.Element {
  const labels: LabArtifactPreviewLabels = { open: props.t('openArtifact'), loading: props.t('stateLoading'), unavailable: props.t('artifactPreviewUnavailable'), text: props.t('artifactTextPreview'), json: props.t('artifactJsonPreview'), image: props.t('artifactImagePreview'), unsupported: props.t('artifactUnsupported'), metadata: props.t('evidence') }
  const [previews, setPreviews] = useState<Record<string, LabArtifactPreviewRecord>>({})
  const [previewStates, setPreviewStates] = useState<Record<string, 'loading' | 'unavailable'>>({})
  useEffect(() => { setPreviews({}); setPreviewStates({}) }, [artifacts])
  const openArtifact = (artifact: LabArtifactRecord): void => {
    setPreviewStates(current => ({ ...current, [artifact.artifactId]: 'loading' }))
    void props.openArtifact(artifact.runId, artifact.artifactId).then(result => {
      if (result.preview === undefined) {
        setPreviewStates(current => ({ ...current, [artifact.artifactId]: 'unavailable' }))
        return
      }
      setPreviews(current => ({ ...current, [artifact.artifactId]: result.preview as LabArtifactPreviewRecord }))
      setPreviewStates(current => { const next = { ...current }; delete next[artifact.artifactId]; return next })
    }).catch(() => { setPreviewStates(current => ({ ...current, [artifact.artifactId]: 'unavailable' })) })
  }
  return <div className={css.detailStack}><div className={css.list}>{artifacts.map(artifact => <LabArtifactPreview key={artifact.artifactId} artifact={artifact} preview={previews[artifact.artifactId]} {...previewStates[artifact.artifactId] === undefined ? {} : { previewState: previewStates[artifact.artifactId] }} selected={artifact.artifactId === selectedArtifactId} labels={labels} onOpen={openArtifact} />)}</div>{report.state === 'ready' && <LabResultReportView report={report.value} labels={reportLabels(props.t)} knowledgeAvailable={props.openCitation !== undefined} {...props.openCitation === undefined ? {} : { onOpenCitation: props.openCitation }} />}</div>
}

function Archive({ props, report }: { readonly props: Props; readonly report: ReportState }): JSX.Element {
  return <div className={css.detailStack}><div className={css.notice}>{props.t('archiveNotice')}</div>{report.state === 'ready' && <LabResultReportView report={report.value} labels={reportLabels(props.t)} knowledgeAvailable={props.openCitation !== undefined} {...props.openCitation === undefined ? {} : { onOpenCitation: props.openCitation }} />}</div>
}

/** 展示 Host 授权的 Project 文件元数据，并把正文读取与下载交给 adapter。 */
function ProjectFiles({ props, projectId, files, filesState, artifacts, state, onRefresh }: { readonly props: Props; readonly projectId: string | undefined; readonly files: readonly LabProjectFileRecord[]; readonly filesState: ProjectFilesState; readonly artifacts: readonly LabArtifactRecord[]; readonly state: ArtifactsState; readonly onRefresh: () => void }): JSX.Element {
  const artifactLabels: LabArtifactPreviewLabels = { open: props.t('openArtifact'), loading: props.t('stateLoading'), unavailable: props.t('artifactPreviewUnavailable'), text: props.t('artifactTextPreview'), json: props.t('artifactJsonPreview'), image: props.t('artifactImagePreview'), unsupported: props.t('artifactUnsupported'), metadata: props.t('evidence') }
  const fileLabels: LabProjectFileLabels = { preview: props.t('projectFilePreview'), download: props.t('projectFileDownload'), loading: props.t('stateLoading'), unavailable: props.t('artifactPreviewUnavailable'), metadata: props.t('evidence'), path: props.t('projectFilePath'), revision: props.t('projectFileRevision'), downloadReady: props.t('projectFileDownloadReady'), previewUnavailable: props.t('artifactUnsupported') }
  const nativeFiles = props.listProjectFiles !== undefined && projectId !== undefined
  const [previews, setPreviews] = useState<Record<string, LabProjectFilePreview>>({})
  const [previewStates, setPreviewStates] = useState<Record<string, 'idle' | 'loading' | 'unavailable'>>({})
  const [downloadStates, setDownloadStates] = useState<Record<string, 'idle' | 'loading' | 'ready' | 'unavailable'>>({})
  useEffect(() => {
    setPreviews({})
    setPreviewStates({})
    setDownloadStates({})
  }, [files])
  const previewFile = (file: LabProjectFileRecord): void => {
    if (projectId === undefined || props.openProjectFile === undefined) return
    setPreviewStates(current => ({ ...current, [file.projectFileId]: 'loading' }))
    void props.openProjectFile(projectId, file.projectFileId).then(result => {
      if (result.state === 'ready') {
        setPreviews(current => ({ ...current, [file.projectFileId]: result.value }))
        setPreviewStates(current => ({ ...current, [file.projectFileId]: 'idle' }))
      } else {
        setPreviewStates(current => ({ ...current, [file.projectFileId]: 'unavailable' }))
      }
    }).catch(() => { setPreviewStates(current => ({ ...current, [file.projectFileId]: 'unavailable' })) })
  }
  const downloadFile = (file: LabProjectFileRecord): void => {
    if (projectId === undefined || props.downloadProjectFile === undefined) return
    setDownloadStates(current => ({ ...current, [file.projectFileId]: 'loading' }))
    void props.downloadProjectFile(projectId, file.projectFileId).then(result => { setDownloadStates(current => ({ ...current, [file.projectFileId]: result.state === 'ready' ? 'ready' : 'unavailable' })) }).catch(() => { setDownloadStates(current => ({ ...current, [file.projectFileId]: 'unavailable' })) })
  }
  const renderFiles = (group: LabProjectFileRecord['group']): JSX.Element | undefined => {
    const groupFiles = files.filter(file => file.group === group)
    if (groupFiles.length === 0) return undefined
    return <div>{groupFiles.map(file => <LabProjectFileView key={file.projectFileId} file={file} labels={fileLabels} {...previews[file.projectFileId] === undefined ? {} : { preview: previews[file.projectFileId] }} {...previewStates[file.projectFileId] === undefined ? {} : { previewState: previewStates[file.projectFileId] }} {...downloadStates[file.projectFileId] === undefined ? {} : { downloadState: downloadStates[file.projectFileId] }} {...props.openProjectFile === undefined ? {} : { onPreview: () => { previewFile(file) } }} {...props.downloadProjectFile === undefined ? {} : { onDownload: () => { downloadFile(file) } }} />)}</div>
  }
  return <section className={css.projectFiles} data-lab-project-files>
    <header className={css.sectionHeading}><div><span className={css.sectionKicker}>{props.t('projectFilesKicker')}</span><h2>{props.t('projectFiles')}</h2></div><button type='button' onClick={onRefresh}>{props.t('projectFilesRefresh')}</button></header>
    {nativeFiles && <StateNoticeWhenVisible state={filesState} t={props.t} emptyMessage={props.t('projectFilesEmpty')} />}
    <FileGroup title={props.t('projectFilesConfiguration')} empty={props.t('projectFilesEmpty')}>{nativeFiles ? renderFiles('configuration') : undefined}</FileGroup>
    <FileGroup title={props.t('projectFilesConversationOutput')} empty={props.t('projectFilesEmpty')}>{nativeFiles ? renderFiles('conversation-output') : undefined}</FileGroup>
    <section className={css.fileGroup}><h3>{props.t('projectFilesRunArtifacts')}</h3>{nativeFiles ? renderFiles('run-artifacts') : <><StateNoticeWhenVisible state={state} t={props.t} emptyMessage={props.t('projectFilesEmpty')} />{artifacts.map(artifact => <LabArtifactPreview key={artifact.artifactId} artifact={artifact} labels={artifactLabels} onOpen={item => { void props.openArtifact(item.runId, item.artifactId) }} />)}</>}</section>
  </section>
}

function FileGroup(props: { readonly title: string; readonly empty: string; readonly children: JSX.Element | undefined }): JSX.Element {
  return <section className={css.fileGroup}><h3>{props.title}</h3>{props.children ?? <p>{props.empty}</p>}</section>
}

function StateNoticeWhenVisible<T>(props: { readonly state: LoadingState | LabQueryState<T>; readonly t: Props['t']; readonly emptyMessage: string }): JSX.Element | null {
  return props.state.state === 'ready' ? null : <StateNotice state={props.state} t={props.t} emptyMessage={props.emptyMessage} />
}

function StateNotice<T>({ state, t, emptyMessage }: { readonly state: LoadingState | LabQueryState<T>; readonly t: Props['t']; readonly emptyMessage: string }): JSX.Element {
  if (state.state === 'loading') return <div className={css.notice}>{t('stateLoading')}</div>
  if (state.state === 'empty') return <div className={css.notice}>{emptyMessage}</div>
  if (state.state === 'waiting') return <div className={css.notice} role='status'>{state.message}</div>
  if (state.state === 'unavailable' || state.state === 'failed') return <div className={css.error} role='status'>{state.code}: {state.message}</div>
  return <div className={css.notice}>{t('hostStateUnavailable')}</div>
}

function failed(reason: unknown): LabQueryState<never> {
  return { state: 'failed', code: 'PROVIDER_UNAVAILABLE', message: reason instanceof Error ? reason.message : String(reason), retryable: true }
}

function destinationOf(value: string): Page {
  if (value === 'experiments') return 'planning'
  if (value === 'runs') return 'execution'
  if (value === 'conversations') return 'overview'
  return (PAGES as readonly string[]).includes(value) ? value as Page : 'overview'
}

function destinationLabel(value: Page): LabWorkbenchKey {
  const labels: Record<Page, LabWorkbenchKey> = {
    overview: 'overview', planning: 'planning', approval: 'approval', execution: 'execution', steps: 'stepOrchestration', evidence: 'evidencePage', files: 'projectFiles', archive: 'archive',
  }
  return labels[value]
}
