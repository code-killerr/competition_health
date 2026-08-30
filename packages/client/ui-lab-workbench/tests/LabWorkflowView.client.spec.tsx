// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { LabWorkflowView, type LabWorkflowLabels } from '../src/client/LabWorkflowView.tsx'
import { LAB_FIXTURE_IDS, createLabFixtureAdapter } from '../src/client/index.ts'

afterEach(cleanup)

const labels: LabWorkflowLabels = {
  title: 'Experiment Workflow', revision: 'Revision', status: 'Status', steps: 'Steps', dependencies: 'Dependencies', inputs: 'Inputs', outputs: 'Outputs', skillRevision: 'Skill revision', operation: 'Operation', completion: 'Completion', failurePolicy: 'Failure policy', validation: 'Validation', unresolved: 'Unresolved', noValue: '—', noSteps: 'No steps', valid: 'Valid', invalid: 'Invalid', listSeparator: ', ', statusLabel: value => value,
}

describe('LabWorkflowView', () => {
  it('renders graph step details and validator findings from the fixture', async () => {
    const adapter = createLabFixtureAdapter('success')
    const workflow = await adapter.getWorkflow(LAB_FIXTURE_IDS.experimentId)
    expect(workflow.state).toBe('ready')
    if (workflow.state !== 'ready') return

    render(<LabWorkflowView workflow={{ ...workflow.value, steps: [{ ...workflow.value.steps[0], dependencies: ['step-previous'], requiredInputs: ['sample'], completionCriteria: ['measurement is recorded'], failurePolicy: 'REPLAN' }] }} validation={{ valid: false, issues: [{ code: 'MISSING_INPUT', message: 'sample is unresolved' }] }} labels={labels} />)
    expect(screen.getByText('Collect fixture observation')).toBeTruthy()
    expect(screen.getByText('step-previous')).toBeTruthy()
    expect(screen.getByText('measurement is recorded')).toBeTruthy()
    expect(screen.getByText('REPLAN')).toBeTruthy()
    expect(screen.getByText('Invalid')).toBeTruthy()
  })

  it('renders an honest empty workflow state', () => {
    render(<LabWorkflowView workflow={{ planId: 'plan-empty', experimentId: 'experiment-1', revision: 1, status: 'DRAFT', steps: [], skillRevisionIds: [], unresolved: [] }} labels={labels} />)
    expect(screen.getByText('No steps')).toBeTruthy()
  })
})
