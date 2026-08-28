// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { SidebarRootComponentProps } from '../src/client/contract/slots.ts'
import { SidebarRoot } from '../src/client/SidebarRoot.tsx'
import { en } from '../src/client/locales.ts'

const t: SidebarRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key
const neverHook = (() => { throw new Error('sidebar shell must not read this hook') }) as never

afterEach(() => { cleanup(); vi.useRealTimers() })

function mount(collapsed: boolean) {
  const calls: string[] = []
  const view = render(
    <SidebarRoot
      collapsed={collapsed}
      width={collapsed ? 56 : 300}
      useSessions={neverHook}
      useWorkspaces={neverHook}
      startSession={vi.fn()}
      toggleSidebar={vi.fn()}
      t={t}
      renderSlot={((key: string, owner: { wide?: boolean }, options?: { fallback?: ReactNode }) => {
        calls.push(`${key}:${String(owner.wide)}`)
        return options?.fallback ?? <div data-testid={key} />
      }) as SidebarRootComponentProps['renderSlot']}
    />,
  )
  return { calls, view }
}

describe('sidebar primary navigation seat', () => {
  it('renders between New Session and workspace browsing in wide mode', () => {
    const { calls } = mount(false)
    const keys = calls.map(call => call.split(':')[0])
    expect(keys.indexOf('sidebar.navigation')).toBeGreaterThan(keys.indexOf('sidebar.brand.name'))
    expect(keys.indexOf('sidebar.navigation')).toBeLessThan(keys.indexOf('sidebar.workspaces'))
    expect(calls.find(call => call.startsWith('sidebar.navigation:'))).toBe('sidebar.navigation:true')
  })

  it('passes rail ownership props when the sidebar is collapsed', () => {
    const { calls } = mount(true)
    expect(calls.find(call => call.startsWith('sidebar.navigation:'))).toBe('sidebar.navigation:false')
  })
})
