/** 实验自动化工作台的纯展示组件；数据和副作用通过四个 props share 注入。 */

import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale, PropsRenderSlots, PropsStore, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useMemo, type ReactNode } from 'react'
import type { LabExperimentRequest, LabSearchResult } from './api.ts'
import type { LabPage, LabWorkbenchState } from './store.ts'
import { firstPlanId, planReviews, runView } from './store.ts'
import type { createLabWorkbenchStore } from './store.ts'
import css from './LabWorkbench.module.css'

/** 工作台注册层提供的异步操作。 */
export interface LabWorkbenchInjected {
  refresh: (experimentId: string) => Promise<void>
  listProjects: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  createProject: (name: string) => Promise<void>
  openSession: (sessionId: string) => void
  createSession: (projectId: string, title?: string) => Promise<void>
  updateProjectScope: (
    projectId: string,
    sources: readonly { readonly documentId: string; readonly versionId: string }[],
    deviceIds: readonly string[],
  ) => Promise<void>
  associateSession: (projectId: string, sessionId: string, title?: string) => Promise<void>
  renameSession: (projectId: string, sessionId: string, title: string) => Promise<void>
  createExperiment: (request: LabExperimentRequest) => Promise<void>
  buildContext: (request: LabExperimentRequest) => Promise<void>
  proposeLocalPlan: (request: LabExperimentRequest, content: string) => Promise<void>
  validatePlan: (planId: string) => Promise<void>
  approvePlan: (experimentId: string, planId: string, approvedBy: string) => Promise<void>
  validateSkill: (revisionId: string) => Promise<void>
  approveSkill: (revisionId: string, approvedBy: string) => Promise<void>
  activateSkill: (revisionId: string) => Promise<void>
  startRun: (experimentId: string, planId: string) => Promise<void>
  executeStep: (runId: string) => Promise<void>
  confirmStep: (runId: string, evidence: string, confirmedBy: string, stepId?: string) => Promise<void>
  stopRun: (runId: string, requestedBy: string) => Promise<void>
  report: (runId: string) => Promise<void>
}

/** Public Project context passed into the Knowledge workspace slot. */
export interface LabKnowledgeWorkspaceOwnerProps {
  readonly projectId?: string
  readonly experimentId?: string
  readonly selectedSources?: readonly { readonly documentId: string; readonly versionId: string }[]
  readonly onSourceToggle?: (source: { readonly documentId: string; readonly versionId: string }) => void
  readonly onCitationAvailable?: (citation: LabSearchResult) => void
}

/** 工作台的完整槽位 props。 */
export type LabWorkbenchProps =
  & ConvViewProps
  & PropsStore<ReturnType<typeof createLabWorkbenchStore>>
  & PropsRenderSlots<'lab.knowledge.workspace'>
  & InjectFace<LabWorkbenchInjected>
  & PropsLocale<'labWorkbench'>

/** 渲染会话视图中的实验工作台。 */
export function LabWorkbench(props: LabWorkbenchProps): JSX.Element {
  const state = props.useStore(snapshot => snapshot)
  useEffect(() => {
    const applyNavigation = (event: Event): void => {
      const page = (event as CustomEvent<unknown>).detail
      if (isLabPage(page)) props.actions.setPage(page)
    }
    window.addEventListener('lab:navigate', applyNavigation)
    return () => { window.removeEventListener('lab:navigate', applyNavigation) }
  }, [props.actions])
  const labels = useMemo<Record<LabPage, string>>(() => ({
    overview: props.t('overview'),
    conversations: props.t('conversations'),
    knowledge: props.t('knowledge'),
    experiments: props.t('experiments'),
    runs: props.t('runs'),
    evidence: props.t('evidencePage'),
    devices: props.t('devices'),
    projects: props.t('projects'),
  }), [props.t])
  const request = buildRequest(state)
  const reviews = planReviews(state.snapshot)
  const activePlanId = state.activePlanId ?? firstPlanId(state.snapshot)
  const run = runView(state.snapshot)
  const runId = state.activeRunId ?? run?.runId
  const planId = state.activePlanId ?? firstPlanId(state.snapshot)
  const busy = state.pendingAction !== undefined

  return (
    <section className={css.backdrop} data-lab-workbench aria-label={props.t('title')}>
      <main className={css.content}>
        <nav className={css.nav} aria-label={props.t('projectNavigation')}>
          {PROJECT_PAGES.map((page, index) => (
            <button
              key={page}
              type="button"
              className={page === state.page ? css.navItemActive : css.navItem}
              onClick={() => { props.actions.setPage(page) }}
            >
              <span className={css.navIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span>{labels[page]}</span>
            </button>
          ))}
        </nav>
        <header className={css.header}>
          <div>
            <h1 className={css.title}>{props.t('title')}</h1>
            <span className={css.eyebrow}>{labels[state.page]}</span>
            <h2>{state.projectName || props.t('noProject')}</h2>
            <div className={css.identity}>{state.projectId || props.t('projectNotSelected')} · {state.experimentId || props.t('experimentId')}</div>
          </div>
          <div className={css.contextPill}><span>{props.t('currentProject')}</span><strong>{state.projectName || props.t('projectNotSelected')}</strong></div>
        </header>

        {(state.error !== undefined || state.notice !== undefined) && (
          <div className={state.error !== undefined ? css.alert : css.notice} role="status">
            {state.error !== undefined ? `${props.t('errorPrefix')}：${state.error}` : state.notice}
          </div>
        )}

        {state.page === 'overview' && <OverviewStage props={props} state={state} busy={busy} onNavigate={(page) => { props.actions.setPage(page) }} />}
        {state.page === 'knowledge' && <KnowledgeStage props={props} state={state} busy={busy} />}
        {state.page === 'devices' && <DeviceStage props={props} state={state} busy={busy} />}
        {state.page === 'projects' && <ProjectStage props={props} state={state} busy={busy} />}
        {state.page === 'conversations' && <RequestStage props={props} state={state} request={request} busy={busy} />}
        {state.page === 'experiments' && <div className={css.stageStack}><RequestStage props={props} state={state} request={request} busy={busy} /><PlanStage props={props} state={state} reviews={reviews} {...activePlanId === undefined ? {} : { activePlanId }} busy={busy} /></div>}
        {state.page === 'runs' && <ExecutionStage props={props} state={state} {...run === undefined ? {} : { run }} {...runId === undefined ? {} : { runId }} {...planId === undefined ? {} : { planId }} busy={busy} />}
        {state.page === 'evidence' && <ReportStage props={props} state={state} {...run === undefined ? {} : { run }} {...runId === undefined ? {} : { runId }} busy={busy} />}
      </main>
    </section>
  )
}

type StageProps = { readonly props: LabWorkbenchProps; readonly state: LabWorkbenchState; readonly busy: boolean }

/** Project overview with the next human action kept visible. */
function OverviewStage({ props, state, onNavigate }: StageProps & { readonly onNavigate: (page: LabPage) => void }): JSX.Element {
  const planCount = planReviews(state.snapshot).length
  const run = runView(state.snapshot)
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('overview')} hint={props.t('demoMode')}>
        <p className={css.description}>{props.t('overviewDescription')}</p>
        <div className={css.summaryGrid}>
          <SummaryValue label={props.t('knowledge')} value={String(state.projectView?.sources.length ?? 0)} />
          <SummaryValue label={props.t('experiments')} value={String(planCount)} />
          <SummaryValue label={props.t('runs')} value={run?.runStatus ?? props.t('notStarted')} />
          <SummaryValue label={props.t('evidence')} value={String(state.projectView?.evidence.length ?? 0)} />
        </div>
      </Panel>
      <Panel title={props.t('nextAction')} hint={props.t('humanGate')}>
        <p className={css.description}>{nextAction(props, state)}</p>
        <div className={css.buttonRow}>
          <ActionButton onClick={() => { onNavigate(nextPage(state)) }}>{props.t('continueFlow')}</ActionButton>
          <ActionButton onClick={() => { onNavigate('conversations') }}>{props.t('newExperiment')}</ActionButton>
        </div>
      </Panel>
    </div>
  )
}

function SummaryValue(props: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className={css.summaryValue}><span>{props.label}</span><strong>{props.value}</strong></div>
}

function nextPage(state: LabWorkbenchState): LabPage {
  if (state.projectId.trim() === '' || state.projectView === undefined) return 'projects'
  if (state.projectView?.sources.length === 0) return 'knowledge'
  if (state.snapshot?.planReviews.length === 0) return 'experiments'
  if (state.snapshot?.run === undefined) return 'runs'
  return 'evidence'
}

function nextAction(props: LabWorkbenchProps, state: LabWorkbenchState): string {
  if (state.projectId.trim() === '' || state.projectView === undefined) return props.t('createProjectPrompt')
  if ((state.projectView?.sources.length ?? 0) === 0) return props.t('selectKnowledgePrompt')
  if ((state.snapshot?.planReviews.length ?? 0) === 0) return props.t('createPlanPrompt')
  if (state.snapshot?.run === undefined) return props.t('approveRunPrompt')
  return props.t('inspectEvidencePrompt')
}

function DeviceStage({ props, state, busy }: StageProps): JSX.Element {
  const sourceSelections = splitComma(state.selectedSourceKeysText).map((value) => {
    const separator = value.indexOf(':')
    return {
      documentId: separator < 0 ? value : value.slice(0, separator),
      versionId: separator < 0 ? '' : value.slice(separator + 1),
    }
  })
  const deviceIds = splitComma(state.selectedDeviceIdsText)
  const invalidSource = sourceSelections.some(source => source.documentId === '' || source.versionId === '')
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('devices')} hint={props.t('scope')}>
        <div className={css.field}>
          <span>{props.t('selectedSources')}</span>
          <StatusList items={parseSourceKeys(state.selectedSourceKeysText)} empty={props.t('noSourcesSelected')} renderItem={source => (
            <div key={source.documentId + ':' + source.versionId} className={css.listRow}>
              <span>{source.documentId}:{source.versionId}</span>
              <StatusBadge value={props.t('selected')} />
            </div>
          )} />
        </div>
        <label className={css.field}>
          <span>{props.t('selectedDevices')}</span>
          <input
            value={state.selectedDeviceIdsText}
            onChange={(event) => { props.actions.setSelectedDeviceIdsText(event.currentTarget.value) }}
            placeholder="device-1, device-2"
          />
        </label>
        <ActionButton
          disabled={busy || state.projectId.trim() === '' || invalidSource}
          onClick={() => { void props.updateProjectScope(state.projectId.trim(), sourceSelections, deviceIds) }}
        >
          {props.t('saveScope')}
        </ActionButton>
      </Panel>
      <Panel title={props.t('status')} hint={props.t('devices')}>
        <StatusList items={state.snapshot?.devices ?? []} empty={props.t('empty')} renderItem={(device, index) => (
          <div key={String(device.id ?? index)} className={css.listRow}>
            <span>{String(device.name ?? device.id ?? props.t('devices'))}</span>
            <StatusBadge value={device.status} />
          </div>
        )} />
      </Panel>
      <Panel title={props.t('sources')} hint={props.t('scope')}>
        <StatusList items={state.projectView?.sources ?? []} empty={props.t('empty')} renderItem={(source, index) => (
          <div key={String(source.versionId ?? index)} className={css.listRow}>
            <span>{String(source.documentId ?? props.t('sourceName'))}:{String(source.versionId ?? '—')}</span>
            <StatusBadge value={source.status} />
          </div>
        )} />
      </Panel>
    </div>
  )
}

function ProjectStage({ props, state, busy }: StageProps): JSX.Element {
  const projectId = state.projectId.trim()
  const sessionId = String(props.sessionId)
  const sessionTitle = state.sessionTitle.trim()
  const currentSession = state.projectView?.sessions.find(session => String(session.sessionId) === sessionId)
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('projects')} hint={props.t('stageHint')}>
        <label className={css.field}>
          <span>{props.t('projectName')}</span>
          <input value={state.projectName} onChange={(event) => { props.actions.setProjectName(event.currentTarget.value) }} />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy} onClick={() => { void props.listProjects() }}>{props.t('listProjects')}</ActionButton>
          <ActionButton disabled={busy || projectId === ''} onClick={() => { void props.openProject(projectId) }}>{props.t('openProject')}</ActionButton>
          <ActionButton disabled={busy || state.projectName.trim() === ''} onClick={() => { void props.createProject(state.projectName.trim()) }}>{props.t('createProject')}</ActionButton>
        </div>
        <StatusList items={state.projectViews} empty={props.t('empty')} renderItem={(view, index) => {
          const project = view.project ?? {}
          const listedProjectId = String(project.projectId ?? 'project-' + String(index + 1))
          return (
            <button key={listedProjectId} type="button" className={css.listRow} onClick={() => { void props.openProject(listedProjectId) }}>
              <span>{String(project.name ?? listedProjectId)}</span>
              <StatusBadge value={project.status} />
            </button>
          )
        }} />
        <JsonPreview value={state.projectView?.project} empty={props.t('empty')} />
      </Panel>
      <Panel title={props.t('projectSessions')} hint={props.t('stageHint')}>
        <label className={css.field}>
          <span>{props.t('sessionTitle')}</span>
          <input value={state.sessionTitle} onChange={(event) => { props.actions.setSessionTitle(event.currentTarget.value) }} />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy || projectId === ''} onClick={() => { void props.createSession(projectId, sessionTitle === '' ? undefined : sessionTitle) }}>
            {props.t('createSession')}
          </ActionButton>
          <ActionButton disabled={busy || projectId === '' || sessionId.trim() === ''} onClick={() => { void props.associateSession(projectId, sessionId, sessionTitle === '' ? undefined : sessionTitle) }}>
            {props.t('associateSession')}
          </ActionButton>
          <ActionButton disabled={busy || projectId === '' || currentSession === undefined || sessionTitle === ''} onClick={() => { void props.renameSession(projectId, sessionId, sessionTitle) }}>
            {props.t('renameSession')}
          </ActionButton>
        </div>
        <StatusList items={state.projectView?.sessions ?? []} empty={props.t('empty')} renderItem={(session, index) => (
          <button key={String(session.sessionId ?? index)} type="button" className={css.listRow} onClick={() => {
            if (typeof session.sessionId === 'string') props.openSession(session.sessionId)
          }}>
            <span>{String(session.title ?? session.sessionId ?? props.t('sessionTitle'))}</span>
            <StatusBadge value={session.status} />
          </button>
        )} />
      </Panel>
    </div>
  )
}

function KnowledgeStage({ props, state }: StageProps): JSX.Element {
  const selectedSources = parseSourceKeys(state.selectedSourceKeysText)
  const toggleSource = (source: { readonly documentId: string; readonly versionId: string }): void => {
    if (state.projectId.trim() === '') { props.actions.setError(props.t('projectRequired')); return }
    const key = source.documentId + ':' + source.versionId
    const next = selectedSources.some(item => item.documentId + ':' + item.versionId === key)
      ? selectedSources.filter(item => item.documentId + ':' + item.versionId !== key)
      : [...selectedSources, source]
    props.actions.setSelectedSourceKeysText(next.map(item => item.documentId + ':' + item.versionId).join('\n'))
    void props.updateProjectScope(state.projectId.trim(), next, splitComma(state.selectedDeviceIdsText))
  }
  const receiveCitation = (citation: LabSearchResult): void => {
    const current = state.searchResults.filter(item => item.citationId !== citation.citationId)
    props.actions.setSearch([...current, citation], state.conflicts)
  }
  return (
    <div className={css.stageGrid}>
      <div className={css.workspaceSlot} data-lab-knowledge-slot>
        {typeof props.renderSlot === 'function' ? props.renderSlot('lab.knowledge.workspace', {
          projectId: state.projectId,
          experimentId: state.experimentId,
          selectedSources,
          onSourceToggle: toggleSource,
          onCitationAvailable: receiveCitation,
        }) : null}
      </div>
      <Panel title={props.t('knowledge')} hint={props.t('knowledgeWorkspaceNotice')}>
        <p className={css.description}>{props.t('knowledgeWorkspaceNotice')}</p>
        <div className={css.statusLine}>
          <StatusBadge value={state.snapshot?.knowledgeCapability?.state ?? 'unavailable'} />
          <span>
            {state.snapshot?.knowledgeCapability?.state === 'available'
              ? props.t('capabilityAvailable')
              : state.snapshot?.knowledgeCapability?.reason ?? props.t('capabilityUnavailable')}
          </span>
        </div>
        <StatusList items={state.snapshot?.knowledge ?? []} empty={props.t('empty')} renderItem={(item, index) => (
          <div key={String(item.versionId ?? item.documentId ?? index)} className={css.listRow}>
            <span>{String(item.sourceName ?? item.documentId ?? props.t('sourceName'))}</span>
            <StatusBadge value={item.status} />
          </div>
        )} />
      </Panel>
      <Panel title={props.t('citations')} hint={props.t('readOnly')}>
        <ResultList results={state.searchResults} empty={props.t('empty')} />
        <div className={css.subheading}>{props.t('conflicts')}</div>
        <StatusList items={state.conflicts} empty={props.t('empty')} renderItem={(item, index) => (
          <div key={String(item.conflictId ?? index)} className={css.listRow}>
            <span>{String(item.conflictId ?? props.t('conflicts'))}</span>
            <StatusBadge value={item.status} />
          </div>
        )} />
      </Panel>
      <Panel title={props.t('scope')} hint={props.t('selectedSources')}>
        <StatusList items={state.projectView?.sources ?? []} empty={props.t('empty')} renderItem={(source, index) => (
          <div key={String(source.versionId ?? index)} className={css.listRow}>
            <span>{String(source.documentId ?? props.t('sourceName'))}:{String(source.versionId ?? '—')}</span>
            <StatusBadge value={source.status} />
          </div>
        )} />
      </Panel>
    </div>
  )
}
function RequestStage({ props, state, request, busy }: StageProps & { readonly request: LabExperimentRequest }): JSX.Element {
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('request')} hint={props.t('stageHint')}>
        <p className={css.description}>{props.t('conversationNotice')}</p>
        <label className={css.field}>
          <span>{props.t('objective')}</span>
          <textarea value={state.objective} onChange={(event) => { props.actions.setObjective(event.currentTarget.value) }} rows={5} />
        </label>
        <label className={css.field}>
          <span>{props.t('sample')}</span>
          <input value={state.sampleName} onChange={(event) => { props.actions.setSampleName(event.currentTarget.value) }} />
        </label>
        <label className={css.field}>
          <span>{props.t('expectedOutputs')}</span>
          <textarea
            value={state.expectedOutputsText}
            onChange={(event) => { props.actions.setExpectedOutputsText(event.currentTarget.value) }}
            rows={4}
          />
        </label>
        <label className={css.field}>
          <span>{props.t('constraints')}</span>
          <textarea
            value={state.constraintsText}
            onChange={(event) => { props.actions.setConstraintsText(event.currentTarget.value) }}
            rows={3}
          />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy || request.objective === ''} onClick={() => { void props.createExperiment(request) }}>{props.t('createExperiment')}</ActionButton>
          <ActionButton disabled={busy || request.objective === ''} onClick={() => { void props.buildContext(request) }}>{props.t('buildContext')}</ActionButton>
        </div>
      </Panel>
      <Panel title={props.t('citations')} hint={props.t('noPlan')}>
        <JsonPreview value={state.planningContext} empty={props.t('empty')} />
      </Panel>
    </div>
  )
}

function PlanStage({ props, state, reviews, activePlanId, busy }: StageProps & { readonly reviews: readonly import('./api.ts').LabPlanReview[]; readonly activePlanId?: string }): JSX.Element {
  const active = reviews.find(review => review.plan.planId === activePlanId)
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('generatedPlan')} hint={props.t('deterministicDemo')}>
        <p className={css.description}>{props.t('planGenerationNotice')}</p>
        <StatusList items={state.searchResults} empty={props.t('noCitations')} renderItem={(citation, index) => (
          <div key={String(citation.citationId ?? index)} className={css.listRow}>
            <span>{String(citation.excerpt ?? citation.citationId ?? props.t('citations'))}</span>
            <StatusBadge value={citation.confirmed === true ? props.t('confirmed') : props.t('pending')} />
          </div>
        )} />
        <ActionButton disabled={busy || state.objective.trim() === '' || !state.searchResults.some(citation => typeof citation.citationId === 'string' && citation.citationId !== '')} onClick={() => {
          const citation = state.searchResults.find(item => typeof item.citationId === 'string' && item.citationId !== '')
          if (citation?.citationId === undefined) { props.actions.setError(props.t('citationRequired')); return }
          const content = JSON.stringify(createLocalPlan(buildRequest(state), citation.citationId))
          props.actions.setLocalPlanText(content)
          void props.proposeLocalPlan(buildRequest(state), content)
        }}>{props.t('generatePlan')}</ActionButton>
      </Panel>
      <Panel title={props.t('plan')} hint={props.t('noPlan')}>
        {reviews.length === 0 && <EmptyState text={props.t('noPlan')} />}
        {reviews.map((review) => {
          const planId = review.plan.planId ?? 'unknown-plan'
          return (
            <button key={planId} type="button" className={planId === activePlanId ? css.planCardActive : css.planCard} onClick={() => { props.actions.setActivePlan(planId) }}>
              <span className={css.cardTitle}>{String(review.plan.objective ?? planId)}</span>
              <span className={css.cardMeta}>{planId} · revision {String(review.plan.revision ?? '?')}</span>
              <span className={css.cardMeta}>{props.t('citations')}: {(review.plan.citations ?? []).join(', ') || props.t('empty')}</span>
              <span className={css.cardMeta}>{props.t('assumptions')}: {(review.plan.assumptions ?? []).join(', ') || props.t('empty')}</span>
              <span className={css.cardMeta}>{props.t('unresolvedInputs')}: {(review.plan.unresolved ?? []).join(', ') || props.t('empty')}</span>
              <StatusBadge value={review.plan.status} />
            </button>
          )
        })}
        {activePlanId !== undefined && (
          <div className={css.buttonRow}>
            <ActionButton disabled={busy} onClick={() => { void props.validatePlan(activePlanId) }}>{props.t('validate')}</ActionButton>
            <ActionButton emphasis="amber" disabled={busy || state.reviewer.trim() === ''} onClick={() => { void props.approvePlan(state.experimentId, activePlanId, state.reviewer) }}>{props.t('approve')}</ActionButton>
          </div>
        )}
        <label className={css.field}>
          <span>{props.t('reviewer')}</span>
          <input value={state.reviewer} onChange={(event) => { props.actions.setReviewer(event.currentTarget.value) }} />
        </label>
      </Panel>
      <Panel title={props.t('steps')} hint={props.t('citations')}>
        {active === undefined ? <EmptyState text={props.t('empty')} /> : (
          <>
            <JsonPreview value={active.validation} empty={props.t('empty')} />
            {(active.skillRevisions ?? []).map((skill, index) => {
              const revisionId = skill.revisionId ?? `skill-${String(index)}`
              return (
                <div key={revisionId} className={css.listRow}>
                  <span>{String(skill.name ?? revisionId)} · {String(skill.status ?? '—')}</span>
                  <div className={css.buttonRow}>
                    <ActionButton disabled={busy || skill.status !== 'DRAFT'} onClick={() => { void props.validateSkill(revisionId) }}>{props.t('skillValidate')}</ActionButton>
                    <ActionButton disabled={busy || skill.status !== 'VALIDATED' || state.reviewer.trim() === ''} onClick={() => { void props.approveSkill(revisionId, state.reviewer) }}>{props.t('skillApprove')}</ActionButton>
                    <ActionButton disabled={busy || skill.status !== 'HUMAN_APPROVED'} onClick={() => { void props.activateSkill(revisionId) }}>{props.t('skillActivate')}</ActionButton>
                  </div>
                </div>
              )
            })}
            {(active.plan.steps ?? []).map((step, index) => (
              <div key={String(step.stepId ?? index)} className={css.stepCard}>
                <span className={css.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{String(step.title ?? step.stepId ?? props.t('steps'))}</strong>
                  <p>{String(step.operationKind ?? '')} · {String(step.operationResource ?? '')}</p>
                  <small>{(step.citations ?? []).join(', ') || props.t('empty')}</small>
                </div>
                {step.requiresApproval === true && <StatusBadge value={props.t('approve')} />}
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  )
}

function ExecutionStage({ props, state, run, runId, planId, busy }: StageProps & { readonly run?: import('./api.ts').LabRun; readonly runId?: string; readonly planId?: string }): JSX.Element {
  const currentStepId = run?.currentStepId
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('execution')} hint={props.t('stageHint')}>
        {run === undefined && <EmptyState text={props.t('noRun')} />}
        {run !== undefined && <div className={css.runStatus}><StatusBadge value={run.runStatus} /><span>{String(currentStepId ?? props.t('steps'))}</span></div>}
        <div className={css.buttonRow}>
          <ActionButton disabled={busy || planId === undefined} onClick={() => { void props.startRun(state.experimentId, planId ?? '') }}>{props.t('startRun')}</ActionButton>
          <ActionButton disabled={busy || runId === undefined} onClick={() => { void props.executeStep(runId ?? '') }}>{props.t('nextStep')}</ActionButton>
          <ActionButton disabled={busy || runId === undefined || state.evidenceText.trim() === '' || state.reviewer.trim() === ''} onClick={() => { void props.confirmStep(runId ?? '', state.evidenceText, state.reviewer, currentStepId) }}>{props.t('confirmStep')}</ActionButton>
          <ActionButton disabled={busy || runId === undefined || state.requestedBy.trim() === ''} onClick={() => { void props.stopRun(runId ?? '', state.requestedBy) }}>{props.t('stopRun')}</ActionButton>
        </div>
        <label className={css.field}>
          <span>{props.t('evidence')}</span>
          <textarea
            value={state.evidenceText}
            onChange={(event) => { props.actions.setEvidenceText(event.currentTarget.value) }}
            rows={5}
          />
        </label>
        <label className={css.field}>
          <span>{props.t('requestedBy')}</span>
          <input value={state.requestedBy} onChange={(event) => { props.actions.setRequestedBy(event.currentTarget.value) }} />
        </label>
      </Panel>
      <Panel title={props.t('devices')} hint={props.t('status')}>
        <StatusList items={state.snapshot?.devices ?? []} empty={props.t('empty')} renderItem={(device, index) => (
          <div key={String(device.id ?? index)} className={css.listRow}>
            <span>{String(device.name ?? device.id ?? props.t('devices'))}</span>
            <StatusBadge value={device.status} />
          </div>
        )} />
      </Panel>
    </div>
  )
}

function ReportStage({ props, state, run, runId, busy }: StageProps & { readonly run?: import('./api.ts').LabRun; readonly runId?: string }): JSX.Element {
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('report')} hint={props.t('stageHint')}>
        <ActionButton disabled={busy || runId === undefined} onClick={() => { void props.report(runId ?? '') }}>{props.t('reportAction')}</ActionButton>
        <JsonPreview value={state.snapshot?.report} empty={run === undefined ? props.t('noRun') : props.t('empty')} />
      </Panel>
      <Panel title={props.t('status')} hint={props.t('citations')}>
        <JsonPreview value={state.snapshot?.run} empty={props.t('empty')} />
      </Panel>
    </div>
  )
}

function Panel(props: { readonly title: string; readonly hint: string; readonly children: ReactNode }): JSX.Element {
  return (
    <section className={css.panel}>
      <div className={css.panelHeader}>
        <h3>{props.title}</h3>
        <span>{props.hint}</span>
      </div>
      {props.children}
    </section>
  )
}

function ActionButton(props: { readonly children: ReactNode; readonly onClick: () => void; readonly disabled?: boolean; readonly emphasis?: 'amber' }): JSX.Element {
  return <button type="button" className={props.emphasis === 'amber' ? css.actionAmber : css.action} disabled={props.disabled} onClick={props.onClick}>{props.children}</button>
}

function StatusBadge(props: { readonly value?: unknown }): JSX.Element {
  return <span className={css.badge}>{String(props.value ?? '—')}</span>
}

function StatusList<T extends object>(props: {
  readonly items: readonly T[]
  readonly empty: string
  readonly renderItem: (item: T, index: number) => ReactNode
}): JSX.Element {
  return props.items.length === 0 ? <EmptyState text={props.empty} /> : <div className={css.list}>{props.items.map(props.renderItem)}</div>
}

function ResultList(props: { readonly results: readonly import('./api.ts').LabSearchResult[]; readonly empty: string }): JSX.Element {
  return props.results.length === 0 ? <EmptyState text={props.empty} /> : (
    <div className={css.list}>
      {props.results.map((result, index) => (
        <div key={String(result.citationId ?? index)} className={css.resultRow}>
          <span>{String(result.citationId ?? props.empty)}</span>
          <span>{String(result.excerpt ?? '')}</span>
          <StatusBadge value={result.score} />
        </div>
      ))}
    </div>
  )
}

function JsonPreview(props: { readonly value?: unknown; readonly empty: string }): JSX.Element {
  if (props.value === undefined) return <EmptyState text={props.empty} />
  return <pre className={css.json}>{JSON.stringify(props.value, null, 2)}</pre>
}

function EmptyState(props: { readonly text: string }): JSX.Element {
  return <div className={css.empty}>{props.text}</div>
}

/** Build the deterministic keyless plan submitted by the showcase button. */
function createLocalPlan(request: LabExperimentRequest, citationId: string): {
  readonly plan: Record<string, unknown>
  readonly skillDrafts: readonly Record<string, unknown>[]
} {
  const stepId = 'step-record-output'
  const revisionId = 'skill-local-demo-r1'
  return {
    plan: {
      planId: 'plan-' + request.experimentId + '-local',
      experimentId: request.experimentId,
      revision: 1,
      status: 'DRAFT',
      objective: request.objective,
      citations: [citationId],
      assumptions: [],
      unresolved: [],
      steps: [{ stepId, title: 'Record the observed bench output', operationKind: 'human', operationResource: 'manual-record', requiresApproval: true, requiredInputs: [], citations: [citationId], expectedOutputs: ['observed output recorded'], skillRevisionId: revisionId }],
    },
    skillDrafts: [{ skillId: 'skill-local-demo', revisionId, status: 'DRAFT', name: 'manual-record', purpose: 'Record a human-observed output for a controlled bench procedure', applicability: [request.objective], inputs: [], outputs: ['observed output recorded'], parameterConstraints: {}, completionConditions: ['the observer records the output'], failurePolicy: 'BLOCK', citations: [citationId], operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }] }],
  }
}

function buildRequest(state: LabWorkbenchState): LabExperimentRequest {
  const outputs = splitLines(state.expectedOutputsText)
  return {
    experimentId: state.experimentId.trim(),
    objective: state.objective.trim(),
    samples: state.sampleName.trim() === '' ? [] : [{ name: state.sampleName.trim(), attributes: {} }],
    constraints: splitLines(state.constraintsText).map(value => ({ name: 'user constraint', value, citations: [] })),
    expectedOutputs: outputs,
    unresolved: [],
  }
}

const PROJECT_PAGES: readonly LabPage[] = ['overview', 'conversations', 'knowledge', 'experiments', 'runs', 'evidence']

function isLabPage(value: unknown): value is LabPage {
  return typeof value === 'string' && [...PROJECT_PAGES, 'devices', 'projects'].includes(value as LabPage)
}

function parseSourceKeys(value: string): readonly { readonly documentId: string; readonly versionId: string }[] {
  return splitComma(value).flatMap((item) => {
    const separator = item.indexOf(':')
    if (separator < 1 || separator === item.length - 1) return []
    return [{ documentId: item.slice(0, separator), versionId: item.slice(separator + 1) }]
  })
}

function splitLines(value: string): readonly string[] {
  return value.split(/\r?\n/).map(item => item.trim()).filter(item => item !== '')
}

function splitComma(value: string): readonly string[] {
  return value.split(/[,\r\n]/).map(item => item.trim()).filter(item => item !== '')
}
