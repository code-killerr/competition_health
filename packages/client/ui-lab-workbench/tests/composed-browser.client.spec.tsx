// @vitest-environment jsdom
/** Browser acceptance for the Harness conversation plus laboratory workspace composition. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ISession, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SlotTestRuntime, stubSettingsScope, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyConversation, inject as conversationInject } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { apply as applyWorkbench, inject as workbenchInject } from '../src/client/index.ts'

usePinnedBrowserLanguages('zh-CN')

const SID = 'session-1' as SessionId

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

type AppRootProps = PropsRenderSlots<'conversation' | 'details'>
function AppRoot({ renderSlot }: AppRootProps): JSX.Element {
  return <>{renderSlot('conversation', {})}</>
}

const LAYOUT_CHILDREN = {
  conversation: { kind: 'single', scope: 'session-maybe' },
  details: { kind: 'single', scope: 'session' },
} as const

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

async function bench() {
  const runtime = await SlotTestRuntime.create()
  runtime.provide('connection', { api: { settings: {} }, isLoopback: false })
  runtime.provide('remote', { $on: () => () => {} })
  runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  runtime.provide('layout', { openDetails: vi.fn(), closeDetails: vi.fn() })
  const locale = new LocaleRuntime(runtime.ctx)
  runtime.provide('locale', locale)
  runtime.slots.installLocale(locale)
  const prompt = vi.fn<ISession['prompt']>(async () => ({ ok: true, value: { accepted: true } }))
  await runtime.sessions.add({
    id: SID,
    summary: { title: 'S', displayTitle: 'S', cwd: '/lab' },
    snapshot: { nodes: [] },
    session: { loadOlder: vi.fn<ISession['loadOlder']>(), prompt },
  })
  await runtime.root.declare(LAYOUT_CHILDREN, AppRoot)
  await runtime.mount({ inject: [...conversationInject], apply: applyConversation })
  await runtime.mount({ inject: [...workbenchInject], apply: applyWorkbench })
  return { runtime, prompt }
}

describe('Harness-native laboratory browser composition', () => {
  it('renders the workbench beside the real composer and submits the current Session message', { timeout: 30_000 }, async () => {
    const { runtime, prompt } = await bench()
    const view = runtime.renderRoot()

    fireEvent.click(view.getByRole('tab', { name: 'lab-workbench' }))
    expect(view.getByRole('heading', { name: '实验自动化工作台' })).toBeTruthy()
    const composer = view.container.querySelector('[data-composer-card] textarea')
    if (!(composer instanceof HTMLTextAreaElement)) throw new Error('Harness composer is missing')
    fireEvent.change(composer, { target: { value: '制定一个校准实验计划' } })
    fireEvent.keyDown(composer, { key: 'Enter' })
    await waitFor(() => { expect(prompt).toHaveBeenCalledOnce() })

    await runtime.dispose()
  })
})
