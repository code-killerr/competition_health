// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabAgentLifecycleView, type LabLifecycleLabels } from '../src/client/LabAgentLifecycleView.tsx'
import { LAB_FIXTURE_IDS, createLabFixtureAdapter } from '../src/client/index.ts'

afterEach(cleanup)

const labels: LabLifecycleLabels = {
  title: 'Agent lifecycle', goal: 'Goal', knowledge: 'Knowledge', capabilityGap: 'Capability gap', workflow: 'Workflow', skill: 'Skill', execution: 'Execution', replan: 'Replan', resultAssessment: 'Result assessment', report: 'Report', objective: 'Objective', missingInputs: 'Missing inputs', sources: 'Sources', citations: 'Citations', unavailable: 'Unavailable', steps: 'Steps', unresolved: 'Unresolved', validation: 'Validation', revision: 'Revision', currentStep: 'Current step', reason: 'Reason', verdict: 'Verdict', evidence: 'Evidence', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', empty: '—', listSeparator: ', ', valid: 'Valid', invalid: 'Invalid', status: value => value,
}

describe('LabAgentLifecycleView', () => {
  it('renders every typed lifecycle projection from the deterministic fixture', () => {
    const adapter = createLabFixtureAdapter('replan')
    const onCitationOpen = vi.fn()
    render(<LabAgentLifecycleView events={adapter.events} labels={labels} knowledgeAvailable onCitationOpen={onCitationOpen} />)

    expect(screen.getByText('Goal')).toBeTruthy()
    expect(screen.getByText('Workflow')).toBeTruthy()
    expect(screen.getByText('Replan')).toBeTruthy()
    expect(screen.getByText('Result assessment')).toBeTruthy()
    expect(screen.getByText('plan-fixture-replacement')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Open citation/ }))
    expect(onCitationOpen).toHaveBeenCalledWith(expect.objectContaining({ projectId: LAB_FIXTURE_IDS.projectId, location: 'page:1/block:1' }))
  })

  it('keeps citation metadata visible when Knowledge is unavailable', () => {
    const adapter = createLabFixtureAdapter('success')
    render(<LabAgentLifecycleView events={adapter.events} labels={labels} knowledgeAvailable={false} />)

    expect(screen.getByText('Knowledge unavailable: fixture-protocol.pdf · page:1/block:1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Open citation/ })).toBeNull()
  })

  it('renders a capability gap from the typed unavailable projection', () => {
    const adapter = createLabFixtureAdapter('waiting')
    render(<LabAgentLifecycleView events={adapter.events} labels={labels} knowledgeAvailable />)

    expect(screen.getByText('Capability gap')).toBeTruthy()
    expect(screen.getByText('Fixture capability is unavailable')).toBeTruthy()
  })
})
