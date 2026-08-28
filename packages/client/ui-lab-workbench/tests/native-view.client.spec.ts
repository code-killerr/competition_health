// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import type { LabWorkbenchInjected } from '../src/client/LabWorkbench.tsx'

describe('lab workbench native conversation view', () => {
  it('registers one session-scoped conversation view without a shell overlay', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.provide('layout', { openAppView: vi.fn() })
    runtime.slots.installLocale(locale)
    await runtime.root.declare(
      { 'conversation.view': { kind: 'list', scope: 'session' } },
      (_props: { renderSlot?: unknown }) => null,
    )
    await runtime.mount({ inject: [...inject], apply })

    const entries = runtime.slots.entries('conversation.view')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.options).toMatchObject({
      id: 'lab-workbench',
      order: 20,
    })

    await runtime.dispose()
  })
  it('surfaces a stable error code for malformed local plan output', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.provide('layout', { openAppView: vi.fn() })
    runtime.slots.installLocale(locale)
    await runtime.root.declare(
      { 'conversation.view': { kind: 'list', scope: 'session' } },
      (_props: { renderSlot?: unknown }) => null,
    )
    await runtime.mount({ inject: [...inject], apply })
    await runtime.sessions.add({ id: 'session-1' })
    runtime.renderRoot()
    const entry = runtime.slots.entries('conversation.view')[0]
    if (entry?.inject === undefined) throw new Error('conversation view injection is missing')
    const store = runtime.storeOf('conversation.view', 'session-1')
    const injected = (entry.inject as unknown as (sessionId: string, actions: unknown) => LabWorkbenchInjected)(
      'session-1', store.actions,
    )
    await injected.proposeLocalPlan({ experimentId: 'experiment-1', objective: 'objective', samples: [], constraints: [], expectedOutputs: [], unresolved: [] }, '{not-json')
    expect((store.getSnapshot() as { readonly error?: string }).error).toMatch(/^INVALID_OUTPUT:/)
    await runtime.dispose()
  })
  it('surfaces a stable provider error through the native conversation action', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.provide('layout', { openAppView: vi.fn() })
    runtime.slots.installLocale(locale)
    await runtime.root.declare(
      { 'conversation.view': { kind: 'list', scope: 'session' } },
      (_props: { renderSlot?: unknown }) => null,
    )
    await runtime.mount({ inject: [...inject], apply })
    await runtime.sessions.add({ id: 'session-1' })
    runtime.renderRoot()
    const entry = runtime.slots.entries('conversation.view')[0]
    if (entry?.inject === undefined) throw new Error('conversation view injection is missing')
    const store = runtime.storeOf('conversation.view', 'session-1')
    const injected = (entry.inject as unknown as (sessionId: string, actions: unknown) => LabWorkbenchInjected)(
      'session-1', store.actions,
    )
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      status: 503,
      json: async () => ({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Agent provider is not configured' } }),
    })))
    await injected.refresh('experiment-1')
    expect((store.getSnapshot() as { readonly error?: string }).error).toBe('PROVIDER_UNAVAILABLE: Agent provider is not configured')
    vi.unstubAllGlobals()
    await runtime.dispose()
  })
})
