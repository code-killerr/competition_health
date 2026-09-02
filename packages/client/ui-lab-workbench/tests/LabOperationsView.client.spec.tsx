// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { LabOperationsView } from '../src/client/LabOperationsView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

type LabOperationsProps = Parameters<typeof LabOperationsView>[0]

function props(kind: 'monitor' | 'configuration'): { readonly value: LabOperationsProps; readonly ui: LabUiContext; readonly openAppView: ReturnType<typeof vi.fn> } {
  const ui = new LabUiContext()
  const openAppView = vi.fn()
  const value = {
    kind,
    ui,
    openAppView,
    listProjects: vi.fn().mockResolvedValue([{
      projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: '', status: 'ACTIVE', sessionCount: 1, experimentCount: 1,
      activeRunCount: 1, failedRunCount: 2, pendingApprovalCount: 1, currentStepId: 'step-2',
      runs: [{ experimentId: 'experiment-1', runId: 'run-1', status: 'WAITING_CONFIRMATION' as const, currentStepId: 'step-2', updatedAt: 2 }],
    }]),
    t: (key: string) => key,
  } as unknown as LabOperationsProps
  return { value, ui, openAppView }
}

describe('LabOperationsView', () => {
  afterEach(() => { cleanup() })

  it('aggregates real project activity and routes to the selected Project and Run', async () => {
    const setup = props('monitor')
    const view = render(<LabOperationsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    expect(view.getByText('activeRuns').nextElementSibling?.textContent).toBe('1')
    expect(view.getByText('failedRuns').nextElementSibling?.textContent).toBe('2')
    expect(view.getByText('pendingApproval').nextElementSibling?.textContent).toBe('1')
    fireEvent.click(view.getAllByRole('button', { name: /Calibration/ })[0]!)
    expect(setup.ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', projectPage: 'overview' })
    expect(setup.openAppView).toHaveBeenCalledWith('lab-project')
    fireEvent.click(view.getByRole('button', { name: /run-1/ }))
    expect(setup.ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', activeExperimentId: 'experiment-1', activeRunId: 'run-1', projectPage: 'execution' })
  })

  it('keeps an unavailable Host monitor distinct from an empty Project list', async () => {
    const setup = props('monitor')
    const value = { ...setup.value, listProjectsState: vi.fn().mockResolvedValue({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: 'Host down', retryable: true }) }
    const view = render(<LabOperationsView {...value} />)

    await waitFor(() => { expect(view.getByRole('status').textContent).toContain('Host down') })
    expect(view.queryByText('monitorNoProjects')).toBeNull()
  })

  it('renders a typed empty Host result as an empty state', async () => {
    const setup = props('monitor')
    const value = { ...setup.value, listProjectsState: vi.fn().mockResolvedValue({ state: 'empty', code: 'NO_RECORDS', message: '' }) }
    const view = render(<LabOperationsView {...value} />)

    await waitFor(() => { expect(view.getByRole('status').textContent).toContain('monitorNoProjects') })
    expect(view.queryByText('monitorHostUnavailable')).toBeNull()
  })

  it('keeps unregistered configuration capabilities explicitly unavailable', () => {
    const setup = props('configuration')
    const view = render(<LabOperationsView {...setup.value} />)

    expect(view.getByRole('button', { name: 'agentConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: 'workflowConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: 'peopleConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByText('configurationUnavailable')).toBeTruthy()
  })

  it('renders adapter-provided capability details without inventing actions', async () => {
    const setup = props('configuration')
    const value = { ...setup.value, listConfigurationCapabilities: vi.fn().mockResolvedValue({ state: 'ready', value: [
      { kind: 'agent', name: 'DeepSeek Agent', version: 'v2', status: 'read-only', allowedActions: [], recordCount: 2, detail: 'session-scoped' },
      { kind: 'workflow', name: 'Workflow registry', version: '2026.08', status: 'available', allowedActions: ['validate'], recordCount: 3 },
      { kind: 'devices', name: 'Device registry', version: 'mock-1', status: 'available', allowedActions: ['inspect'], recordCount: 1 },
    ] }) }
    const view = render(<LabOperationsView {...value} />)

    await waitFor(() => { expect(view.getByText(/DeepSeek Agent/)).toBeTruthy() })
    expect(view.getByText(/v2/)).toBeTruthy()
    expect(view.getByText(/Read-only|capabilityReadOnly/)).toBeTruthy()
    expect(view.getByText(/validate/)).toBeTruthy()
    expect(view.getByText(/capabilityRecords: 2/)).toBeTruthy()
  })

  it('does not turn unavailable Host summaries into zero counts', async () => {
    const setup = props('monitor')
    vi.mocked(setup.value.listProjects).mockResolvedValue([{
      projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: '', status: 'ACTIVE', sessionCount: 1, experimentCount: 1,
    }])
    const view = render(<LabOperationsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    expect(view.getByText('activeRuns').nextElementSibling?.textContent).toBe('notAvailable')
    expect(view.getByText('failedRuns').nextElementSibling?.textContent).toBe('notAvailable')
    expect(view.getByText('pendingApproval').nextElementSibling?.textContent).toBe('notAvailable')
  })
})
