import { Context } from '@deepseek-ai/cordis'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { describe, expect, it, vi } from 'vitest'
import { LabMvpWebService, parseLabProjectConversationCommand } from '../src/index.ts'

describe('LabMvpWebService', () => {
  it('keeps snapshot and import/search actions behind existing services', async () => {
    const ctx = new Context()
    const knowledge = {
      listImportStatuses: vi.fn().mockResolvedValue([]),
      importDocument: vi.fn().mockResolvedValue({ documentId: 'document-1', versionId: 'version-1', status: 'READY' }),
      search: vi.fn().mockResolvedValue([{ citationId: 'citation-1', confirmed: true, conflicted: false, score: 1 }]),
      listConflicts: vi.fn().mockResolvedValue([{ conflictId: 'conflict-1', status: 'OPEN' }]),
    }
    const planning = { listProposals: vi.fn().mockReturnValue([]) }
    const devices = { listDevices: vi.fn().mockReturnValue([]) }
    const runtime = { getRun: vi.fn().mockReturnValue(undefined), listRuns: vi.fn().mockReturnValue([]) }
    ctx.provide('labKnowledge', knowledge)
    ctx.provide('labPlanning', planning)
    ctx.provide('labDevices', devices)
    ctx.provide('labRuntime', runtime)
    const service = new LabMvpWebService(ctx)

    await expect(service.dispatch({ command: 'snapshot', experimentId: brandId<'ExperimentId'>('experiment-1') })).resolves.toMatchObject({ kind: 'snapshot' })
    await expect(service.dispatch({
      command: 'knowledge-import',
      name: 'protocol.csv',
      bytes: new Uint8Array([1, 2]),
      metadata: { title: 'protocol' },
    })).resolves.toMatchObject({ kind: 'knowledge-import' })
    await expect(service.dispatch({ command: 'knowledge-search', request: { query: 'ATAC', experimentId: brandId<'ExperimentId'>('experiment-1') } })).resolves.toMatchObject({
      kind: 'knowledge-search',
      value: { conflicts: [{ conflictId: 'conflict-1', status: 'OPEN' }] },
    })
    expect(knowledge.importDocument).toHaveBeenCalledWith({
      source: { kind: 'bytes', name: 'protocol.csv', bytes: new Uint8Array([1, 2]) },
      metadata: { title: 'protocol' },
    })
    expect(knowledge.search).toHaveBeenCalledWith({ query: 'ATAC', experimentId: 'experiment-1' })
  })

  it('does not bypass the planning service for approval', async () => {
    const ctx = new Context()
    const planning = {
      validatePlan: vi.fn().mockResolvedValue({
        plan: { experimentId: 'experiment-1', planId: 'plan-1', status: 'DRAFT', steps: [] },
        validation: { valid: false, issues: [{ code: 'NO_EVIDENCE', message: 'missing evidence' }] },
      }),
    }
    const runtime = { approvePlan: vi.fn() }
    ctx.provide('labPlanning', planning)
    ctx.provide('labRuntime', runtime)
    ctx.provide('labSkills', { snapshotForRun: vi.fn(), resolveRevision: vi.fn() })
    const service = new LabMvpWebService(ctx)
    await expect(service.dispatch({ command: 'plan-approve', experimentId: brandId<'ExperimentId'>('experiment-1'), planId: brandId<'PlanId'>('plan-1'), approvedBy: 'reviewer' })).rejects.toThrow(/validated plan/)
    expect(runtime.approvePlan).not.toHaveBeenCalled()
  })

  it('routes typed Experiment and Run page queries through their owning services', async () => {
    const ctx = new Context()
    const experiment = {
      experimentId: 'experiment-1',
      projectId: 'project-1',
      title: 'Calibration',
      objective: 'Calibrate the bench',
      status: 'DRAFT',
      createdInSessionId: 'session-1',
      createdAt: 1,
      updatedAt: 1,
    }
    const projects = { listExperiments: vi.fn().mockResolvedValue([experiment]) }
    const runtime = { listRuns: vi.fn().mockReturnValue([]) }
    ctx.provide('labProjects', projects)
    ctx.provide('labRuntime', runtime)
    const service = new LabMvpWebService(ctx)

    await expect(service.dispatchProject(parseLabProjectConversationCommand({ command: 'experiment-list', projectId: 'project-1' }))).resolves.toMatchObject({
      kind: 'experiment-list', value: [{ experimentId: 'experiment-1', title: 'Calibration' }],
    })
    await expect(service.dispatchProject(parseLabProjectConversationCommand({ command: 'run-list', experimentId: 'experiment-1' }))).resolves.toMatchObject({ kind: 'run-list', value: [] })
    expect(projects.listExperiments).toHaveBeenCalledWith('project-1')
    expect(runtime.listRuns).toHaveBeenCalledWith('experiment-1')
  })

  it('compares only terminal Runs from one Experiment with structured fields', async () => {
    const ctx = new Context()
    const run = (runId: string, experimentId: string, runStatus: 'RUNNING' | 'FAILED' | 'COMPLETED', updatedAt: number) => ({
      runId: brandId<'RunId'>(runId), experimentId: brandId<'ExperimentId'>(experimentId), planId: brandId<'PlanId'>('plan-1'),
      createdAt: 100, updatedAt, planStatus: 'LOCKED' as const, runStatus,
      executionGraph: { version: 1 as const, planId: brandId<'PlanId'>('plan-1'), skillSnapshots: [], steps: [{ stepId: brandId<'PlanStepId'>('step-1'), skillRevisionId: brandId<'SkillRevisionId'>('skill-1'), operationKind: 'human' as const, operationResource: 'manual', parameters: { temperature: 25 }, requiresApproval: false, expectedEvidence: [], failurePolicy: 'STOP' as const }] },
      observations: [{ stepId: brandId<'PlanStepId'>('step-1'), operationId: brandId<'OperationId'>('operation-1'), valid: runStatus === 'COMPLETED', evidence: [], artifactIds: [brandId<'ArtifactId'>('artifact-1')], status: runStatus === 'RUNNING' ? 'WAITING' as const : runStatus === 'FAILED' ? 'FAILED' as const : 'COMPLETED' as const }],
      artifacts: [{ artifactId: brandId<'ArtifactId'>('artifact-1'), runId: brandId<'RunId'>(runId), kind: 'json' as const, displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 12, digest: 'sha256:test', createdAt: 100 }],
      cache: {}, feedback: { status: runStatus, valid: runStatus === 'COMPLETED', summary: 'fixture', issues: [], replanRequested: false },
    })
    const runs = new Map([
      ['run-1', run('run-1', 'experiment-1', 'FAILED', 250)],
      ['run-2', run('run-2', 'experiment-1', 'COMPLETED', 300)],
      ['run-running', run('run-running', 'experiment-1', 'RUNNING', 300)],
      ['run-other', run('run-other', 'experiment-2', 'COMPLETED', 300)],
    ])
    ctx.provide('labRuntime', { getRun: (runId: string) => runs.get(runId) })
    const service = new LabMvpWebService(ctx)

    await expect(service.dispatchProject(parseLabProjectConversationCommand({ command: 'run-compare', leftRunId: 'run-1', rightRunId: 'run-2' }))).resolves.toMatchObject({
      kind: 'run-comparison', value: { durationMs: { left: 150, right: 200 }, parameters: { left: [{ stepId: 'step-1' }] }, observations: [{ stepId: 'step-1' }], artifactMetadata: { left: [{ displayName: 'result.json', digest: 'sha256:test' }] } },
    })
    await expect(service.dispatchProject(parseLabProjectConversationCommand({ command: 'run-compare', leftRunId: 'run-running', rightRunId: 'run-2' }))).rejects.toThrow(/only terminal Runs/)
    await expect(service.dispatchProject(parseLabProjectConversationCommand({ command: 'run-compare', leftRunId: 'run-1', rightRunId: 'run-other' }))).rejects.toThrow(/different Experiments/)
  })

  it('projects a project Run action into the Session log and cache', async () => {
    const ctx = new Context()
    const appended: unknown[][] = []
    const run = {
      runId: brandId<'RunId'>('run-1'),
      experimentId: brandId<'ExperimentId'>('experiment-1'),
      runStatus: 'COMPLETED' as const,
      observations: [],
      artifacts: [],
      feedback: { status: 'COMPLETED' as const, valid: true, summary: 'done', issues: [], replanRequested: false },
      cache: {},
    }
    const runtime = { startRun: vi.fn().mockResolvedValue(run) }
    const projects = { projectForSession: vi.fn().mockResolvedValue(undefined) }
    const session = { append: vi.fn((...event: unknown[]) => { appended.push(event) }) }
    ctx.provide('labRuntime', runtime)
    ctx.provide('labProjects', projects)
    ctx.provide('sessions', { get: vi.fn(() => session) })
    ctx.provide('labExperimentCache', { project: vi.fn().mockResolvedValue(undefined) })
    const service = new LabMvpWebService(ctx)

    await service.dispatchProject(parseLabProjectConversationCommand({
      command: 'run-start',
      experimentId: 'experiment-1',
      planId: 'plan-1',
      sessionId: 'session-1',
    }))

    expect(appended).toContainEqual(['lab/run/state', expect.objectContaining({ runId: 'run-1', to: 'COMPLETED' })])
  })

  it('registers a project Experiment with Runtime before returning it', async () => {
    const ctx = new Context()
    const experiment = {
      experimentId: brandId<'ExperimentId'>('experiment-1'),
      projectId: brandId<'LabProjectId'>('project-1'),
      title: 'Calibration',
      objective: 'Calibrate the bench',
      status: 'DRAFT' as const,
      createdInSessionId: brandId<'SessionId'>('session-1'),
      createdAt: 1,
      updatedAt: 1,
    }
    const projects = {
      createExperiment: vi.fn().mockResolvedValue({
        experiment,
        project: { project: experiment, sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [] },
      }),
    }
    const runtime = { createExperiment: vi.fn().mockResolvedValue(undefined) }
    const session = { append: vi.fn() }
    ctx.provide('labProjects', projects)
    ctx.provide('labRuntime', runtime)
    ctx.provide('sessions', { get: vi.fn(() => session) })
    const service = new LabMvpWebService(ctx)

    await service.dispatchProject(parseLabProjectConversationCommand({
      command: 'experiment-create',
      projectId: 'project-1',
      title: 'Calibration',
      objective: 'Calibrate the bench',
      sessionId: 'session-1',
    }))

    expect(runtime.createExperiment).toHaveBeenCalledWith({
      experimentId: 'experiment-1',
      objective: 'Calibrate the bench',
      expectedOutputs: [],
    })
  })

  it('blocks an inactive Skill before Runtime approval side effects', async () => {
    const ctx = new Context()
    const planning = {
      validatePlan: vi.fn().mockResolvedValue({
        plan: {
          experimentId: 'experiment-1',
          planId: 'plan-1',
          revision: 1,
          status: 'VALIDATED',
          objective: 'objective',
          citations: [],
          assumptions: [],
          unresolved: [],
          steps: [{
            stepId: 'step-1',
            title: 'step',
            dependencies: [],
            skillRevisionId: 'skill-revision-1',
            operationKind: 'human',
            operationResource: 'manual',
            requiresApproval: true,
            requiredInputs: [],
            parameters: {},
            citations: [],
            expectedOutputs: ['evidence'],
          }],
        },
        validation: { valid: true, issues: [] },
      }),
    }
    const runtime = { approvePlan: vi.fn() }
    const skills = {
      snapshotForRun: vi.fn().mockResolvedValue([]),
      resolveRevision: vi.fn().mockReturnValue({ status: 'RETIRED' }),
    }
    ctx.provide('labPlanning', planning)
    ctx.provide('labRuntime', runtime)
    ctx.provide('labSkills', skills)
    const service = new LabMvpWebService(ctx)
    await expect(service.dispatch({ command: 'plan-approve', experimentId: brandId<'ExperimentId'>('experiment-1'), planId: brandId<'PlanId'>('plan-1'), approvedBy: 'reviewer' })).rejects.toThrow(/not ACTIVE/)
    expect(runtime.approvePlan).not.toHaveBeenCalled()
  })

  it('preserves Runtime gates for unconfirmed steps and device failures', async () => {
    const ctx = new Context()
    const runtime = {
      executeNextStep: vi
        .fn()
        .mockRejectedValueOnce(new Error('run is not waiting for confirmation'))
        .mockRejectedValueOnce(new Error('device failed')),
    }
    ctx.provide('labRuntime', runtime)
    const service = new LabMvpWebService(ctx)
    await expect(service.dispatch({ command: 'run-step', runId: brandId<'RunId'>('run-1') })).rejects.toThrow(/not waiting for confirmation/)
    await expect(service.dispatch({ command: 'run-step', runId: brandId<'RunId'>('run-1') })).rejects.toThrow(/device failed/)
    expect(runtime.executeNextStep).toHaveBeenCalledTimes(2)
  })
})
