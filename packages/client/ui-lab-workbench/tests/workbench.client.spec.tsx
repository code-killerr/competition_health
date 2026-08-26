// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabWorkbench, type LabWorkbenchProps } from '../src/client/LabWorkbench.tsx'
import type { LabSnapshot } from '../src/client/api.ts'
import { zh, type LabWorkbenchKey } from '../src/client/locales.ts'
import { createLabWorkbenchStore } from '../src/client/store.ts'

afterEach(cleanup)

function renderWorkbench(stage: 'knowledge' | 'request' | 'plan' | 'execution' | 'report' = 'knowledge', localPlanText = '', snapshot?: LabSnapshot, withSearch = false, requestedBy = '') {
  const handle = createLabWorkbenchStore()
  const instance = handle.create()
  instance.actions.setStage(stage)
  instance.actions.setLocalPlanText(localPlanText)
  instance.actions.setObjective('Controlled bench procedure')
  if (snapshot !== undefined) instance.actions.setSnapshot(snapshot)
  if (withSearch) instance.actions.setSearch([{ citationId: 'citation-1', excerpt: 'retrieved evidence', score: 0.9 }], [])
  if (requestedBy !== '') instance.actions.setRequestedBy(requestedBy)
  const proposeLocalPlan = vi.fn(() => Promise.resolve())
  const translate = (key: LabWorkbenchKey): string => zh[key]
  const props = {
    useStore: (selector: (state: ReturnType<typeof instance.getSnapshot>) => unknown) => selector(instance.getSnapshot()),
    actions: instance.actions,
    t: translate,
    refresh: vi.fn(() => Promise.resolve()),
    importSource: vi.fn(() => Promise.resolve()),
    search: vi.fn(() => Promise.resolve()),
    createExperiment: vi.fn(() => Promise.resolve()),
    buildContext: vi.fn(() => Promise.resolve()),
    agentPlan: vi.fn(() => Promise.resolve()),
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
  return { ...render(<LabWorkbench {...props} />), proposeLocalPlan, stopRun: props.stopRun, report: props.report }
}

describe('实验工作台浏览器组件', () => {
  it('renders the knowledge empty state and stage navigation', () => {
    renderWorkbench()
    expect(screen.getByRole('heading', { name: zh.title })).toBeTruthy()
    expect(screen.getAllByText(zh.empty).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: `02${zh.request}` })).toBeTruthy()
    cleanup()
    renderWorkbench('request')
    expect(screen.getByText(zh.objective)).toBeTruthy()
  })

  it('submits an explicit local plan document without generating content in the component', () => {
    const content = JSON.stringify({ plan: {}, skillDrafts: [] })
    const view = renderWorkbench('plan', content)
    fireEvent.click(screen.getByRole('button', { name: zh.submitLocalPlan }))
    expect(view.proposeLocalPlan).toHaveBeenCalledWith(expect.objectContaining({ objective: 'Controlled bench procedure' }), content)
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
})
