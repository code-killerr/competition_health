import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { SessionId } from '@deepseek-ai/dsh-session'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { InMemoryLabProjectStore } from '@deepseek-ai/dsh-experimental-lab-project'
import { LabProjectService } from '@deepseek-ai/dsh-experimental-lab-project'
import * as ToolLabProject from '../src/index.ts'
import { MockAdapter } from '../../../core/agent-loop/tests/mock-adapter.ts'

const contexts: Context[] = []
let callNumber = 0

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

async function setup() {
  const ctx = new Context()
  contexts.push(ctx)
  await mountAgentLoopTestDependencies(ctx)
  await ctx.plugin(AgentLoop, { agents: [] })
  const workspace = { id: brandId<'WorkspaceId'>('workspace-tools'), path: '/workspace/tools', sessionIds: [SessionId('lab-project-tools')] }
  ctx.provide('workspaceRegistry', { get: () => workspace, list: () => [workspace] })
  const projects = new LabProjectService(ctx, { clock: () => 100 })
  await projects.attach(new InMemoryLabProjectStore())
  const search = vi.fn().mockResolvedValue([])
  ctx.provide('labKnowledge', {
    listImportStatuses: vi.fn().mockResolvedValue([]),
    search,
    listConflicts: vi.fn().mockResolvedValue([]),
  })
  ctx.provide('labDevices', { listDevices: () => [{ id: 'device-1', name: 'Bench', healthy: true, reserved: false, capabilities: [] }] })
  await ctx.plugin(ToolLabProject)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(['hang']))
  const agent = ctx.agentLoop.create(SessionId('lab-project-tools'), { provider: 'mock', model: 'mock' })
  return { ctx, projects, agent, search }
}

function execute(ctx: Context, agent: ReturnType<Context['agents']['get']>, name: string, arguments_: unknown) {
  if (agent === undefined) throw new Error('test agent is missing')
  return ctx.tools.execute({
    callId: CallId(`lab-project-call-${++callNumber}`),
    name,
    arguments: arguments_,
    agent,
    signal: AbortSignal.timeout(5_000),
  })
}

function text(result: Awaited<ReturnType<typeof execute>>): string {
  return result.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

describe('tool-lab-project', () => {
  it('registers project context tools in Agent scope and preserves selected scope', async () => {
    const { ctx, projects, agent } = await setup()
    const scope = scopeOf(agent.ctx)
    if (scope === undefined) throw new Error('expected Agent scope')
    const assembly = await ctx.systemPrompt.assemble({ scope })
    expect(assembly.tools.map(tool => tool.name)).toEqual(expect.arrayContaining(['lab_project_context', 'lab_project_plan_context']))

    const project = (await projects.create({ name: 'Tool project', createdBy: agent.session.id })).project.projectId
    await projects.updateScope(project, {
      sources: [{ documentId: brandId<'KnowledgeDocumentId'>('doc-1'), versionId: brandId<'KnowledgeDocumentVersionId'>('version-1') }],
      deviceIds: [brandId<'DeviceId'>('device-1')],
      selectedBy: agent.session.id,
    })
    await projects.attachSession({ projectId: project, sessionId: agent.session.id, attachedBy: agent.session.id })

    const result = await execute(ctx, agent, 'lab_project_context', { project_id: project })
    const inferred = await execute(ctx, agent, 'lab_project_context', {})
    expect(inferred.isError).toBe(false)
    expect(JSON.parse(text(inferred))).toMatchObject({ project: { projectId: project } })
    expect(result.isError).toBe(false)
    expect(JSON.parse(text(result))).toMatchObject({
      project: {
        projectId: project,
        sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
        devices: [{ deviceId: 'device-1' }],
      },
      knowledgeCapability: { state: 'available' },
    })
  })

  it('limits planning retrieval to project source versions and carries unresolved inputs', async () => {
    const { ctx, projects, agent, search } = await setup()
    const project = (await projects.create({ name: 'Planning project', createdBy: agent.session.id })).project.projectId
    await projects.updateScope(project, {
      sources: [{ documentId: brandId<'KnowledgeDocumentId'>('doc-2'), versionId: brandId<'KnowledgeDocumentVersionId'>('version-2') }],
      deviceIds: [],
      selectedBy: agent.session.id,
    })
    await projects.attachSession({ projectId: project, sessionId: agent.session.id, attachedBy: agent.session.id })

    const result = await execute(ctx, agent, 'lab_project_plan_context', {
      project_id: project,
      experiment_id: 'experiment-1',
      objective: 'calibration',
      unresolved: ['sample mass'],
    })
    expect(result.isError).toBe(false)
    expect(JSON.parse(text(result))).toMatchObject({ planningContext: { objective: 'calibration', unresolved: ['sample mass'] } })
    expect(search).toHaveBeenCalledWith({
      query: 'calibration',
      documentIds: ['doc-2'],
      versionIds: ['version-2'],
      confirmed: true,
      experimentId: 'experiment-1',
    })
  })

  it('returns a stable cross-project reference error to the Agent', async () => {
    const { ctx, projects, agent } = await setup()
    const owner = (await projects.create({ name: 'Owner project', createdBy: agent.session.id })).project.projectId
    const other = (await projects.create({ name: 'Other project', createdBy: agent.session.id })).project.projectId
    await projects.attachSession({ projectId: owner, sessionId: agent.session.id, attachedBy: agent.session.id })
    const result = await execute(ctx, agent, 'lab_project_context', { project_id: other })
    expect(result.isError).toBe(true)
    expect(result.error).toMatchObject({ info: { name: 'HarnessError', code: 'CROSS_PROJECT_REFERENCE' } })
  })
})
