/** 实验规划的本地 Provider，负责检索上下文和确定性提案校验。 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  validateExperimentPlan,
  type ExperimentRequest,
  type PlanValidationContext,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabDeviceService, DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { KnowledgeService } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import type { LabPlanningProvider, PlanProposalInput, PlanProposalResult, PlanningContext } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { LabSkillRevision } from '@deepseek-ai/dsh-experimental-lab-skill'
import type { LabSkillService } from '@deepseek-ai/dsh-experimental-lab-skill'

const DEFAULT_CONTEXT_LIMIT = 8

/** 本地规划 Provider 配置。 */
export interface Config {
  /** 每个规划检索词返回的最大引用数。 */
  readonly contextLimit?: number
}

/** Loader 使用的本地规划 Provider 配置 schema。 */
export const Config: z<Config> = z.object({
  contextLimit: z.number().min(1).default(DEFAULT_CONTEXT_LIMIT),
})

/** Cordis 插件名称。 */
export const name = 'lab-planning-local'
/** 依赖规划、知识、Skill 和设备 Service。 */
export const inject = ['labPlanning', 'labKnowledge', 'labSkills', 'labDevices']

/** 进程内规划 Provider；后续可替换为持久化或远程 Planner。 */
export class LocalLabPlanningProvider implements LabPlanningProvider {
  readonly name = 'local'
  private readonly contextLimit: number
  private readonly knowledge: KnowledgeService
  private readonly skills: LabSkillService
  private readonly devices: LabDeviceService

  constructor(
    knowledge: KnowledgeService,
    skills: LabSkillService,
    devices: LabDeviceService,
    config: Config = {},
  ) {
    this.knowledge = knowledge
    this.skills = skills
    this.devices = devices
    this.contextLimit = config.contextLimit ?? DEFAULT_CONTEXT_LIMIT
    if (!Number.isInteger(this.contextLimit) || this.contextLimit < 1) throw new Error('planning contextLimit must be a positive integer')
  }

  /** 根据目标和约束检索带引用上下文，并读取当前只读设备台账。 */
  async buildContext(request: ExperimentRequest): Promise<PlanningContext> {
    const queries = unique([request.objective, ...request.constraints.map(constraint => constraint.value)])
    const citations = new Map<string, PlanningContext['citations'][number]>()
    for (const query of queries) {
      for (const citation of await this.knowledge.search({
        query,
        experimentId: request.experimentId,
        limit: this.contextLimit,
      })) citations.set(citation.citationId, citation)
    }
    const conflicts = await this.knowledge.listConflicts(request.experimentId)
    const devices = this.devices.listDevices()
    const unresolved = [...request.unresolved]
    if (citations.size === 0) unresolved.push('no knowledge citation matched the planning request')
    for (const conflict of conflicts) {
      if (conflict.status === 'OPEN') unresolved.push(`knowledge conflict ${conflict.conflictId}: ${conflict.summary}`)
    }
    return {
      experimentId: request.experimentId,
      objective: request.objective,
      queries,
      citations: [...citations.values()],
      conflicts,
      devices: cloneDevices(devices),
      assumptions: [],
      unresolved: unique(unresolved),
    }
  }

  /** 创建 Skill 草案并返回等待审批的计划校验结果。 */
  async propose(input: PlanProposalInput): Promise<PlanProposalResult> {
    if (input.plan.experimentId !== input.request.experimentId) throw new Error('plan experimentId does not match request')
    if (input.plan.status !== 'DRAFT') throw new Error('only a DRAFT plan can be proposed')
    const context = await this.buildContext(input.request)
    const contextCitationIds = new Set(context.citations.map(citation => citation.citationId))
    const unresolved = [...context.unresolved, ...input.plan.unresolved]
    for (const citationId of input.plan.citations) {
      if (!contextCitationIds.has(citationId)) unresolved.push(`plan citation ${citationId} was not returned by the current retrieval context`)
    }
    const plan = {
      ...input.plan,
      unresolved: unique(unresolved),
      status: 'DRAFT' as const,
    }
    const skillRevisions: LabSkillRevision[] = []
    for (const draft of input.skillDrafts) skillRevisions.push(await this.skills.createDraft(draft))
    const validationContext: PlanValidationContext = {
      availableInputs: new Set(input.request.samples.map(sample => sample.name)),
      skillStatuses: new Map(skillRevisions.map(revision => [revision.revisionId, revision.status])),
      installedOperations: new Set(skillRevisions.flatMap(revision => revision.operations.filter(operation => operation.installed).map(operation => `${operation.kind}:${operation.resourceRef}`))),
      deviceCapabilities: new Map(context.devices.map(device => [device.id, device.capabilities.map(capability => capability.name)])),
    }
    return {
      context,
      plan,
      skillRevisions,
      validation: validateExperimentPlan(plan, validationContext),
    }
  }

  /** 本地 Provider 不持有额外资源。 */
  dispose(): void {}
}

/** 将本地 Provider 挂载到规划 Service。 */
export function apply(ctx: Context, config: Config = {}): void {
  const provider = new LocalLabPlanningProvider(ctx.labKnowledge, ctx.labSkills, ctx.labDevices, config)
  ctx.effect(() => ctx.labPlanning.registerProvider(provider), 'lab-planning-local.provider')
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(value => value.length > 0))]
}

function cloneDevices(devices: readonly DeviceView[]): DeviceView[] {
  return devices.map(device => ({
    ...device,
    capabilities: device.capabilities.map(capability => ({ ...capability, parameters: { ...capability.parameters } })),
  }))
}
