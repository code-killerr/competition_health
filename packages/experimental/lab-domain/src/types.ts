/** 实验自动化平台共享领域类型；本文件只包含类型与类型声明。 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type { LabOperationId, LabProjectId } from './project.ts'

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
/** Harness Workspace 标识。 */
export type WorkspaceId = Branded<'WorkspaceId'>
/** 知识文档标识。 */
export type KnowledgeDocumentId = Branded<'KnowledgeDocumentId'>
/** 知识文档版本标识。 */
export type KnowledgeDocumentVersionId = Branded<'KnowledgeDocumentVersionId'>
/** 知识引用标识。 */
export type CitationId = Branded<'CitationId'>
/** 知识 SOP 草案标识。 */
export type KnowledgeSopDraftId = Branded<'KnowledgeSopDraftId'>
/** 知识 SOP 步骤标识。 */
export type KnowledgeSopStepId = Branded<'KnowledgeSopStepId'>
/** 知识冲突标识。 */
export type KnowledgeConflictId = Branded<'KnowledgeConflictId'>
/** 实验运行标识。 */
export type RunId = Branded<'RunId'>
/** 操作幂等标识。 */
export type OperationId = Branded<'OperationId'>
/** Agent 工具调用关联标识。 */
export type LabAgentCallId = Branded<'LabAgentCallId'>
/** 运行产物标识。 */
export type ArtifactId = Branded<'ArtifactId'>

/** 实验进度结果的状态。 */
export type LabProgressState = 'registered' | 'already-registered' | 'blocked' | 'waiting' | 'unavailable' | 'failed' | 'completed'
/** 实验进度结果的下一执行者。 */
export type LabProgressActor = 'agent' | 'human' | 'runtime' | 'capability'
/** 实验进度中可被 Host 授权的记录标识。 */
export interface LabScopedRecordIds {
  readonly workspaceId?: WorkspaceId
  readonly sessionId?: SessionId
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
  readonly planId?: PlanId
  readonly skillRevisionId?: SkillRevisionId
  readonly runId?: RunId
  readonly stepId?: PlanStepId
  readonly operationId?: OperationId
}
/** Agent 或 Host 可用于定位工作的已注册工作台目的地。 */
export interface LabWorkbenchDestination {
  readonly view: 'lab-project' | 'lab-monitor'
  readonly page?: 'approval' | 'execution' | 'evidence' | 'overview'
  readonly projectId?: LabProjectId
  readonly experimentId?: ExperimentId
}
/** 可由 Session event 重建的实验进度结果。 */
export interface LabProgressResult {
  readonly state: LabProgressState
  readonly sessionId: SessionId
  readonly scopedIds: LabScopedRecordIds
  readonly reason: string
  readonly nextActor: LabProgressActor
  readonly allowedActions: readonly string[]
  readonly workbenchDestination?: LabWorkbenchDestination
}

/** Registered destinations that an Agent may ask the Host to present. */
export type LabPresentationView = 'projects' | 'knowledge' | 'devices' | 'project' | 'experiment' | 'run' | 'evidence' | 'citation'

/** 运行产物的安全展示类别。 */
export type ArtifactKind = 'text' | 'json' | 'image' | 'file'

/** 只描述已由 Host 授权的运行产物，不承载可执行内容。 */
export interface ArtifactManifest {
  readonly artifactId: ArtifactId
  readonly runId: RunId
  readonly kind: ArtifactKind
  readonly displayName: string
  readonly uri: string
  readonly mediaType: string
  readonly size: number
  readonly digest: string
  readonly createdAt: number
}

/** 为领域对象创建 branded id。
 * @param id - string value to brand as a domain identifier.
 * @returns - branded identifier with compile-time identity B.
 */
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
/** 知识 SOP 草案生命周期。 */
export type KnowledgeSopDraftStatus = 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'REJECTED'
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
  /** 被拒绝计划的下一版修订来源。 */
  readonly supersedesPlanId?: PlanId
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
  readonly availableCitations: ReadonlySet<CitationId>
  /** Citation ids inherited from request constraints and other required sources. */
  readonly requiredCitations?: ReadonlySet<CitationId>
  readonly skillStatuses: ReadonlyMap<SkillRevisionId, LabSkillStatus>
  /** Declarative parameter constraints for each Skill revision referenced by the plan. */
  readonly skillParameterConstraints: ReadonlyMap<SkillRevisionId, Readonly<Record<string, string>>>
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

/** 从 Session 权威事件重建最近一次实验缓存投影；缺少投影事件时返回 undefined。
 * @param events - authoritative Session events to replay.
 * @param experimentId - optional experiment scope.
 * @returns - latest matching cache projection, when one was recorded.
 */
export function rebuildExperimentCache(
  events: readonly SessionEvent[],
  experimentId?: ExperimentId,
): ExperimentCacheProjection | undefined {
  let projection: ExperimentCacheProjection | undefined
  for (const event of events) {
    if (event.type !== 'lab/cache/projected') continue
    if (experimentId !== undefined && event.data.projection.experimentId !== experimentId) continue
    projection = event.data.projection
  }
  return projection
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
  readonly kind?: 'text' | 'table'
  readonly page?: number
  readonly titlePath?: readonly string[]
  /** Table column names when the cited block is a normalized table row. */
  readonly tableHeaders?: readonly string[]
  /** One-based logical row number in the source table. */
  readonly tableRow?: number
  readonly confirmed: boolean
  readonly conflicted: boolean
  readonly provenance?: 'SOURCE' | 'SOP_PUBLISHED'
  readonly sopDraftId?: KnowledgeSopDraftId
  readonly sopStepId?: KnowledgeSopStepId
  readonly score: number
}

/** 一个可供人工审核的 SOP 步骤。 */
export interface KnowledgeSopStep {
  readonly stepId: KnowledgeSopStepId
  readonly order: number
  readonly title: string
  readonly instruction: string
  readonly requiredInputs: readonly string[]
  readonly completionCriteria: readonly string[]
  readonly citations: readonly CitationId[]
  readonly missingFields: readonly string[]
}

/** 从知识引用生成、但尚未成为规划知识的 SOP 草案。 */
export interface KnowledgeSopDraft {
  readonly draftId: KnowledgeSopDraftId
  readonly title: string
  readonly status: KnowledgeSopDraftStatus
  readonly steps: readonly KnowledgeSopStep[]
  readonly sourceVersionIds: readonly KnowledgeDocumentVersionId[]
  readonly blockers: readonly string[]
  readonly updatedBy?: string
}

/** 两条或多条引用之间需要人工处理的知识冲突。 */
export interface KnowledgeConflict {
  readonly conflictId: KnowledgeConflictId
  readonly experimentId?: ExperimentId
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
      operationId?: LabOperationId
    }
    /** Project scope and capability facts exposed to an Agent request. */
    'lab/agent/context-read': {
      version: 1
      sessionId: SessionId
      kind: 'project' | 'planning'
      projectId: LabProjectId
      sourceIds: readonly { documentId: KnowledgeDocumentId; versionId: KnowledgeDocumentVersionId }[]
      deviceIds: readonly DeviceId[]
      sharedFactIds: readonly string[]
      citationIds: readonly CitationId[]
      knowledgeState: 'available' | 'unavailable'
      knowledgeReason?: string
      experimentId?: ExperimentId
      objective?: string
      unresolved: readonly string[]
    }
    /** Agent 被人工门禁暂停时的可恢复进度。 */
    'lab/agent/pending': {
      version: 1
      callId: LabAgentCallId
      sessionId: SessionId
      state: 'waiting'
      nextActor: 'human'
      reason: string
      allowedActions: readonly string[]
      scopedIds: LabScopedRecordIds
      projectId?: LabProjectId
      experimentId?: ExperimentId
      planId?: PlanId
      skillRevisionId?: SkillRevisionId
      runId?: RunId
      stepId?: PlanStepId
      operationId?: OperationId
      workbenchDestination?: LabWorkbenchDestination
    }
    /** Host-validated Agent presentation intent. */
    'lab/presentation/accepted': {
      version: 1
      sessionId: SessionId
      view: LabPresentationView
      projectId?: LabProjectId
      targetId?: string
    }
    /** Rejected presentation intent retained as actionable Session evidence. */
    'lab/presentation/rejected': {
      version: 1
      sessionId: SessionId
      code: 'UNKNOWN_VIEW' | 'PROJECT_SCOPE_MISMATCH' | 'RECORD_NOT_AUTHORIZED'
      message: string
    }
    /** Agent 生成并提交的计划草案。 */
    'lab/plan/proposed': {
      version: 1
      experimentId: ExperimentId
      planId: PlanId
      revision: number
      supersedesPlanId?: PlanId
      citationIds: readonly CitationId[]
      skillRevisionIds: readonly SkillRevisionId[]
      validation: ValidationResult
    }
    /** 人工确认的计划或 Skill 修订。 */
    'lab/plan/approved': {
      version: 1
      experimentId: ExperimentId
      planId: PlanId
      approvedBy: string
      skillRevisionIds: readonly SkillRevisionId[]
    }
    /** 人工拒绝的计划修订及其可选替代修订。 */
    'lab/plan/rejected': {
      version: 1
      experimentId: ExperimentId
      planId: PlanId
      rejectedBy: SessionId
      reason: string
      replacementPlanId?: PlanId
    }
    /** Skill 草案通过确定性校验。 */
    'lab/skill/validated': {
      version: 1
      skillRevisionId: SkillRevisionId
      validatedBy: SessionId
      validation: ValidationResult
    }
    /** 人工批准 Skill 修订。 */
    'lab/skill/approved': {
      version: 1
      skillRevisionId: SkillRevisionId
      approvedBy: string
    }
    /** Skill 修订进入可供计划锁定的 ACTIVE 状态。 */
    'lab/skill/activated': {
      version: 1
      skillRevisionId: SkillRevisionId
      activatedBy: SessionId
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
      status?: 'WAITING' | 'COMPLETED' | 'FAILED' | 'STOPPED'
      error?: string
      replanRequested?: boolean
    }
    /** Runtime began or completed one immutable ExecutionGraph step. */
    'lab/run/step': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      stepId: PlanStepId
      operationId: OperationId
      status: 'STARTED' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'STOPPED'
      requestedBy?: SessionId
    }
    /** Device operation receipt returned by the Host device capability. */
    'lab/run/device-receipt': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      stepId: PlanStepId
      operationId: OperationId
      status: 'accepted' | 'completed' | 'failed' | 'stopped'
      evidence: readonly string[]
    }
    /** Human approval evidence for a waiting Runtime operation. */
    'lab/run/approval': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      stepId: PlanStepId
      operationId: OperationId
      approvedBy: string
      evidence: readonly string[]
    }
    /** Artifact manifest projected into the Agent Session. */
    'lab/run/artifact': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      artifactId: ArtifactId
      kind: ArtifactKind
      displayName: string
      mediaType: string
      size: number
      digest: string
      createdAt: number
    }
    /** 运行结果验证、失败策略和最终反馈。 */
    'lab/run/feedback': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      status: RunStatus
      valid: boolean
      summary: string
      issues: readonly string[]
      replanRequested: boolean
      replanRequest?: { stepId: PlanStepId; reason: string }
    }
    /** Host-owned result assessment and authoritative verdict. */
    'lab/run/verdict': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      status: 'PENDING' | 'PASSED' | 'FAILED' | 'HUMAN_QC'
      verdict?: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
      method?: string
      evidenceIds: readonly string[]
      assessedBy?: string
      assessedAt?: number
      humanQcRequired: boolean
    }
    /** 运行状态转移，供运行时间线重建。 */
    'lab/run/state': {
      version: 1
      experimentId: ExperimentId
      runId: RunId
      from?: RunStatus
      to: RunStatus
      requestedBy?: SessionId
      reason?: string
    }
    /** 当前实验缓存投影更新。 */
    'lab/cache/projected': {
      version: 1
      projection: ExperimentCacheProjection
    }
  }
}
