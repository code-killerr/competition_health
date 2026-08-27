// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LabNavigation } from '../src/client/LabNavigation.tsx'
import { zh, type LabWorkbenchKey } from '../src/client/locales.ts'

afterEach(cleanup)

describe('lab global navigation', () => {
  it('exposes Knowledge, Devices, and Projects links in the public Sidebar action surface', () => {
    const t = (key: LabWorkbenchKey): string => zh[key]
    render(<LabNavigation wide={true} t={t} /> as never)

    expect(screen.getByRole('link', { name: zh.knowledge }).getAttribute('href')).toBe('#lab-knowledge')
    expect(screen.getByRole('link', { name: zh.devices }).getAttribute('href')).toBe('#lab-devices')
    expect(screen.getByRole('link', { name: zh.projects }).getAttribute('href')).toBe('#lab-projects')
  })
})
