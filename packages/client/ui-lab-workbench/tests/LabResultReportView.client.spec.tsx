// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LabResultReportView } from '../src/client/LabResultReportView.tsx'

afterEach(cleanup)

describe('LabResultReportView', () => {
  it('renders structured assessment fields and an explicit human QC gate', () => {
    render(<LabResultReportView report={{ runId: 'run-1', experimentId: 'experiment-1', planId: 'plan-1', status: 'WAITING_CONFIRMATION', criteria: ['signal is within tolerance'], observations: [], artifacts: [], feedback: { status: 'WAITING_CONFIRMATION', valid: false, summary: 'Review required', issues: [], replanRequested: false }, assessment: { status: 'HUMAN_QC', verdict: 'INCONCLUSIVE', method: 'deterministic-check', evidenceIds: ['artifact-1'], assessedBy: 'reviewer-1', assessedAt: 10, humanQcRequired: true } }} labels={{ title: 'Report', criteria: 'Criteria', method: 'Method', verdict: 'Verdict', plan: 'Plan', run: 'Run', evidence: 'Evidence', actor: 'Actor', assessedAt: 'Assessed at', observations: 'Observations', artifacts: 'Artifacts', humanQc: 'Human QC required', noValue: '—', noCriteria: 'No criteria' }} />)

    expect(screen.getByText('deterministic-check')).toBeTruthy()
    expect(screen.getByText('signal is within tolerance')).toBeTruthy()
    expect(screen.getByText('Human QC required')).toBeTruthy()
    expect(screen.queryByText(/"runId"/)).toBeNull()
  })
})

