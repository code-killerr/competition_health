import { Context } from '@deepseek-ai/cordis'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { describe, expect, it, vi } from 'vitest'
import { InMemoryLabProjectStore, LabProjectService } from '@deepseek-ai/dsh-experimental-lab-project'
import { LabMvpWebService, parseLabProjectConversationCommand } from '../src/index.ts'

describe('project conversation protocol', () => {
  it('parses project scope and planning commands without using the Knowledge protocol', () => {
    expect(parseLabProjectConversationCommand({
      command: 'project-scope-update',
      projectId: 'project-1',
      sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
      deviceIds: ['device-1'],
    })).toMatchObject({
      command: 'project-scope-update',
      projectId: 'project-1',
      sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
    })
    expect(() => parseLabProjectConversationCommand({ command: 'project-create', projectId: 'project-1', name: 'Project' })).toThrow(/must not accept projectId/)
    expect(() => parseLabProjectConversationCommand({ command: 'project-planning-context', projectId: 'project-1', request: { experimentId: 'experiment-1' } })).toThrow(/objective/)
    expect(parseLabProjectConversationCommand({ command: 'experiment-create', projectId: 'project-1', title: 'Calibration', objective: 'Calibrate the bench' })).toMatchObject({
      command: 'experiment-create', projectId: 'project-1', title: 'Calibration', objective: 'Calibrate the bench',
    })
    expect(parseLabProjectConversationCommand({ command: 'experiment-session-link', projectId: 'project-1', experimentId: 'experiment-1', targetSessionId: 'session-1', role: 'continued' })).toMatchObject({
      command: 'experiment-session-link', role: 'continued',
    })
    expect(parseLabProjectConversationCommand({ command: 'run-list', experimentId: 'experiment-1' })).toMatchObject({ command: 'run-list', experimentId: 'experiment-1' })
    expect(parseLabProjectConversationCommand({ command: 'run-compare', leftRunId: 'run-1', rightRunId: 'run-2' })).toMatchObject({ command: 'run-compare', leftRunId: 'run-1', rightRunId: 'run-2' })
    expect(parseLabProjectConversationCommand({ command: 'artifact-open', runId: 'run-1', artifactId: 'artifact-1' })).toMatchObject({ command: 'artifact-open', runId: 'run-1', artifactId: 'artifact-1' })
    expect(parseLabProjectConversationCommand({ command: 'configuration-capabilities' })).toEqual({ command: 'configuration-capabilities' })
    expect(parseLabProjectConversationCommand({ command: 'project-create', workspaceId: 'workspace-1' })).toEqual({ command: 'project-create', workspaceId: 'workspace-1' })
  })

  it('routes project commands through the Web Facade and scopes planning retrieval', async () => {
    const ctx = new Context()
    const projects = new LabProjectService(ctx, { clock: () => 100 })
    await projects.attach(new InMemoryLabProjectStore())
    const search = vi.fn().mockResolvedValue([])
    const appended = vi.fn()
    const actor = brandId<'SessionId'>('session-1')
    const createdSession = { id: brandId<'SessionId'>('session-created') }
    const projectWorkspace = { id: brandId<'WorkspaceId'>('workspace-1'), path: '/workspace/project', sessionIds: [actor] }
    ctx.provide('labKnowledge', {
      listImportStatuses: vi.fn().mockResolvedValue([{ documentId: 'doc-1', versionId: 'version-1', status: 'READY' }]),
      search,
      listConflicts: vi.fn().mockResolvedValue([]),
    })
    ctx.provide('labDevices', { listDevices: () => [{ id: 'device-1', name: 'Bench', healthy: true, reserved: false, capabilities: [] }] })
    ctx.provide('labPlanning', { listProposals: () => [] })
    ctx.provide('labRuntime', { listRuns: () => [] })
    ctx.provide('workspaceRegistry', {
      get: vi.fn((id: string) => id === projectWorkspace.id ? projectWorkspace : undefined),
      list: vi.fn(() => [projectWorkspace]),
    })
    ctx.provide('sessions', {
      get: vi.fn(() => ({ append: appended })),
      create: vi.fn(() => { projectWorkspace.sessionIds.push(createdSession.id); return createdSession }),
    })
    const web = new LabMvpWebService(ctx)

    await expect(web.dispatchProject(parseLabProjectConversationCommand({ command: 'configuration-capabilities' }))).resolves.toMatchObject({
      kind: 'configuration-capabilities',
      value: expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', status: 'available', recordCount: 0 }),
        expect.objectContaining({ kind: 'devices', status: 'available', recordCount: 1 }),
        expect.objectContaining({ kind: 'agent', status: 'unavailable' }),
      ]) as unknown,
    })

    const created = await web.dispatchProject(parseLabProjectConversationCommand({ command: 'project-create', workspaceId: 'workspace-1', sessionId: actor }))
    expect(created).toMatchObject({ kind: 'project' })
    expect(created).toMatchObject({ value: { project: { name: 'project' } } })
    expect(created).toMatchObject({ value: { sessions: [{ sessionId: actor }] } })
    const projectId = (created.value as { project: { projectId: string } }).project.projectId
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-scope-update',
      projectId,
      sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
      deviceIds: ['device-1'],
      sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sources: [{ documentId: 'doc-1' }] } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'presentation-intent',
      sessionId: actor,
      intent: { view: 'project', projectId, page: 'execution' },
    }))).resolves.toEqual({
      kind: 'presentation',
      value: { accepted: true, intent: { view: 'project', projectId, page: 'execution' } },
    })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'presentation-intent',
      sessionId: actor,
      intent: { view: 'https://example.test' },
    }))).resolves.toMatchObject({ kind: 'presentation', value: { accepted: false, code: 'UNKNOWN_VIEW' } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-session-attach',
      projectId,
      targetSessionId: 'session-1',
      sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sessions: [{ sessionId: 'session-1' }] } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-session-create',
      projectId,
      title: 'Follow-up',
      sessionId: actor,
    }))).resolves.toMatchObject({
      kind: 'project',
      value: { sessions: expect.arrayContaining([expect.objectContaining({ sessionId: 'session-created', title: 'Follow-up' })]) as unknown },
    })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-session-detach', projectId, targetSessionId: 'session-created', sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sessions: [{ sessionId: 'session-1' }] } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-archive', projectId, sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { project: { status: 'ARCHIVED' } } })
    const planning = await web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-planning-context',
      projectId,
      sessionId: actor,
      request: {
        experimentId: 'experiment-1',
        objective: 'calibration',
        samples: [],
        constraints: [],
        expectedOutputs: ['report'],
        unresolved: ['operator confirmation'],
      },
    }))

    expect(planning).toMatchObject({ kind: 'project-context', value: { planningContext: { objective: 'calibration', unresolved: ['operator confirmation'] } } })
    expect(search).toHaveBeenCalledWith({
      query: 'calibration',
      documentIds: ['doc-1'],
      versionIds: ['version-1'],
      confirmed: true,
      experimentId: 'experiment-1',
    })
    expect(appended).toHaveBeenCalledWith('lab/project/created', expect.anything())
    expect(appended).toHaveBeenCalledWith('lab/project/scope-updated', expect.anything())
    expect(appended).toHaveBeenCalledWith('lab/project/session-attached', expect.anything())
    expect(appended).toHaveBeenCalledWith('lab/project/session-detached', expect.anything())
    expect(appended).toHaveBeenCalledWith('lab/project/archived', expect.anything())
    expect(appended).toHaveBeenCalledWith('lab/presentation/accepted', expect.objectContaining({ view: 'project', projectId }))
    expect(appended).toHaveBeenCalledWith('lab/presentation/rejected', expect.objectContaining({ code: 'UNKNOWN_VIEW' }))
  })
  it('keeps empty project scope operable while Knowledge is unavailable', async () => {
    const ctx = new Context()
    const projects = new LabProjectService(ctx, { clock: () => 100 })
    await projects.attach(new InMemoryLabProjectStore())
    const projectWorkspace = { id: brandId<'WorkspaceId'>('workspace-unavailable'), path: '/workspace/unavailable', sessionIds: [] }
    ctx.provide('workspaceRegistry', { get: () => projectWorkspace, list: () => [projectWorkspace] })
    ctx.provide('labKnowledge', {
      listImportStatuses: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
      search: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
      listConflicts: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
    })
    ctx.provide('labDevices', { listDevices: () => [] })
    const web = new LabMvpWebService(ctx)
    const created = await web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-create',
      workspaceId: 'workspace-unavailable',
      name: 'Unavailable Knowledge project',
    }))
    expect(created).toMatchObject({ kind: 'project' })
    const projectId = (created.value as { project: { projectId: string } }).project.projectId
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-scope-update',
      projectId,
      sources: [],
      deviceIds: [],
    }))).resolves.toMatchObject({ kind: 'project', value: { sources: [], devices: [] } })
  })
})
