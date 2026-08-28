// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabWorkbench, type LabWorkbenchProps } from '../src/client/LabWorkbench.tsx'
import type { LabProjectView, LabSnapshot } from '../src/client/api.ts'
import { zh, type LabWorkbenchKey } from '../src/client/locales.ts'
import { createLabWorkbenchStore, type LabStage } from '../src/client/store.ts'

afterEach(cleanup)

function renderWorkbench(stage: LabStage = 'knowledge', localPlanText = '', snapshot?: LabSnapshot, withSearch = false, requestedBy = '', projectView?: LabProjectView) {
  const handle = createLabWorkbenchStore()
  const instance = handle.create()
  instance.actions.setProjectId('project-1')
  instance.actions.setExperimentId('experiment-1')
  instance.actions.setStage(stage)
  instance.actions.setLocalPlanText(localPlanText)
  instance.actions.setObjective('Controlled bench procedure')
  if (snapshot !== undefined) instance.actions.setSnapshot(snapshot)
  if (withSearch) instance.actions.setSearch([{ citationId: 'citation-1', excerpt: 'retrieved evidence', score: 0.9 }], [])
  if (requestedBy !== '') instance.actions.setRequestedBy(requestedBy)
  if (projectView !== undefined) instance.actions.setProjectView(projectView)
  instance.actions.setReviewer('reviewer-1')
  instance.actions.setEvidenceText('receipt-1')
  const proposeLocalPlan = vi.fn(() => Promise.resolve())
  const translate = (key: LabWorkbenchKey): string => zh[key]
  const props = {
    useStore: (selector: (state: ReturnType<typeof instance.getSnapshot>) => unknown) => selector(instance.getSnapshot()),
    actions: instance.actions,
    t: translate,
    sessionId: 'session-1',
    refresh: vi.fn(() => Promise.resolve()),
    listProjects: vi.fn(() => Promise.resolve()),
    openProject: vi.fn(() => Promise.resolve()),
    createProject: vi.fn(() => Promise.resolve()),
    openSession: vi.fn(),
    createSession: vi.fn(() => Promise.resolve()),
    updateProjectScope: vi.fn(() => Promise.resolve()),
    associateSession: vi.fn(() => Promise.resolve()),
    renameSession: vi.fn(() => Promise.resolve()),
    createExperiment: vi.fn(() => Promise.resolve()),
    buildContext: vi.fn(() => Promise.resolve()),

    proposeLocalPlan,
    validatePlan: vi.fn(() => Promise.resolve()),
    approvePlan: vi.fn(() => Promise.resolve()),
    validateSkill: vi.fn(() => Promise.resolve()),
    approveSkill: vi.fn(() => Promise.resolve()),
    activateSkill: vi.fn(() => Promise.resolve()),
    startRun: vi.fn(() => Promise.resolve()),
    executeStep: vi.fn(() => Promise.resolve()),
    confirmStep: vi.fn(() => Promise.resolve()),
    stopRun: vi.fn(() => Promise.resolve()),
    report: vi.fn(() => Promise.resolve()),
  } as unknown as LabWorkbenchProps
  return {
    ...render(<LabWorkbench {...props} />),
    proposeLocalPlan,
    validatePlan: props.validatePlan,
    approvePlan: props.approvePlan,
    validateSkill: props.validateSkill,
    approveSkill: props.approveSkill,
    activateSkill: props.activateSkill,
    startRun: props.startRun,
    executeStep: props.executeStep,
    confirmStep: props.confirmStep,
    stopRun: props.stopRun,
    report: props.report,
    updateProjectScope: props.updateProjectScope,
    listProjects: props.listProjects,
    associateSession: props.associateSession,
    openSession: props.openSession,
    createSession: props.createSession,
  }
}

describe('实验工作台浏览器组件', () => {
  it('renders the knowledge empty state and stage navigation', () => {
    renderWorkbench()
    expect(screen.getByRole('heading', { name: zh.title })).toBeTruthy()
    expect(screen.getAllByText(zh.empty).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: `02${zh.conversations}` })).toBeTruthy()
    cleanup()
    renderWorkbench('request')
    expect(screen.getByText(zh.objective)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '调用当前 Agent 规划' })).toBeNull()
  })

  it('projects Knowledge capability availability without exposing Knowledge write controls', () => {
    const snapshot: LabSnapshot = {
      knowledge: [],
      knowledgeCapability: { state: 'unavailable', reason: 'provider loading' },
      devices: [],
      planReviews: [],
    }
    renderWorkbench('knowledge', '', snapshot)
    expect(screen.getByText('provider loading')).toBeTruthy()
    expect(screen.getByText('unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: zh.importSource })).toBeNull()
    expect(screen.queryByLabelText(zh.fileInput)).toBeNull()
  })
  it('renders plan revision identity, citations, assumptions and unresolved inputs', () => {
    const snapshot: LabSnapshot = {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: {
        planId: 'plan-1',
        revision: 3,
        status: 'PROPOSED',
        objective: 'Calibrate the sample',
        citations: ['citation-1'],
        assumptions: ['temperature is stable'],
        unresolved: ['operator confirmation'],
        steps: [],
      } }],
    }
    renderWorkbench('plan', '', snapshot)
    expect(screen.getByText('plan-1 · revision 3')).toBeTruthy()
    expect(screen.getByText(`${zh.citations}: citation-1`)).toBeTruthy()
    expect(screen.getByText(`${zh.assumptions}: temperature is stable`)).toBeTruthy()
    expect(screen.getByText(`${zh.unresolvedInputs}: operator confirmation`)).toBeTruthy()
  })
  it('generates a deterministic cited plan from a retrieved citation', () => {
    const view = renderWorkbench('plan', '', undefined, true)
    fireEvent.click(screen.getByRole('button', { name: zh.generatePlan }))
    expect(view.proposeLocalPlan).toHaveBeenCalledWith(expect.objectContaining({ objective: 'Controlled bench procedure' }), expect.stringContaining('citation-1'))
  })

  it('shows citation identity and keeps stop/report actions behind the rendered run state', () => {
    const snapshot: LabSnapshot = {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: { planId: 'plan-1', status: 'HUMAN_APPROVED', steps: [] } }],
      run: { runId: 'run-1', planId: 'plan-1', runStatus: 'WAITING_CONFIRMATION', currentStepId: 'step-1' },
    }
    renderWorkbench('knowledge', '', undefined, true)
    expect(screen.getByText('citation-1')).toBeTruthy()
    cleanup()
    const execution = renderWorkbench('execution', '', snapshot, false, 'reviewer')
    fireEvent.click(screen.getByRole('button', { name: zh.stopRun }))
    expect(execution.stopRun).toHaveBeenCalledWith('run-1', 'reviewer')
    cleanup()
    const report = renderWorkbench('report', '', snapshot)
    fireEvent.click(screen.getByRole('button', { name: zh.reportAction }))
    expect(report.report).toHaveBeenCalledWith('run-1')
  })

  it('renders project scope and multi-session controls through the injected actions', () => {
    const devices = renderWorkbench('devices')
    fireEvent.click(screen.getByRole('button', { name: zh.saveScope }))
    expect(devices.updateProjectScope).toHaveBeenCalledWith('project-1', [], [])

    cleanup()
    const projects = renderWorkbench('projects')
    fireEvent.click(screen.getByRole('button', { name: zh.listProjects }))
    expect(projects.listProjects).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: zh.createSession }))
    expect(projects.createSession).toHaveBeenCalledWith('project-1', undefined)
    fireEvent.click(screen.getByRole('button', { name: zh.associateSession }))
    expect(projects.associateSession).toHaveBeenCalledWith('project-1', 'session-1', undefined)
    cleanup()
    const selected = renderWorkbench('projects', '', undefined, false, '', {
      project: { projectId: 'project-1', name: 'Project', status: 'ACTIVE' },
      sources: [],
      devices: [],
      sessions: [{ sessionId: 'session-2', title: 'Follow-up', status: 'ACTIVE' }],
      sharedFacts: [],
      evidence: [],
    })
    fireEvent.click(screen.getByRole('button', { name: /Follow-up/ }))
    expect(selected.openSession).toHaveBeenCalledWith('session-2')
  })

  it('routes plan and Skill review actions through explicit controls', () => {
    const basePlan = {
      planId: 'plan-1',
      revision: 2,
      status: 'VALIDATED',
      objective: 'Calibrate the sample',
      citations: ['citation-1'],
      assumptions: [],
      unresolved: [],
      steps: [],
    }
    const draft = renderWorkbench('plan', '', {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: basePlan, skillRevisions: [{ revisionId: 'skill-1', status: 'DRAFT', name: 'dispense' }] }],
    })
    fireEvent.click(screen.getByRole('button', { name: zh.validate }))
    expect(draft.validatePlan).toHaveBeenCalledWith('plan-1')
    const reviewer = screen.getByText(zh.reviewer).parentElement?.querySelector('input')
    if (!(reviewer instanceof HTMLInputElement)) throw new Error('reviewer input is missing')
    fireEvent.change(reviewer, { target: { value: 'reviewer-1' } })
    fireEvent.click(screen.getByRole('button', { name: zh.approve }))
    expect(draft.approvePlan).toHaveBeenCalledWith('experiment-1', 'plan-1', 'reviewer-1')
    fireEvent.click(screen.getByRole('button', { name: zh.skillValidate }))
    expect(draft.validateSkill).toHaveBeenCalledWith('skill-1')

    cleanup()
    const validated = renderWorkbench('plan', '', {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: basePlan, skillRevisions: [{ revisionId: 'skill-1', status: 'VALIDATED', name: 'dispense' }] }],
    })
    const validatedReviewer = screen.getByText(zh.reviewer).parentElement?.querySelector('input')
    if (!(validatedReviewer instanceof HTMLInputElement)) throw new Error('reviewer input is missing')
    fireEvent.change(validatedReviewer, { target: { value: 'reviewer-1' } })
    fireEvent.click(screen.getByRole('button', { name: zh.skillApprove }))
    expect(validated.approveSkill).toHaveBeenCalledWith('skill-1', 'reviewer-1')

    cleanup()
    const approved = renderWorkbench('plan', '', {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: basePlan, skillRevisions: [{ revisionId: 'skill-1', status: 'HUMAN_APPROVED', name: 'dispense' }] }],
    })
    fireEvent.click(screen.getByRole('button', { name: zh.skillActivate }))
    expect(approved.activateSkill).toHaveBeenCalledWith('skill-1')
  })

  it('routes execution start, step, confirmation and stop through the rendered run', () => {
    const view = renderWorkbench('execution', '', {
      knowledge: [],
      devices: [],
      planReviews: [{ plan: { planId: 'plan-1', status: 'HUMAN_APPROVED', steps: [] } }],
      run: { runId: 'run-1', planId: 'plan-1', runStatus: 'WAITING_CONFIRMATION', currentStepId: 'step-1' },
    }, false, 'operator-1')
    fireEvent.click(screen.getByRole('button', { name: zh.startRun }))
    expect(view.startRun).toHaveBeenCalledWith('experiment-1', 'plan-1')
    fireEvent.click(screen.getByRole('button', { name: zh.nextStep }))
    expect(view.executeStep).toHaveBeenCalledWith('run-1')

    const evidence = screen.getByText(zh.evidence).parentElement?.querySelector('textarea')
    if (!(evidence instanceof HTMLTextAreaElement)) throw new Error('execution evidence input is missing')
    fireEvent.change(evidence, { target: { value: 'receipt-1' } })
    fireEvent.click(screen.getByRole('button', { name: zh.confirmStep }))
    expect(view.confirmStep).toHaveBeenCalledWith('run-1', 'receipt-1', 'reviewer-1', 'step-1')
    fireEvent.click(screen.getByRole('button', { name: zh.stopRun }))
    expect(view.stopRun).toHaveBeenCalledWith('run-1', 'operator-1')
  })
})
