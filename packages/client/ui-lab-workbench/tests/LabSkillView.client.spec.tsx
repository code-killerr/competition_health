// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabSkillView, type LabSkillLabels } from '../src/client/LabSkillView.tsx'
import { LAB_FIXTURE_IDS, createLabFixtureAdapter } from '../src/client/index.ts'

afterEach(cleanup)

const labels: LabSkillLabels = {
  title: 'Lab Skill', status: 'Status', purpose: 'Purpose', revision: 'Revision', definition: 'Definition', validation: 'Validation', changes: 'Revision changes', noChanges: 'No changes', noValue: '—', validate: 'Validate', approve: 'Approve', activate: 'Activate', actionUnavailable: 'Review action unavailable', valid: 'Valid', invalid: 'Invalid', statusLabel: value => value,
}

describe('LabSkillView', () => {
  it('renders a revision diff and emits review actions without changing state locally', async () => {
    const adapter = createLabFixtureAdapter('success')
    const revisions = await adapter.listSkillRevisions(LAB_FIXTURE_IDS.experimentId)
    expect(revisions.state).toBe('ready')
    if (revisions.state !== 'ready') return
    const onReviewAction = vi.fn()
    render(<LabSkillView revision={revisions.value[0]!} state='validated' validation={{ valid: true, issues: [] }} changes={[{ field: 'purpose', before: 'old', after: 'new' }]} labels={labels} onReviewAction={onReviewAction} />)

    expect(screen.getByText('old → new')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onReviewAction).toHaveBeenCalledWith('approve')
    expect(screen.getByText('validated')).toBeTruthy()
  })

  it('keeps activation disabled until the Host projection is approved', () => {
    const revision = { skillId: 'skill-1', revisionId: 'revision-1', name: 'Draft skill', status: 'DRAFT', purpose: 'Test', revision: 1 } as const
    render(<LabSkillView revision={revision} state='draft' labels={labels} />)
    expect(screen.getByRole('button', { name: 'Activate' }).hasAttribute('disabled')).toBe(true)
  })
})
