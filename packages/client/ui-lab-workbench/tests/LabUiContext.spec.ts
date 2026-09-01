import { describe, expect, it } from 'vitest'
import { LabUiContext } from '../src/client/LabUiContext.ts'

describe('LabUiContext presentation selection', () => {
  it('stores an authorized citation target without copying business records', () => {
    const ui = new LabUiContext()
    const snapshots: string[] = []
    ui.subscribe(() => { snapshots.push(ui.snapshot().activeCitation?.location ?? '') })

    ui.openCitation({ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:3' })

    expect(ui.snapshot()).toMatchObject({
      activeProjectId: 'project-1',
      activeCitation: { projectId: 'project-1', location: 'page:3' },
    })
    expect(snapshots).toEqual(['page:3'])
  })

  it('clears a previous citation target when the user chooses another Project', () => {
    const ui = new LabUiContext()
    ui.openCitation({ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1' })

    ui.selectProject('project-2')

    expect(ui.snapshot().activeProjectId).toBe('project-2')
    expect(ui.snapshot().activeCitation).toBeUndefined()
  })

  it('keeps an Artifact selection addressable and clears it when its Run changes', () => {
    const ui = new LabUiContext()
    ui.selectRun('run-1')
    ui.selectArtifact('artifact-1')

    expect(ui.snapshot().activeArtifactId).toBe('artifact-1')
    ui.selectRun('run-2')
    expect(ui.snapshot().activeArtifactId).toBeUndefined()
  })

  it('clears the Project selection when its Workspace has no mapped Project', () => {
    const ui = new LabUiContext()
    ui.selectWorkspace('workspace-1')
    ui.selectProject('project-1')
    ui.selectExperiment('experiment-1')
    ui.selectRun('run-1')
    ui.selectArtifact('artifact-1')

    ui.selectWorkspace('workspace-2')
    ui.clearProjectSelection()

    expect(ui.snapshot()).toEqual({ activeWorkspaceId: 'workspace-2', projectPage: 'overview' })
  })

  it('clears descendant selections when a different Project is selected', () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    ui.selectExperiment('experiment-1')
    ui.selectRun('run-1')
    ui.selectArtifact('artifact-1')

    ui.selectProject('project-2')

    expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-2' })
    expect(ui.snapshot().activeExperimentId).toBeUndefined()
    expect(ui.snapshot().activeRunId).toBeUndefined()
    expect(ui.snapshot().activeArtifactId).toBeUndefined()
  })

  it('restores each Project destination and descendant selection independently', () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    ui.selectExperiment('experiment-1')
    ui.selectRun('run-1')
    ui.selectArtifact('artifact-1')
    ui.openProjectPage('evidence')

    ui.selectProject('project-2')
    ui.openProjectPage('planning')
    ui.selectProject('project-1')

    expect(ui.snapshot()).toMatchObject({ activeProjectId: 'project-1', activeExperimentId: 'experiment-1', activeRunId: 'run-1', activeArtifactId: 'artifact-1', projectPage: 'evidence' })
  })
})
