/** 实验规划的本地 Provider，负责检索上下文和确定性提案校验。 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  validateExperimentPlan,
  type ExperimentPlan,
  type ExperimentRequest,
  type PlanValidationContext,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabDeviceService, DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { KnowledgeService } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import type { LabPlanningProvider, PlanProposalInput, PlanProposalResult, PlanningContext, PlanningKnowledgeScope } from '@deepseek-ai/dsh-experimental-lab-planning'
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
  private readonly proposals = new Map<ExperimentPlan['planId'], PlanProposalResult>()
  private readonly requests = new Map<ExperimentPlan['planId'], ExperimentRequest>()

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
    return this.buildContextForScope(request)
  }

  private async buildContextForScope(request: ExperimentRequest, scope?: PlanningKnowledgeScope): Promise<PlanningContext> {
    const queries = unique([request.objective, ...request.constraints.map(constraint => constraint.value)])
    const citations = new Map<string, PlanningContext['citations'][number]>()
    for (const query of queries) {
      const searchRequest = {
        query,
        experimentId: request.experimentId,
        limit: this.contextLimit,
        ...scope === undefined ? {} : {
          documentIds: scope.documentIds,
          versionIds: scope.versionIds,
          confirmed: scope.confirmed,
        },
      }
      for (const citation of await this.knowledge.search(searchRequest)) citations.set(citation.citationId, citation)
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
    if (this.proposals.has(input.plan.planId)) throw new Error(`plan ${input.plan.planId} already exists`)
    if (input.plan.supersedesPlanId !== undefined) {
      const previous = this.requireProposal(input.plan.supersedesPlanId)
      if (previous.plan.experimentId !== input.plan.experimentId) throw new Error('replacement plan must stay within the same experiment')
      if (previous.plan.status !== 'REJECTED') throw new Error('replacement plan must supersede a REJECTED plan')
      if (input.plan.revision !== previous.plan.revision + 1) throw new Error('replacement plan revision must increment the rejected plan revision')
    }
    const context = await this.buildContextForScope(input.request, input.knowledgeScope)
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
      availableCitations: new Set(context.citations.map(citation => citation.citationId)),
      requiredCitations: new Set(input.request.constraints.flatMap(constraint => constraint.citations)),
      skillStatuses: new Map(skillRevisions.map(revision => [revision.revisionId, revision.status])),
      skillParameterConstraints: new Map(skillRevisions.map(revision => [revision.revisionId, revision.parameterConstraints])),
      installedOperations: new Set(skillRevisions.flatMap(revision => revision.operations.filter(operation => operation.installed).map(operation => `${operation.kind}:${operation.resourceRef}`))),
      deviceCapabilities: new Map(context.devices.map(device => [device.id, device.capabilities.map(capability => capability.name)])),
    }
    const validation = validateExperimentPlan(plan, validationContext)
    const result: PlanProposalResult = {
      context,
      plan: validation.valid ? { ...plan, status: 'VALIDATED' } : plan,
      skillRevisions,
      validation,
    }
    this.proposals.set(result.plan.planId, result)
    this.requests.set(result.plan.planId, input.request)
    return cloneProposal(result)
  }

  /** 返回本地保存的计划提案副本。 */
  getProposal(planId: PlanProposalResult['plan']['planId']): PlanProposalResult | undefined {
    const proposal = this.proposals.get(planId)
    return proposal === undefined ? undefined : cloneProposal(proposal)
  }

  /** 返回本地保存的计划审核副本。 */
  listProposals(experimentId?: ExperimentRequest['experimentId']): readonly PlanProposalResult[] {
    return [...this.proposals.values()]
      .filter(proposal => experimentId === undefined || proposal.plan.experimentId === experimentId)
      .map(proposal => cloneProposal(proposal))
  }

  /** 使用当前 Skill 生命周期重新校验已保存的计划。 */
  validatePlan(planId: PlanProposalResult['plan']['planId']): Promise<PlanProposalResult> {
    const proposal = this.requireProposal(planId)
    const request = this.requests.get(planId)
    if (request === undefined) throw new Error(`request for plan ${planId} does not exist`)
    if (proposal.plan.status === 'HUMAN_APPROVED' || proposal.plan.status === 'LOCKED') throw new Error('approved or locked plan cannot be revalidated')
    const currentRevisions = proposal.skillRevisions.map(revision => this.skills.resolveRevision(revision.revisionId) ?? revision)
    const plan = { ...proposal.plan, status: 'DRAFT' as const }
    const validation = validateExperimentPlan(plan, this.validationContext(request, proposal.context, currentRevisions))
    const updated = {
      ...proposal,
      plan: validation.valid ? { ...plan, status: 'VALIDATED' as const } : plan,
      skillRevisions: currentRevisions,
      validation,
    }
    this.proposals.set(planId, updated)
    return Promise.resolve(cloneProposal(updated))
  }

  /** 只有确定性校验通过且所有 Skill 已激活时才允许人工批准。 */
  async approvePlan(planId: PlanProposalResult['plan']['planId'], approvedBy: string): Promise<PlanProposalResult> {
    const proposal = await this.validatePlan(planId)
    if (approvedBy.trim().length === 0) throw new Error('approvedBy must not be empty')
    if (!proposal.validation.valid || proposal.plan.status !== 'VALIDATED') throw new Error('only a validated plan can be approved')
    for (const revision of proposal.skillRevisions) {
      if (this.skills.resolveRevision(revision.revisionId)?.status !== 'ACTIVE') {
        throw new Error(`Skill revision ${revision.revisionId} must be ACTIVE before plan approval`)
      }
    }
    const updated = {
      ...proposal,
      plan: { ...proposal.plan, status: 'HUMAN_APPROVED' as const },
    }
    this.proposals.set(planId, updated)
    return cloneProposal(updated)
  }

  /** 计划被拒绝后保留新的审核版本标记，后续提案使用新的 planId。 */
  rejectPlan(planId: PlanProposalResult['plan']['planId'], reason: string): Promise<PlanProposalResult> {
    const proposal = this.requireProposal(planId)
    const trimmedReason = reason.trim()
    if (trimmedReason.length === 0) throw new Error('rejection reason must not be empty')
    if (proposal.plan.status === 'HUMAN_APPROVED' || proposal.plan.status === 'LOCKED') throw new Error('approved or locked plan cannot be rejected')
    const updated = {
      ...proposal,
      plan: {
        ...proposal.plan,
        status: 'REJECTED' as const,
        unresolved: unique([...proposal.plan.unresolved, `human review rejected plan: ${trimmedReason}`]),
      },
    }
    this.proposals.set(planId, updated)
    return Promise.resolve(cloneProposal(updated))
  }

  private requireProposal(planId: PlanProposalResult['plan']['planId']): PlanProposalResult {
    const proposal = this.proposals.get(planId)
    if (proposal === undefined) throw new Error(`plan ${planId} does not exist`)
    return proposal
  }

  private validationContext(
    request: ExperimentRequest,
    context: PlanningContext,
    revisions: readonly LabSkillRevision[],
  ): PlanValidationContext {
    return {
      availableInputs: new Set(request.samples.map(sample => sample.name)),
      availableCitations: new Set(context.citations.map(citation => citation.citationId)),
      requiredCitations: new Set(request.constraints.flatMap(constraint => constraint.citations)),
      skillStatuses: new Map(revisions.map(revision => [revision.revisionId, revision.status])),
      skillParameterConstraints: new Map(revisions.map(revision => [revision.revisionId, revision.parameterConstraints])),
      installedOperations: new Set(revisions.flatMap(revision => revision.operations.filter(operation => operation.installed).map(operation => `${operation.kind}:${operation.resourceRef}`))),
      deviceCapabilities: new Map(context.devices.map(device => [device.id, device.capabilities.map(capability => capability.name)])),
    }
  }

  /** 释放本地 Provider 的提案与请求索引。 */
  dispose(): void {
    this.proposals.clear()
    this.requests.clear()
  }
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

function cloneProposal(proposal: PlanProposalResult): PlanProposalResult {
  return structuredClone(proposal)
}
