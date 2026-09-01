import { describe, expect, it } from 'vitest'
import type { LabQueryState, LabWorkbenchAdapter } from '../src/client/adapter.ts'
import type { LabProjectView, LabReportView, LabRun, LabRunComparisonView } from '../src/client/api.ts'

const projectView: LabProjectView = {
  project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Demo', description: '', status: 'ACTIVE' },
  sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [], experiments: [], experimentSessions: [],
}

const run = (runId: string): LabRun => ({ runId, planId: 'plan-1', runStatus: 'COMPLETED', observations: [], artifacts: [] })
const report: LabReportView = {
  runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'COMPLETED', observations: [], artifacts: [],
  feedback: { status: 'COMPLETED', valid: true, summary: 'done', issues: [], replanRequested: false },
}

const ready = <T>(value: T): LabQueryState<T> => ({ state: 'ready', value })

function adapterFor(runs: readonly LabRun[]): LabWorkbenchAdapter {
  return {
    listProjects: async () => ready([projectView.project ?? {}]),
    openProject: async () => ready(projectView),
    getProjectContext: async () => ready({ project: { projectId: 'project-1', sessionId: 'session-1', sources: [], devices: [], sharedFacts: [] }, knowledgeCapability: { state: 'available' } }),
    listDevices: async () => ready([]),
    listExperiments: async () => ready([]),
    listExperimentReviews: async () => ready([]),
    openExperiment: async () => ready({ experimentId: 'experiment-1', projectId: 'project-1', title: 'Demo', objective: 'Test', status: 'ACTIVE', createdInSessionId: 'session-1', createdAt: 1, updatedAt: 1 }),
    listRuns: async (experimentId) => ready(runs.filter(item => item.runId?.startsWith(experimentId === 'experiment-1' ? 'run-' : 'never'))),
    compareRuns: async (leftRunId, rightRunId) => ready({ leftRunId, rightRunId, status: { left: 'COMPLETED', right: 'COMPLETED' }, durationMs: { left: 0, right: 0 }, parameters: { left: [], right: [] }, stepStatuses: [], observations: [], artifactCounts: { left: 0, right: 0 }, artifactMetadata: { left: [], right: [] } } satisfies LabRunComparisonView),
    openRun: async (runId) => ready(runs.find(item => item.runId === runId) ?? run(runId)),
    listArtifacts: async (runId) => ready((runs.find(item => item.runId === runId) ?? run(runId)).artifacts ?? []),
    openArtifact: async (runId, artifactId) => ready({ artifactId, runId, kind: 'text', displayName: 'log', uri: 'host://artifact', mediaType: 'text/plain', size: 0, digest: 'sha256:test', createdAt: 1 }),
    buildReport: async (runId) => ready({ ...report, runId }),
    getWorkflow: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'no workflow' }),
    listSkillRevisions: async () => ready([]),
    getResultAssessment: async () => ({ state: 'waiting', code: 'HUMAN_QC_REQUIRED', message: 'review required' }),
    getKnowledgeScope: async () => ready({ capability: { state: 'available' }, sources: [], evidence: [] }),
    validatePlan: async () => ready({ valid: true, issues: [] }),
    validateSkill: async () => ready({ valid: true, issues: [] }),
    createProject: async () => projectView,
    updateProjectScope: async () => projectView,
    archiveProject: async () => projectView,
    createExperiment: async () => ({ experimentId: 'experiment-2', projectId: 'project-1', title: 'New', objective: 'Test', status: 'DRAFT', createdInSessionId: 'session-1', createdAt: 1, updatedAt: 1 }),
    deriveExperiment: async () => ({ experimentId: 'experiment-3', projectId: 'project-1', title: 'Derived', objective: 'Test', status: 'DRAFT', createdInSessionId: 'session-1', createdAt: 1, updatedAt: 1 }),
    linkExperimentSession: async () => projectView,
    approvePlan: async () => ({ planId: 'plan-1', experimentId: 'experiment-1', revision: 1, status: 'LOCKED', steps: [], skillRevisionIds: [], unresolved: [] }),
    approveSkill: async () => ({ revisionId: 'revision-1', status: 'HUMAN_APPROVED' }),
    activateSkill: async () => ({ revisionId: 'revision-1', status: 'ACTIVE' }),
    startRun: async () => run('run-2'),
    stopRun: async () => run('run-2'),
    retryRun: async () => run('run-3'),
    confirmStep: async () => run('run-2'),
    presentForSession: async () => ({ accepted: true, intent: { view: 'projects' } }),
  }
}

describe('LabWorkbenchAdapter contract', () => {
  it('addresses a Run directly and keeps list queries experiment-scoped', async () => {
    const adapter = adapterFor([run('run-1'), run('run-2')])
    await expect(adapter.openRun('run-2')).resolves.toMatchObject({ state: 'ready', value: { runId: 'run-2' } })
    const listed = await adapter.listRuns('experiment-1')
    expect(listed.state).toBe('ready')
    if (listed.state === 'ready') expect(listed.value.map(item => item.runId)).toEqual(['run-1', 'run-2'])
    await expect(adapter.buildReport('run-2')).resolves.toMatchObject({ state: 'ready', value: { runId: 'run-2' } })
  })

  it('keeps record reads separate from typed state-changing actions', async () => {
    const adapter = adapterFor([])
    await expect(adapter.createExperiment({ projectId: 'project-1', title: 'New', objective: 'Test' })).resolves.toMatchObject({ projectId: 'project-1' })
    await expect(adapter.startRun({ experimentId: 'experiment-1', planId: 'plan-1' })).resolves.toMatchObject({ runId: 'run-2' })
  })

  it('represents unavailable, waiting and failed states with stable codes', async () => {
    const adapter = adapterFor([])
    await expect(adapter.getResultAssessment('run-1')).resolves.toMatchObject({ state: 'waiting', code: 'HUMAN_QC_REQUIRED' })
    await expect(adapter.getWorkflow('experiment-1')).resolves.toMatchObject({ state: 'empty', code: 'NO_RECORDS' })
    await expect(adapter.validatePlan('plan-1')).resolves.toMatchObject({ state: 'ready', value: { valid: true } })

    const unavailable: LabQueryState<readonly []> = { state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE', message: 'Knowledge is unavailable', retryable: true }
    const failed: LabQueryState<readonly []> = { state: 'failed', code: 'VALIDATION_FAILED', message: 'Plan validation failed', retryable: false }
    expect(unavailable).toMatchObject({ state: 'unavailable', code: 'CAPABILITY_UNAVAILABLE' })
    expect(failed).toMatchObject({ state: 'failed', code: 'VALIDATION_FAILED' })
  })
})
