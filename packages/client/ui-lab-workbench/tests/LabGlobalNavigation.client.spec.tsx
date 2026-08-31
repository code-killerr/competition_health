// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { LabGlobalNavigation } from '../src/client/LabGlobalNavigation.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

type NavigationProps = Parameters<typeof LabGlobalNavigation>[0]

describe('LabGlobalNavigation', () => {
  afterEach(() => { cleanup() })

  it('opens grouped applications without a Session', () => {
    const openAppView = vi.fn()
    const expandSidebar = vi.fn()
    const ui = new LabUiContext()
    const props = {
      wide: true,
      expandSidebar,
      openAppView,
      ui,
      listProjects: async () => [],
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps
    const view = render(<LabGlobalNavigation {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'projects' }))
    fireEvent.click(view.getByRole('button', { name: 'knowledge' }))
    fireEvent.click(view.getByRole('button', { name: 'devices' }))

    expect(openAppView.mock.calls).toEqual([['lab-projects'], ['lab-knowledge'], ['lab-devices']])
    expect(expandSidebar).toHaveBeenCalledTimes(3)
  })

  it('renders a status-backed Project tree without duplicating workspace destinations', async () => {
    const openAppView = vi.fn()
    const ui = new LabUiContext()
    const project = {
      projectId: 'project-1',
      workspaceId: 'workspace-1',
      name: 'Calibration',
      description: 'Device calibration',
      status: 'ACTIVE' as const,
      sessionCount: 1,
      experimentCount: 2,
      activeRunCount: 1,
      failedRunCount: 1,
      pendingApprovalCount: 1,
      currentStepId: 'step-2',
    }
    const props = {
      wide: true,
      expandSidebar: vi.fn(),
      openAppView,
      ui,
      listProjects: async () => [project],
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps
    const view = render(<LabGlobalNavigation {...props} />)

    await waitFor(() => { expect(view.getByRole('button', { name: 'Calibration' })).toBeTruthy() })
    expect(view.getByText('lifecycleStatusActive')).toBeTruthy()
    expect(view.getByLabelText('pendingApproval')).toBeTruthy()
    expect(view.container.textContent).toContain('runCurrentStep')
    expect(view.queryByRole('button', { name: 'Calibration overview' })).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Calibration' }))
    expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-1' })
    expect(openAppView).toHaveBeenCalledWith('lab-project')
  })

  it('keeps Project loading and unavailable states visible', async () => {
    let rejectProjects: ((reason: unknown) => void) | undefined
    const view = render(<LabGlobalNavigation {...({
      wide: true,
      expandSidebar: vi.fn(),
      openAppView: vi.fn(),
      ui: new LabUiContext(),
      listProjects: () => new Promise<readonly never[]>((_resolve, reject) => { rejectProjects = reject }),
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps)} />)

    expect(view.getByText('projectsLoading')).toBeTruthy()
    rejectProjects?.(new Error('host unavailable'))
    await waitFor(() => { expect(view.getByText('projectsUnavailable')).toBeTruthy() })
  })

  it('restores the first valid Project Overview when the current Project disappears', async () => {
    const ui = new LabUiContext()
    ui.selectProject('deleted-project')
    const openAppView = vi.fn()
    const view = render(<LabGlobalNavigation {...({
      wide: true,
      expandSidebar: vi.fn(),
      openAppView,
      ui,
      listProjects: async () => [{ projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: '', status: 'ACTIVE', sessionCount: 0, experimentCount: 0 }],
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps)} />)

    await waitFor(() => { expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', projectPage: 'overview' }) })
    expect(view.getByRole('button', { name: 'Calibration' })).toBeTruthy()
    expect(openAppView).not.toHaveBeenCalled()
  })
})
