/** 实验自动化平台共享领域类型；本文件只包含类型与类型声明。 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'

/** 实验实例标识。 */
export type ExperimentId = Branded<'ExperimentId'>
/** 实验计划修订标识。 */
export type PlanId = Branded<'PlanId'>
/** 实验步骤标识。 */
export type PlanStepId = Branded<'PlanStepId'>
/** 实验 Skill 标识。 */
export type LabSkillId = Branded<'LabSkillId'>
/** 实验 Skill 修订标识。 */
export type SkillRevisionId = Branded<'SkillRevisionId'>
/** 设备标识。 */
export type DeviceId = Branded<'DeviceId'>
/** 知识文档标识。 */
export type KnowledgeDocumentId = Branded<'KnowledgeDocumentId'>
/** 知识文档版本标识。 */
export type KnowledgeDocumentVersionId = Branded<'KnowledgeDocumentVersionId'>
/** 知识引用标识。 */
export type CitationId = Branded<'CitationId'>
/** 知识冲突标识。 */
export type KnowledgeConflictId = Branded<'KnowledgeConflictId'>
/** 实验运行标识。 */
export type RunId = Branded<'RunId'>
/** 操作幂等标识。 */
export type OperationId = Branded<'OperationId'>

/** 为领域对象创建 branded id。 */
export function brandId<B extends string>(id: string): Branded<B> {
  return id as Branded<B>
}

/** 带单位的实验参数，禁止用裸数字表达有物理单位的值。 */
export interface UnitValue {
  readonly value: number
  readonly unit: string
}

/** 知识资料输入来源。 */
export type KnowledgeSource =
  | { readonly kind: 'path'; readonly path: string }
  | { readonly kind: 'bytes'; readonly name: string; readonly bytes: Uint8Array }

/** 实验 Skill 生命周期。 */
export type LabSkillStatus = 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'ACTIVE' | 'RETIRED'
/** 实验操作类型。 */
export type OperationKind = 'device' | 'human' | 'approval' | 'script' | 'api'
/** 文档导入生命周期。 */
export type KnowledgeImportStatus = 'QUEUED' | 'PARSING' | 'INDEXING' | 'READY' | 'FAILED'
/** 知识冲突生命周期。 */
export type KnowledgeConflictStatus = 'OPEN' | 'RESOLVED'
/** 实验计划生命周期。 */
export type PlanStatus = 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'LOCKED' | 'REJECTED'
/** 实验运行生命周期。 */
export type RunStatus = 'CREATED' | 'WAITING_CONFIRMATION' | 'RUNNING' | 'BLOCKED' | 'FAILED' | 'COMPLETED' | 'STOPPED'

/** 用户提供的实验样本描述。 */
export interface ExperimentSample {
  readonly name: string
  readonly attributes: Readonly<Record<string, string>>
}

/** 用户提供的实验约束及其来源。 */
export interface ExperimentConstraint {
  readonly name: string
  readonly value: string
  readonly citations: readonly CitationId[]
}

/** Agent 规划的实验需求。 */
export interface ExperimentRequest {
  readonly experimentId: ExperimentId
  readonly objective: string
  readonly samples: readonly ExperimentSample[]
  readonly constraints: readonly ExperimentConstraint[]
  readonly expectedOutputs: readonly string[]
  readonly unresolved: readonly string[]
}

/** 计划参数允许来自模型或外部输入；数值必须在校验时带单位。 */
export type PlanParameter = UnitValue | string | number | boolean

/** 实验计划中的一个声明式步骤。 */
export interface PlanStep {
  readonly stepId: PlanStepId
  readonly title: string
  readonly dependencies: readonly PlanStepId[]
  readonly skillRevisionId: SkillRevisionId
  readonly operationKind: OperationKind
  readonly operationResource: string
  readonly deviceId?: DeviceId
  readonly deviceCapability?: string
  readonly requiresApproval: boolean
  readonly requiredInputs: readonly string[]
  readonly parameters: Readonly<Record<string, PlanParameter>>
  readonly citations: readonly CitationId[]
  readonly expectedOutputs: readonly string[]
}

/** Agent 生成、等待确定性校验和人工确认的实验计划。 */
export interface ExperimentPlan {
  readonly planId: PlanId
  readonly experimentId: ExperimentId
  readonly revision: number
  readonly status: PlanStatus
  readonly objective: string
  readonly citations: readonly CitationId[]
  readonly assumptions: readonly string[]
  readonly unresolved: readonly string[]
  readonly steps: readonly PlanStep[]
}

/** 计划校验所需的外部事实快照。 */
export interface PlanValidationContext {
  readonly availableInputs: ReadonlySet<string>
  readonly skillStatuses: ReadonlyMap<SkillRevisionId, LabSkillStatus>
  readonly installedOperations: ReadonlySet<string>
  readonly deviceCapabilities: ReadonlyMap<DeviceId, readonly string[]>
}

/** 带计划身份和修订号的确定性校验结果。 */
export interface PlanValidationResult extends ValidationResult {
  readonly planId: PlanId
  readonly revision: number
}

/** 确定性校验问题。 */
export interface ValidationIssue {
  readonly code: string
  readonly message: string
  readonly path?: string
}

/** 确定性校验结果。 */
export interface ValidationResult {
  readonly valid: boolean
  readonly issues: readonly ValidationIssue[]
}

/** 计划步骤执行前需要检查的最小信息。 */
export interface ExecutableStepValidationInput {
  readonly skillStatus: LabSkillStatus
  readonly operationKind: OperationKind
  readonly operationInstalled: boolean
}

/** 一条可重建的实验缓存投影。 */
export interface ExperimentCacheProjection {
  readonly version: 1
  readonly experimentId: ExperimentId
  readonly planId?: PlanId
  readonly runId?: RunId
  readonly status: PlanStatus | RunStatus
  readonly knowledgeCitations: readonly CitationId[]
  readonly skillRevisionIds: readonly SkillRevisionId[]
  readonly updatedBy: SessionId
}

/** Knowledge Service 的检索请求。 */
export interface KnowledgeSearchRequest {
  readonly query: string
  readonly experimentId?: ExperimentId
  readonly documentIds?: readonly KnowledgeDocumentId[]
  readonly versionIds?: readonly KnowledgeDocumentVersionId[]
  readonly confirmed?: boolean
  readonly limit?: number
}

/** 带来源的知识检索结果。 */
export interface KnowledgeSearchResult {
  readonly citationId: CitationId
  readonly documentId: KnowledgeDocumentId
  readonly versionId: KnowledgeDocumentVersionId
  readonly location: string
  readonly excerpt: string
  readonly confirmed: boolean
  readonly score: number
}

/** 两条或多条引用之间需要人工处理的知识冲突。 */
export interface KnowledgeConflict {
  readonly conflictId: KnowledgeConflictId
  readonly citationIds: readonly CitationId[]
  readonly summary: string
  readonly status: KnowledgeConflictStatus
}

/** 实验运行快照中锁定的 Skill 版本。 */
export interface SkillSnapshot {
  readonly skillId: LabSkillId
  readonly revisionId: SkillRevisionId
  readonly status: 'ACTIVE'
  readonly definitionHash: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** 用户输入的实验需求，属于模型可见事实。 */
    'lab/experiment/requested': {
      version: 1
      experimentId: ExperimentId
      objective: string
      sessionId: SessionId
    }
    /** Agent 生成并提交的计划草案。 */
    'lab/plan/proposed': {
      version: 1
      experimentId: ExperimentId
      planId: PlanId
      citationIds: readonly CitationId[]
      skillRevisionIds: readonly SkillRevisionId[]
    }
    /** 人工确认的计划或 Skill 修订。 */
    'lab/plan/approved': {
      version: 1
      experimentId: ExperimentId
      planId: PlanId
      approvedBy: SessionId
      skillRevisionIds: readonly SkillRevisionId[]
    }
    /** 人工确认的知识引用。 */
    'lab/knowledge/confirmed': {
      version: 1
      citationId: CitationId
      confirmedBy: string
      note?: string
    }
    /** 实验步骤执行结果和验证结论。 */
    'lab/run/observation': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      stepId: PlanStepId
      operationId: OperationId
      valid: boolean
      evidence: readonly string[]
    }
    /** 当前实验缓存投影更新。 */
    'lab/cache/projected': {
      version: 1
      projection: ExperimentCacheProjection
    }
  }
}
