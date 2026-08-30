// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { LabGlobalNavigation } from '../src/client/LabGlobalNavigation.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'

type NavigationProps = Parameters<typeof LabGlobalNavigation>[0]

describe('LabGlobalNavigation', () => {
  afterEach(() => { cleanup() })

  it('opens grouped applications without a Session', () => {
    const openAppView = vi.fn()
    const expandSidebar = vi.fn()
    const ui = new LabUiContext()
    const props = {
      wide: true,
      expandSidebar,
      openAppView,
      ui,
      listProjects: async () => [],
      t: (key: string) => key,
      useSessions: () => undefined,
      useWorkspaces: () => ({ items: [] }),
    } as unknown as NavigationProps
    const view = render(<LabGlobalNavigation {...props} />)

    fireEvent.click(view.getByRole('button', { name: 'projects' }))
    fireEvent.click(view.getByRole('button', { name: 'knowledge' }))
    fireEvent.click(view.getByRole('button', { name: 'devices' }))

    expect(openAppView.mock.calls).toEqual([['lab-projects'], ['lab-knowledge'], ['lab-devices']])
    expect(expandSidebar).toHaveBeenCalledTimes(3)
  })
})
