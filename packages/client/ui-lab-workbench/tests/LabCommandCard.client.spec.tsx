// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabCommandCard } from '../src/client/LabCommandCard.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

function commandProps(node: never, openWorkbench: () => void): Parameters<typeof LabCommandCard>[0] {
  return { node, openWorkbench, t: (key: string) => String(zh[key as keyof typeof zh] ?? key), sessionId: 'session-1' as never } as unknown as Parameters<typeof LabCommandCard>[0]
}

describe('LabCommandCard', () => {
  it('renders native command lifecycle and links back to the workbench', () => {
    const openWorkbench = vi.fn()
    render(<LabCommandCard {...commandProps({ kind: 'command', seq: 1, time: 1, commandId: 'command-1' as never, name: 'plan-approve', args: null, outcome: { kind: 'success', text: 'Plan approved by Host' } } as never, openWorkbench)} />)

    expect(screen.getByText('plan-approve')).toBeTruthy()
    expect(screen.getByText('Plan approved by Host')).toBeTruthy()
    expect(screen.getByText('规划与技能')).toBeTruthy()
    expect(screen.getByText('命令结果')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: zh.viewWorkbench }))
    expect(openWorkbench).toHaveBeenCalledOnce()
  })

  it('shows command arguments and the originating event when the Host provides them', () => {
    render(<LabCommandCard {...commandProps({ kind: 'command', seq: 2, time: 1, commandId: 'command-3' as never, name: 'run-start', args: '--experiment experiment-1', outcome: { kind: 'success', text: 'Run queued', sourceEventSeq: 1 } } as never, () => {})} />)

    expect(screen.getByText('启动运行')).toBeTruthy()
    expect(screen.getByText('查看参数')).toBeTruthy()
    expect(screen.getByText('--experiment experiment-1')).toBeTruthy()
    expect(screen.getByText('来源事件')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('keeps a model-unavailable command as a failed Host outcome', () => {
    render(<LabCommandCard {...commandProps({ kind: 'command', seq: 1, time: 1, commandId: 'command-2' as never, name: 'plan-propose', args: null, outcome: { kind: 'error', text: 'Model unavailable' } } as never, () => {})} />)

    expect(screen.getByText('Model unavailable')).toBeTruthy()
    expect(screen.getByRole('article').getAttribute('data-state')).toBe('failed')
  })
})
