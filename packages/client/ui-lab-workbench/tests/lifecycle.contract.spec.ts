import { describe, expect, it } from 'vitest'
import { LabUiContext } from '../src/client/LabUiContext.ts'
import { consumeLabPresentationIntent } from '../src/client/LabPresentationConsumer.ts'
import { createLabFixtureAdapter } from '../src/client/fixtures/adapter.ts'
import { validateLabPresentationIntent, type LabPresentationScope } from '../src/client/lifecycle.ts'
import { vi } from 'vitest'

const scope: LabPresentationScope = {
  activeProjectId: 'project-1',
  registeredViews: ['projects', 'knowledge', 'devices', 'project', 'experiment', 'run', 'evidence', 'citation'],
  projectIds: ['project-1'],
  experiments: [{ projectId: 'project-1', experimentId: 'experiment-1' }],
  runs: [{ projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1' }],
  artifacts: [{ runId: 'run-1', artifactId: 'artifact-1' }],
  citations: [{ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1' }],
}

describe('Agent lifecycle and presentation intent contract', () => {
  it('accepts an authorized Run and citation destination', () => {
    expect(validateLabPresentationIntent({ view: 'run', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1' }, scope)).toEqual({
      accepted: true,
      intent: { view: 'run', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1' },
    })
    expect(validateLabPresentationIntent({ view: 'citation', projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2' }, scope)).toMatchObject({ accepted: true })
  })

  it('rejects unknown views and records outside the active Project', () => {
    expect(validateLabPresentationIntent({ view: 'arbitrary-url', url: 'https://example.test' }, scope)).toMatchObject({ accepted: false, code: 'UNKNOWN_VIEW' })
    expect(validateLabPresentationIntent({ view: 'run', projectId: 'project-2', experimentId: 'experiment-1', runId: 'run-1' }, scope)).toMatchObject({ accepted: false, code: 'PROJECT_SCOPE_MISMATCH' })
    expect(validateLabPresentationIntent({ view: 'run', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-2' }, scope)).toMatchObject({ accepted: false, code: 'RECORD_NOT_AUTHORIZED' })
  })

  it('rejects an Artifact that is not attached to the addressed Run', () => {
    expect(validateLabPresentationIntent({ view: 'evidence', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1', artifactId: 'artifact-2' }, scope)).toMatchObject({ accepted: false, code: 'RECORD_NOT_AUTHORIZED' })
  })

  it('consumes fixture presentation intents for Knowledge, Experiment, Run, Evidence and citation', () => {
    const fixture = createLabFixtureAdapter('success')
    const ui = new LabUiContext()
    const openAppView = vi.fn()
    const target = { ui, openAppView }
    expect(consumeLabPresentationIntent({ view: 'knowledge', projectId: 'project-fixture' }, fixture.presentationScope, target)).toMatchObject({ accepted: true })
    expect(openAppView).toHaveBeenLastCalledWith('lab-knowledge')
    expect(consumeLabPresentationIntent({ view: 'experiment', projectId: 'project-fixture', experimentId: 'experiment-fixture' }, fixture.presentationScope, target)).toMatchObject({ accepted: true })
    expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-fixture', activeExperimentId: 'experiment-fixture', projectPage: 'planning' })
    expect(consumeLabPresentationIntent({ view: 'run', projectId: 'project-fixture', experimentId: 'experiment-fixture', runId: 'run-fixture' }, fixture.presentationScope, target)).toMatchObject({ accepted: true })
    expect(ui.snapshot()).toMatchObject({ activeRunId: 'run-fixture', projectPage: 'execution' })
    expect(consumeLabPresentationIntent({ view: 'evidence', projectId: 'project-fixture', experimentId: 'experiment-fixture', runId: 'run-fixture', artifactId: 'artifact-fixture' }, fixture.presentationScope, target)).toMatchObject({ accepted: true })
    expect(openAppView).toHaveBeenLastCalledWith('lab-project')
    expect(ui.snapshot().activeArtifactId).toBe('artifact-fixture')
    expect(consumeLabPresentationIntent({ view: 'citation', projectId: 'project-fixture', documentId: 'document-fixture', versionId: 'version-fixture', location: 'page:1/block:1' }, fixture.presentationScope, target)).toMatchObject({ accepted: true })
    expect(ui.snapshot().activeCitation).toMatchObject({ projectId: 'project-fixture', location: 'page:1/block:1' })
  })

  it('routes the legacy projects presentation intent to the global monitor', () => {
    const fixture = createLabFixtureAdapter('success')
    const openAppView = vi.fn()
    const result = consumeLabPresentationIntent({ view: 'projects' }, fixture.presentationScope, { ui: new LabUiContext(), openAppView })
    expect(result).toMatchObject({ accepted: true })
    expect(openAppView).toHaveBeenCalledWith('lab-monitor')
  })

  it('rejects an invalid Agent destination without changing the current selection, while manual navigation remains available', () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    const openAppView = vi.fn()
    const result = consumeLabPresentationIntent({ view: 'run', projectId: 'project-2', experimentId: 'experiment-1', runId: 'run-1' }, scope, { ui, openAppView })
    expect(result).toMatchObject({ accepted: false, code: 'PROJECT_SCOPE_MISMATCH' })
    expect(openAppView).not.toHaveBeenCalled()
    expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', projectPage: 'overview' })
    ui.openProjectPage('evidence')
    expect(ui.snapshot().projectPage).toBe('evidence')
  })
})
