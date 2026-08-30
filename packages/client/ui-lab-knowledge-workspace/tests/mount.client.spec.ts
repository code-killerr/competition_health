// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'

describe('independent Knowledge workspace mount', () => {
  it('registers Knowledge as a root application view without a Session', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.slots.installLocale(locale)
    await runtime.root.declare(
      {
        'conversation.view': { kind: 'list', scope: 'session' },
        'app.view': { kind: 'list', scope: 'root' },
        'sidebar.navigation': { kind: 'list', scope: 'root' },
      },
      (_props: { renderSlot?: unknown }) => null,
    )
    await runtime.mount({ inject: [...inject], apply })

    expect(runtime.slots.entries('app.view')).toMatchObject([{ options: { id: 'lab-knowledge' } }])
    expect(runtime.slots.entries('conversation.view')).not.toContainEqual(expect.objectContaining({ options: { id: 'lab-workbench' } }))

    await runtime.dispose()
  })
})
