// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { LabDevicesView } from '../src/client/LabDevicesView.tsx'
import type { LabQueryState } from '../src/client/adapter.ts'
import type { LabDevice } from '../src/client/api.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

describe('Devices application view', () => {
  it('loads globally configured devices without an active Experiment', async () => {
    const loadDevices = vi.fn(async (): Promise<LabQueryState<readonly LabDevice[]>> => ({ state: 'ready', value: [] }))
    render(<LabDevicesView {...propsFor({ loadDevices })} />)

    await waitFor(() => { expect(screen.getByRole('status').textContent).toContain(zh.devicesEmpty) })
    expect(loadDevices).toHaveBeenCalledWith(undefined)
  })

  it('renders Host device records with provider mode and capabilities', async () => {
    const loadDevices = vi.fn(async (): Promise<LabQueryState<readonly LabDevice[]>> => ({
      state: 'ready',
      value: [{ id: 'device-fixture', name: 'Fixture reader', status: 'reserved', source: 'real', capabilities: [{ name: 'measure' }] }],
    }))
    const selection = { activeExperimentId: 'experiment-fixture' as const }
    const ui = {
      snapshot: () => selection,
      subscribe: (_listener: () => void): (() => void) => () => {},
    }
    render(<LabDevicesView {...propsFor({ loadDevices, ui, source: 'deterministic' })} />)

    await waitFor(() => { expect(screen.getByText('Fixture reader')).toBeTruthy() })
    expect(screen.getByText(zh.real)).toBeTruthy()
    expect(screen.getByText('measure')).toBeTruthy()
    expect(screen.getByText(zh.deviceReserved)).toBeTruthy()
    expect(loadDevices).toHaveBeenCalledWith('experiment-fixture')
  })
})

function propsFor(input: {
  readonly loadDevices: (experimentId?: string) => Promise<LabQueryState<readonly LabDevice[]>>
  readonly ui?: { readonly snapshot: () => { readonly activeProjectId?: string; readonly activeExperimentId?: string }; readonly subscribe: (listener: () => void) => () => void }
  readonly source?: 'deterministic' | 'mock' | 'real'
}): Parameters<typeof LabDevicesView>[0] {
  return {
    t: (key: string) => String(zh[key as keyof typeof zh] ?? key),
    loadDevices: input.loadDevices,
    ui: input.ui,
    source: input.source ?? 'real',
    global: {} as never,
  } as unknown as Parameters<typeof LabDevicesView>[0]
}
