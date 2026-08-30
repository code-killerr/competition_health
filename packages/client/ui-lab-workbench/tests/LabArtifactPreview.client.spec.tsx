// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabArtifactPreview, type LabArtifactPreviewLabels } from '../src/client/LabArtifactPreview.tsx'

afterEach(cleanup)

const labels: LabArtifactPreviewLabels = { open: 'Open through Host', unavailable: 'Preview unavailable', text: 'Text preview', json: 'JSON preview', image: 'Image preview', unsupported: 'Unsupported', metadata: 'Metadata' }
const artifact = { artifactId: 'artifact-1', runId: 'run-1', kind: 'json' as const, displayName: 'result.json', uri: 'lab-artifact://result.json', mediaType: 'application/json', size: 12, digest: 'sha256:test', createdAt: 1 }

describe('LabArtifactPreview', () => {
  it('renders safe text and JSON previews and delegates opening to the Host action', () => {
    const onOpen = vi.fn()
    const view = render(<LabArtifactPreview artifact={artifact} preview={{ kind: 'json', content: { value: 1, safe: true } }} labels={labels} onOpen={onOpen} />)
    expect(screen.getByLabelText(labels.json).textContent).toContain('safe')
    fireEvent.click(screen.getByRole('button', { name: labels.open }))
    expect(onOpen).toHaveBeenCalledWith(artifact)
    view.rerender(<LabArtifactPreview artifact={{ ...artifact, kind: 'text', displayName: 'notes.txt', mediaType: 'text/plain' }} preview={{ kind: 'text', content: '<not markup>' }} labels={labels} />)
    expect(screen.getByLabelText(labels.text).textContent).toBe('<not markup>')
  })

  it('shows an explicit unavailable preview instead of opening the artifact URI', () => {
    render(<LabArtifactPreview artifact={artifact} labels={labels} />)
    expect(screen.getByText(labels.unavailable)).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
