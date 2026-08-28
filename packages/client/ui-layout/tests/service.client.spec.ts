/**
 * LayoutController behavior: the cross-plugin panel-action face. Geometry
 * lives in the entry store (layout-store.spec.ts) — here we assert the
 * delegation contract: attachPanels wiring, the three actions forwarding, the
 * unwired fail-loud, and re-attach overwriting a stale action set.
 */
import { describe, expect, it, vi } from 'vitest'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { PanelActions } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'

function fakePanels(): PanelActions {
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

describe('LayoutController', () => {
  it('forwards the three panel actions to the attached set', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    service.attachPanels(panels)

    service.toggleSidebar()
    service.openDetails()
    service.closeDetails()

    expect(panels.toggleSidebar).toHaveBeenCalledTimes(1)
    expect(panels.openDetails).toHaveBeenCalledTimes(1)
    expect(panels.closeDetails).toHaveBeenCalledTimes(1)
    expect(panels.setSidebar).not.toHaveBeenCalled()
    expect(panels.setDetails).not.toHaveBeenCalled()
  })

  it('fails loud before the root entry wired its actions', () => {
    const service = new LayoutController()
    expect(() => { service.toggleSidebar() }).toThrow(/panel actions not wired/)
    expect(() => { service.openDetails() }).toThrow(/panel actions not wired/)
    expect(() => { service.closeDetails() }).toThrow(/panel actions not wired/)
  })

  it('re-attach overwrites the stale action set (entry re-register)', () => {
    const service = new LayoutController()
    const stale = fakePanels()
    const fresh = fakePanels()
    service.attachPanels(stale)
    service.attachPanels(fresh)

    service.toggleSidebar()

    expect(stale.toggleSidebar).not.toHaveBeenCalled()
    expect(fresh.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('opens only a live app view and clears it when the entry unloads', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    const ids = ['test-page']
    let changed: (() => void) | undefined
    const registry = {
      entriesOfSlot: vi.fn(() => ids.map(id => ({ options: { id } }))),
      subscribe: vi.fn((_key: string, listener: () => void) => {
        changed = listener
        return () => { changed = undefined }
      }),
    }
    service.attachPanels(panels)
    const dispose = service.attachAppViews(registry)

    service.openAppView('test-page')
    expect(service.activeAppView()).toBe('test-page')
    expect(panels.setActiveAppView).toHaveBeenCalledWith('test-page')

    ids.length = 0
    changed?.()
    expect(service.activeAppView()).toBeUndefined()
    expect(panels.setActiveAppView).toHaveBeenLastCalledWith(undefined)
    dispose()
  })

  it('rejects an unknown app view before changing the active selection', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    const registry = {
      entriesOfSlot: () => [{ options: { id: 'known-page' } }],
      subscribe: () => () => {},
    }
    service.attachPanels(panels)
    service.attachAppViews(registry)

    expect(() => { service.openAppView('missing-page') }).toThrow('APP_VIEW_NOT_FOUND')
    expect(service.activeAppView()).toBeUndefined()
    expect(panels.setActiveAppView).not.toHaveBeenCalled()
  })

  it('does not publish an active view when root actions are not wired', () => {
    const service = new LayoutController()
    const registry = {
      entriesOfSlot: () => [{ options: { id: 'known-page' } }],
      subscribe: () => () => {},
    }
    service.attachAppViews(registry)

    expect(() => { service.openAppView('known-page') }).toThrow('panel actions not wired')
    expect(service.activeAppView()).toBeUndefined()
  })
})
