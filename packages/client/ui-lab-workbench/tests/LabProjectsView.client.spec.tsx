// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { LabProjectsView } from '../src/client/LabProjectsView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

type LabProjectsProps = Parameters<typeof LabProjectsView>[0]

function props(workspaceItems = [{ workspaceId: 'workspace-1', title: 'Lab', path: '/lab' }]): {
  value: LabProjectsProps
  listProjects: ReturnType<typeof vi.fn>
  createProject: ReturnType<typeof vi.fn>
  openProjectView: ReturnType<typeof vi.fn>
  ui: LabUiContext
} {
  const ui = new LabUiContext()
  const listProjects = vi.fn().mockResolvedValue([{
    projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: '', status: 'ACTIVE', sessionCount: 2, experimentCount: 1,
  }])
  const createProject = vi.fn().mockResolvedValue({
    projectId: 'project-2', workspaceId: 'workspace-1', name: 'New project', description: '', status: 'ACTIVE', sessionCount: 0, experimentCount: 0,
  })
  const openProjectView = vi.fn()
  const value = {
    ui,
    listProjects,
    createProject,
    openProjectView,
    t: (key: string) => key,
    useWorkspaces: (selector: (state: { readonly items: readonly { readonly workspaceId: string; readonly title: string; readonly path: string }[] }) => unknown) => selector({ items: workspaceItems }),
    useSessions: () => undefined,
  } as unknown as LabProjectsProps
  return { value, listProjects, createProject, openProjectView, ui }
}

describe('LabProjectsView', () => {
  afterEach(() => { cleanup() })

  it('loads Host projects and creates a project from a real Workspace option', async () => {
    const setup = props()
    const view = render(<LabProjectsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    fireEvent.click(view.getByRole('button', { name: 'labProjectsCreateAction' }))

    await waitFor(() => { expect(setup.createProject).toHaveBeenCalledWith('workspace-1') })
    expect(setup.ui.snapshot().activeProjectId).toBe('project-2')
    expect(setup.listProjects).toHaveBeenCalledTimes(1)
    expect(setup.openProjectView).toHaveBeenCalledTimes(1)
  })

  it('does not select or open the first Project while loading the list', async () => {
    const setup = props()
    render(<LabProjectsView {...setup.value} />)

    await waitFor(() => { expect(setup.listProjects).toHaveBeenCalledTimes(1) })
    expect(setup.ui.snapshot().activeProjectId).toBeUndefined()
    expect(setup.openProjectView).not.toHaveBeenCalled()
  })

  it('opens the Host Project already mapped to the selected Workspace', async () => {
    const setup = props([
      { workspaceId: 'workspace-1', title: 'Lab', path: '/lab' },
      { workspaceId: 'workspace-2', title: 'Other lab', path: '/other-lab' },
    ])
    const view = render(<LabProjectsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'workspace-1' } })

    expect(setup.ui.snapshot()).toMatchObject({ activeWorkspaceId: 'workspace-1', activeProjectId: 'project-1' })
    expect(setup.openProjectView).toHaveBeenCalledTimes(1)
    expect(setup.createProject).not.toHaveBeenCalled()
  })

  it('clears the active Project when the selected Workspace has no Host mapping', async () => {
    const setup = props([
      { workspaceId: 'workspace-1', title: 'Lab', path: '/lab' },
      { workspaceId: 'workspace-2', title: 'Other lab', path: '/other-lab' },
    ])
    setup.ui.selectProject('project-1')
    const view = render(<LabProjectsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'workspace-2' } })

    expect(setup.ui.snapshot()).toEqual({ activeWorkspaceId: 'workspace-2', projectPage: 'overview' })
    expect(setup.openProjectView).not.toHaveBeenCalled()
  })

  it('keeps creation unavailable when Host exposes no Workspace', () => {
    const setup = props([])
    const view = render(<LabProjectsView {...setup.value} />)

    expect(view.getByRole('button', { name: 'labProjectsCreateAction' })).toHaveProperty('disabled', true)
  })
})
