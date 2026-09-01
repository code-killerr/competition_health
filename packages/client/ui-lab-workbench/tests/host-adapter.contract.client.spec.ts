import { describe, expect, it, vi } from 'vitest'
import type { LabCommand, LabCommandResult, LabProjectCommand, LabProjectCommandResult, LabProjectContextView, LabProjectView, LabReportView, LabRun } from '../src/client/api.ts'
import { createLabHostAdapter } from '../src/client/host-adapter.ts'

const project: LabProjectView = {
  project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Project', status: 'ACTIVE' },
  sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [], experiments: [], experimentSessions: [],
}
const projectContext: LabProjectContextView = {
  project: { projectId: 'project-1', sessionId: 'session-1', sources: [], devices: [], sharedFacts: [] },
  knowledgeCapability: { state: 'available' },
}
const device = { id: 'device-1', name: 'Device', status: 'ready', capabilities: [] }
const run: LabRun = { runId: 'run-1', planId: 'plan-1', runStatus: 'FAILED', observations: [], artifacts: [] }
const report: LabReportView = {
  runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'FAILED', observations: [], artifacts: [],
  feedback: { status: 'FAILED', valid: false, summary: 'failed', issues: ['issue'], replanRequested: false },
}

describe('Host-backed LabWorkbenchAdapter', () => {
  it('maps project, run and report queries and keeps missing assessment unavailable', async () => {
    const sendProjectCommand = vi.fn(async (command: LabProjectCommand): Promise<LabProjectCommandResult> => {
      if (command.command === 'project-list') return { kind: 'project-list', value: [project] }
      if (command.command === 'project-open') return { kind: 'project', value: project }
      if (command.command === 'project-context') return { kind: 'project-context', value: projectContext }
      if (command.command === 'project-scope-update') return { kind: 'project', value: project }
      if (command.command === 'experiment-reviews') return { kind: 'experiment-reviews', value: [] }
      if (command.command === 'run-list') return { kind: 'run-list', value: [run] }
      if (command.command === 'run-report') return { kind: 'run-report', value: report }
      if (command.command === 'configuration-capabilities') return { kind: 'configuration-capabilities', value: [{ kind: 'workflow', name: 'Workflow registry', status: 'available', allowedActions: ['validate'], recordCount: 0 }] }
      throw new Error(`unexpected project command ${command.command}`)
    })
    const adapter = createLabHostAdapter({ sendProjectCommand })

    await expect(adapter.listProjects()).resolves.toEqual({ state: 'ready', value: [project.project] })
    await expect(adapter.openProject('project-1')).resolves.toEqual({ state: 'ready', value: project })
    await expect(adapter.getProjectContext('project-1')).resolves.toEqual({ state: 'ready', value: projectContext })
    await expect(adapter.getKnowledgeScope('project-1')).resolves.toEqual({ state: 'ready', value: { capability: { state: 'available' }, sources: [], evidence: [] } })
    await expect(adapter.updateProjectScope({ projectId: 'project-1', sources: [{ documentId: 'doc-1', versionId: 'version-1' }], deviceIds: ['device-1'] })).resolves.toEqual(project)
    await expect(adapter.listExperimentReviews('experiment-1')).resolves.toEqual({ state: 'ready', value: [] })
    await expect(adapter.listRuns('experiment-1')).resolves.toEqual({ state: 'ready', value: [run] })
    await expect(adapter.getResultAssessment('run-1')).resolves.toEqual({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: '该 Run 尚无 Host 结果判定', retryable: false })
    await expect(adapter.listConfigurationCapabilities!()).resolves.toEqual({ state: 'ready', value: [{ kind: 'workflow', name: 'Workflow registry', status: 'available', allowedActions: ['validate'], recordCount: 0 }] })
  })

  it('routes the general device query through the adapter', async () => {
    const sendCommand = vi.fn(async (command: LabCommand): Promise<LabCommandResult> => {
      if (command.command === 'device-list') return { kind: 'device-list', value: [device] }
      throw new Error(`unexpected agent command ${command.command}`)
    })
    const adapter = createLabHostAdapter({ sendCommand })

    await expect(adapter.listDevices()).resolves.toEqual({ state: 'ready', value: [device] })
    expect(sendCommand).toHaveBeenCalledWith({ command: 'device-list' })
  })

  it('routes stop, confirm and retry through typed Host commands', async () => {
    const sendProjectCommand = vi.fn(async (command: LabProjectCommand): Promise<LabProjectCommandResult> => {
      if (command.command === 'run-retry') return { kind: 'run', value: run }
      throw new Error(`unexpected project command ${command.command}`)
    })
    const sendCommand = vi.fn(async (command: LabCommand): Promise<LabCommandResult> => {
      if (command.command === 'run-stop' || command.command === 'run-confirm') return { kind: 'run', value: run }
      throw new Error(`unexpected agent command ${command.command}`)
    })
    const adapter = createLabHostAdapter({ sendProjectCommand, sendCommand })

    await adapter.retryRun({ runId: 'run-1', actor: 'session-1', sessionId: 'session-1' })
    await adapter.stopRun({ runId: 'run-1', requestedBy: 'session-1', sessionId: 'session-1' })
    await adapter.confirmStep({ runId: 'run-1', evidence: ['artifact-1'], confirmedBy: 'session-1', stepId: 'step-1', operationId: 'operation-1', sessionId: 'session-1' })

    expect(sendProjectCommand).toHaveBeenCalledWith({ command: 'run-retry', runId: 'run-1', sessionId: 'session-1' })
    expect(sendCommand).toHaveBeenNthCalledWith(1, { command: 'run-stop', runId: 'run-1', requestedBy: 'session-1', sessionId: 'session-1' })
    expect(sendCommand).toHaveBeenNthCalledWith(2, { command: 'run-confirm', runId: 'run-1', evidence: ['artifact-1'], confirmedBy: 'session-1', stepId: 'step-1', operationId: 'operation-1', sessionId: 'session-1' })
  })

  it('routes Agent presentation through the Host validation command', async () => {
    const sendProjectCommand = vi.fn(async (command: LabProjectCommand): Promise<LabProjectCommandResult> => {
      if (command.command === 'presentation-intent') return {
        kind: 'presentation',
        value: { accepted: true, intent: { view: 'project', projectId: 'project-1', page: 'execution' } },
      }
      throw new Error('unexpected project command')
    })
    const adapter = createLabHostAdapter({ sendProjectCommand })

    await expect(adapter.presentForSession({
      sessionId: 'session-1',
      value: { view: 'project', projectId: 'project-1', page: 'execution' },
    })).resolves.toEqual({
      accepted: true,
      intent: { view: 'project', projectId: 'project-1', page: 'execution' },
    })
    expect(sendProjectCommand).toHaveBeenCalledWith({
      command: 'presentation-intent',
      sessionId: 'session-1',
      intent: { view: 'project', projectId: 'project-1', page: 'execution' },
    })
  })

  it('routes Project file actions and Host revision frames through the adapter', async () => {
    const file = {
      projectFileId: 'file-1', projectId: 'project-1', group: 'configuration' as const,
      displayName: 'workflow.json', relativePath: 'configuration/workflow.json', mediaType: 'application/json',
      size: 12, digest: 'sha256:file', revision: 2, createdAt: 100,
    }
    const sendProjectCommand = vi.fn(async (command: LabProjectCommand): Promise<LabProjectCommandResult> => {
      if (command.command === 'project-file-list') return { kind: 'project-file-list', value: [file] }
      if (command.command === 'project-file-open') return { kind: 'project-file-preview', value: { kind: 'json', content: { revision: 2 } } }
      if (command.command === 'project-file-download') return { kind: 'project-file-download', value: { projectFileId: 'file-1', displayName: 'workflow.json', mediaType: 'application/json', downloadToken: 'token-1' } }
      throw new Error(`unexpected project command ${command.command}`)
    })
    let hostListener: ((envelope: { readonly payload: unknown }) => void) | undefined
    const adapter = createLabHostAdapter({ sendProjectCommand, subscribeHostEvents: listener => { hostListener = listener; return () => { hostListener = undefined } } })

    await expect(adapter.listProjectFiles('project-1')).resolves.toEqual({ state: 'ready', value: [file] })
    await expect(adapter.openProjectFile('project-1', 'file-1')).resolves.toMatchObject({ state: 'ready', value: { kind: 'json' } })
    await expect(adapter.downloadProjectFile('project-1', 'file-1')).resolves.toMatchObject({ state: 'ready', value: { downloadToken: 'token-1' } })
    const events: unknown[] = []
    const dispose = adapter.subscribeProjectFileEvents(event => { events.push(event) })
    hostListener?.({ payload: { type: 'host/project-file-revision', projectId: 'project-1', projectFileId: 'file-1', group: 'configuration', revision: 3 } })
    hostListener?.({ payload: { type: 'host/project-file-revision', projectId: 'other', projectFileId: 'file-1', group: 'configuration', revision: 4 } })
    hostListener?.({ payload: { type: 'host/agent-error', projectId: 'project-1' } })
    dispose()
    expect(events).toEqual([{ type: 'project-file-revision', projectId: 'project-1', projectFileId: 'file-1', group: 'configuration', revision: 3 }, { type: 'project-file-revision', projectId: 'other', projectFileId: 'file-1', group: 'configuration', revision: 4 }])
  })
})
