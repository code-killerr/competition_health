// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { KnowledgeWorkspace, type KnowledgeWorkspaceProps } from '../src/client/KnowledgeWorkspace.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Knowledge workspace browser flow', () => {
  it('imports a PDF, retrieves a citation, confirms an SOP and publishes it', async () => {
    const commands: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body
      if (typeof body !== 'string') throw new Error('test request body is not a string')
      const payload = JSON.parse(body) as { readonly command: string }
      commands.push(payload.command)
      const value = (() => {
        switch (payload.command) {
          case 'snapshot':
            return { knowledgeCapability: { state: 'available' }, knowledge: [] }
          case 'knowledge-import':
            return { documentId: 'document-1', versionId: 'version-1', status: 'READY', metadata: { sourceName: 'fixture.pdf' } }
          case 'knowledge-search':
            return { results: [{ citationId: 'citation-1', documentId: 'document-1', versionId: 'version-1', location: 'page:1/block:1', excerpt: 'Use the cited source.', confirmed: true }] }
          case 'knowledge-sop-create':
            return sopValue('DRAFT')
          case 'knowledge-fact-confirm':
            return null
          case 'knowledge-sop-update':
            return sopValue('REVIEWED')
          case 'knowledge-sop-publish':
            return sopValue('PUBLISHED')
          default:
            throw new Error('unexpected command: ' + payload.command)
        }
      })()
      return { ok: true, json: async () => ({ ok: true, result: { kind: payload.command, value } }) }
    }))

    const onSourceToggle = vi.fn()
    const onCitationAvailable = vi.fn()
    const props = {
      sessionId: 'session-1',
      projectId: 'project-1',
      t: (key: keyof typeof zh): string => zh[key],
      onSourceToggle,
      onCitationAvailable,
    } as unknown as KnowledgeWorkspaceProps
    render(<KnowledgeWorkspace {...props} />)

    await waitFor(() => { expect(commands).toContain('snapshot') })
    const file = new File(['%PDF-1.7 fixture'], 'fixture.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText(zh.fileInput), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: zh.importFile }))
    await waitFor(() => { expect(screen.getByText('READY')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: zh.addToProject }))
    expect(onSourceToggle).toHaveBeenCalledWith({ documentId: 'document-1', versionId: 'version-1' })

    fireEvent.change(screen.getByLabelText(zh.query), { target: { value: 'cited source' } })
    fireEvent.click(screen.getByRole('button', { name: zh.searchAction }))
    await waitFor(() => { expect(screen.getByText('citation-1')).toBeTruthy() })
    expect(onCitationAvailable).toHaveBeenCalledWith(expect.objectContaining({ citationId: 'citation-1' }))

    fireEvent.click(screen.getByRole('button', { name: zh.createSop }))
    await waitFor(() => { expect(screen.getByText(/DRAFT/)).toBeTruthy() })
    fireEvent.change(screen.getByLabelText(zh.reviewer), { target: { value: 'human-reviewer' } })
    fireEvent.click(screen.getByRole('button', { name: zh.confirmAndReview }))
    await waitFor(() => { expect(screen.getByText(/REVIEWED/)).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: zh.publish }))
    await waitFor(() => { expect(screen.getByText(/PUBLISHED/)).toBeTruthy() })

    expect(commands).toEqual([
      'snapshot',
      'knowledge-import',
      'knowledge-search',
      'knowledge-sop-create',
      'knowledge-fact-confirm',
      'knowledge-sop-update',
      'knowledge-sop-publish',
    ])
  })
})

function sopValue(status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED'): unknown {
  return {
    draft: {
      draftId: 'sop-draft-1',
      title: 'Knowledge procedure',
      status,
      steps: [{
        order: 1,
        title: 'Use cited source',
        instruction: 'Use the cited source.',
        requiredInputs: [],
        completionCriteria: ['operator confirms completion'],
        citations: ['citation-1'],
        missingFields: [],
      }],
      blockers: [],
    },
    blockers: [],
  }
}
