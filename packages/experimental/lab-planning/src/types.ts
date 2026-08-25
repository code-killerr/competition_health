/** 实验规划 Service 的上下文、提案和 Provider 接口。 */

import type {
  ExperimentPlan,
  ExperimentRequest,
  KnowledgeConflict,
  KnowledgeSearchResult,
  PlanValidationResult,
} from '@deepseek-ai/dsh-experimental-lab-domain'
import type { DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { LabSkillDraft, LabSkillRevision } from '@deepseek-ai/dsh-experimental-lab-skill'

/** 规划阶段提供给 Agent 的知识与设备事实。 */
export interface PlanningContext {
  readonly experimentId: ExperimentRequest['experimentId']
  readonly objective: string
  readonly queries: readonly string[]
  readonly citations: readonly KnowledgeSearchResult[]
  readonly conflicts: readonly KnowledgeConflict[]
  readonly devices: readonly DeviceView[]
  readonly assumptions: readonly string[]
  readonly unresolved: readonly string[]
}

/** Agent 提交的声明式计划和待审 Skill 草案。 */
export interface PlanProposalInput {
  readonly request: ExperimentRequest
  readonly plan: ExperimentPlan
  readonly skillDrafts: readonly LabSkillDraft[]
}

/** Planner 返回的提案结果；结果仍可能因为待审批而不可执行。 */
export interface PlanProposalResult {
  readonly context: PlanningContext
  readonly plan: ExperimentPlan
  readonly skillRevisions: readonly LabSkillRevision[]
  readonly validation: PlanValidationResult
}

/** 可替换的规划 Provider。 */
export interface LabPlanningProvider {
  readonly name: string
  buildContext(request: ExperimentRequest): Promise<PlanningContext>
  propose(input: PlanProposalInput): Promise<PlanProposalResult>
  dispose?(): Promise<void> | void
}
