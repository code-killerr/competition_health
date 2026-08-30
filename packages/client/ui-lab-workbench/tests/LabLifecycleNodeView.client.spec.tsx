// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabLifecycleNodeView } from '../src/client/LabLifecycleNodeView.tsx'
import { createLabFixtureAdapter } from '../src/client/index.ts'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

describe('LabLifecycleNodeView', () => {
  it('renders a durable lifecycle projection and opens its typed workbench detail', () => {
    const adapter = createLabFixtureAdapter('replan')
    const openDetail = vi.fn()
    const openCitation = vi.fn()
    const event = adapter.events.find(item => item.kind === 'workflow-proposal')
    if (event === undefined) throw new Error('fixture workflow projection missing')
    const nodeProps = {
      node: { kind: 'lab-lifecycle', seq: 1, time: 1, data: event } as never,
      openDetail, openCitation, t: (key: string) => String(en[key as keyof typeof en] ?? key), sessionId: 'session-1' as never,
      hooks: { turnData: () => () => undefined } as never, openFile: () => {}, inspectCall: () => {}, forkAt: () => {}, renderMessageImages: () => null, fileMentions: () => undefined,
    } as unknown as Parameters<typeof LabLifecycleNodeView>[0]
    render(<LabLifecycleNodeView {...nodeProps} />)

    expect(screen.getByText(en.lifecycleWorkflow)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.viewWorkbench }))
    expect(openDetail).toHaveBeenCalledWith(event)
  })
})
