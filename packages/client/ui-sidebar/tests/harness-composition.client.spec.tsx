// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSyncExternalStore, type JSX, type ReactNode } from 'react'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { AppFrame } from '@deepseek-ai/dsh-client-ui-layout/src/client/AppFrame.tsx'
import type { AppFrameProps } from '@deepseek-ai/dsh-client-ui-layout/src/client/AppFrame.tsx'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { ILayout } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import { createLayoutStore } from '@deepseek-ai/dsh-client-ui-layout/src/client/stores.ts'
import type { SessionId, SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { SidebarRoot } from '../src/client/SidebarRoot.tsx'
import type {
  SidebarNavigationOwnerProps, SidebarRootComponentProps, SidebarSectionOwnerProps,
} from '../src/client/contract/slots.ts'
import { en } from '../src/client/locales.ts'

const t: SidebarRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key
const session = { current: undefined as SessionId | undefined }

function globalNavigation(layout: ILayout) {
  return function GlobalNavigation(props: SidebarNavigationOwnerProps): JSX.Element {
    return <nav aria-label="Global navigation" data-testid="global-navigation">
      <button type="button" aria-label="Projects" onClick={() => {
        if (!props.wide) props.expandSidebar()
        layout.openAppView('projects')
      }}>Projects</button>
      <button type="button" aria-label="Knowledge" onClick={() => {
        if (!props.wide) props.expandSidebar()
        layout.openAppView('knowledge')
      }}>Knowledge</button>
    </nav>
  }
}

function WorkspaceBrowser(props: SidebarSectionOwnerProps): JSX.Element {
  return <div data-testid="workspace-browser" data-wide={props.wide} />
}

beforeEach(() => {
  session.current = undefined
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', class {
    observe(): void {}
    disconnect(): void {}
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function mountHarnessComposition() {
  const slots = new SlotCore()
  slots.register({
    name: 'root',
    children: {
      sidebar: { kind: 'single', scope: 'root' },
      conversation: { kind: 'single', scope: 'session-maybe' },
      details: { kind: 'single', scope: 'session' },
      'shell.overlay': { kind: 'list', scope: 'root' },
      'app.view': { kind: 'list', scope: 'root' },
    },
  } as never, (() => null) as never)
  const disposeProjects = slots.register(
    { name: 'app.view', id: 'projects' },
    () => <div data-testid="app-view-projects">Projects page</div>,
  )
  const disposeKnowledge = slots.register(
    { name: 'app.view', id: 'knowledge' },
    () => <div data-testid="app-view-knowledge">Knowledge page</div>,
  )
  const store = createLayoutStore().create()
  const layout = new LayoutController()
  layout.attachPanels(store.actions)
  const disposeSidebar = slots.register({
    name: 'sidebar',
    children: {
      'sidebar.navigation': { kind: 'list', scope: 'root' },
      'sidebar.workspaces': { kind: 'single', scope: 'root' },
    },
    inject: () => ({ startSession: () => {}, toggleSidebar: () => { layout.toggleSidebar() } }),
  } as never, SidebarRoot as never)
  const disposeNavigation = slots.register(
    { name: 'sidebar.navigation', id: 'global-navigation' },
    globalNavigation(layout),
  )
  const disposeWorkspaceBrowser = slots.register(
    { name: 'sidebar.workspaces' },
    WorkspaceBrowser,
  )
  const disposeAppViews = layout.attachAppViews({
    entriesOfSlot: key => slots.entriesOfSlot(key),
    subscribe: (key, listener) => slots.subscribe(key, listener),
  })
  const renderSidebarSlot = ((key: string, owner: object, options?: { fallback?: ReactNode }) => {
    if (key === 'sidebar.navigation') {
      const entry = slots.entriesOfSlot('sidebar.navigation')[0]
      if (entry === undefined) return options?.fallback ?? null
      const Navigation = entry.component as (props: SidebarNavigationOwnerProps) => ReactNode
      return <Navigation {...owner as SidebarNavigationOwnerProps} />
    }
    if (key === 'sidebar.workspaces') {
      const entry = slots.entriesOfSlot('sidebar.workspaces')[0]
      if (entry === undefined) return options?.fallback ?? null
      const Workspace = entry.component as (props: SidebarSectionOwnerProps) => ReactNode
      return <Workspace {...owner as SidebarSectionOwnerProps} />
    }
    return options?.fallback ?? null
  }) as SidebarRootComponentProps['renderSlot']
  const renderRootSlot = ((key: string, owner: object, options?: { only?: string; fallback?: ReactNode }) => {
    if (key === 'sidebar') {
      const entry = slots.entriesOfSlot('sidebar')[0]
      if (entry === undefined) return null
      const Shell = entry.component as (props: {
        collapsed: boolean
        width: number
        startSession: () => void
        toggleSidebar: () => void
        t: SidebarRootComponentProps['t']
        renderSlot: SidebarRootComponentProps['renderSlot']
      }) => ReactNode
      return <Shell
        {...owner as { collapsed: boolean; width: number }}
        startSession={() => {}}
        toggleSidebar={() => { layout.toggleSidebar() }}
        t={t}
        renderSlot={renderSidebarSlot}
      />
    }
    if (key === 'conversation') return <input data-testid="conversation" />
    if (key === 'app.view') {
      const entry = slots.entriesOfSlot('app.view').find(candidate => candidate.options.id === options?.only)
      if (entry === undefined) return null
      const View = entry.component as () => ReactNode
      return <View />
    }
    return options?.fallback ?? null
  }) as AppFrameProps['renderSlot']
  const useStore = ((selector: (state: ReturnType<typeof store.getSnapshot>) => unknown) =>
    selector(useSyncExternalStore(
      listener => store.subscribe(listener),
      () => store.getSnapshot(),
    ))) as AppFrameProps['useStore']
  const useSessions = ((selector: (state: SessionListState) => unknown) => selector({
    ids: session.current === undefined ? [] : [session.current],
    byId: session.current === undefined ? {} : {
      [session.current]: { id: session.current, displayTitle: 'Live', running: false, blank: false, updatedAt: 1 },
    },
    current: session.current,
    phase: 'ready',
  } as SessionListState)) as AppFrameProps['useSessions']
  const useWorkspaces = ((selector: (state: WorkspaceListState) => unknown) => selector({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  })) as AppFrameProps['useWorkspaces']
  const element = () => <AppFrame
    useStore={useStore}
    actions={store.actions}
    renderSlot={renderRootSlot}
    useSessions={useSessions}
    useWorkspaces={useWorkspaces}
    SessionProvider={() => null}
  />
  const view = render(element())
  return {
    layout,
    view,
    rerender: () => { view.rerender(element()) },
    disposeProjects,
    disposeKnowledge,
    disposeNavigation,
    disposeWorkspaceBrowser,
    disposeSidebar,
    disposeAppViews,
  }
}

describe('Harness root composition', () => {
  it('opens app views from primary navigation across Session and rail states', () => {
    const harness = mountHarnessComposition()
    const conversation = screen.getByTestId('conversation')
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent')
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const initialHash = window.location.hash

    expect(screen.getByTestId('global-navigation')).toBeTruthy()
    expect(screen.getByTestId('workspace-browser')).toBeTruthy()
    expect(screen.getByTestId('global-navigation').compareDocumentPosition(screen.getByTestId('workspace-browser'))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByTestId('app-view-projects')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(screen.getByTestId('app-view-projects')).toBeTruthy()
    expect(conversation.parentElement?.hidden).toBe(true)

    act(() => { harness.layout.closeAppView() })
    expect(screen.getByTestId('conversation')).toBe(conversation)

    session.current = 's-live' as SessionId
    act(() => { harness.rerender() })
    fireEvent.click(screen.getByRole('button', { name: 'Knowledge' }))
    expect(screen.getByTestId('app-view-knowledge')).toBeTruthy()

    act(() => { harness.layout.closeAppView() })
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.getByRole('button', { name: 'Projects' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
    expect(screen.getByTestId('app-view-projects')).toBeTruthy()

    act(() => {
      harness.layout.closeAppView()
      harness.disposeProjects()
    })
    expect(screen.queryByTestId('app-view-projects')).toBeNull()
    expect(screen.getByTestId('conversation')).toBe(conversation)
    expect(dispatchEvent.mock.calls.some(([event]) => event.type === 'lab:navigate')).toBe(false)
    expect(addEventListener.mock.calls.some(([type]) => type === 'lab:navigate')).toBe(false)
    expect(window.location.hash).toBe(initialHash)
    harness.disposeNavigation()
    harness.disposeWorkspaceBrowser()
    harness.disposeSidebar()
    harness.disposeKnowledge()
    harness.disposeAppViews()
  })
})
