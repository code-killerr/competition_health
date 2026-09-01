/** 实验工作台的浏览器 HTTP DTO 与 `/api/lab` 客户端。 */

import type { LabPresentationIntent, LabPresentationValidation } from './lifecycle.ts'

/** A structured experiment request sent from the workbench to the Host. */
export interface LabExperimentRequest {
  readonly experimentId: string
  readonly objective: string
  readonly samples: readonly {
    readonly name: string
    readonly attributes: Readonly<Record<string, string>>
  }[]
  readonly constraints: readonly {
    readonly name: string
    readonly value: string
    readonly citations: readonly string[]
  }[]
  readonly expectedOutputs: readonly string[]
  readonly unresolved: readonly string[]
}

/** JSON values allowed in a serializable laboratory view. */
export type LabJsonValue = string | number | boolean | null | readonly LabJsonValue[] | { readonly [key: string]: LabJsonValue }

/** A unit-aware parameter value shown in a plan or execution graph. */
export type LabParameterValue = string | number | boolean | { readonly value: number; readonly unit: string }

/** Stable lifecycle states shared by page records and capability projections. */
export type LabRecordState = 'loading' | 'ready' | 'empty' | 'waiting' | 'unavailable' | 'failed'

/** A project identity returned by the Host. */
export interface LabProjectRecord {
  readonly projectId?: string
  readonly workspaceId?: string
  readonly name?: string
  readonly description?: string
  readonly status?: 'ACTIVE' | 'ARCHIVED'
  readonly createdAt?: number
  readonly updatedAt?: number
}

/** A project Session association returned by the Host. */
export interface LabProjectSessionRecord {
  readonly projectId?: string
  readonly sessionId?: string
  readonly title?: string
  readonly order?: number
  readonly status?: 'ACTIVE' | 'ARCHIVED'
  readonly createdAt?: number
  readonly updatedAt?: number
}

/** An Experiment identity and provenance record returned by the Host. */
export interface LabExperimentRecord {
  readonly experimentId: string
  readonly projectId: string
  readonly title: string
  readonly objective: string
  readonly status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  readonly createdInSessionId: string
  readonly derivedFromExperimentId?: string
  readonly createdAt: number
  readonly updatedAt: number
}

/** One Session's role in an Experiment. */
export interface LabExperimentSessionRecord {
  readonly projectId: string
  readonly experimentId: string
  readonly sessionId: string
  readonly role: 'created' | 'continued' | 'reviewed'
  readonly linkedBy: string
  readonly linkedAt: number
}

/** A Project-scoped source selection. */
export interface LabProjectSourceRecord {
  readonly projectId?: string
  readonly documentId?: string
  readonly versionId?: string
  readonly selectedAt?: number
  readonly selectedBy?: string
  readonly status?: string
}

/** A Project-scoped device selection. */
export interface LabProjectDeviceRecord {
  readonly projectId?: string
  readonly deviceId?: string
  readonly id?: string
  readonly selectedAt?: number
  readonly selectedBy?: string
}

/** A Project evidence projection linked to a durable Session event. */
export interface LabEvidenceRecord {
  readonly version?: 1
  readonly projectId?: string
  readonly sessionId?: string
  readonly experimentId?: string
  readonly kind?: 'plan-proposal' | 'plan-approval' | 'run' | 'report'
  readonly referenceId?: string
  readonly status?: string
  readonly updatedAt?: number
}

/** Safe content returned by a Host-authorized Artifact preview action. */
export type LabArtifactPreview =
  | { readonly kind: 'text'; readonly content: string }
  | { readonly kind: 'json'; readonly content: LabJsonValue }
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'unsupported' }

/** A Host-authorized Artifact manifest, optionally enriched after an open action. */
export interface LabArtifactRecord {
  readonly artifactId: string
  readonly runId: string
  readonly kind: 'text' | 'json' | 'image' | 'file' | 'report'
  readonly displayName: string
  readonly uri: string
  readonly mediaType: string
  readonly size: number
  readonly digest: string
  readonly createdAt: number
  readonly preview?: LabArtifactPreview
}

/** Project 文件在授权 Workspace 中的元数据记录。 */
export type LabProjectFileGroup = 'configuration' | 'conversation-output' | 'run-artifacts'

/** 由 Host 授权的 Project 文件记录；不包含文件正文或绝对路径。 */
export interface LabProjectFileRecord {
  readonly projectFileId: string
  readonly projectId: string
  readonly group: LabProjectFileGroup
  readonly displayName: string
  readonly relativePath: string
  readonly mediaType: string
  readonly size: number
  readonly digest: string
  readonly revision: number
  readonly createdAt: number
  readonly runId?: string
  readonly artifactId?: string
}

/** Host 对 Project 文件执行安全预览后返回的短生命周期数据。 */
export type LabProjectFilePreview =
  | { readonly kind: 'text'; readonly content: string }
  | { readonly kind: 'json'; readonly content: LabJsonValue }
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'unsupported' }

/** Host 为一次 Project 文件下载动作签发的不透明句柄。 */
export interface LabProjectFileDownload {
  readonly projectFileId: string
  readonly displayName: string
  readonly mediaType: string
  readonly downloadToken: string
}

/** Project 文件 revision 事件只携带元数据，供当前目录重新查询。 */
export interface LabProjectFileRevisionEvent {
  readonly type: 'project-file-revision'
  readonly projectId: string
  readonly projectFileId: string
  readonly group: LabProjectFileGroup
  readonly revision: number
}

/** A structured result assessment. Verdict ownership stays on the Host. */
export interface LabResultAssessmentRecord {
  readonly status: 'PENDING' | 'PASSED' | 'FAILED' | 'HUMAN_QC'
  readonly verdict?: 'PASS' | 'FAIL' | 'INCONCLUSIVE'
  readonly method?: string
  readonly evidenceIds: readonly string[]
  readonly assessedBy?: string
  readonly assessedAt?: number
  readonly humanQcRequired: boolean
}

/** A locked product-facing Workflow compiled from a Plan and Skill revisions. */
export interface LabWorkflowRecord {
  readonly planId: string
  readonly experimentId: string
  readonly revision: number
  readonly status: 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'LOCKED' | 'REJECTED'
  readonly steps: readonly LabPlanStep[]
  readonly skillRevisionIds: readonly string[]
  readonly unresolved: readonly string[]
}

/** Read-only Knowledge document status projected into the Harness workbench. */
export interface LabKnowledgeItem {
  readonly documentId?: string
  readonly versionId?: string
  readonly sourceName?: string
  readonly status?: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | string
  readonly error?: string
}

/** One cited result projected from the Knowledge capability. */
export interface LabSearchResult {
  readonly citationId?: string
  readonly score?: number
  readonly confirmed?: boolean
  readonly conflicted?: boolean
  readonly excerpt?: string
  readonly documentId?: string
  readonly versionId?: string
  readonly location?: string
  readonly page?: number
  readonly titlePath?: readonly string[]
}

/** A SOP step projected for read-only review. */
export interface LabSopStep {
  readonly stepId?: string
  readonly order?: number
  readonly title?: string
  readonly instruction?: string
  readonly requiredInputs?: readonly string[]
  readonly completionCriteria?: readonly string[]
  readonly citations?: readonly string[]
  readonly missingFields?: readonly string[]
}

/** A SOP draft projected for read-only review. */
export interface LabSopDraft {
  readonly draftId?: string
  readonly title?: string
  readonly status?: string
  readonly steps?: readonly LabSopStep[]
  readonly sourceVersionIds?: readonly string[]
  readonly blockers?: readonly string[]
  readonly updatedBy?: string
}

/** A Knowledge conflict projected for read-only review. */
export interface LabConflict {
  readonly conflictId?: string
  readonly status?: string
  readonly citationIds?: readonly string[]
  readonly summary?: string
}

/** A device status projected into the Harness workbench. */
export interface LabDevice {
  readonly id?: string
  readonly name?: string
  readonly status?: string
  readonly capabilities?: readonly {
    readonly name?: string
    readonly parameters?: Readonly<Record<string, LabJsonValue>>
  }[]
}

/** A registered configuration capability projected by the owning adapter. */
export interface LabConfigurationCapability {
  readonly kind: 'agent' | 'workflow' | 'devices' | 'people'
  readonly name: string
  readonly version?: string
  readonly status: 'available' | 'read-only' | 'unavailable'
  readonly allowedActions: readonly string[]
  readonly recordCount?: number
  readonly detail?: string
}

/** A plan step projected into the Harness workbench. */
export interface LabPlanStep {
  readonly stepId?: string
  readonly title?: string
  readonly dependencies?: readonly string[]
  readonly skillRevisionId?: string
  readonly operationKind?: string
  readonly operationResource?: string
  readonly deviceId?: string
  readonly deviceCapability?: string
  readonly requiresApproval?: boolean
  readonly parameters?: Readonly<Record<string, LabParameterValue>>
  readonly citations?: readonly string[]
  readonly expectedOutputs?: readonly string[]
  readonly requiredInputs?: readonly string[]
  readonly completionCriteria?: readonly string[]
  readonly failurePolicy?: 'BLOCK' | 'STOP' | 'REPLAN'
}

/** An experiment plan projected into the Harness workbench. */
export interface LabPlan {
  readonly planId?: string
  readonly experimentId?: string
  readonly revision?: number
  readonly status?: 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'LOCKED' | 'REJECTED'
  readonly objective?: string
  readonly citations?: readonly string[]
  readonly assumptions?: readonly string[]
  readonly unresolved?: readonly string[]
  readonly steps?: readonly LabPlanStep[]
}

/** A Skill revision projected alongside a plan review. */
export interface LabSkillRevision {
  readonly skillId?: string
  readonly revisionId?: string
  readonly name?: string
  readonly status?: 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'ACTIVE' | 'RETIRED'
  readonly purpose?: string
  readonly definitionHash?: string
  readonly revision?: number
}

/** A proposed Skill draft submitted with a plan proposal. */
export interface LabSkillDraft {
  readonly skillId: string
  readonly revisionId: string
  readonly status: 'DRAFT'
  readonly name: string
  readonly purpose: string
  readonly applicability: readonly string[]
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly parameterConstraints: Readonly<Record<string, string>>
  readonly completionConditions: readonly string[]
  readonly failurePolicy: 'BLOCK' | 'STOP' | 'REPLAN'
  readonly citations: readonly string[]
  readonly operations: readonly {
    readonly kind: 'device' | 'human' | 'approval' | 'script' | 'api'
    readonly resourceRef: string
    readonly installed: boolean
  }[]
}

/** The plan proposal payload sent to the Web Facade. */
export interface LabPlanProposalInput {
  readonly request: LabExperimentRequest
  readonly plan: LabPlan
  readonly skillDrafts: readonly LabSkillDraft[]
}

/** Deterministic plan or Skill validation output. */
export interface LabValidation {
  readonly valid?: boolean
  readonly issues?: readonly {
    readonly code: string
    readonly message: string
    readonly path?: string
  }[]
}

/** A plan review with validation and planning context. */
export interface LabPlanReview {
  readonly plan: LabPlan
  readonly skillRevisions?: readonly LabSkillRevision[]
  readonly validation?: LabValidation
  readonly context?: Readonly<Record<string, LabJsonValue>>
}

/** A controlled run projected into the Harness workbench. */
export interface LabRun {
  readonly runId?: string
  readonly planId?: string
  readonly runStatus?: 'CREATED' | 'WAITING_CONFIRMATION' | 'RUNNING' | 'BLOCKED' | 'FAILED' | 'COMPLETED' | 'STOPPED'
  readonly currentStepId?: string
  readonly retryOfRunId?: string
  readonly createdAt?: number
  readonly updatedAt?: number
  readonly planStatus?: 'DRAFT' | 'VALIDATED' | 'HUMAN_APPROVED' | 'LOCKED' | 'REJECTED'
  readonly executionGraph?: LabWorkflowRecord
  readonly observations?: readonly LabObservationRecord[]
  readonly artifacts?: readonly LabArtifactRecord[]
  readonly feedback?: LabRunFeedback
  readonly replanRequest?: LabReplanRequest
}

/** One structured observation produced by a controlled step or human gate. */
export interface LabObservationRecord {
  readonly stepId: string
  readonly operationId: string
  readonly valid: boolean
  readonly evidence: readonly string[]
  readonly artifactIds: readonly string[]
  readonly status: 'WAITING' | 'COMPLETED' | 'FAILED' | 'STOPPED'
  readonly error?: string
  readonly replanRequested?: boolean
}

/** Run feedback projected for progress and failure handling. */
export interface LabRunFeedback {
  readonly status: LabRun['runStatus']
  readonly valid: boolean
  readonly summary: string
  readonly issues: readonly string[]
  readonly replanRequested: boolean
}

/** Structured replan request emitted after a failed step. */
export interface LabReplanRequest {
  readonly runId: string
  readonly stepId: string
  readonly reason: string
}

/** Report view addressed to exactly one Run. */
export interface LabReportView {
  readonly runId: string
  readonly experimentId: string
  readonly planId: string
  readonly status: LabRun['runStatus']
  readonly observations: readonly LabObservationRecord[]
  readonly artifacts: readonly LabArtifactRecord[]
  readonly feedback: LabRunFeedback
  readonly replanRequest?: LabReplanRequest
  readonly assessment?: LabResultAssessmentRecord
  readonly criteria?: readonly string[]
  readonly skillRevisionIds?: readonly string[]
  readonly citations?: readonly {
    readonly projectId: string
    readonly documentId: string
    readonly versionId: string
    readonly location?: string
    readonly sourceName?: string
  }[]
}

/** Public availability state for the Knowledge capability. */
export interface LabKnowledgeCapability {
  readonly state: 'available' | 'unavailable'
  readonly reason?: string
}

/** The read-only state snapshot rendered by the Harness workbench. */
export interface LabSnapshot {
  readonly knowledge: readonly LabKnowledgeItem[]
  readonly knowledgeCapability?: LabKnowledgeCapability
  readonly devices: readonly LabDevice[]
  readonly planningContext?: Readonly<Record<string, LabJsonValue>>
  readonly planReviews: readonly LabPlanReview[]
  readonly run?: LabRun
  readonly report?: LabReportView
}

/** Project state projected by the project conversation Facade. */
export interface LabProjectView {
  readonly project?: LabProjectRecord
  readonly sources: readonly LabProjectSourceRecord[]
  readonly devices: readonly LabProjectDeviceRecord[]
  readonly sessions: readonly LabProjectSessionRecord[]
  readonly sharedFacts: readonly {
    readonly factId: string
    readonly projectId: string
    readonly content: string
    readonly citationIds: readonly string[]
    readonly sourceSessionId?: string
    readonly approvedBy: string
    readonly createdAt: number
  }[]
  readonly evidence: readonly LabEvidenceRecord[]
  readonly experiments: readonly LabExperimentRecord[]
  readonly experimentSessions: readonly LabExperimentSessionRecord[]
}

/** Project-scoped command DTO sent to the dedicated project protocol. */
export type LabProjectCommand = { readonly sessionId?: string } & (
  | { readonly command: 'project-list' }
  | { readonly command: 'project-create'; readonly workspaceId?: string; readonly name?: string; readonly description?: string }
  | { readonly command: 'project-open'; readonly projectId: string }
  | { readonly command: 'project-scope-update'; readonly projectId: string; readonly sources: readonly { readonly documentId: string; readonly versionId: string }[]; readonly deviceIds: readonly string[] }
  | { readonly command: 'project-session-create'; readonly projectId: string; readonly title?: string }
  | { readonly command: 'project-session-attach'; readonly projectId: string; readonly targetSessionId: string; readonly title?: string }
  | { readonly command: 'project-session-detach'; readonly projectId: string; readonly targetSessionId: string }
  | { readonly command: 'project-archive'; readonly projectId: string }
  | { readonly command: 'project-session-rename'; readonly projectId: string; readonly targetSessionId: string; readonly title: string }
  | { readonly command: 'project-context'; readonly projectId: string }
  | { readonly command: 'project-planning-context'; readonly projectId: string; readonly request: LabExperimentRequest }
  | { readonly command: 'experiment-list'; readonly projectId: string }
  | { readonly command: 'experiment-reviews'; readonly experimentId: string }
  | { readonly command: 'experiment-open'; readonly projectId: string; readonly experimentId: string }
  | { readonly command: 'experiment-create'; readonly projectId: string; readonly title: string; readonly objective: string }
  | { readonly command: 'experiment-derive'; readonly projectId: string; readonly sourceExperimentId: string; readonly title: string; readonly objective: string }
  | { readonly command: 'experiment-session-link'; readonly projectId: string; readonly experimentId: string; readonly targetSessionId: string; readonly role: 'created' | 'continued' | 'reviewed' }
  | { readonly command: 'run-list'; readonly experimentId: string }
  | { readonly command: 'run-open'; readonly runId: string }
  | { readonly command: 'run-start'; readonly experimentId: string; readonly planId: string }
  | { readonly command: 'run-stop'; readonly runId: string }
  | { readonly command: 'run-retry'; readonly runId: string }
  | { readonly command: 'run-compare'; readonly leftRunId: string; readonly rightRunId: string }
  | { readonly command: 'run-report'; readonly runId: string }
  | { readonly command: 'artifact-list'; readonly runId: string }
  | { readonly command: 'artifact-open'; readonly runId: string; readonly artifactId: string }
  | { readonly command: 'project-file-list'; readonly projectId: string }
  | { readonly command: 'project-file-open'; readonly projectId: string; readonly projectFileId: string }
  | { readonly command: 'project-file-download'; readonly projectId: string; readonly projectFileId: string }
  | { readonly command: 'configuration-capabilities' }
  | { readonly command: 'presentation-intent'; readonly intent: Record<string, unknown> }
)
/** A command sent to the general laboratory Web Facade. */
export type LabCommand = { readonly sessionId?: string } & (
  | { readonly command: 'snapshot'; readonly experimentId: string }
  | { readonly command: 'device-list' }
  | { readonly command: 'knowledge-import'; readonly name: string; readonly bytesBase64: string; readonly metadata?: Readonly<Record<string, string>> }
  | { readonly command: 'knowledge-search'; readonly request: { readonly query: string; readonly experimentId?: string } }
  | { readonly command: 'knowledge-sop-create'; readonly title: string; readonly steps: readonly LabSopStep[] }
  | { readonly command: 'knowledge-sop-get'; readonly draftId: string }
  | { readonly command: 'knowledge-sop-list' }
  | { readonly command: 'knowledge-sop-update'; readonly draftId: string; readonly title: string; readonly steps: readonly LabSopStep[] }
  | { readonly command: 'knowledge-sop-publish'; readonly draftId: string; readonly publishedBy: string }
  | { readonly command: 'experiment-create'; readonly request: LabExperimentRequest }
  | { readonly command: 'planning-context'; readonly request: LabExperimentRequest }
  | { readonly command: 'plan-propose'; readonly input: LabPlanProposalInput }
  | { readonly command: 'plan-validate'; readonly planId: string }
  | { readonly command: 'plan-approve'; readonly experimentId: string; readonly planId: string; readonly approvedBy: string }
  | { readonly command: 'skill-validate'; readonly revisionId: string }
  | { readonly command: 'skill-approve'; readonly revisionId: string; readonly approvedBy: string }
  | { readonly command: 'skill-activate'; readonly revisionId: string }
  | { readonly command: 'run-start'; readonly experimentId: string; readonly planId: string }
  | { readonly command: 'run-step'; readonly runId: string }
  | { readonly command: 'run-confirm'; readonly runId: string; readonly evidence: readonly string[]; readonly confirmedBy: string; readonly stepId?: string }
  | { readonly command: 'run-stop'; readonly runId: string; readonly requestedBy: string }
  | { readonly command: 'run-report'; readonly runId: string }
)

/** Typed result values returned by the Knowledge and Agent planning commands. */
export type LabAgentCommandResult =
  | { readonly kind: 'device-list'; readonly value: readonly LabDevice[] }
  | { readonly kind: 'knowledge-import'; readonly value: LabKnowledgeItem }
  | { readonly kind: 'knowledge-search'; readonly value: { readonly capability: LabKnowledgeCapability; readonly results: readonly LabSearchResult[]; readonly conflicts: readonly LabConflict[] } }
  | { readonly kind: 'knowledge-fact-confirm'; readonly value: null }
  | { readonly kind: 'knowledge-sop'; readonly value: LabSopDraft | readonly LabSopDraft[] }
  | { readonly kind: 'planning-context'; readonly value: Readonly<Record<string, LabJsonValue>> }
  | { readonly kind: 'plan-proposal'; readonly value: LabPlanReview }
  | { readonly kind: 'plan-rejection'; readonly value: LabPlanReview }
  | { readonly kind: 'skill-revision'; readonly value: LabSkillRevision }
  | { readonly kind: 'run'; readonly value: LabRun }
  | { readonly kind: 'report'; readonly value: LabReportView }

/** Result envelope returned by the laboratory Web Facade. */
export type LabCommandResult = { readonly kind: 'snapshot'; readonly value: LabSnapshot } | LabAgentCommandResult

/** Typed result values returned by project, Experiment, Run and Artifact queries. */
export type LabProjectCommandResult =
  | { readonly kind: 'project-list'; readonly value: readonly LabProjectView[] }
  | { readonly kind: 'project'; readonly value: LabProjectView }
  | { readonly kind: 'project-context'; readonly value: LabProjectContextView }
  | { readonly kind: 'project-session-attach-conflict'; readonly value: LabSessionAttachConflictView }
  | { readonly kind: 'experiment-list'; readonly value: readonly LabExperimentRecord[] }
  | { readonly kind: 'experiment-reviews'; readonly value: readonly LabPlanReview[] }
  | { readonly kind: 'experiment'; readonly value: LabExperimentRecord }
  | { readonly kind: 'experiment-project'; readonly value: LabProjectView }
  | { readonly kind: 'run-list'; readonly value: readonly LabRun[] }
  | { readonly kind: 'run'; readonly value: LabRun }
  | { readonly kind: 'run-report'; readonly value: LabReportView }
  | { readonly kind: 'run-comparison'; readonly value: LabRunComparisonView }
  | { readonly kind: 'artifact-list'; readonly value: readonly LabArtifactRecord[] }
  | { readonly kind: 'artifact'; readonly value: LabArtifactRecord }
  | { readonly kind: 'project-file-list'; readonly value: readonly LabProjectFileRecord[] }
  | { readonly kind: 'project-file-preview'; readonly value: LabProjectFilePreview }
  | { readonly kind: 'project-file-download'; readonly value: LabProjectFileDownload }
  | { readonly kind: 'configuration-capabilities'; readonly value: readonly LabConfigurationCapability[] }
  | { readonly kind: 'presentation'; readonly value: LabPresentationValidation }

/** Project scope and Knowledge capability returned by a Host query. */
export interface LabProjectContextView {
  readonly project: {
    readonly projectId: string
    readonly sessionId?: string
    readonly sources: readonly LabProjectSourceRecord[]
    readonly devices: readonly LabProjectDeviceRecord[]
    readonly sharedFacts: readonly LabProjectView['sharedFacts'][number][]
  }
  readonly knowledgeCapability: LabKnowledgeCapability
}

/** A stable attach conflict that the UI can render without parsing an error string. */
export interface LabSessionAttachConflictView {
  readonly status: 'conflict'
  readonly code: 'WORKSPACE_MISMATCH'
  readonly projectWorkspaceId: string
  readonly sessionWorkspaceId?: string
  readonly action: { readonly kind: 'create-session-in-project-workspace'; readonly workspaceId: string }
}

/** Comparison of two terminal Runs from one Experiment. */
export interface LabRunComparisonView {
  readonly leftRunId: string
  readonly rightRunId: string
  readonly status: { readonly left: LabRun['runStatus']; readonly right: LabRun['runStatus'] }
  readonly durationMs: { readonly left: number; readonly right: number }
  readonly parameters: {
    readonly left: readonly { readonly stepId: string; readonly values: Readonly<Record<string, LabParameterValue>> }[]
    readonly right: readonly { readonly stepId: string; readonly values: Readonly<Record<string, LabParameterValue>> }[]
  }
  readonly stepStatuses: readonly { readonly stepId: string; readonly left?: string; readonly right?: string }[]
  readonly observations: readonly {
    readonly stepId: string
    readonly left?: { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] }
    readonly right?: { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] }
  }[]
  readonly artifactCounts: { readonly left: number; readonly right: number }
  readonly artifactMetadata: {
    readonly left: readonly { readonly artifactId: string; readonly displayName: string; readonly kind: string; readonly mediaType: string; readonly size: number; readonly digest: string; readonly createdAt: number }[]
    readonly right: readonly { readonly artifactId: string; readonly displayName: string; readonly kind: string; readonly mediaType: string; readonly size: number; readonly digest: string; readonly createdAt: number }[]
  }
}

interface LabSuccessEnvelope {
  readonly ok: true
  readonly result: unknown
}

interface LabErrorEnvelope {
  readonly ok: false
  readonly error?: { readonly code?: string; readonly message?: string }
}

/** 统一的 Web Consumer 请求错误。 */
export class LabApiError extends Error {
  constructor(readonly code: string, message: string, readonly status?: number) {
    super(message)
    this.name = 'LabApiError'
  }
}

/** Send a typed laboratory command.
 * @param command - command DTO sent to the Web Facade.
 * @param signal - optional cancellation signal for the request.
 * @returns - parsed command result.
 */
export async function sendLabCommand(command: LabCommand, signal?: AbortSignal): Promise<LabCommandResult> {
  const response = await fetch('/api/lab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ namespace: 'lab', ...command }),
    ...signal === undefined ? {} : { signal },
  })
  let body: LabSuccessEnvelope | LabErrorEnvelope
  try {
    body = await response.json() as LabSuccessEnvelope | LabErrorEnvelope
  } catch {
    throw new LabApiError('INVALID_JSON', '实验 API 返回了无法解析的响应（HTTP ' + String(response.status) + '）', response.status)
  }
  if (!body.ok) {
    throw new LabApiError(body.error?.code ?? 'INTERNAL_ERROR', body.error?.message ?? '实验 API 请求失败', response.status)
  }
  return parseLabCommandResult(body.result)
}

/** Project an unknown service value into a safe workbench snapshot.
 * @param value - unknown response value returned by the Web Facade.
 * @returns - safe workbench snapshot projection.
 */
export function parseLabSnapshot(value: unknown): LabSnapshot {
  const object = record(value)
  const planningContext = recordOrUndefined(object.planningContext)
  const run = recordOrUndefined(object.run)
  const report = recordOrUndefined(object.report)
  const knowledgeCapability = parseKnowledgeCapability(object.knowledgeCapability)
  return {
    knowledge: array(object.knowledge).map(item => decodeObject<LabKnowledgeItem>(item, 'snapshot.knowledge')),
    knowledgeCapability,
    devices: array(object.devices).map(item => decodeObject<LabDevice>(item, 'snapshot.devices')),
    ...planningContext === undefined ? {} : { planningContext: decodeJsonObject(planningContext, 'snapshot.planningContext') },
    planReviews: array(object.planReviews).map((item) => {
      const review = record(item)
      return {
        plan: decodeObject<LabPlan>(review.plan, 'snapshot.planReviews.plan'),
        ...Array.isArray(review.skillRevisions)
          ? { skillRevisions: review.skillRevisions.map(item => decodeObject<LabSkillRevision>(item, 'snapshot.planReviews.skillRevisions')) }
          : {},
        ...recordOrUndefined(review.validation) === undefined ? {} : { validation: decodeObject<LabValidation>(review.validation, 'snapshot.planReviews.validation') },
      }
    }),
    ...run === undefined ? {} : { run: decodeObject<LabRun>(run, 'snapshot.run') },
    ...report === undefined ? {} : { report: decodeObject<LabReportView>(report, 'snapshot.report') },
  }
}

/** Encode text as Base64 for the Web Consumer protocol.
 * @param value - text to encode as UTF-8 bytes.
 * @returns - Base64 representation of the encoded bytes.
 */
export function textToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function recordOrUndefined(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function parseKnowledgeCapability(value: unknown): LabKnowledgeCapability {
  const object = recordOrUndefined(value)
  if (object?.state === 'available') return { state: 'available' }
  if (object?.state === 'unavailable') {
    return typeof object.reason === 'string' && object.reason.trim() !== ''
      ? { state: 'unavailable', reason: object.reason }
      : { state: 'unavailable' }
  }
  return { state: 'unavailable', reason: 'Knowledge capability status is unavailable' }
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Send a project-scoped command through the shared Web Facade route.
 * @param command - project command DTO sent to the Web Facade.
 * @param signal - optional cancellation signal for the request.
 * @returns - parsed command result.
 */
export async function sendLabProjectCommand(command: LabProjectCommand, signal?: AbortSignal): Promise<LabProjectCommandResult> {
  const response = await fetch('/api/lab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ namespace: 'project', ...command }),
    ...signal === undefined ? {} : { signal },
  })
  let body: LabSuccessEnvelope | LabErrorEnvelope
  try {
    body = await response.json() as LabSuccessEnvelope | LabErrorEnvelope
  } catch {
    throw new LabApiError('INVALID_JSON', `实验 API 返回了无法解析的响应（HTTP ${String(response.status)}）`, response.status)
  }
  if (!body.ok) {
    throw new LabApiError(body.error?.code ?? 'INTERNAL_ERROR', body.error?.message ?? '实验 API 请求失败', response.status)
  }
  return parseLabProjectCommandResult(body.result)
}

/** Decode a general Facade result at the JSON boundary before it reaches page state.
 * @param value - Untrusted JSON value returned by the Facade.
 * @returns The validated general command result.
 */
export function parseLabCommandResult(value: unknown): LabCommandResult {
  const object = record(value)
  switch (object.kind) {
    case 'snapshot': return { kind: 'snapshot', value: parseLabSnapshot(object.value) }
    case 'device-list': return { kind: 'device-list', value: array(object.value).map(item => decodeObject<LabDevice>(item, 'result.value')) }
    case 'knowledge-import': return { kind: 'knowledge-import', value: decodeObject<LabKnowledgeItem>(object.value, 'result.value') }
    case 'knowledge-search': return { kind: 'knowledge-search', value: decodeObject<Extract<LabAgentCommandResult, { readonly kind: 'knowledge-search' }>['value']>(object.value, 'result.value') }
    case 'knowledge-fact-confirm': return { kind: 'knowledge-fact-confirm', value: null }
    case 'knowledge-sop': return { kind: 'knowledge-sop', value: Array.isArray(object.value) ? object.value.map(item => decodeObject<LabSopDraft>(item, 'result.value')) : decodeObject<LabSopDraft>(object.value, 'result.value') }
    case 'planning-context': return { kind: 'planning-context', value: decodeJsonObject(object.value, 'result.value') }
    case 'plan-proposal': return { kind: 'plan-proposal', value: decodeObject<LabPlanReview>(object.value, 'result.value') }
    case 'plan-rejection': return { kind: 'plan-rejection', value: decodeObject<LabPlanReview>(object.value, 'result.value') }
    case 'skill-revision': return { kind: 'skill-revision', value: decodeObject<LabSkillRevision>(object.value, 'result.value') }
    case 'run': return { kind: 'run', value: decodeObject<LabRun>(object.value, 'result.value') }
    case 'report': return { kind: 'report', value: decodeObject<LabReportView>(object.value, 'result.value') }
    default: throw new LabApiError('INVALID_RESPONSE', '实验 API 返回未知结果类型')
  }
}

/** Decode a Project Facade result at the JSON boundary before it reaches page state.
 * @param value - Untrusted JSON value returned by the Project Facade.
 * @returns The validated Project command result.
 */
export function parseLabProjectCommandResult(value: unknown): LabProjectCommandResult {
  const object = record(value)
  switch (object.kind) {
    case 'project-list': return { kind: 'project-list', value: array(object.value).map(item => toProjectView(item)) }
    case 'project': return { kind: 'project', value: toProjectView(object.value) }
    case 'project-context': return { kind: 'project-context', value: toProjectContextView(object.value) }
    case 'project-session-attach-conflict': return { kind: 'project-session-attach-conflict', value: decodeObject<LabSessionAttachConflictView>(object.value, 'result.value') }
    case 'experiment-list': return { kind: 'experiment-list', value: array(object.value).map(item => decodeObject<LabExperimentRecord>(item, 'result.value')) }
    case 'experiment-reviews': return { kind: 'experiment-reviews', value: array(object.value).map(item => decodeObject<LabPlanReview>(item, 'result.value')) }
    case 'experiment': return { kind: 'experiment', value: decodeObject<LabExperimentRecord>(object.value, 'result.value') }
    case 'experiment-project': return { kind: 'experiment-project', value: toProjectView(object.value) }
    case 'run-list': return { kind: 'run-list', value: array(object.value).map(item => decodeObject<LabRun>(item, 'result.value')) }
    case 'run': return { kind: 'run', value: decodeObject<LabRun>(object.value, 'result.value') }
    case 'run-report': return { kind: 'run-report', value: decodeObject<LabReportView>(object.value, 'result.value') }
    case 'run-comparison': return { kind: 'run-comparison', value: decodeObject<LabRunComparisonView>(object.value, 'result.value') }
    case 'artifact-list': return { kind: 'artifact-list', value: array(object.value).map(item => decodeObject<LabArtifactRecord>(item, 'result.value')) }
    case 'artifact': return { kind: 'artifact', value: decodeObject<LabArtifactRecord>(object.value, 'result.value') }
    case 'project-file-list': return { kind: 'project-file-list', value: array(object.value).map(item => decodeObject<LabProjectFileRecord>(item, 'result.value')) }
    case 'project-file-preview': return { kind: 'project-file-preview', value: decodeObject<LabProjectFilePreview>(object.value, 'result.value') }
    case 'project-file-download': return { kind: 'project-file-download', value: decodeObject<LabProjectFileDownload>(object.value, 'result.value') }
    case 'configuration-capabilities': return { kind: 'configuration-capabilities', value: array(object.value).map(item => decodeObject<LabConfigurationCapability>(item, 'result.value')) }
    case 'presentation': return { kind: 'presentation', value: parsePresentationValidation(object.value) }
    default: throw new LabApiError('INVALID_RESPONSE', '项目 API 返回未知结果类型')
  }
}

/** Project one decoded Host response into the explicit workbench Project view.
 * @param value - Untrusted JSON value containing the Project view records.
 * @returns The validated workbench Project view.
 */
export function toProjectView(value: unknown): LabProjectView {
  const object = record(value)
  return {
    ...object.project === undefined ? {} : { project: decodeObject<LabProjectRecord>(object.project, 'project.project') },
    sources: array(object.sources).map(item => decodeObject<LabProjectSourceRecord>(item, 'project.sources')),
    devices: array(object.devices).map(item => decodeObject<LabProjectDeviceRecord>(item, 'project.devices')),
    sessions: array(object.sessions).map(item => decodeObject<LabProjectSessionRecord>(item, 'project.sessions')),
    sharedFacts: array(object.sharedFacts).map(item => decodeObject<LabProjectView['sharedFacts'][number]>(item, 'project.sharedFacts')),
    evidence: array(object.evidence).map(item => decodeObject<LabEvidenceRecord>(item, 'project.evidence')),
    experiments: array(object.experiments).map(item => decodeObject<LabExperimentRecord>(item, 'project.experiments')),
    experimentSessions: array(object.experimentSessions).map(item => decodeObject<LabExperimentSessionRecord>(item, 'project.experimentSessions')),
  }
}

/** Decode a Host Project context while preserving its capability status.
 * @param value - Untrusted JSON value containing the Project context.
 * @returns The validated Project context for adapter consumers.
 */
function toProjectContextView(value: unknown): LabProjectContextView {
  const object = record(value)
  const project = record(object.project)
  return {
    project: {
      projectId: stringField(project.projectId, 'project.projectId'),
      ...(typeof project.sessionId === 'string' ? { sessionId: project.sessionId } : {}),
      sources: array(project.sources).map(item => decodeObject<LabProjectSourceRecord>(item, 'project.sources')),
      devices: array(project.devices).map(item => decodeObject<LabProjectDeviceRecord>(item, 'project.devices')),
      sharedFacts: array(project.sharedFacts).map(item => decodeObject<LabProjectView['sharedFacts'][number]>(item, 'project.sharedFacts')),
    },
    knowledgeCapability: decodeObject<LabKnowledgeCapability>(object.knowledgeCapability, 'knowledgeCapability'),
  }
}

function decodeObject<T>(value: unknown, path: string): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new LabApiError('INVALID_RESPONSE', `${path} 必须是对象`)
  return value as T
}

function parsePresentationValidation(value: unknown): LabPresentationValidation {
  const object = recordOrUndefined(value)
  if (object?.accepted === true) {
    const intent = recordOrUndefined(object.intent)
    if (intent === undefined || typeof intent.view !== 'string') throw new LabApiError('INVALID_RESPONSE', 'result.value.intent 缺少有效 view')
    return { accepted: true, intent: intent as unknown as LabPresentationIntent }
  }
  if (object?.accepted === false
    && (object.code === 'UNKNOWN_VIEW' || object.code === 'PROJECT_SCOPE_MISMATCH' || object.code === 'RECORD_NOT_AUTHORIZED')
    && typeof object.message === 'string') {
    return { accepted: false, code: object.code, message: object.message }
  }
  throw new LabApiError('INVALID_RESPONSE', 'result.value 不是有效的 presentation validation')
}

function stringField(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new LabApiError('INVALID_RESPONSE', `${path} 缺少有效字符串`)
  return value
}

function decodeJsonObject(value: unknown, path: string): Readonly<Record<string, LabJsonValue>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new LabApiError('INVALID_RESPONSE', `${path} 必须是 JSON 对象`)
  return value as Readonly<Record<string, LabJsonValue>>
}
