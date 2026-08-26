import { Context } from '@deepseek-ai/cordis'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { describe, expect, it, vi } from 'vitest'
import { LabMvpWebService } from '../src/index.ts'

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
    const runtime = { getRun: vi.fn().mockReturnValue(undefined) }
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
