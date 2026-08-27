// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'

describe('lab workbench native conversation view', () => {
  it('registers one session-scoped conversation view without a shell overlay', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
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
})

