import { useEffect, useState, useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import type { PropsLocale, PropsRuntime, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { LabArtifactRecord, LabPlanReview, LabProjectView, LabReportView, LabRun, LabRunComparisonView, LabSkillRevision, LabWorkflowRecord } from './api.ts'
import type { LabUiContext } from './LabUiContext.ts'
import type { LabQueryState } from './adapter.ts'
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
import type { LabResultReportLabels } from './LabResultReportView.tsx'
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
  readonly openSession: (sessionId: string) => void
}

type Props = PropsRuntime<'app.view'> & PropsLocale<'labWorkbench'> & InjectFace<LabProjectShellInjected>

const PAGES = ['overview', 'planning', 'approval', 'execution', 'steps', 'evidence', 'archive'] as const
type Page = typeof PAGES[number]
type LoadingState = { readonly state: 'loading' }
type ProjectState = LoadingState | LabQueryState<LabProjectView>
type RunsState = LoadingState | LabQueryState<readonly LabRun[]>
type ArtifactsState = LoadingState | LabQueryState<readonly LabArtifactRecord[]>
type ReportState = LoadingState | LabQueryState<LabReportView>
type ReviewsState = LoadingState | LabQueryState<readonly LabPlanReview[]>

/** Render a Project-owned list/detail shell while the same Harness Conversation stays below it. */
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
  }, [props.compareRuns, props.listArtifacts, props.listRuns, props.loadRunReport, project, selection.activeExperimentId, selection.activeRunId])

  useEffect(() => {
    const experimentId = selection.activeExperimentId ?? project?.experiments[0]?.experimentId
    if (experimentId === undefined) { setExperimentReviews({ state: 'empty', code: 'NO_RECORDS', message: '' }); return }
    setExperimentReviews({ state: 'loading' })
    let current = true
    void props.loadExperimentReviews(experimentId).then(value => { if (current) setExperimentReviews(value) }).catch(reason => { if (current) setExperimentReviews(failed(reason)) })
    return () => { current = false }
  }, [props.loadExperimentReviews, project, selection.activeExperimentId])

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
      <nav className={css.tabs} aria-label={props.t('projectNavigation')}>
        {PAGES.map((item) => (
          <button key={item} type='button' className={page === item ? css.tabActive : css.tab} onClick={() => { props.ui.openProjectPage(item) }}>
            {props.t(destinationLabel(item))}
          </button>
        ))}
      </nav>
      {page === 'overview' && <Overview props={props} project={project} runs={runs} artifacts={artifacts} onNavigate={destination => { props.ui.openProjectPage(destination) }} />}
      {page === 'planning' && <Experiments props={props} project={project} runs={runs} reviews={experimentReviews} />}
      {page === 'approval' && <Experiments props={props} project={project} runs={runs} reviews={experimentReviews} />}
      {(page === 'execution' || page === 'steps') && <><StateNoticeWhenVisible state={runsState} t={props.t} emptyMessage={props.t('stateNoExperiment')} /><Runs props={props} runs={runs} artifacts={artifacts} report={report} comparison={comparison} /></>}
      {page === 'evidence' && <><StateNoticeWhenVisible state={artifactsState} t={props.t} emptyMessage={props.t('stateNoRun')} /><Evidence props={props} artifacts={artifacts} {...selection.activeArtifactId === undefined ? {} : { selectedArtifactId: selection.activeArtifactId }} /></>}
      {page === 'archive' && <div className={css.notice}>{props.t('archiveNotice')}</div>}
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

function Experiments({ props, project, runs, reviews }: { readonly props: Props; readonly project: LabProjectView | undefined; readonly runs: readonly LabRun[]; readonly reviews: ReviewsState }): JSX.Element {
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
    <LabExperimentDetailView experiment={selected} sessions={(project?.experimentSessions ?? []).filter(session => session.experimentId === selected.experimentId)} review={review} runs={runs} evidence={(project?.evidence ?? []).filter(item => item.experimentId === selected.experimentId)} labels={experimentLabels(props.t)} onOpenSession={props.openSession} />
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
  return <div className={css.experimentLayout}><div className={css.list}>{runs.map(run => <button key={run.runId} type='button' className={run.runId === selectedId ? css.rowActive : css.row} onClick={() => { if (run.runId !== undefined) props.ui.selectRun(run.runId); props.ui.openProjectPage('execution') }}><strong>{run.runId ?? props.t('runs')}</strong><span>{run.runStatus ?? props.t('notAvailable')}</span></button>)}</div>{selected === undefined ? <div className={css.notice}>{props.t('stateNoRun')}</div> : <LabRunDetailView run={selected} artifacts={artifacts} {...report.state === 'ready' ? { report: report.value, assessment: report.value.assessment } : {}} {...comparison?.state === 'ready' ? { comparison: comparison.value } : {}} onRetry={props.retryRun} labels={runLabels(props.t)} />}</div>
}

function runLabels(t: Props['t']): LabRunDetailLabels {
  const resultLabels: LabRunResultLabels = { runTitle: t('runDetail'), resultTitle: t('result'), runStatus: t('status'), resultStatus: t('status'), currentStep: t('runCurrentStep'), feedback: t('runFeedback'), replanReason: t('runReplanReason'), verdict: t('lifecycleVerdict'), evidence: t('evidence'), assessedBy: t('runAssessedBy'), assessedAt: t('runAssessedAt'), humanQcGate: t('runHumanQcGate'), noValue: t('notAvailable'), statusLabel: value => t(runStatusKey(value)) }
  const comparisonLabels: LabRunComparisonLabels = { title: t('runComparison'), left: t('runLeft'), right: t('runRight'), status: t('status'), steps: t('steps'), artifacts: t('runArtifacts'), noValue: t('notAvailable') }
  const reportLabels: LabResultReportLabels = { title: t('report'), criteria: t('reportCriteria'), method: t('reportMethod'), verdict: t('lifecycleVerdict'), plan: t('plan'), run: t('runs'), evidence: t('evidence'), actor: t('reportActor'), assessedAt: t('reportAssessedAt'), observations: t('reportObservations'), artifacts: t('runArtifacts'), humanQc: t('runHumanQcGate'), noValue: t('notAvailable'), noCriteria: t('reportNoCriteria') }
  return { title: t('runDetail'), overview: t('runOverview'), parameters: t('runParameters'), steps: t('steps'), executionGraph: t('runExecutionGraph'), evidence: t('evidence'), logs: t('runLogs'), timeline: t('runTimeline'), plan: t('plan'), currentStep: t('runCurrentStep'), dependencies: t('runDependencies'), operation: t('runOperation'), createdAt: t('runCreatedAt'), updatedAt: t('runUpdatedAt'), noValue: t('notAvailable'), noSteps: t('runNoSteps'), noEvidence: t('experimentNoEvidence'), noLogs: t('runNoLogs'), retry: t('runRetry'), retryOfRun: t('runRetryOf'), comparisonLabels, reportLabels, resultLabels }
}

function runStatusKey(value: LabRunDisplayState | LabResultDisplayState): LabWorkbenchKey {
  const keys: Record<LabRunDisplayState | LabResultDisplayState, LabWorkbenchKey> = { queued: 'runDisplayQueued', running: 'runDisplayRunning', waiting: 'runDisplayWaiting', failed: 'runDisplayFailed', replanning: 'runDisplayReplanning', completed: 'runDisplayCompleted', pending: 'runDisplayPending', passed: 'runDisplayPassed', 'human-qc': 'runDisplayHumanQc' }
  return keys[value]
}

function Evidence({ props, artifacts, selectedArtifactId }: { readonly props: Props; readonly artifacts: readonly LabArtifactRecord[]; readonly selectedArtifactId?: string }): JSX.Element {
  const labels: LabArtifactPreviewLabels = { open: props.t('openArtifact'), unavailable: props.t('artifactPreviewUnavailable'), text: props.t('artifactTextPreview'), json: props.t('artifactJsonPreview'), image: props.t('artifactImagePreview'), unsupported: props.t('artifactUnsupported'), metadata: props.t('evidence') }
  return <div className={css.list}>{artifacts.map(artifact => <LabArtifactPreview key={artifact.artifactId} artifact={artifact} selected={artifact.artifactId === selectedArtifactId} labels={labels} onOpen={item => { void props.openArtifact(item.runId, item.artifactId) }} />)}</div>
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
    overview: 'overview', planning: 'planning', approval: 'approval', execution: 'execution', steps: 'stepOrchestration', evidence: 'evidencePage', archive: 'archive',
  }
  return labels[value]
}
