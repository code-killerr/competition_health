// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LabConversationContextDock } from '../src/client/LabConversationContextDock.tsx'
import { LabConversationHeaderAction } from '../src/client/LabConversationHeaderAction.tsx'
import { LabUiContext } from '../src/client/LabUiContext.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

describe('Lab Conversation chrome', () => {
  it('keeps the Session header action additive and opens the workbench', () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    const openWorkbench = vi.fn()
    render(<LabConversationHeaderAction {...({ ui, openWorkbench, t: (key: string) => String(zh[key as keyof typeof zh] ?? key), sessionId: 'session-1' as never } as unknown as Parameters<typeof LabConversationHeaderAction>[0])} />)

    fireEvent.click(screen.getByRole('button', { name: zh.viewWorkbench }))
    expect(openWorkbench).toHaveBeenCalledOnce()
    expect(screen.getByText('project-1')).toBeTruthy()
  })

  it('separates approved Project context from Session-local attachments', () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    ui.selectExperiment('experiment-1')
    ui.selectRun('run-1')
    render(<LabConversationContextDock {...({ ui, context: () => ({ workspaceName: 'lab', workspaceDirectory: 'E:/lab', knowledgeCount: 2, deviceCount: 1, runStatus: 'RUNNING', currentStepId: 'step-2' }), input: { imageIds: ['image-1' as never], draft: '', draftRev: 0, phase: 'plain', occurrences: [], queue: [] }, t: (key: string) => String(zh[key as keyof typeof zh] ?? key), session: {} as never, sessionId: 'session-1' as never } as unknown as Parameters<typeof LabConversationContextDock>[0])} />)

    expect(screen.getByLabelText(zh.projectScope)).toBeTruthy()
    expect(screen.getByLabelText(zh.sessionLocal)).toBeTruthy()
    expect(screen.getByLabelText(zh.projectScope).textContent).toContain('2')
    expect(screen.getByLabelText(zh.projectScope).textContent).toContain('1')
    expect(screen.getByLabelText(zh.sessionLocal).textContent).toContain('1')
    expect(screen.getByLabelText(zh.executionMonitor).textContent).toContain('run-1')
    expect(screen.getByLabelText(zh.executionMonitor).textContent).toContain('RUNNING')
    expect(screen.getByLabelText(zh.executionMonitor).textContent).toContain('step-2')
  })

  it('loads Project scope counts from the Host query when no static context is supplied', async () => {
    const ui = new LabUiContext()
    ui.selectProject('project-1')
    const loadProjectContext = vi.fn(async () => ({ state: 'ready' as const, value: { project: { projectId: 'project-1', sources: [{ documentId: 'doc-1', versionId: 'version-1' }], devices: [{ deviceId: 'device-1' }], sharedFacts: [] }, knowledgeCapability: { state: 'available' as const } } }))
    render(<LabConversationContextDock {...({ ui, loadProjectContext, input: { imageIds: [], draft: '', draftRev: 0, phase: 'plain', occurrences: [], queue: [] }, t: (key: string) => String(zh[key as keyof typeof zh] ?? key), session: {} as never, sessionId: 'session-1' as never } as unknown as Parameters<typeof LabConversationContextDock>[0])} />)

    expect((await screen.findByLabelText(zh.projectScope)).textContent).toContain('1')
    expect(screen.getByLabelText(zh.projectScope).textContent).toContain('1')
    expect(loadProjectContext).toHaveBeenCalledWith('project-1')
  })
})
