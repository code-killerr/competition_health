// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { LabNavigation } from '../src/client/LabNavigation.tsx'
import { zh, type LabWorkbenchKey } from '../src/client/locales.ts'
import type { LocaleKeysOf } from '@deepseek-ai/dsh-client-ui-slots'

afterEach(cleanup)

describe('lab global navigation', () => {
  it('exposes Knowledge, Devices, and Projects links in the public Sidebar action surface', () => {
    const t = (key: LocaleKeysOf<'labWorkbench'>): string => zh[key as LabWorkbenchKey] ?? key
    render(createElement(LabNavigation, { wide: true, t } as never))

    expect(screen.getByRole('button', { name: zh.knowledge })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.devices })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.projects })).toBeTruthy()
  })
})
