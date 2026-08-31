// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabResultReportView } from '../src/client/LabResultReportView.tsx'

afterEach(cleanup)

describe('LabResultReportView', () => {
  it('renders structured assessment fields, provenance and an explicit human QC gate', () => {
    render(<LabResultReportView report={{ runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'WAITING_CONFIRMATION', criteria: ['signal is within tolerance'], skillRevisionIds: ['skill-revision-1'], citations: [{ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2', sourceName: 'Protocol' }], observations: [{ stepId: 'step-1', operationId: 'operation-1', valid: true, evidence: [], artifactIds: ['artifact-1'], status: 'COMPLETED' }], artifacts: [{ artifactId: 'artifact-1', runId: 'run-1', kind: 'json', displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 12, digest: 'sha256:test', createdAt: 1 }], feedback: { status: 'WAITING_CONFIRMATION', valid: false, summary: 'Review required', issues: [], replanRequested: false }, assessment: { status: 'HUMAN_QC', verdict: 'INCONCLUSIVE', method: 'deterministic-check', evidenceIds: ['artifact-1'], assessedBy: 'reviewer-1', assessedAt: 10, humanQcRequired: true } }} labels={{ title: 'Report', experiment: 'Experiment', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', skillRevisions: 'Skill revisions', citations: 'Citations', observationIds: 'Observation records', artifactIds: 'Artifact records', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', humanQc: 'Human QC required', humanQcAction: 'Review', humanQcUnavailable: 'Review unavailable', noValue: '—', noCriteria: 'No criteria' }} />)

    expect(screen.getByText('deterministic-check')).toBeTruthy()
    expect(screen.getByText('signal is within tolerance')).toBeTruthy()
    expect(screen.getByText('Human QC required')).toBeTruthy()
    expect(screen.getByText('skill-revision-1')).toBeTruthy()
    expect(screen.getByText('operation-1')).toBeTruthy()
    expect(screen.getByText(/result\.json/)).toBeTruthy()
    expect(screen.getByText(/Protocol/)).toBeTruthy()
    expect(screen.queryByText(/"runId"/)).toBeNull()
  })

  it('opens a report citation only through the typed callback', () => {
    const onOpenCitation = vi.fn()
    render(<LabResultReportView report={{ runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'COMPLETED', observations: [], artifacts: [], citations: [{ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2' }], feedback: { status: 'COMPLETED', valid: true, summary: 'Ready', issues: [], replanRequested: false } }} labels={{ title: 'Report', experiment: 'Experiment', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', skillRevisions: 'Skill revisions', citations: 'Citations', observationIds: 'Observation records', artifactIds: 'Artifact records', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', humanQc: 'Human QC required', humanQcAction: 'Review', humanQcUnavailable: 'Review unavailable', noValue: '—', noCriteria: 'No criteria' }} knowledgeAvailable onOpenCitation={onOpenCitation} />)
    fireEvent.click(screen.getByRole('button', { name: /Open citation/ }))
    expect(onOpenCitation).toHaveBeenCalledWith({ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2' })
  })
})
