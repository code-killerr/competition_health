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
    }]),
    t: (key: string) => key,
  } as unknown as LabOperationsProps
  return { value, ui, openAppView }
}

describe('LabOperationsView', () => {
  afterEach(() => { cleanup() })

  it('aggregates real project activity and routes to the selected Project Overview', async () => {
    const setup = props('monitor')
    const view = render(<LabOperationsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    expect(view.getByText('activeRuns').nextElementSibling?.textContent).toBe('1')
    expect(view.getByText('failedRuns').nextElementSibling?.textContent).toBe('2')
    expect(view.getByText('pendingApproval').nextElementSibling?.textContent).toBe('1')
    fireEvent.click(view.getByRole('button', { name: /Calibration/ }))
    expect(setup.ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', projectPage: 'overview' })
    expect(setup.openAppView).toHaveBeenCalledWith('lab-project')
  })

  it('keeps unregistered configuration capabilities explicitly unavailable', () => {
    const setup = props('configuration')
    const view = render(<LabOperationsView {...setup.value} />)

    expect(view.getByRole('button', { name: 'agentConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: 'workflowConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: 'peopleConfiguration' })).toHaveProperty('disabled', true)
    expect(view.getByText('configurationUnavailable')).toBeTruthy()
  })
})
