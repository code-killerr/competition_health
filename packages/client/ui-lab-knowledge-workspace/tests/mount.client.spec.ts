// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyWorkbench, inject as workbenchInject } from '@deepseek-ai/dsh-client-ui-lab-workbench/client'
import { apply, inject } from '../src/client/index.ts'

describe('independent Knowledge workspace mount', () => {
  it('declares and registers under the Harness workbench Knowledge child slot', async () => {
    const runtime = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(runtime.ctx)
    runtime.provide('locale', locale)
    runtime.slots.installLocale(locale)
    await runtime.root.declare(
      { 'conversation.view': { kind: 'list', scope: 'session' } },
      (_props: { renderSlot?: unknown }) => null,
    )
    await runtime.mount({ inject: [...workbenchInject], apply: applyWorkbench })
    await runtime.mount({ inject: [...inject], apply })

    expect(runtime.slots.spec('lab.knowledge.workspace')).toEqual({ kind: 'single', scope: 'session' })
    expect(runtime.slots.entries('lab.knowledge.workspace')).toHaveLength(1)
    expect(runtime.slots.entries('conversation.view')).toMatchObject([{ options: { id: 'lab-workbench' } }])

    await runtime.dispose()
  })
})
