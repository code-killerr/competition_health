import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { CallId } from '@deepseek-ai/dsh-llm'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import { SessionId } from '@deepseek-ai/dsh-session'
import KnowledgeService from '@deepseek-ai/dsh-experimental-lab-knowledge'
import * as LocalKnowledge from '@deepseek-ai/dsh-experimental-lab-knowledge-local'
import * as ToolLabKnowledge from '../src/index.ts'
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
  await ctx.plugin(KnowledgeService)
  await ctx.plugin(LocalKnowledge, { path: ':memory:' })
  await ctx.plugin(ToolLabKnowledge)
  ctx.llm.registerAdapter(['mock'], new MockAdapter(['hang']))
  const agent = ctx.agentLoop.create(SessionId('lab-knowledge-tools'), { provider: 'mock', model: 'mock' })
  return { ctx, agent }
}

function execute(ctx: Context, agent: ReturnType<Context['agents']['get']>, name: string, arguments_: unknown) {
  if (agent === undefined) throw new Error('test agent is missing')
  return ctx.tools.execute({
    callId: CallId(`lab-knowledge-call-${++callNumber}`),
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

describe('tool-lab-knowledge', () => {
  it('registers only read-only retrieval tools in Agent scope', async () => {
    const { ctx, agent } = await setup()
    const scope = scopeOf(agent.ctx)
    if (scope === undefined) throw new Error('expected Agent scope')
    const assembly = await ctx.systemPrompt.assemble({ scope })
    expect(assembly.tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'lab_knowledge_status',
      'lab_knowledge_search',
      'lab_knowledge_conflicts',
    ]))

    await ctx.labKnowledge.importDocument({
      source: { kind: 'bytes', name: 'facts.csv', bytes: new TextEncoder().encode('alpha,42\n') },
    })
    const search = await execute(ctx, agent, 'lab_knowledge_search', { query: 'alpha' })
    expect(search.isError).toBe(false)
    const results = parseJson(text(search))
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ citationId: expect.any(String) as unknown }) as unknown,
    ]) as unknown)
  })
})
