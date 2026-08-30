// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabRunDetailView, type LabRunDetailLabels } from '../src/client/LabRunDetailView.tsx'

afterEach(cleanup)

const labels: LabRunDetailLabels = {
  title: 'Run detail', overview: 'Overview', parameters: 'Parameters', steps: 'Steps', executionGraph: 'Execution graph', evidence: 'Evidence', logs: 'Logs', timeline: 'Timeline', plan: 'Plan', currentStep: 'Current step', dependencies: 'Dependencies', operation: 'Operation', createdAt: 'Created at', updatedAt: 'Updated at', noValue: '—', noSteps: 'No steps', noEvidence: 'No evidence', noLogs: 'No logs', retry: 'Retry Run', retryOfRun: 'Retry of', comparisonLabels: { title: 'Run comparison', left: 'Left', right: 'Right', status: 'Status', steps: 'Steps', artifacts: 'Artifacts', noValue: '—' }, reportLabels: { title: 'Report', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', humanQc: 'Human QC', noValue: '—', noCriteria: 'No criteria' }, resultLabels: { runTitle: 'Run', resultTitle: 'Result', runStatus: 'Run status', resultStatus: 'Result status', currentStep: 'Current step', feedback: 'Feedback', replanReason: 'Replan reason', verdict: 'Verdict', evidence: 'Evidence', assessedBy: 'Assessed by', assessedAt: 'Assessed at', humanQcGate: 'Human QC', noValue: '—', statusLabel: value => value },
}

describe('LabRunDetailView', () => {
  it('shows retry lineage and Host comparison while emitting retry intent', () => {
    const onRetry = vi.fn()
    render(<LabRunDetailView run={{ runId: 'run-2', planId: 'plan-1', retryOfRunId: 'run-1', runStatus: 'FAILED', executionGraph: { planId: 'plan-1', experimentId: 'experiment-1', revision: 1, status: 'LOCKED', steps: [{ stepId: 'step-1', title: 'Measure', dependencies: [], operationKind: 'device', parameters: { temperature: { value: 25, unit: 'C' } } }], skillRevisionIds: [], unresolved: [] }, observations: [{ stepId: 'step-1', operationId: 'op-1', valid: false, evidence: [], artifactIds: [], status: 'FAILED', error: 'device unavailable' }] }} comparison={{ leftRunId: 'run-1', rightRunId: 'run-2', status: { left: 'FAILED', right: 'COMPLETED' }, stepStatuses: [{ stepId: 'step-1', left: 'FAILED', right: 'COMPLETED' }], artifactCounts: { left: 0, right: 1 } }} artifacts={[]} labels={labels} onRetry={onRetry} />)

    expect(screen.getByText('Retry of: run-1')).toBeTruthy()
    expect(screen.getByText('Run comparison')).toBeTruthy()
    expect(screen.getByText('25 C')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: labels.retry }))
    expect(onRetry).toHaveBeenCalledWith('run-2')
  })
})

