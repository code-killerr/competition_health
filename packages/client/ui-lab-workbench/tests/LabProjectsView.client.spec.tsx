// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { LabProjectsView } from '../src/client/LabProjectsView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

type LabProjectsProps = Parameters<typeof LabProjectsView>[0]

function props(): {
  value: LabProjectsProps
  listProjects: ReturnType<typeof vi.fn>
  createProject: ReturnType<typeof vi.fn>
  ui: LabUiContext
} {
  const ui = new LabUiContext()
  const listProjects = vi.fn().mockResolvedValue([{
    projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: '', status: 'ACTIVE', sessionCount: 2, experimentCount: 1,
  }])
  const createProject = vi.fn().mockResolvedValue({
    projectId: 'project-2', workspaceId: 'workspace-1', name: 'New project', description: '', status: 'ACTIVE', sessionCount: 0, experimentCount: 0,
  })
  const value = {
    ui,
    listProjects,
    createProject,
    t: (key: string) => key,
    useWorkspaces: (selector: (state: { readonly items: readonly { readonly workspaceId: string; readonly title: string; readonly path: string }[] }) => unknown) => selector({ items: [{ workspaceId: 'workspace-1', title: 'Lab', path: '/lab' }] }),
    useSessions: () => undefined,
  } as unknown as LabProjectsProps
  return { value, listProjects, createProject, ui }
}

describe('LabProjectsView', () => {
  afterEach(() => { cleanup() })

  it('loads Host projects and creates a project from a real Workspace option', async () => {
    const setup = props()
    const view = render(<LabProjectsView {...setup.value} />)

    await waitFor(() => { expect(view.getByText('Calibration')).toBeTruthy() })
    fireEvent.change(view.getByLabelText('labProjectsName'), { target: { value: 'New project' } })
    fireEvent.click(view.getByRole('button', { name: 'labProjectsCreateAction' }))

    await waitFor(() => { expect(setup.createProject).toHaveBeenCalledWith('workspace-1', 'New project') })
    expect(setup.ui.snapshot().activeProjectId).toBe('project-2')
    expect(setup.listProjects).toHaveBeenCalledTimes(1)
  })

  it('keeps creation unavailable when Host exposes no Workspace', () => {
    const setup = props()
    setup.value.useWorkspaces = selector => selector({
      items: [],
      archivedSessionIds: [],
      state: 'idle',
      phase: 'ready',
      error: null,
      baselinesReady: true,
      recentWorkspaceId: undefined,
    })
    const view = render(<LabProjectsView {...setup.value} />)

    expect(view.getByRole('button', { name: 'labProjectsCreateAction' })).toHaveProperty('disabled', true)
  })
})
