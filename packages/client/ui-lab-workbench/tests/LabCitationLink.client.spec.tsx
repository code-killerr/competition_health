// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabCitationLink } from '../src/client/LabCitationLink.tsx'

const citation = { projectId: 'project-1', documentId: 'document-1', versionId: 'version-1', location: 'page:2/block:4' } as const

afterEach(cleanup)

describe('LabCitationLink', () => {
  it('opens the authorized citation through the typed presentation action', () => {
    const onOpen = vi.fn()
    render(<LabCitationLink citation={citation} origin='plan' available onOpen={onOpen} label='Open citation' unavailableLabel='Knowledge unavailable' />)

    fireEvent.click(screen.getByRole('button', { name: /Open citation/ }))
    expect(onOpen).toHaveBeenCalledWith(citation)
    expect(screen.getByRole('button').getAttribute('data-lab-citation-origin')).toBe('plan')
  })

  it('preserves citation location when Knowledge is unavailable', () => {
    render(<LabCitationLink citation={citation} origin='report' available={false} label='Open citation' unavailableLabel='Knowledge unavailable' />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Knowledge unavailable: page:2/block:4')).toBeTruthy()
    expect(screen.getByText('Open citation')).toBeTruthy()
  })
})
