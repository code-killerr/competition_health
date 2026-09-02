import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { SessionId } from '@deepseek-ai/dsh-session'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import LabDeviceService from '@deepseek-ai/dsh-experimental-lab-device'
import * as MockDevice from '@deepseek-ai/dsh-experimental-lab-device-mock'
import LabKnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import * as LocalKnowledge from '@deepseek-ai/dsh-experimental-lab-knowledge-local'
import LabPlanningService from '@deepseek-ai/dsh-experimental-lab-planning'
import * as LocalPlanning from '@deepseek-ai/dsh-experimental-lab-planning-local'
import LabSkillService from '@deepseek-ai/dsh-experimental-lab-skill'
import * as LocalSkill from '@deepseek-ai/dsh-experimental-lab-skill-local'
import { InMemoryLabProjectStore, LabProjectService } from '@deepseek-ai/dsh-experimental-lab-project'
import * as ToolLabPlanning from '../src/index.ts'
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
  await ctx.plugin(LabKnowledgeService)
  await ctx.plugin(LocalKnowledge, { path: ':memory:' })
  await ctx.plugin(LabSkillService)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(LocalSkill)
  await ctx.plugin(LabDeviceService)
  await ctx.plugin(MockDevice, { devices: [{ id: 'device-1', name: 'mock dispenser', capabilities: ['dispense'] }] })
  const workspace = { id: brandId<'WorkspaceId'>('workspace-lab-planning'), path: '/workspace/lab-planning', sessionIds: [SessionId('lab-planning-tools')] }
  ctx.provide('workspaceRegistry', { get: (id: typeof workspace.id) => id === workspace.id ? workspace : undefined, list: () => [workspace] })
  const projects = new LabProjectService(ctx, { clock: () => 100 })
  await projects.attach(new InMemoryLabProjectStore())
  await ctx.plugin(LabPlanningService)
  await ctx.plugin(LocalPlanning)
  await ctx.plugin(ToolLabPlanning)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(['hang']))
  const agent = ctx.agentLoop.create(SessionId('lab-planning-tools'), { provider: 'mock', model: 'mock' })
  const project = (await projects.create({ workspaceId: workspace.id, createdBy: agent.session.id })).project.projectId
  await projects.attachSession({ projectId: project, sessionId: agent.session.id, attachedBy: agent.session.id })
  return { ctx, agent, projects, project }
}

async function recordPlanningContext(
  agent: ReturnType<Context['agents']['get']>,
  projects: LabProjectService,
  projectId: ReturnType<typeof brandId<'LabProjectId'>>,
  experimentId: string,
  objective: string,
  citationIds: readonly string[] = [],
): Promise<void> {
  if (agent === undefined) throw new Error('test agent is missing')
  const project = await projects.context(projectId, agent.session.id)
  agent.session.append('lab/agent/context-read', {
    version: 1,
    sessionId: agent.session.id,
    kind: 'planning',
    projectId,
    sourceIds: project.sources.map(source => ({ documentId: source.documentId, versionId: source.versionId })),
    deviceIds: project.devices.map(device => device.deviceId),
    sharedFactIds: project.sharedFacts.map(fact => String(fact.factId)),
    citationIds: citationIds.map(citationId => brandId<'CitationId'>(citationId)),
    knowledgeState: 'available',
    experimentId: brandId<'ExperimentId'>(experimentId),
    objective,
    unresolved: [],
  })
}

function execute(ctx: Context, agent: ReturnType<Context['agents']['get']>, name: string, arguments_: unknown) {
  if (agent === undefined) throw new Error('test agent is missing')
  return ctx.tools.execute({
    callId: CallId(`lab-planning-call-${++callNumber}`),
    name,
    arguments: arguments_,
    agent,
    signal: AbortSignal.timeout(5_000),
  })
}

function text(result: Awaited<ReturnType<typeof execute>>): string {
  return result.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

describe('tool-lab-planning', () => {
  it('registers planning tools in Agent scope and records a non-executable proposal', async () => {
    const { ctx, agent, projects, project } = await setup()
    const scope = scopeOf(agent.ctx)
    if (scope === undefined) throw new Error('expected Agent scope')
    const assembly = await ctx.systemPrompt.assemble({ scope })
    expect(assembly.tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'lab_plan_context',
      'lab_plan_devices',
      'lab_plan_propose',
    ]))

    const imported = await ctx.labKnowledge.importDocument({
      source: { kind: 'bytes', name: 'facts.csv', bytes: new TextEncoder().encode('alpha,42\n') },
    })
    const request = {
      experimentId: 'experiment-1',
      objective: 'alpha',
      samples: [{ name: 'sample', attributes: {} }],
      constraints: [],
      expectedOutputs: ['result'],
      unresolved: [],
    }
    const contextResult = await execute(ctx, agent, 'lab_plan_context', { request })
    expect(contextResult.isError).toBe(false)
    const context = JSON.parse(text(contextResult)) as { objective: string; citations: Array<{ citationId: string; excerpt: string }> }
    expect(context).toMatchObject({ objective: 'alpha', citations: [{ excerpt: 'column1: alpha | column2: 42', kind: 'table', tableHeaders: ['column1', 'column2'], tableRow: 1 }] })
    const citationId = context.citations[0]!.citationId
    await ctx.labKnowledge.confirmFact({ citationId: brandId<'CitationId'>(citationId), confirmedBy: 'reviewer' })
    await projects.updateScope(project, {
      sources: [{ documentId: imported.documentId, versionId: imported.versionId }],
      deviceIds: [],
      selectedBy: agent.session.id,
    })
    await recordPlanningContext(agent, projects, project, 'experiment-1', 'alpha', [citationId])

    const proposalResult = await execute(ctx, agent, 'lab_plan_propose', {
      request,
      plan: {
        planId: 'plan-1',
        experimentId: 'experiment-1',
        revision: 1,
        status: 'DRAFT',
        objective: 'alpha',
        citations: [citationId],
        assumptions: [],
        unresolved: [],
        steps: [{
          stepId: 'step-1',
          title: 'dispense sample',
          dependencies: [],
          skillRevisionId: 'skill-revision-1',
          operationKind: 'device',
          operationResource: 'dispense',
          deviceId: 'device-1',
          deviceCapability: 'dispense',
          requiresApproval: true,
          requiredInputs: ['sample'],
          parameters: { volume: { value: 10, unit: 'uL' } },
          citations: [citationId],
          expectedOutputs: ['dispensed sample'],
        }],
      },
      skill_drafts: [{
        skillId: 'skill-1',
        revisionId: 'skill-revision-1',
        status: 'DRAFT',
        name: 'dispense-sample',
        purpose: 'Dispense a sample with a configured device.',
        applicability: ['configured dispenser'],
        inputs: ['sample'],
        outputs: ['dispensed sample'],
        parameterConstraints: { volume: 'positive uL volume' },
        completionConditions: ['receipt recorded'],
        failurePolicy: 'STOP',
        citations: [citationId],
        operations: [{ kind: 'device', resourceRef: 'dispense', installed: true }],
      }],
    })
    expect(proposalResult.isError).toBe(false)
    expect(JSON.parse(text(proposalResult))).toMatchObject({ validation: { valid: false, issues: [{ code: 'SKILL_NOT_ACTIVE' }] } })
    await expect(execute(ctx, agent, 'lab_skill_validate', { skill_revision_id: 'skill-revision-1' })).resolves.toMatchObject({ isError: false })
    expect(agent.session.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'lab/plan/proposed',
        data: expect.objectContaining({
          planId: 'plan-1',
          validation: expect.objectContaining({
            valid: false,
            issues: [expect.objectContaining({ code: 'SKILL_NOT_ACTIVE' })],
          }) as unknown,
        }) as unknown,
      }),
      expect.objectContaining({
        type: 'lab/skill/validated',
        data: expect.objectContaining({
          skillRevisionId: 'skill-revision-1',
          validation: expect.objectContaining({ valid: true, issues: [] }) as unknown,
        }) as unknown,
      }),
    ]))
  })

  it('rejects a plan citation that is outside the current retrieval context', async () => {
    const { ctx, agent, projects, project } = await setup()
    await recordPlanningContext(agent, projects, project, 'experiment-invalid-citation', 'unmatched objective')
    const result = await execute(ctx, agent, 'lab_plan_propose', {
      request: {
        experimentId: 'experiment-invalid-citation',
        objective: 'unmatched objective',
        samples: [],
        constraints: [],
        expectedOutputs: ['result'],
        unresolved: [],
      },
      plan: {
        planId: 'plan-invalid-citation',
        experimentId: 'experiment-invalid-citation',
        revision: 1,
        status: 'DRAFT',
        objective: 'unmatched objective',
        citations: ['citation-not-retrieved'],
        assumptions: [],
        unresolved: [],
        steps: [],
      },
      skill_drafts: [],
    })

    expect(result.isError).toBe(false)
    expect(parseJson(text(result))).toMatchObject({
      validation: {
        valid: false,
        issues: expect.arrayContaining([expect.objectContaining({ code: 'CITATION_UNKNOWN' })]) as unknown,
      },
    })

    expect(agent.session.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'lab/plan/proposed',
        data: expect.objectContaining({ planId: 'plan-invalid-citation', citationIds: ['citation-not-retrieved'] }) as unknown,
      }),
    ]))
  })
  it('returns a stable citation-required issue for an uncited plan', async () => {
    const { ctx, agent, projects, project } = await setup()
    await recordPlanningContext(agent, projects, project, 'experiment-uncited', 'uncited objective')
    const result = await execute(ctx, agent, 'lab_plan_propose', {
      request: {
        experimentId: 'experiment-uncited',
        objective: 'uncited objective',
        samples: [],
        constraints: [],
        expectedOutputs: ['result'],
        unresolved: [],
      },
      plan: {
        planId: 'plan-uncited',
        experimentId: 'experiment-uncited',
        revision: 1,
        status: 'DRAFT',
        objective: 'uncited objective',
        citations: [],
        assumptions: [],
        unresolved: [],
        steps: [],
      },
      skill_drafts: [],
    })
    expect(result.isError).toBe(false)
    expect(parseJson(text(result))).toMatchObject({
      validation: {
        valid: false,
        issues: expect.arrayContaining([expect.objectContaining({ code: 'CITATION_REQUIRED' })]) as unknown,
      },
    })
    expect(agent.session.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'lab/plan/proposed',
        data: expect.objectContaining({ planId: 'plan-uncited', citationIds: [] }) as unknown,
      }),
    ]))
  })

  it('requires a current Project planning context before proposing a plan', async () => {
    const { ctx, agent } = await setup()
    const result = await execute(ctx, agent, 'lab_plan_propose', {
      request: {
        experimentId: 'experiment-without-context',
        objective: 'prepare sample',
        samples: [],
        constraints: [],
        expectedOutputs: ['sample'],
        unresolved: [],
      },
      plan: {
        planId: 'plan-without-context',
        experimentId: 'experiment-without-context',
        revision: 1,
        status: 'DRAFT',
        objective: 'prepare sample',
        citations: [],
        assumptions: [],
        unresolved: [],
        steps: [],
      },
      skill_drafts: [],
    })

    expect(result.isError).toBe(true)
    expect(JSON.stringify(result)).toContain('PROJECT_PLANNING_CONTEXT_REQUIRED')
    expect(agent.session.events.some(event => event.type === 'lab/plan/proposed')).toBe(false)
  })
})
