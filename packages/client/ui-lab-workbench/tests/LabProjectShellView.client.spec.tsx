// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import { LabProjectShellView } from '../src/client/LabProjectShellView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'
import type { LabProjectFileRecord } from '../src/client/api.ts'

describe('LabProjectShellView', () => {
  afterEach(() => { cleanup() })

  it('loads the selected Project records and switches its inspection pages', async () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    const props = {
      ui,
      t: (key: string) => key,
      loadProject: async () => ({ state: 'ready', value: {
        project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: 'Demo', status: 'ACTIVE' },
        sources: [],
        devices: [],
        sessions: [{ projectId: 'project-1', sessionId: 'session-1', title: 'Conversation', status: 'ACTIVE' }],
        sharedFacts: [],
        evidence: [],
        experiments: [{ experimentId: 'experiment-1', projectId: 'project-1', title: 'Experiment', objective: 'Test', status: 'ACTIVE', createdInSessionId: 'session-1', createdAt: 1, updatedAt: 1 }],
        experimentSessions: [],
      }}),
      listRuns: async () => ({ state: 'ready', value: [{ runId: 'run-1', planId: 'plan-1', runStatus: 'COMPLETED' }] }),
      loadRunReport: async () => ({ state: 'ready', value: { runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'COMPLETED', observations: [], artifacts: [], feedback: { status: 'COMPLETED', valid: true, summary: 'Done', issues: [], replanRequested: false }, assessment: { status: 'PASSED', verdict: 'PASS', evidenceIds: [], humanQcRequired: false } } }),
      listArtifacts: async () => ({ state: 'ready', value: [{ artifactId: 'artifact-1', runId: 'run-1', kind: 'json', displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 1, digest: 'sha256:test', createdAt: 1 }] }),
      openArtifact: async () => ({ artifactId: 'artifact-1', runId: 'run-1', kind: 'json', displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 1, digest: 'sha256:test', createdAt: 1 }),
      loadExperimentReviews: async () => ({ state: 'ready', value: [{ plan: { planId: 'plan-1', experimentId: 'experiment-1', revision: 1, status: 'LOCKED', objective: 'Test', steps: [], unresolved: [] }, skillRevisions: [{ skillId: 'skill-1', revisionId: 'skill-rev-1', name: 'Calibration skill', status: 'ACTIVE', purpose: 'Calibrate the device', revision: 1 }] }] }),
      compareRuns: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No comparison' }),
      retryRun: async () => ({ runId: 'run-1' }),
      openSession: () => {},
    } as unknown as Parameters<typeof LabProjectShellView>[0]

    const view = render(<LabProjectShellView {...props} />)
    await waitFor(() => { expect(view.getByRole('heading', { name: 'Calibration' })).toBeTruthy() })
    expect(view.getByText('currentPath')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'planning' }))
    expect(ui.snapshot().projectPage).toBe('planning')
    await waitFor(() => { expect(view.getByRole('heading', { name: 'Experiment' })).toBeTruthy() })
    expect(view.getAllByText('Test')).toHaveLength(2)
    fireEvent.click(view.getByRole('button', { name: 'execution' }))
    await waitFor(() => { expect(view.getByRole('heading', { name: 'run-1' })).toBeTruthy() })
    expect(view.getByRole('heading', { name: 'runOverview' })).toBeTruthy()
    expect(view.getByRole('heading', { name: 'runExecutionGraph' })).toBeTruthy()
    expect(view.getByRole('heading', { name: 'runTimeline' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'evidencePage' }))
    expect(ui.snapshot().projectPage).toBe('evidence')
    fireEvent.click(view.getByRole('button', { name: 'projectFiles' }))
    expect(ui.snapshot().projectPage).toBe('files')
    expect(view.container.querySelector('[data-lab-project-files]')).toBeTruthy()
    expect(view.getByText('projectFilesRunArtifacts')).toBeTruthy()
  })

  it('renders authorized Project file groups and reloads the same catalog after a revision event', async () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    const files: readonly LabProjectFileRecord[] = [
      { projectFileId: 'config-1', projectId: 'project-1', group: 'configuration' as const, displayName: 'workflow.plan.json', relativePath: 'configuration/workflow.plan.json', mediaType: 'application/json', size: 10, digest: 'sha256:config', revision: 1, createdAt: 1 },
      { projectFileId: 'conversation-1', projectId: 'project-1', group: 'conversation-output' as const, displayName: 'summary.md', relativePath: 'conversation-output/summary.md', mediaType: 'text/markdown', size: 20, digest: 'sha256:conversation', revision: 1, createdAt: 1 },
      { projectFileId: 'artifact-1', projectId: 'project-1', group: 'run-artifacts' as const, displayName: 'result.json', relativePath: 'run-artifacts/result.json', mediaType: 'application/json', size: 30, digest: 'sha256:artifact', revision: 1, createdAt: 1, runId: 'run-1', artifactId: 'artifact-1' },
    ]
    const configFile = files[0]
    if (configFile === undefined) throw new Error('fixture config file is missing')
    let currentFiles = files
    const listeners = new Set<(event: { readonly projectId: string }) => void>()
    const listProjectFiles = vi.fn(async () => ({ state: 'ready' as const, value: currentFiles }))
    const openProjectFile = vi.fn(async () => ({ state: 'ready' as const, value: { kind: 'json' as const, content: { planId: 'plan-1' } } }))
    const downloadProjectFile = vi.fn(async () => ({ state: 'ready' as const, value: { projectFileId: 'config-1', displayName: 'workflow.plan.json', mediaType: 'application/json', downloadToken: 'fixture-token' } }))
    const props = {
      ui,
      t: (key: string) => key,
      loadProject: async () => ({ state: 'ready' as const, value: { project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Calibration', description: 'Demo', status: 'ACTIVE' as const }, sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [], experiments: [], experimentSessions: [] } }),
      listRuns: async () => ({ state: 'empty' as const, code: 'NO_RECORDS' as const, message: '' }),
      loadRunReport: async () => ({ state: 'empty' as const, code: 'NO_RECORDS' as const, message: '' }),
      listArtifacts: async () => ({ state: 'empty' as const, code: 'NO_RECORDS' as const, message: '' }),
      openArtifact: async () => ({ artifactId: 'artifact-1', runId: 'run-1', kind: 'json' as const, displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 1, digest: 'sha256:test', createdAt: 1 }),
      loadExperimentReviews: async () => ({ state: 'empty' as const, code: 'NO_RECORDS' as const, message: '' }),
      compareRuns: async () => ({ state: 'empty' as const, code: 'NO_RECORDS' as const, message: '' }),
      retryRun: async () => ({ runId: 'run-1' }),
      openSession: () => {},
      listProjectFiles,
      openProjectFile,
      downloadProjectFile,
      subscribeProjectFileEvents: (listener: (event: { readonly projectId: string }) => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    } as unknown as Parameters<typeof LabProjectShellView>[0]

    const view = render(<LabProjectShellView {...props} />)
    await waitFor(() => { expect(view.getByRole('heading', { name: 'Calibration' })).toBeTruthy() })
    fireEvent.click(view.getByRole('button', { name: 'projectFiles' }))
    await waitFor(() => { expect(view.getByText('workflow.plan.json')).toBeTruthy() })
    expect(view.container.querySelectorAll('[data-lab-project-file-group]')).toHaveLength(3)
    const config = view.container.querySelector('[data-lab-project-file-id="config-1"]') as HTMLElement | null
    expect(config).toBeTruthy()
    if (config === null) return
    fireEvent.click(within(config).getByRole('button', { name: 'projectFilePreview' }))
    await waitFor(() => { expect(openProjectFile).toHaveBeenCalledWith('project-1', 'config-1') })
    expect(view.getByText(/plan-1/)).toBeTruthy()
    fireEvent.click(within(config).getByRole('button', { name: 'projectFileDownload' }))
    await waitFor(() => { expect(downloadProjectFile).toHaveBeenCalledWith('project-1', 'config-1') })
    expect(within(config).getByRole('button', { name: 'projectFileDownloadReady' })).toBeTruthy()

    currentFiles = [...files, { ...configFile, projectFileId: 'config-2', displayName: 'workflow.lock.json', relativePath: 'configuration/workflow.lock.json' }]
    act(() => { for (const listener of listeners) listener({ projectId: 'project-1' }) })
    await waitFor(() => { expect(view.getByText('workflow.lock.json')).toBeTruthy() })
    expect(view.queryByText(/plan-1/)).toBeNull()
    expect(listProjectFiles).toHaveBeenCalledTimes(2)
  })
})
