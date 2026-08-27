/** 实验自动化工作台的纯展示组件；数据和副作用通过四个 props share 注入。 */

import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale, PropsStore, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useMemo, type ReactNode } from 'react'
import type { LabExperimentRequest, LabSopDraft } from './api.ts'
import type { LabStage, LabWorkbenchState } from './store.ts'
import { firstPlanId, planReviews, runView } from './store.ts'
import type { createLabWorkbenchStore } from './store.ts'
import css from './LabWorkbench.module.css'

/** 工作台注册层提供的异步操作。 */
export interface LabWorkbenchInjected {
  refresh: (experimentId: string) => Promise<void>
  importSource: (name: string, content: string, title: string) => Promise<void>
  importFile: (file: File) => Promise<void>
  search: (query: string, experimentId: string) => Promise<void>
  createSop: (title: string, citationId: string, instruction: string) => Promise<void>
  reviewSop: (draft: LabSopDraft) => Promise<void>
  publishSop: (draftId: string) => Promise<void>
  listProjects: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  createProject: (projectId: string, name: string) => Promise<void>
  updateProjectScope: (projectId: string, sources: readonly { readonly documentId: string; readonly versionId: string }[], deviceIds: readonly string[]) => Promise<void>
  associateSession: (projectId: string, sessionId: string, title?: string) => Promise<void>
  renameSession: (projectId: string, sessionId: string, title: string) => Promise<void>
  createExperiment: (request: LabExperimentRequest) => Promise<void>
  buildContext: (request: LabExperimentRequest) => Promise<void>
  agentPlan: (projectId: string, request: LabExperimentRequest, submit: (text: string) => void) => Promise<void>
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

/** 工作台的完整槽位 props。 */
export type LabWorkbenchProps =
  & ConvViewProps
  & PropsStore<ReturnType<typeof createLabWorkbenchStore>>
  & InjectFace<LabWorkbenchInjected>
  & PropsLocale<'labWorkbench'>

/** 渲染会话视图中的实验工作台。 */
export function LabWorkbench(props: LabWorkbenchProps): JSX.Element {
  const state = props.useStore(snapshot => snapshot)
  useEffect(() => {
    const applyHash = (): void => {
      const stage = stageFromHash(window.location.hash)
      if (stage !== undefined) props.actions.setStage(stage)
    }
    window.addEventListener('hashchange', applyHash)
    applyHash()
    return () => { window.removeEventListener('hashchange', applyHash) }
  }, [props.actions])
  const labels = useMemo<Record<LabStage, string>>(() => ({
    knowledge: props.t('knowledge'),
    request: props.t('request'),
    plan: props.t('plan'),
    execution: props.t('execution'),
    report: props.t('report'),
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
      <aside className={css.sidebar}>
        <div className={css.brand}>
          <span className={css.brandMark} aria-hidden="true">L</span>
          <div>
            <h1>{props.t('title')}</h1>
            <p>{props.t('subtitle')}</p>
          </div>
        </div>
        <nav className={css.nav} aria-label={props.t('stageHint')}>
          {(Object.keys(labels) as LabStage[]).map(stage => (
            <button
              key={stage}
              type="button"
              className={stage === state.stage ? css.navItemActive : css.navItem}
              onClick={() => { props.actions.setStage(stage) }}
            >
              <span className={css.navIndex}>{String((Object.keys(labels) as LabStage[]).indexOf(stage) + 1).padStart(2, '0')}</span>
              <span>{labels[stage]}</span>
            </button>
          ))}
        </nav>
        <div className={css.sidebarFooter}>
          <span className={css.statusDot} data-active={busy || undefined} />
          <span>{busy ? props.t('pending') : props.t('ready')}</span>
          <button type="button" className={css.sidebarRefresh} onClick={() => { void props.refresh(state.experimentId) }} disabled={busy}>
            {props.t('refresh')}
          </button>
        </div>
      </aside>

      <main className={css.content}>
        <header className={css.header}>
          <div>
            <span className={css.eyebrow}>{labels[state.stage]}</span>
            <h2>{state.experimentId || props.t('experimentId')}</h2>
          </div>
          <label className={css.compactField}>
            <span>{props.t('experimentId')}</span>
            <input value={state.experimentId} onChange={event => { props.actions.setExperimentId(event.currentTarget.value) }} />
          </label>
          <label className={css.compactField}>
            <span>{props.t('projectId')}</span>
            <input value={state.projectId} onChange={event => { props.actions.setProjectId(event.currentTarget.value) }} />
          </label>
        </header>

        {(state.error !== undefined || state.notice !== undefined) && (
          <div className={state.error !== undefined ? css.alert : css.notice} role="status">
            {state.error !== undefined ? `${props.t('errorPrefix')}：${state.error}` : state.notice}
          </div>
        )}

        {state.stage === 'knowledge' && <KnowledgeStage props={props} state={state} busy={busy} />}
        {state.stage === 'devices' && <DeviceStage props={props} state={state} busy={busy} />}
        {state.stage === 'projects' && <ProjectStage props={props} state={state} busy={busy} />}
        {state.stage === 'request' && <RequestStage props={props} state={state} request={request} busy={busy} />}
        {state.stage === 'plan' && <PlanStage props={props} state={state} reviews={reviews} {...activePlanId === undefined ? {} : { activePlanId }} busy={busy} />}
        {state.stage === 'execution' && <ExecutionStage props={props} state={state} {...run === undefined ? {} : { run }} {...runId === undefined ? {} : { runId }} {...planId === undefined ? {} : { planId }} busy={busy} />}
        {state.stage === 'report' && <ReportStage props={props} state={state} {...run === undefined ? {} : { run }} {...runId === undefined ? {} : { runId }} busy={busy} />}
      </main>
    </section>
  )
}

type StageProps = { readonly props: LabWorkbenchProps; readonly state: LabWorkbenchState; readonly busy: boolean }

function DeviceStage({ props, state, busy }: StageProps): JSX.Element {
  const sourceSelections = splitComma(state.selectedSourceKeysText).map(value => {
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
        <label className={css.field}>
          <span>{props.t('selectedSources')}</span>
          <textarea
            value={state.selectedSourceKeysText}
            onChange={event => { props.actions.setSelectedSourceKeysText(event.currentTarget.value) }}
            rows={3}
            placeholder="document-id:version-id"
          />
        </label>
        <label className={css.field}>
          <span>{props.t('selectedDevices')}</span>
          <input
            value={state.selectedDeviceIdsText}
            onChange={event => { props.actions.setSelectedDeviceIdsText(event.currentTarget.value) }}
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
          <input value={state.projectName} onChange={event => { props.actions.setProjectName(event.currentTarget.value) }} />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy} onClick={() => { void props.listProjects() }}>{props.t('listProjects')}</ActionButton>
          <ActionButton disabled={busy || projectId === ''} onClick={() => { void props.openProject(projectId) }}>{props.t('openProject')}</ActionButton>
          <ActionButton disabled={busy || projectId === '' || state.projectName.trim() === ''} onClick={() => { void props.createProject(projectId, state.projectName.trim()) }}>{props.t('createProject')}</ActionButton>
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
          <input value={state.sessionTitle} onChange={event => { props.actions.setSessionTitle(event.currentTarget.value) }} />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy || projectId === '' || sessionId.trim() === ''} onClick={() => { void props.associateSession(projectId, sessionId, sessionTitle === '' ? undefined : sessionTitle) }}>
            {props.t('associateSession')}
          </ActionButton>
          <ActionButton disabled={busy || projectId === '' || currentSession === undefined || sessionTitle === ''} onClick={() => { void props.renameSession(projectId, sessionId, sessionTitle) }}>
            {props.t('renameSession')}
          </ActionButton>
        </div>
        <StatusList items={state.projectView?.sessions ?? []} empty={props.t('empty')} renderItem={(session, index) => (
          <div key={String(session.sessionId ?? index)} className={css.listRow}>
            <span>{String(session.title ?? session.sessionId ?? props.t('sessionTitle'))}</span>
            <StatusBadge value={session.status} />
          </div>
        )} />
      </Panel>
    </div>
  )
}

function KnowledgeStage({ props, state, busy }: StageProps): JSX.Element {
  const firstCitation = state.searchResults.find(result => result.citationId !== undefined && result.excerpt !== undefined)
  const draft = state.sopDraft
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('importSource')} hint={props.t('sourceText')}>
        <label className={css.field}>
          <span>{props.t('sourceName')}</span>
          <input value={state.sourceName} onChange={event => { props.actions.setSourceName(event.currentTarget.value) }} placeholder="protocol.pdf / protocol.csv" />
        </label>
        <label className={css.field}>
          <span>{props.t('sourceText')}</span>
          <textarea value={state.sourceText} onChange={event => { props.actions.setSourceText(event.currentTarget.value) }} rows={9} />
        </label>
        <label className={css.field}>
          <span>{props.t('fileInput')}</span>
          <input type="file" accept=".pdf,.csv,.tsv,.txt,.md" onChange={event => {
            const file = event.currentTarget.files?.[0]
            if (file !== undefined) void props.importFile(file)
          }} />
        </label>
        <ActionButton disabled={busy || state.sourceName.trim() === '' || state.sourceText.trim() === ''} onClick={() => { void props.importSource(state.sourceName, state.sourceText, state.sourceName) }}>
          {props.t('importSource')}
        </ActionButton>
        <StatusList items={state.snapshot?.knowledge ?? []} empty={props.t('empty')} renderItem={(item, index) => (
          <div key={String(item.versionId ?? item.documentId ?? index)} className={css.listRow}>
            <span>{String(item.sourceName ?? item.documentId ?? props.t('sourceName'))}</span>
            <StatusBadge value={item.status} />
          </div>
        )} />
      </Panel>
      <Panel title={props.t('search')} hint={props.t('citations')}>
        <label className={css.field}>
          <span>{props.t('query')}</span>
          <input value={state.query} onChange={event => { props.actions.setQuery(event.currentTarget.value) }} />
        </label>
        <ActionButton disabled={busy || state.query.trim() === ''} onClick={() => { void props.search(state.query, state.experimentId) }}>
          {props.t('search')}
        </ActionButton>
        <ResultList results={state.searchResults} empty={props.t('empty')} />
        <div className={css.subheading}>{props.t('conflicts')}</div>
        <StatusList items={state.conflicts} empty={props.t('empty')} renderItem={(item, index) => (
          <div key={String(item.conflictId ?? index)} className={css.listRow}>
            <span>{String(item.conflictId ?? props.t('conflicts'))}</span>
            <StatusBadge value={item.status} />
          </div>
        )} />
      </Panel>
      <Panel title={props.t('sop')} hint={props.t('sopHint')}>
        <label className={css.field}>
          <span>{props.t('sopTitle')}</span>
          <input value={state.sopTitle} onChange={event => { props.actions.setSopTitle(event.currentTarget.value) }} />
        </label>
        <ActionButton
          disabled={busy || state.sopTitle.trim() === '' || firstCitation === undefined}
          onClick={() => {
            if (firstCitation !== undefined) void props.createSop(state.sopTitle, firstCitation.citationId!, firstCitation.excerpt!)
          }}
        >
          {props.t('createSop')}
        </ActionButton>
        {draft === undefined ? <EmptyState text={props.t('empty')} /> : (
          <>
            <div className={css.subheading}>{String(draft.status ?? '—')} · {String(draft.title ?? '—')}</div>
            {draft.blockers === undefined || draft.blockers.length === 0
              ? <EmptyState text={props.t('empty')} />
              : <div className={css.list}>{draft.blockers.map(blocker => <div key={blocker} className={css.listRow}><span>{blocker}</span></div>)}</div>}
            <div className={css.buttonRow}>
              <ActionButton disabled={busy || draft.draftId === undefined || draft.status === 'PUBLISHED'} onClick={() => { void props.reviewSop(draft) }}>
                {props.t('reviewSop')}
              </ActionButton>
              <ActionButton emphasis="amber" disabled={busy || draft.draftId === undefined || draft.status !== 'REVIEWED'} onClick={() => {
                if (draft.draftId !== undefined) void props.publishSop(draft.draftId)
              }}>
                {props.t('publishSop')}
              </ActionButton>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function RequestStage({ props, state, request, busy }: StageProps & { readonly request: LabExperimentRequest }): JSX.Element {
  return (
    <div className={css.stageGrid}>
      <Panel title={props.t('request')} hint={props.t('stageHint')}>
        <label className={css.field}>
          <span>{props.t('objective')}</span>
          <textarea value={state.objective} onChange={event => { props.actions.setObjective(event.currentTarget.value) }} rows={5} />
        </label>
        <label className={css.field}>
          <span>{props.t('sample')}</span>
          <input value={state.sampleName} onChange={event => { props.actions.setSampleName(event.currentTarget.value) }} />
        </label>
        <label className={css.field}>
          <span>{props.t('expectedOutputs')}</span>
          <textarea value={state.expectedOutputsText} onChange={event => { props.actions.setExpectedOutputsText(event.currentTarget.value) }} rows={4} />
        </label>
        <label className={css.field}>
          <span>{props.t('constraints')}</span>
          <textarea value={state.constraintsText} onChange={event => { props.actions.setConstraintsText(event.currentTarget.value) }} rows={3} />
        </label>
        <div className={css.buttonRow}>
          <ActionButton disabled={busy || request.objective === ''} onClick={() => { void props.createExperiment(request) }}>{props.t('createExperiment')}</ActionButton>
          <ActionButton disabled={busy || request.objective === ''} onClick={() => { void props.buildContext(request) }}>{props.t('buildContext')}</ActionButton>
          <ActionButton emphasis="amber" disabled={busy || request.objective === ''} onClick={() => { void props.agentPlan(state.projectId, request, text => { props.inputActions.setDraft(text); props.inputActions.submit() }) }}>{props.t('agentPlan')}</ActionButton>
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
      <Panel title={props.t('localDemo')} hint={props.t('jsonHint')}>
        <label className={css.field}>
          <span>{props.t('localPlanJson')}</span>
          <textarea value={state.localPlanText} onChange={event => { props.actions.setLocalPlanText(event.currentTarget.value) }} rows={8} />
        </label>
        <ActionButton disabled={busy || state.localPlanText.trim() === '' || state.objective.trim() === ''} onClick={() => { void props.proposeLocalPlan(buildRequest(state), state.localPlanText) }}>
          {props.t('submitLocalPlan')}
        </ActionButton>
      </Panel>
      <Panel title={props.t('plan')} hint={props.t('noPlan')}>
        {reviews.length === 0 && <EmptyState text={props.t('noPlan')} />}
        {reviews.map(review => {
          const planId = review.plan.planId ?? 'unknown-plan'
          return (
            <button key={planId} type="button" className={planId === activePlanId ? css.planCardActive : css.planCard} onClick={() => { props.actions.setActivePlan(planId) }}>
              <span className={css.cardTitle}>{String(review.plan.objective ?? planId)}</span>
              <span className={css.cardMeta}>{planId} · revision {String(review.plan.revision ?? '?')}</span>
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
          <input value={state.reviewer} onChange={event => { props.actions.setReviewer(event.currentTarget.value) }} />
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
          <textarea value={state.evidenceText} onChange={event => { props.actions.setEvidenceText(event.currentTarget.value) }} rows={5} />
        </label>
        <label className={css.field}>
          <span>{props.t('requestedBy')}</span>
          <input value={state.requestedBy} onChange={event => { props.actions.setRequestedBy(event.currentTarget.value) }} />
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
  return <section className={css.panel}><div className={css.panelHeader}><h3>{props.title}</h3><span>{props.hint}</span></div>{props.children}</section>
}

function ActionButton(props: { readonly children: ReactNode; readonly onClick: () => void; readonly disabled?: boolean; readonly emphasis?: 'amber' }): JSX.Element {
  return <button type="button" className={props.emphasis === 'amber' ? css.actionAmber : css.action} disabled={props.disabled} onClick={props.onClick}>{props.children}</button>
}

function StatusBadge(props: { readonly value?: unknown }): JSX.Element {
  return <span className={css.badge}>{String(props.value ?? '—')}</span>
}

function StatusList<T extends object>(props: { readonly items: readonly T[]; readonly empty: string; readonly renderItem: (item: T, index: number) => ReactNode }): JSX.Element {
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
  return props.value === undefined ? <EmptyState text={props.empty} /> : <pre className={css.json}>{JSON.stringify(props.value, null, 2)}</pre>
}

function EmptyState(props: { readonly text: string }): JSX.Element {
  return <div className={css.empty}>{props.text}</div>
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

const LAB_STAGES: readonly LabStage[] = ['knowledge', 'request', 'plan', 'execution', 'report', 'devices', 'projects']

function stageFromHash(hash: string): LabStage | undefined {
  if (!hash.startsWith('#lab-')) return undefined
  const value = hash.slice('#lab-'.length)
  return LAB_STAGES.includes(value as LabStage) ? value as LabStage : undefined
}

function splitLines(value: string): readonly string[] {
  return value.split(/\r?\n/).map(item => item.trim()).filter(item => item !== '')
}

function splitComma(value: string): readonly string[] {
  return value.split(/[,\r\n]/).map(item => item.trim()).filter(item => item !== '')
}
