// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LabRunResultView, getResultDisplayState, getRunDisplayState, type LabRunResultLabels } from '../src/client/LabRunResultView.tsx'
import { LAB_FIXTURE_IDS, createLabFixtureAdapter } from '../src/client/index.ts'

afterEach(cleanup)

const labels: LabRunResultLabels = {
  runTitle: 'Run', resultTitle: 'Result', runStatus: 'Run status', resultStatus: 'Result status', currentStep: 'Current step', feedback: 'Feedback', replanReason: 'Replan reason', verdict: 'Verdict', evidence: 'Evidence', assessedBy: 'Assessed by', assessedAt: 'Assessed at', humanQcGate: 'Human QC required', noValue: '—', statusLabel: value => value,
}

describe('LabRunResultView', () => {
  it('maps all fixture Run and Result lifecycle states without calculating a verdict', async () => {
    for (const scenario of ['success', 'waiting', 'failed', 'replan'] as const) {
      const adapter = createLabFixtureAdapter(scenario)
      const runResult = await adapter.openRun(LAB_FIXTURE_IDS.runId)
      const assessmentResult = await adapter.getResultAssessment(LAB_FIXTURE_IDS.runId)
      expect(runResult.state).toBe('ready')
      if (runResult.state !== 'ready') continue
      const assessment = assessmentResult.state === 'ready' ? assessmentResult.value : assessmentResult.state === 'waiting' ? { status: 'HUMAN_QC' as const, evidenceIds: [], humanQcRequired: true } : undefined
      expect(getRunDisplayState(runResult.value)).toBe(scenario === 'success' ? 'completed' : scenario === 'waiting' ? 'waiting' : scenario === 'failed' ? 'failed' : 'replanning')
      expect(getResultDisplayState(assessment)).toBe(scenario === 'success' ? 'passed' : scenario === 'waiting' ? 'human-qc' : scenario === 'failed' ? 'failed' : 'pending')
    }
  })

  it('renders the human QC gate from the Host assessment', async () => {
    const adapter = createLabFixtureAdapter('waiting')
    const run = await adapter.openRun(LAB_FIXTURE_IDS.runId)
    const assessment = await adapter.getResultAssessment(LAB_FIXTURE_IDS.runId)
    if (run.state !== 'ready' || assessment.state !== 'waiting') return
    render(<LabRunResultView run={run.value} assessment={{ status: 'HUMAN_QC', evidenceIds: [], humanQcRequired: true }} labels={labels} />)
    expect(screen.getByText('human-qc')).toBeTruthy()
    expect(screen.getByText('Human QC required')).toBeTruthy()
  })
})
