/** 在既有 DeepSeek Harness Agent scope 中提供实验知识库工具。 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { KnowledgeService } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'

/** Cordis 插件名称。 */
export const name = 'tool-lab-knowledge'
/** 复用 Harness Agent、工具注册表和实验 Knowledge Service。 */
export const inject = ['agents', 'tools', 'labKnowledge']

const IMPORT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    documentId: { type: 'string', required: true },
    versionId: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['QUEUED', 'PARSING', 'INDEXING', 'READY', 'FAILED'] },
  },
} as const

const STATUS_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    found: { type: 'boolean', required: true },
    documentId: { type: 'string' },
    versionId: { type: 'string' },
    status: { type: 'string', enum: ['QUEUED', 'PARSING', 'INDEXING', 'READY', 'FAILED'] },
    error: { type: 'string' },
  },
} as const

const SEARCH_RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    citationId: { type: 'string', required: true },
    documentId: { type: 'string', required: true },
    versionId: { type: 'string', required: true },
    location: { type: 'string', required: true },
    excerpt: { type: 'string', required: true },
    confirmed: { type: 'boolean', required: true },
    score: { type: 'number', required: true },
  },
} as const

const CONFLICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    conflictId: { type: 'string', required: true },
    citationIds: { type: 'array', required: true, items: { type: 'string' } },
    summary: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['OPEN', 'RESOLVED'] },
  },
} as const

const CONFIRM_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    citationId: { type: 'string', required: true },
    confirmed: { type: 'boolean', required: true, const: true },
  },
} as const

/** 声明一个 JSON 输出，让 Harness 负责标准化模型可见结果。 */
function jsonOutput<const S extends ValueSchemaSpec>(schema: S): {
  schema: S
  render: (args: unknown, value: InferValue<S>) => [{ type: 'text'; text: string }]
} {
  return {
    schema,
    render: (_args: unknown, value: InferValue<S>) => [{ type: 'text', text: JSON.stringify(value) }],
  }
}

/** 确保调用来自一个已发布的 Agent scope。 */
function callingAgent(agent: Agent | undefined, toolName: string): Agent {
  if (agent === undefined) throw new Error(`${toolName} requires a calling Agent`)
  return agent
}

/** 注册实验知识工具到一个精确 Agent scope。 */
function install(agent: Agent, knowledge: KnowledgeService): () => void {
  const disposers: Array<() => unknown> = []
  const register = (disposer: () => unknown): void => { disposers.push(disposer) }
  try {
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_knowledge_import',
      description: 'Register a local CSV, text, or PDF source in the laboratory knowledge base and return its immutable version status.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute path of the source file.' },
      },
      output: jsonOutput(IMPORT_OUTPUT_SCHEMA),
      async execute(args, exec) {
        callingAgent(exec.agent, 'lab_knowledge_import')
        return await knowledge.importDocument({ source: { kind: 'path', path: args.path } })
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_knowledge_status',
      description: 'Read the parse and index status of one laboratory knowledge document version.',
      parameters: {
        document_id: { type: 'string', required: true, description: 'Knowledge document id returned by lab_knowledge_import.' },
        version_id: { type: 'string', description: 'Optional immutable document version id.' },
      },
      output: jsonOutput(STATUS_OUTPUT_SCHEMA),
      async execute(args, exec) {
        callingAgent(exec.agent, 'lab_knowledge_status')
        const result = await knowledge.getImportStatus(brandId<'KnowledgeDocumentId'>(args.document_id), args.version_id === undefined ? undefined : brandId<'KnowledgeDocumentVersionId'>(args.version_id))
        return result === undefined ? { found: false } : { found: true, ...result }
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_knowledge_search',
      description: 'Search laboratory knowledge and return cited excerpts with document version, location, score, and confirmation state.',
      parameters: {
        query: { type: 'string', required: true, description: 'Evidence-oriented search query.' },
        document_ids: { type: 'array', items: { type: 'string' }, description: 'Optional document ids to include.' },
        version_ids: { type: 'array', items: { type: 'string' }, description: 'Optional immutable version ids to include.' },
        confirmed: { type: 'boolean', description: 'Optional filter for human-confirmed facts.' },
        limit: { type: 'integer', description: 'Maximum number of citations.' },
      },
      output: jsonOutput({ type: 'array', items: SEARCH_RESULT_SCHEMA } as const),
      async execute(args, exec) {
        callingAgent(exec.agent, 'lab_knowledge_search')
        return [...await knowledge.search({
          query: args.query,
          ...args.document_ids === undefined ? {} : { documentIds: args.document_ids.map(id => brandId<'KnowledgeDocumentId'>(id)) },
          ...args.version_ids === undefined ? {} : { versionIds: args.version_ids.map(id => brandId<'KnowledgeDocumentVersionId'>(id)) },
          ...args.confirmed === undefined ? {} : { confirmed: args.confirmed },
          ...args.limit === undefined ? {} : { limit: args.limit },
        })]
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_knowledge_conflicts',
      description: 'List knowledge conflicts that require human review before a laboratory plan can rely on them.',
      parameters: {},
      output: jsonOutput({ type: 'array', items: CONFLICT_SCHEMA } as const),
      async execute(_args, exec) {
        callingAgent(exec.agent, 'lab_knowledge_conflicts')
        return (await knowledge.listConflicts()).map(conflict => ({ ...conflict, citationIds: [...conflict.citationIds] }))
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_knowledge_confirm',
      description: 'Confirm one cited knowledge fact with an accountable reviewer and optional note.',
      parameters: {
        citation_id: { type: 'string', required: true, description: 'Citation id returned by lab_knowledge_search.' },
        confirmed_by: { type: 'string', required: true, description: 'Reviewer identity.' },
        note: { type: 'string', description: 'Optional review note.' },
      },
      output: jsonOutput(CONFIRM_OUTPUT_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_knowledge_confirm')
        await knowledge.confirmFact({
          citationId: brandId<'CitationId'>(args.citation_id),
          confirmedBy: args.confirmed_by,
          ...args.note === undefined ? {} : { note: args.note },
        })
        caller.session.append('lab/knowledge/confirmed', {
          version: 1,
          citationId: brandId<'CitationId'>(args.citation_id),
          confirmedBy: args.confirmed_by,
          ...args.note === undefined ? {} : { note: args.note },
        })
        return { citationId: args.citation_id, confirmed: true }
      },
    })))
  } catch (error) {
    for (const dispose of disposers.reverse()) void dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) void dispose()
  }
}

/** 安装现有 Agent 与后续创建 Agent 的知识工具。 */
export function apply(ctx: Context): void {
  const installed = new Map<Agent, () => void>()
  const maybeInstall = (agent: Agent): void => {
    if (installed.has(agent)) return
    installed.set(agent, install(agent, ctx.labKnowledge))
  }
  for (const agent of ctx.agents.list()) maybeInstall(agent)
  ctx.on('agent/created', ({ agent }) => { maybeInstall(agent) })
  ctx.on('agent/disposed', ({ agent }) => {
    installed.get(agent)?.()
    installed.delete(agent)
  })
  ctx.effect(() => () => {
    for (const dispose of installed.values()) dispose()
    installed.clear()
  }, 'tool-lab-knowledge.scopedTools()')
}
