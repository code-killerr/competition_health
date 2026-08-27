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
    expect(() => parseLabProjectConversationCommand({ command: 'project-create', projectId: ' ', name: 'Project' })).toThrow(/projectId/)
    expect(() => parseLabProjectConversationCommand({ command: 'project-planning-context', projectId: 'project-1', request: { experimentId: 'experiment-1' } })).toThrow(/objective/)
  })

  it('routes project commands through the Web Facade and scopes planning retrieval', async () => {
    const ctx = new Context()
    const projects = new LabProjectService(ctx, () => 100)
    await projects.attach(new InMemoryLabProjectStore())
    const search = vi.fn().mockResolvedValue([])
    const appended = vi.fn()
    const createdSession = { id: brandId<'SessionId'>('session-created') }
    ctx.provide('labKnowledge', {
      listImportStatuses: vi.fn().mockResolvedValue([{ documentId: 'doc-1', versionId: 'version-1', status: 'READY' }]),
      search,
      listConflicts: vi.fn().mockResolvedValue([]),
    })
    ctx.provide('labDevices', { listDevices: () => [{ id: 'device-1', name: 'Bench', healthy: true, reserved: false, capabilities: [] }] })
    ctx.provide('sessions', { get: vi.fn(() => ({ append: appended })), create: vi.fn(() => createdSession) })
    const web = new LabMvpWebService(ctx)
    const actor = brandId<'SessionId'>('session-1')

    await expect(web.dispatchProject(parseLabProjectConversationCommand({ command: 'project-create', projectId: 'project-1', name: 'Project', sessionId: actor }))).resolves.toMatchObject({ kind: 'project' })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-scope-update',
      projectId: 'project-1',
      sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
      deviceIds: ['device-1'],
      sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sources: [{ documentId: 'doc-1' }] } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-session-associate',
      projectId: 'project-1',
      targetSessionId: 'session-1',
      sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sessions: [{ sessionId: 'session-1' }] } })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-session-create',
      projectId: 'project-1',
      title: 'Follow-up',
      sessionId: actor,
    }))).resolves.toMatchObject({ kind: 'project', value: { sessions: expect.arrayContaining([expect.objectContaining({ sessionId: 'session-created', title: 'Follow-up' })]) } })
    const planning = await web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-planning-context',
      projectId: 'project-1',
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
  })
  it('keeps empty project scope operable while Knowledge is unavailable', async () => {
    const ctx = new Context()
    const projects = new LabProjectService(ctx, () => 100)
    await projects.attach(new InMemoryLabProjectStore())
    ctx.provide('labKnowledge', {
      listImportStatuses: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
      search: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
      listConflicts: vi.fn().mockRejectedValue(new Error('Knowledge provider is loading')),
    })
    ctx.provide('labDevices', { listDevices: () => [] })
    const web = new LabMvpWebService(ctx)
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-create',
      projectId: 'project-unavailable',
      name: 'Unavailable Knowledge project',
    }))).resolves.toMatchObject({ kind: 'project' })
    await expect(web.dispatchProject(parseLabProjectConversationCommand({
      command: 'project-scope-update',
      projectId: 'project-unavailable',
      sources: [],
      deviceIds: [],
    }))).resolves.toMatchObject({ kind: 'project', value: { sources: [], devices: [] } })
  })
})
