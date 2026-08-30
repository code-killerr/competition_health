// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { LabProjectShellView } from '../src/client/LabProjectShellView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

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
  })
})
