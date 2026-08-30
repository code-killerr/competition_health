// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { LabAgentLifecycleView, type LabLifecycleLabels } from '../src/client/LabAgentLifecycleView.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'
import { consumeLabPresentationIntent } from '../src/client/LabPresentationConsumer.ts'
import { createLabFixtureAdapter, parseLabFixtureEvents, serializeLabFixtureEvents } from '../src/client/fixtures/adapter.ts'

afterEach(cleanup)

const labels: LabLifecycleLabels = {
  title: 'Agent lifecycle', goal: 'Goal', knowledge: 'Knowledge', capabilityGap: 'Capability gap', workflow: 'Workflow', skill: 'Skill', execution: 'Execution', replan: 'Replan', resultAssessment: 'Result assessment', report: 'Report', objective: 'Objective', missingInputs: 'Missing inputs', sources: 'Sources', citations: 'Citations', unavailable: 'Unavailable', steps: 'Steps', unresolved: 'Unresolved', validation: 'Validation', revision: 'Revision', currentStep: 'Current step', reason: 'Reason', verdict: 'Verdict', evidence: 'Evidence', openCitation: 'Open citation', citationUnavailable: 'Knowledge unavailable', empty: '—', listSeparator: ', ', valid: 'Valid', invalid: 'Invalid', status: value => value,
}

describe('Lab event replay snapshot', () => {
  it('rebuilds Agent cards and the Agent-selected workbench state from one event sequence', () => {
    const fixture = createLabFixtureAdapter('replan')
    const events = parseLabFixtureEvents(serializeLabFixtureEvents(fixture.events))
    const ui = new LabUiContext()
    const openAppView = vi.fn()
    const validation = consumeLabPresentationIntent({ view: 'run', projectId: 'project-fixture', experimentId: 'experiment-fixture', runId: 'run-fixture' }, fixture.presentationScope, { ui, openAppView })
    const view = render(<LabAgentLifecycleView events={events} labels={labels} knowledgeAvailable />)

    expect({
      validation: validation.accepted,
      cards: Array.from(view.container.querySelectorAll('h3')).map(item => item.textContent),
      agentSelection: ui.snapshot(),
      openedViews: openAppView.mock.calls,
    }).toMatchInlineSnapshot(`
      {
        "agentSelection": {
          "activeExperimentId": "experiment-fixture",
          "activeProjectId": "project-fixture",
          "activeRunId": "run-fixture",
          "projectPage": "execution",
        },
        "cards": [
          "Goal",
          "Knowledge",
          "Workflow",
          "Skill",
          "Execution",
          "Replan",
          "Result assessment",
        ],
        "openedViews": [
          [
            "lab-project",
          ],
        ],
        "validation": true,
      }
    `)
  })

  it('keeps manual navigation as the final user choice after replay', () => {
    const fixture = createLabFixtureAdapter('success')
    const ui = new LabUiContext()
    const result = consumeLabPresentationIntent({ view: 'run', projectId: 'project-fixture', experimentId: 'experiment-fixture', runId: 'run-fixture' }, fixture.presentationScope, { ui, openAppView: () => {} })
    expect(result.accepted).toBe(true)
    ui.openProjectPage('evidence')
    expect(ui.snapshot().projectPage).toBe('evidence')
  })
})
