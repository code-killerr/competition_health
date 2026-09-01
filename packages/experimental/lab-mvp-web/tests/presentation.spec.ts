import { describe, expect, it } from 'vitest'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { validateHostPresentationIntent, type LabHostPresentationScope } from '../src/presentation.ts'

const scope: LabHostPresentationScope = {
  activeProjectId: 'project-1',
  registeredViews: ['projects', 'knowledge', 'devices', 'project', 'experiment', 'run', 'evidence', 'citation'],
  projects: ['project-1'],
  experiments: [{ projectId: 'project-1', experimentId: 'experiment-1' }],
  runs: [{ projectId: 'project-1', experimentId: 'experiment-1', runId: brandId<'RunId'>('run-1') }],
  artifacts: [{ runId: brandId<'RunId'>('run-1'), artifactId: brandId<'ArtifactId'>('artifact-1') }],
  citations: [{ projectId: 'project-1', documentId: 'document-1', versionId: 'version-1' }],
}

describe('Host presentation intent validation', () => {
  it('accepts registered records inside the active Project', () => {
    expect(validateHostPresentationIntent({ view: 'run', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1' }, scope)).toEqual({
      accepted: true,
      intent: { view: 'run', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1' },
    })
  })

  it('rejects arbitrary URLs and cross-Project records', () => {
    expect(validateHostPresentationIntent({ view: 'https://example.test' }, scope)).toMatchObject({ accepted: false, code: 'UNKNOWN_VIEW' })
    expect(validateHostPresentationIntent({ view: 'run', projectId: 'project-2', experimentId: 'experiment-1', runId: 'run-1' }, scope)).toMatchObject({ accepted: false, code: 'PROJECT_SCOPE_MISMATCH' })
    expect(validateHostPresentationIntent({ view: 'evidence', projectId: 'project-1', experimentId: 'experiment-1', runId: 'run-1', artifactId: 'artifact-2' }, scope)).toMatchObject({ accepted: false, code: 'RECORD_NOT_AUTHORIZED' })
  })
})
