// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { LabGlobalNavigation } from '../src/client/LabGlobalNavigation.tsx'

type NavigationProps = Parameters<typeof LabGlobalNavigation>[0]

describe('LabGlobalNavigation', () => {
  afterEach(() => { cleanup() })

  it('opens monitoring and configuration destinations without a Session', () => {
    const openAppView = vi.fn()
    const expandSidebar = vi.fn()
    const props = {
      wide: true,
      expandSidebar,
      openAppView,
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps
    const view = render(<LabGlobalNavigation {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'executionMonitor' }))
    fireEvent.click(view.getByRole('button', { name: 'knowledge' }))
    fireEvent.click(view.getByRole('button', { name: 'configuration' }))
    fireEvent.click(view.getByRole('button', { name: 'devices' }))

    expect(openAppView.mock.calls).toEqual([['lab-monitor'], ['lab-knowledge'], ['lab-config'], ['lab-devices']])
    expect(expandSidebar).toHaveBeenCalledTimes(4)
  })

  it('does not render a Projects entry or project list in the sidebar', () => {
    const view = render(<LabGlobalNavigation {...({
      wide: true,
      expandSidebar: vi.fn(),
      openAppView: vi.fn(),
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps)} />)

    expect(view.queryByRole('button', { name: 'projects' })).toBeNull()
    expect(view.queryByText('projectsGroup')).toBeNull()
    expect(view.container.querySelector('[data-project-id]')).toBeNull()
  })
})