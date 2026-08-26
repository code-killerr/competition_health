import { describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { MockDeviceProvider } from '@deepseek-ai/dsh-experimental-lab-device-mock'
import type { ExecutionStepSpec } from '@deepseek-ai/dsh-experimental-lab-runtime'
import { LocalLabRuntimeProvider } from '../src/index.ts'
import { SqliteRuntimeStateStore } from '../src/sqlite-store.ts'

const experimentId = brandId<'ExperimentId'>('experiment-1')
const planId = brandId<'PlanId'>('plan-1')
const skillId = brandId<'LabSkillId'>('skill-1')
const skillRevisionId = brandId<'SkillRevisionId'>('skill-revision-1')
const deviceId = brandId<'DeviceId'>('device-1')
const device = new MockDeviceProvider({
  devices: [{ id: 'device-1', name: 'mock device', capabilities: ['dispense'] }],
})

function executionStep(operationKind: ExecutionStepSpec['operationKind'], stepId: string, stepDeviceId?: typeof deviceId, requiresApproval = false): ExecutionStepSpec {
  return {
    stepId: brandId<'PlanStepId'>(stepId),
    skillRevisionId,
    operationKind,
    operationResource: operationKind === 'device' ? 'dispense' : 'inspect',
    parameters: { volume: { value: 10, unit: 'uL' } },
    requiresApproval,
    expectedEvidence: operationKind === 'device' ? ['mock-device:device-1'] : ['human-check'],
    failurePolicy: 'BLOCK',
    ...stepDeviceId === undefined ? {} : { deviceId: stepDeviceId },
  }
}
async function createProvider(step: ExecutionStepSpec) {
  const provider = new LocalLabRuntimeProvider(device)
  await provider.createExperiment({ experimentId, objective: 'prepare sample', expectedOutputs: ['sample'] })
  await provider.approvePlan({
    experimentId,
    planId,
    approvedBy: 'reviewer-1',
    skillRevisionIds: [skillRevisionId],
    executionSteps: [step],
    skillSnapshots: [{ skillId, revisionId: skillRevisionId, status: 'ACTIVE', definitionHash: 'hash-1' }],
  })
  return provider
}

describe('local runtime controlled execution', () => {
  it('freezes an execution graph and routes device work through the device provider', async () => {
    const provider = await createProvider(executionStep('device', 'step-device', deviceId))
    const started = await provider.startRun(experimentId, planId)
    expect(started.runStatus).toBe('RUNNING')
    expect(started.executionGraph.steps).toHaveLength(1)

    const completed = await provider.executeNextStep(started.runId!)
    expect(completed.runStatus).toBe('COMPLETED')
    expect(completed.observations).toMatchObject([
      { stepId: 'step-device', status: 'COMPLETED', valid: true, evidence: ['mock-device:device-1'] },
    ])
    expect(device.status(deviceId)?.reserved).toBe(false)
    await expect(provider.executeNextStep(started.runId!)).rejects.toThrow(/terminal state/)
  })

  it('waits for human evidence before advancing a human step', async () => {
    const provider = await createProvider(executionStep('human', 'step-human'))
    const started = await provider.startRun(experimentId, planId)
    expect(started.runStatus).toBe('WAITING_CONFIRMATION')

    const waiting = await provider.executeNextStep(started.runId!)
    expect(waiting.runStatus).toBe('WAITING_CONFIRMATION')
    const completed = await provider.confirmStep(
      started.runId!,
      ['human-check'],
      'reviewer-1',
      brandId<'PlanStepId'>('step-human'),
      brandId<'OperationId'>('operation-human'),
    )
    expect(completed.runStatus).toBe('COMPLETED')
    expect(completed.observations[0]).toMatchObject({ status: 'COMPLETED', evidence: ['human-check'] })
  })

  it('requires approval before executing a gated device step', async () => {
    const provider = await createProvider(executionStep('device', 'step-gated', deviceId, true))
    const started = await provider.startRun(experimentId, planId)
    expect(started.runStatus).toBe('WAITING_CONFIRMATION')

    const gate = await provider.executeNextStep(started.runId!)
    expect(gate.runStatus).toBe('WAITING_CONFIRMATION')
    expect(gate.observations).toMatchObject([{ status: 'WAITING', valid: true }])

    const approved = await provider.confirmStep(
      started.runId!,
      ['approval-recorded'],
      'reviewer-1',
      brandId<'PlanStepId'>('step-gated'),
      brandId<'OperationId'>('operation-approval'),
    )
    expect(approved.runStatus).toBe('RUNNING')

    const completed = await provider.executeNextStep(started.runId!)
    expect(completed.runStatus).toBe('COMPLETED')
    expect(completed.observations).toMatchObject([{ status: 'COMPLETED', valid: true }])
  })
  it('blocks unsupported script operations without invoking a device', async () => {
    const provider = await createProvider(executionStep('script', 'step-script'))
    const started = await provider.startRun(experimentId, planId)
    const blocked = await provider.executeNextStep(started.runId!)
    expect(blocked.runStatus).toBe('BLOCKED')
    expect(blocked.observations).toMatchObject([
      { status: 'FAILED', valid: false, error: expect.stringContaining('not executable') as unknown },
    ])
    expect(device.status(deviceId)?.reserved).toBe(false)
  })

  it('rejects unapproved revisions and locks the exact approved execution graph', async () => {
    const provider = new LocalLabRuntimeProvider(device)
    await provider.createExperiment({ experimentId, objective: 'prepare sample', expectedOutputs: ['sample'] })
    await expect(provider.startRun(experimentId, planId)).rejects.toThrow(/approved plan revision/)

    const step = executionStep('device', 'step-locked', deviceId)
    await provider.approvePlan({
      experimentId,
      planId,
      approvedBy: 'reviewer-1',
      skillRevisionIds: [skillRevisionId],
      executionSteps: [step],
      skillSnapshots: [{ skillId, revisionId: skillRevisionId, status: 'ACTIVE', definitionHash: 'hash-1' }],
    })
    const started = await provider.startRun(experimentId, planId)

    expect(started.planStatus).toBe('LOCKED')
    expect(started.executionGraph).toMatchObject({
      planId,
      skillSnapshots: [{ revisionId: skillRevisionId, status: 'ACTIVE' }],
      steps: [{ stepId: 'step-locked', operationResource: 'dispense' }],
    })
    await expect(provider.startRun(experimentId, brandId<'PlanId'>('plan-other'))).rejects.toThrow(/approved plan revision/)
  })

  it('validates evidence and emits a replan request according to the failure policy', async () => {
    const provider = await createProvider({
      ...executionStep('human', 'step-replan'),
      expectedEvidence: ['required-evidence'],
      failurePolicy: 'REPLAN',
    })
    const started = await provider.startRun(experimentId, planId)
    const blocked = await provider.confirmStep(
      started.runId!,
      ['unexpected-evidence'],
      'reviewer-1',
      brandId<'PlanStepId'>('step-replan'),
      brandId<'OperationId'>('operation-replan'),
    )

    expect(blocked.runStatus).toBe('BLOCKED')
    expect(blocked.observations).toMatchObject([{
      status: 'FAILED',
      valid: false,
      replanRequested: true,
      error: expect.stringContaining('required evidence') as unknown,
    }])
    expect(blocked.feedback).toMatchObject({ status: 'BLOCKED', valid: false, replanRequested: true })
    expect(blocked.replanRequest).toMatchObject({ stepId: 'step-replan', runId: started.runId })
    await expect(provider.buildReport(started.runId!)).resolves.toMatchObject({
      feedback: { status: 'BLOCKED', replanRequested: true },
      replanRequest: { stepId: 'step-replan' },
    })
  })

  it('restores the authoritative experiment and run state from SQLite', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lab-runtime-'))
    const path = join(root, 'runtime.sqlite')
    try {
      const first = new LocalLabRuntimeProvider(device, new SqliteRuntimeStateStore(path))
      const step = executionStep('human', 'step-recovered')
      await first.createExperiment({ experimentId, objective: 'prepare sample', expectedOutputs: ['sample'] })
      await first.approvePlan({
        experimentId,
        planId,
        approvedBy: 'reviewer-1',
        skillRevisionIds: [skillRevisionId],
        executionSteps: [step],
        skillSnapshots: [{ skillId, revisionId: skillRevisionId, status: 'ACTIVE', definitionHash: 'hash-1' }],
      })
      const started = await first.startRun(experimentId, planId)
      await first.dispose()

      const recovered = new LocalLabRuntimeProvider(device, new SqliteRuntimeStateStore(path))
      await expect(recovered.buildReport(started.runId!)).resolves.toMatchObject({ runId: started.runId, status: 'WAITING_CONFIRMATION' })
      expect(recovered.getRun(experimentId)).toMatchObject({ runId: started.runId, planId, runStatus: 'WAITING_CONFIRMATION' })
      await recovered.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
