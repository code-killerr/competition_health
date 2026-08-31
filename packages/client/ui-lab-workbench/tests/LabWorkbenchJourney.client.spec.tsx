// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LabCommandCard } from '../src/client/LabCommandCard.tsx'
import { LabProjectShellView } from '../src/client/LabProjectShellView.tsx'
import { LabArtifactPreview } from '../src/client/LabArtifactPreview.tsx'
import { LabCitationLink } from '../src/client/LabCitationLink.tsx'
import { LabResultReportView } from '../src/client/LabResultReportView.tsx'
import { LabRunComparisonView } from '../src/client/LabRunComparisonView.tsx'
import { LabRunResultView, type LabRunResultLabels } from '../src/client/LabRunResultView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'
import type { LabCitationSelection } from '../src/client/LabUiContext.ts'
import { zh } from '../src/client/locales.ts'
import type { LabArtifactRecord, LabProjectView, LabReportView, LabRun } from '../src/client/api.ts'
import type { LabQueryState } from '../src/client/adapter.ts'

afterEach(cleanup)

const runLabels: LabRunResultLabels = {
  runTitle: 'Run',
  resultTitle: 'Result',
  runStatus: 'Run status',
  resultStatus: 'Result status',
  currentStep: 'Current step',
  feedback: 'Feedback',
  replanReason: 'Replan reason',
  verdict: 'Verdict',
  evidence: 'Evidence',
  assessedBy: 'Assessed by',
  assessedAt: 'Assessed at',
  humanQcGate: 'Human QC required',
  noValue: '—',
  statusLabel: value => value,
}

const previewLabels = {
  open: 'Open artifact',
  loading: 'Loading',
  unavailable: 'Preview unavailable',
  text: 'Text preview',
  json: 'JSON preview',
  image: 'Image preview',
  unsupported: 'Unsupported preview',
  metadata: 'Metadata',
} as const

const artifact: LabArtifactRecord = {
  artifactId: 'artifact-1',
  runId: 'run-1',
  kind: 'file',
  displayName: 'raw.bin',
  uri: 'lab-artifact://raw.bin',
  mediaType: 'application/octet-stream',
  size: 12,
  digest: 'sha256:test',
  createdAt: 1,
}

const run: LabRun = {
  runId: 'run-1',
  planId: 'plan-1',
  runStatus: 'WAITING_CONFIRMATION',
  currentStepId: 'step-1',
  feedback: { status: 'WAITING_CONFIRMATION', valid: false, summary: 'Needs confirmation', issues: [], replanRequested: false },
}

const report: LabReportView = {
  runId: 'run-1',
  experimentId: 'experiment-1',
  planId: 'plan-1',
  status: 'WAITING_CONFIRMATION',
  criteria: ['signal is within tolerance'],
  observations: [],
  artifacts: [artifact],
  feedback: { status: 'WAITING_CONFIRMATION', valid: false, summary: 'Review required', issues: [], replanRequested: false },
  assessment: { status: 'HUMAN_QC', verdict: 'INCONCLUSIVE', method: 'deterministic-check', evidenceIds: ['artifact-1'], assessedBy: 'reviewer-1', assessedAt: 10, humanQcRequired: true },
}

function queryState(state: LabQueryState<LabProjectView>): Parameters<typeof LabProjectShellView>[0] {
  const ui = new LabUiContext()
  ui.selectProject('project-1')
  return {
    ui,
    loadProject: async () => state,
    listRuns: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No runs' }),
    listArtifacts: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No artifacts' }),
    loadRunReport: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No report' }),
    openArtifact: async () => artifact,
    loadExperimentReviews: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No plan reviews' }),
    compareRuns: async () => ({ state: 'empty', code: 'NO_RECORDS', message: 'No comparison' }),
    retryRun: async () => run,
    openSession: () => {},
    t: (key: string) => key,
  } as unknown as Parameters<typeof LabProjectShellView>[0]
}

describe('LabWorkbench browser journey', () => {
  it('shows empty, failed and waiting Host query states', async () => {
    const empty = queryState({ state: 'empty', code: 'NO_RECORDS', message: 'No project' })
    const view = render(<LabProjectShellView {...empty} />)
    await waitFor(() => { expect(screen.getByText('stateNoProject')).toBeTruthy() })

    const failed = queryState({ state: 'failed', code: 'PROVIDER_UNAVAILABLE', message: 'Host unavailable', retryable: true })
    view.rerender(<LabProjectShellView {...failed} />)
    await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('PROVIDER_UNAVAILABLE: Host unavailable') })

    const waiting = queryState({ state: 'waiting', code: 'APPROVAL_REQUIRED', message: 'Approval required' })
    view.rerender(<LabProjectShellView {...waiting} />)
    await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('Approval required') })
  })

  it('keeps replan, conflict, unsupported artifact, comparison, report and citation actions visible', () => {
    const ui = new LabUiContext()
    const onCitation = vi.fn((citation: LabCitationSelection) => { ui.openCitation(citation) })
    const replanRun: LabRun = { ...run, runStatus: 'FAILED', replanRequest: { runId: 'run-1', stepId: 'step-1', reason: 'Device receipt is invalid' } }
    render(
      <>
        <LabRunResultView run={run} assessment={{ status: 'HUMAN_QC', evidenceIds: [], humanQcRequired: true }} labels={runLabels} />
        <LabRunResultView run={replanRun} labels={runLabels} />
        <LabCommandCard {...({ node: { kind: 'command', seq: 1, time: 1, commandId: 'command-1' as never, name: 'run-start', args: null, outcome: { kind: 'error', text: 'Concurrent revision conflict' } }, openWorkbench: () => {}, t: (key: string) => String(zh[key as keyof typeof zh] ?? key), sessionId: 'session-1' as never } as unknown as Parameters<typeof LabCommandCard>[0])} />
        <LabArtifactPreview artifact={artifact} preview={{ kind: 'unsupported' }} labels={previewLabels} />
        <LabRunComparisonView comparison={{ leftRunId: 'run-1', rightRunId: 'run-2', status: { left: 'FAILED', right: 'COMPLETED' }, durationMs: { left: 100, right: 200 }, parameters: { left: [], right: [] }, stepStatuses: [{ stepId: 'step-1', left: 'FAILED', right: 'COMPLETED' }], observations: [], artifactCounts: { left: 1, right: 2 }, artifactMetadata: { left: [], right: [] } }} labels={{ title: 'Run comparison', left: 'Left', right: 'Right', status: 'Status', duration: 'Duration', parameters: 'Parameters', steps: 'Steps', observations: 'Observations', artifacts: 'Artifacts', artifactMetadata: 'Artifact metadata', valid: 'Valid', operation: 'Operation', artifactIds: 'Artifact references', noValue: '—' }} />
        <LabResultReportView report={report} labels={{ title: 'Report', experiment: 'Experiment', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', skillRevisions: 'Skill revisions', citations: 'Citations', observationIds: 'Observation records', artifactIds: 'Artifact records', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', humanQc: 'Human QC required', humanQcAction: 'Review', humanQcUnavailable: 'Review unavailable', noValue: '—', noCriteria: 'No criteria' }} />
        <LabCitationLink citation={{ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2' }} origin='report' available onOpen={onCitation} label='Open report citation' unavailableLabel='Knowledge unavailable' />
      </>,
    )

    expect(screen.getByText('waiting')).toBeTruthy()
    expect(screen.getByText('replanning')).toBeTruthy()
    expect(screen.getByText('Device receipt is invalid')).toBeTruthy()
    expect(screen.getByText('Concurrent revision conflict')).toBeTruthy()
    expect(screen.getByText('Unsupported preview')).toBeTruthy()
    expect(screen.getByText('run-1')).toBeTruthy()
    expect(screen.getByText(/run-2/)).toBeTruthy()
    expect(screen.getAllByText('Human QC required')).toHaveLength(2)
    expect(screen.getByText('signal is within tolerance')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Open report citation/ }))
    expect(onCitation).toHaveBeenCalledOnce()
    expect(ui.snapshot().activeCitation?.location).toBe('page:2')
  })
})
