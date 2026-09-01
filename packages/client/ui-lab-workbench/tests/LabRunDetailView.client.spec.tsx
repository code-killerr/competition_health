// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabRunDetailView, type LabRunDetailLabels } from '../src/client/LabRunDetailView.tsx'

afterEach(cleanup)

const labels: LabRunDetailLabels = {
  title: 'Run detail', overview: 'Overview', parameters: 'Parameters', steps: 'Steps', executionGraph: 'Execution graph', evidence: 'Evidence', evidenceInput: 'Confirmation evidence', logs: 'Logs', timeline: 'Timeline', plan: 'Plan', currentStep: 'Current step', dependencies: 'Dependencies', operation: 'Operation', createdAt: 'Created at', updatedAt: 'Updated at', noValue: '—', noSteps: 'No steps', noEvidence: 'No evidence', noLogs: 'No logs', retry: 'Retry Run', retryOfRun: 'Retry of', confirmStep: 'Confirm step', stopRun: 'Stop run', comparisonLabels: { title: 'Run comparison', left: 'Left', right: 'Right', status: 'Status', duration: 'Duration', parameters: 'Parameters', steps: 'Steps', observations: 'Observations', artifacts: 'Artifacts', artifactMetadata: 'Artifact metadata', valid: 'Valid', operation: 'Operation', artifactIds: 'Artifact references', noValue: '—' }, reportLabels: { title: 'Report', experiment: 'Experiment', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', skillRevisions: 'Skill revisions', citations: 'Citations', observationIds: 'Observation records', artifactIds: 'Artifact records', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', humanQc: 'Human QC', humanQcAction: 'Review', humanQcUnavailable: 'Review unavailable', noValue: '—', noCriteria: 'No criteria' }, resultLabels: { runTitle: 'Run', resultTitle: 'Result', runStatus: 'Run status', resultStatus: 'Result status', currentStep: 'Current step', feedback: 'Feedback', replanReason: 'Replan reason', verdict: 'Verdict', evidence: 'Evidence', assessedBy: 'Assessed by', assessedAt: 'Assessed at', humanQcGate: 'Human QC', noValue: '—', statusLabel: value => value },
}

describe('LabRunDetailView', () => {
  it('shows retry lineage and Host comparison while emitting retry intent', () => {
    const onRetry = vi.fn()
    render(<LabRunDetailView run={{ runId: 'run-2', planId: 'plan-1', retryOfRunId: 'run-1', runStatus: 'FAILED', executionGraph: { planId: 'plan-1', experimentId: 'experiment-1', revision: 1, status: 'LOCKED', steps: [{ stepId: 'step-1', title: 'Measure', dependencies: [], operationKind: 'device', parameters: { temperature: { value: 25, unit: 'C' } } }], skillRevisionIds: [], unresolved: [] }, observations: [{ stepId: 'step-1', operationId: 'op-1', valid: false, evidence: [], artifactIds: [], status: 'FAILED', error: 'device unavailable' }] }} comparison={{ leftRunId: 'run-1', rightRunId: 'run-2', status: { left: 'FAILED', right: 'COMPLETED' }, durationMs: { left: 1000, right: 2000 }, parameters: { left: [{ stepId: 'step-1', values: { temperature: { value: 25, unit: 'C' } } }], right: [{ stepId: 'step-1', values: { temperature: { value: 26, unit: 'C' } } }] }, stepStatuses: [{ stepId: 'step-1', left: 'FAILED', right: 'COMPLETED' }], observations: [{ stepId: 'step-1', left: { operationId: 'op-1', status: 'FAILED', valid: false, artifactIds: [] }, right: { operationId: 'op-2', status: 'COMPLETED', valid: true, artifactIds: [] } }], artifactCounts: { left: 0, right: 1 }, artifactMetadata: { left: [], right: [{ artifactId: 'artifact-1', displayName: 'result.json', kind: 'json', mediaType: 'application/json', size: 4, digest: 'sha256:test', createdAt: 2 }] } }} artifacts={[]} labels={labels} onRetry={onRetry} />)

    expect(screen.getByText('Retry of: run-1')).toBeTruthy()
    expect(screen.getByText('Run comparison')).toBeTruthy()
    expect(screen.getByText(text => text.includes('1000 ms') && text.includes('2000 ms'))).toBeTruthy()
    expect(screen.getByText(/artifact-1/)).toBeTruthy()
    expect(screen.getByText('25 C')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: labels.retry }))
    expect(onRetry).toHaveBeenCalledWith('run-2')
  })

  it('enables only status-appropriate typed actions and forwards current step identity', () => {
    const onStop = vi.fn()
    const onConfirmStep = vi.fn()
    const view = render(<LabRunDetailView run={{ runId: 'run-wait', planId: 'plan-1', runStatus: 'WAITING_CONFIRMATION', currentStepId: 'step-2', observations: [{ stepId: 'step-2', operationId: 'op-2', valid: false, evidence: [], artifactIds: [], status: 'WAITING' }] }} artifacts={[]} labels={labels} onStop={onStop} onConfirmStep={onConfirmStep} />)

    expect(view.getByRole('button', { name: labels.stopRun })).toHaveProperty('disabled', false)
    expect(view.getByRole('button', { name: labels.confirmStep })).toHaveProperty('disabled', true)
    fireEvent.change(view.getByRole('textbox', { name: labels.evidenceInput }), { target: { value: 'operator checked the sample' } })
    expect(view.getByRole('button', { name: labels.confirmStep })).toHaveProperty('disabled', false)
    fireEvent.click(view.getByRole('button', { name: labels.stopRun }))
    fireEvent.click(view.getByRole('button', { name: labels.confirmStep }))
    expect(onStop).toHaveBeenCalledWith('run-wait')
    expect(onConfirmStep).toHaveBeenCalledWith({ runId: 'run-wait', evidence: ['operator checked the sample'], stepId: 'step-2', operationId: 'op-2' })

    view.rerender(<LabRunDetailView run={{ runId: 'run-running', planId: 'plan-1', runStatus: 'RUNNING' }} artifacts={[]} labels={labels} onStop={onStop} onConfirmStep={onConfirmStep} />)
    expect(view.getByRole('button', { name: labels.stopRun })).toHaveProperty('disabled', false)
    expect(view.queryByRole('button', { name: labels.confirmStep })).toBeNull()

    view.rerender(<LabRunDetailView run={{ runId: 'run-wait', planId: 'plan-1', runStatus: 'WAITING_CONFIRMATION' }} artifacts={[]} labels={labels} />)
    expect(view.getByRole('button', { name: labels.stopRun })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: labels.confirmStep })).toHaveProperty('disabled', true)
  })
})
