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
})
