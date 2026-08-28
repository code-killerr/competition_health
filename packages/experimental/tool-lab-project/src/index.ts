/** Project-scoped read-only context tools for the opt-in laboratory Agent. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { brandId, type KnowledgeSearchResult, type LabProjectId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabDeviceService } from '@deepseek-ai/dsh-experimental-lab-device'
import type { KnowledgeService } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import { createLabKnowledgeConsumer, LabProjectReferenceError } from '@deepseek-ai/dsh-experimental-lab-project'
import type { LabProjectService } from '@deepseek-ai/dsh-experimental-lab-project'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import { defineTool, type InferValue, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools'

/** Cordis plugin name. */
export const name = 'tool-lab-project'
/** Services used by the Agent-scoped project tools. */
export const inject = ['agents', 'tools', 'labProjects', 'labKnowledge', 'labDevices']

const JSON_SCHEMA = { type: 'json' } as const

function jsonOutput<const S extends ValueSchemaSpec>(schema: S): {
  schema: S
  render: (args: unknown, value: InferValue<S>) => [{ type: 'text'; text: string }]
} {
  return {
    schema,
    render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
  }
}

function jsonValue(value: unknown): JsonValue {
  const serialized: unknown = JSON.stringify(value)
  if (typeof serialized !== 'string') throw new Error('project context is not JSON serializable')
  return JSON.parse(serialized) as JsonValue
}

function callingAgent(agent: Agent | undefined, toolName: string): Agent {
  if (agent === undefined) throw new Error(`${toolName} requires a calling Agent`)
  return agent
}

function projectId(value: unknown): ReturnType<typeof brandId<'LabProjectId'>> {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('project_id must be a non-blank string')
  return brandId<'LabProjectId'>(value.trim())
}

async function resolveProjectId(
  value: unknown,
  caller: Agent,
  projects: LabProjectService,
  toolName: string,
): Promise<LabProjectId> {
  const id = value === undefined
    ? (await projects.projectForSession(caller.session.id))?.projectId
    : projectId(value)
  if (id === undefined) throw new Error(toolName + ' requires a project associated with the current Session')
  try
  {
    await projects.assertSession(id, caller.session.id)
  } catch (error) {
    preserveProjectError(error)
  }
  return id
}

function preserveProjectError(error: unknown): never {
  if (error instanceof LabProjectReferenceError) throw new HarnessError(error.message, error.code, { cause: error })
  throw error
}

async function readProjectContext(projects: LabProjectService, projectId: LabProjectId, sessionId: import('@deepseek-ai/dsh-session').SessionId) {
  try {
    return await projects.context(projectId, sessionId)
  } catch (error) {
    preserveProjectError(error)
  }
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} must be a non-blank string`)
  return value.trim()
}

function optionalLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new Error('limit must be a positive safe integer')
  return value
}

function install(agent: Agent, projects: LabProjectService, knowledge: KnowledgeService, devices: LabDeviceService): () => void {
  const consumer = createLabKnowledgeConsumer(knowledge)
  const disposers: Array<() => unknown> = []
  const register = (disposer: () => unknown): void => { disposers.push(disposer) }
  try {
    register(agent.ctx.tools.register(defineTool({
      name: 'lab_project_context',
      description: 'Read the current Agent Session project scope, selected devices, and explicitly published shared facts. This never changes project state.',
      parameters: {
        project_id: { type: 'string', description: 'Optional opaque project id; omitted values resolve from the current Session association.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_project_context')
        const id = await resolveProjectId(args.project_id, caller, projects, 'lab_project_context')
        return jsonValue({
          project: await readProjectContext(projects, id, caller.session.id),
          knowledgeCapability: await consumer.capability(),
        })
      },
    })))

    register(agent.ctx.tools.register(defineTool({
      name: 'lab_project_plan_context',
      description: 'Retrieve confirmed citations and devices limited to the current Session project scope for planning. Unapproved Session state is excluded.',
      parameters: {
        project_id: { type: 'string', description: 'Optional opaque project id; omitted values resolve from the current Session association.' },
        experiment_id: { type: 'string', required: true, description: 'Opaque experiment id.' },
        objective: { type: 'string', required: true, description: 'Evidence-oriented planning objective.' },
        unresolved: { type: 'array', items: { type: 'string' }, description: 'Missing inputs to preserve in the planning context.' },
        limit: { type: 'integer', description: 'Maximum number of cited results.' },
      },
      output: jsonOutput(JSON_SCHEMA),
      async execute(args, exec) {
        const caller = callingAgent(exec.agent, 'lab_project_plan_context')
        const id = await resolveProjectId(args.project_id, caller, projects, 'lab_project_plan_context')
        const experimentId = brandId<'ExperimentId'>(string(args.experiment_id, 'experiment_id'))
        const objective = string(args.objective, 'objective')
        const project = await readProjectContext(projects, id, caller.session.id)
        const capability = await consumer.capability()
        let citations: readonly KnowledgeSearchResult[] = []
        const limit = optionalLimit(args.limit)
        if (capability.state === 'available') {
          citations = await consumer.search({
            query: objective,
            documentIds: project.sources.map(source => source.documentId),
            versionIds: project.sources.map(source => source.versionId),
            confirmed: true,
            experimentId,
            ...limit === undefined ? {} : { limit },
          })
        }
        const selectedDevices = new Set(project.devices.map(device => device.deviceId))
        const deviceViews = devices.listDevices().filter(device => selectedDevices.has(device.id))
        const unresolved = args.unresolved === undefined ? [] : parseStrings(args.unresolved, 'unresolved')
        return jsonValue({
          project,
          knowledgeCapability: capability,
          planningContext: {
            experimentId,
            objective,
            queries: [objective],
            citations,
            conflicts: [],
            devices: deviceViews,
            assumptions: project.sharedFacts.map(fact => fact.content),
            unresolved,
          },
        })
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

/** Install the project tools on current and future Agent scopes. */
export function apply(ctx: Context): void {
  const installed = new Map<Agent, () => void>()
  const maybeInstall = (agent: Agent): void => {
    if (installed.has(agent)) return
    installed.set(agent, install(agent, ctx.labProjects, ctx.labKnowledge, ctx.labDevices))
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
  }, 'tool-lab-project.scopedTools()')
}

function parseStrings(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value.map((item, index) => string(item, `${path}[${index}]`))
}
