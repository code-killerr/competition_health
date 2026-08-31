// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { PanelActions } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import { AppFrame } from '@deepseek-ai/dsh-client-ui-layout/src/client/AppFrame.tsx'
import type { AppFrameProps } from '@deepseek-ai/dsh-client-ui-layout/src/client/AppFrame.tsx'
import { createLayoutStore } from '@deepseek-ai/dsh-client-ui-layout/src/client/stores.ts'
import type { SessionId, SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'

function panels(): PanelActions {
  return {
    setSidebar: vi.fn(),
    setDetails: vi.fn(),
    setActiveAppView: vi.fn(),
    toggleSidebar: vi.fn(),
    setNarrow: vi.fn(),
    openDetails: vi.fn(),
    closeDetails: vi.fn(),
  }
}

function registry(ids: string[]) {
  let listener: (() => void) | undefined
  return {
    entriesOfSlot: () => ids.map(id => ({ options: { id, ...(id === 'default-page' ? { default: true } : {}) } })),
    subscribe: vi.fn((_key: string, next: () => void) => {
      listener = next
      return () => { listener = undefined }
    }),
    notify: () => { listener?.() },
  }
}

const currentSession = { value: undefined as SessionId | undefined }

function ConversationFixture() {
  const [draft, setDraft] = useState('')
  return <input data-testid="conversation" value={draft} onChange={(event) => { setDraft(event.target.value) }} />
}

beforeEach(() => {
  currentSession.value = undefined
  vi.stubGlobal('ResizeObserver', class {
    observe(): void {}
    disconnect(): void {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mountRootWithRegisteredView() {
  const slots = new SlotCore()
  slots.register({ name: 'root', children: { 'app.view': { kind: 'list', scope: 'root' } } } as never, (() => null) as never)
  const disposeView = slots.register(
    { name: 'app.view', id: 'test-page' },
    () => <div data-testid="registered-page">registered page</div>,
  )
  const store = createLayoutStore().create()
  const layout = new LayoutController()
  layout.attachPanels(store.actions)
  const disposeAppViews = layout.attachAppViews({
    entriesOfSlot: key => slots.entriesOfSlot(key),
    subscribe: (key, listener) => slots.subscribe(key, listener),
  })
  const renderSlot = ((key: string, _owner: object, options?: { only?: string }) => {
    if (key === 'app.view') {
      const entry = slots.entriesOfSlot('app.view').find(candidate => candidate.options.id === options?.only)
      if (entry === undefined) return null
      const View = entry.component as () => ReactNode
      return <View />
    }
    if (key === 'conversation') return <ConversationFixture />
    return null
  }) as AppFrameProps['renderSlot']
  const useStore = ((selector: (state: ReturnType<typeof store.getSnapshot>) => unknown) =>
    selector(useSyncExternalStore(
      listener => store.subscribe(listener),
      () => store.getSnapshot(),
    ))) as AppFrameProps['useStore']
  const useSessions = ((selector: (state: SessionListState) => unknown) => selector({
    ids: currentSession.value === undefined ? [] : [currentSession.value],
    byId: currentSession.value === undefined ? {} : {
      [currentSession.value]: {
        id: currentSession.value, displayTitle: 'Test', running: false, blank: false, updatedAt: 1,
      },
    },
    current: currentSession.value,
    phase: 'ready',
  } as SessionListState)) as AppFrameProps['useSessions']
  const useWorkspaces = ((selector: (state: WorkspaceListState) => unknown) => selector({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  })) as AppFrameProps['useWorkspaces']
  const SessionProvider = (() => null) as AppFrameProps['SessionProvider']
  const element = <AppFrame
    useStore={useStore}
    actions={store.actions}
    renderSlot={renderSlot}
    useSessions={useSessions}
    useWorkspaces={useWorkspaces}
    SessionProvider={SessionProvider}
  />
  const view = render(element)
  return {
    layout,
    store,
    view,
    disposeView,
    disposeAppViews,
    rerender: () => { view.rerender(element) },
  }
}

describe('root application-view contract', () => {
  it('opens and closes a registered page without requiring a Session', () => {
    const service = new LayoutController()
    const actions = panels()
    const views = registry(['test-page'])
    service.attachPanels(actions)
    service.attachAppViews(views)

    service.openAppView('test-page')
    expect(service.activeAppView()).toBe('test-page')
    expect(actions.setActiveAppView).toHaveBeenLastCalledWith('test-page', 'replace')

    service.closeAppView()
    expect(service.activeAppView()).toBeUndefined()
    expect(actions.setActiveAppView).toHaveBeenLastCalledWith(undefined)
  })

  it('rejects unknown pages and clears the selection when a page unloads', () => {
    const service = new LayoutController()
    const actions = panels()
    const ids = ['test-page']
    const views = registry(ids)
    service.attachPanels(actions)
    service.attachAppViews(views)

    expect(() => { service.openAppView('missing-page') }).toThrow('APP_VIEW_NOT_FOUND')
    service.openAppView('test-page')
    ids.length = 0
    views.notify()

    expect(service.activeAppView()).toBeUndefined()
    expect(actions.setActiveAppView).toHaveBeenLastCalledWith(undefined)
  })

  it('selects a default page when it registers after the layout service', () => {
    const service = new LayoutController()
    const actions = panels()
    const ids: string[] = []
    const views = registry(ids)
    service.attachPanels(actions)
    service.attachAppViews(views)

    expect(service.activeAppView()).toBeUndefined()
    ids.push('default-page')
    views.notify()

    expect(service.activeAppView()).toBe('default-page')
    expect(actions.setActiveAppView).toHaveBeenLastCalledWith('default-page', 'replace')
  })

  it('renders a registered page before and after Session creation without remounting Conversation', async () => {
    const { layout, store, view, disposeView, disposeAppViews, rerender } = mountRootWithRegisteredView()
    const conversation = view.getByTestId('conversation')

    expect(view.queryByTestId('registered-page')).toBeNull()
    act(() => { layout.openAppView('test-page') })
    expect(store.getSnapshot().activeAppViewId).toBe('test-page')
    expect(view.getByTestId('registered-page').parentElement?.hidden).toBe(false)
    expect(conversation.parentElement?.hidden).toBe(true)

    act(() => { layout.closeAppView() })
    expect(view.queryByTestId('registered-page')).toBeNull()
    expect(view.getByTestId('conversation')).toBe(conversation)

    currentSession.value = 's-live' as SessionId
    act(() => { rerender() })
    act(() => { layout.openAppView('test-page') })
    expect(view.getByTestId('registered-page').parentElement?.hidden).toBe(false)

    await act(async () => {
      disposeView()
      await Promise.resolve()
    })
    expect(view.queryByTestId('registered-page')).toBeNull()
    expect(view.getByTestId('conversation')).toBe(conversation)
    disposeAppViews()
  })
})
