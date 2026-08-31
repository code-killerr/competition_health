import { describe, expect, it, vi } from 'vitest'
import type { LabCommand, LabCommandResult, LabProjectCommand, LabProjectCommandResult, LabProjectView, LabReportView, LabRun } from '../src/client/api.ts'
import { createLabHostAdapter } from '../src/client/host-adapter.ts'

const project: LabProjectView = {
  project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Project', status: 'ACTIVE' },
  sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [], experiments: [], experimentSessions: [],
}
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
      if (command.command === 'run-list') return { kind: 'run-list', value: [run] }
      if (command.command === 'run-report') return { kind: 'run-report', value: report }
      throw new Error(`unexpected project command ${command.command}`)
    })
    const adapter = createLabHostAdapter({ sendProjectCommand })

    await expect(adapter.listProjects()).resolves.toEqual({ state: 'ready', value: [project.project] })
    await expect(adapter.openProject('project-1')).resolves.toEqual({ state: 'ready', value: project })
    await expect(adapter.listRuns('experiment-1')).resolves.toEqual({ state: 'ready', value: [run] })
    await expect(adapter.getResultAssessment('run-1')).resolves.toEqual({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: '该 Run 尚无 Host 结果判定', retryable: false })
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

    await adapter.retryRun({ runId: 'run-1', actor: 'session-1' })
    await adapter.stopRun({ runId: 'run-1', requestedBy: 'session-1' })
    await adapter.confirmStep({ runId: 'run-1', evidence: ['artifact-1'], confirmedBy: 'session-1', stepId: 'step-1', operationId: 'operation-1' })

    expect(sendProjectCommand).toHaveBeenCalledWith({ command: 'run-retry', runId: 'run-1' })
    expect(sendCommand).toHaveBeenNthCalledWith(1, { command: 'run-stop', runId: 'run-1', requestedBy: 'session-1' })
    expect(sendCommand).toHaveBeenNthCalledWith(2, { command: 'run-confirm', runId: 'run-1', evidence: ['artifact-1'], confirmedBy: 'session-1', stepId: 'step-1', operationId: 'operation-1' })
  })
})
