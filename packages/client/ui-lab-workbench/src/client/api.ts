/** 实验工作台的浏览器 HTTP DTO 与 `/api/lab` 客户端。 */

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

/** Read-only Knowledge document status projected into the Harness workbench. */
export interface LabKnowledgeItem {
  readonly documentId?: string
  readonly versionId?: string
  readonly sourceName?: string
  readonly status?: string
  readonly error?: string
  readonly [key: string]: unknown
}

/** One cited result projected from the Knowledge capability. */
export interface LabSearchResult {
  readonly citationId?: string
  readonly score?: number
  readonly confirmed?: boolean
  readonly conflicted?: boolean
  readonly excerpt?: string
  readonly [key: string]: unknown
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
  readonly [key: string]: unknown
}

/** A device status projected into the Harness workbench. */
export interface LabDevice {
  readonly id?: string
  readonly name?: string
  readonly status?: string
  readonly capabilities?: readonly {
    readonly name?: string
    readonly parameters?: Readonly<Record<string, unknown>>
    readonly [key: string]: unknown
  }[]
  readonly [key: string]: unknown
}

/** A plan step projected into the Harness workbench. */
export interface LabPlanStep {
  readonly stepId?: string
  readonly title?: string
  readonly operationKind?: string
  readonly operationResource?: string
  readonly requiresApproval?: boolean
  readonly citations?: readonly string[]
  readonly expectedOutputs?: readonly string[]
  readonly requiredInputs?: readonly string[]
  readonly [key: string]: unknown
}

/** An experiment plan projected into the Harness workbench. */
export interface LabPlan {
  readonly planId?: string
  readonly experimentId?: string
  readonly revision?: number
  readonly status?: string
  readonly objective?: string
  readonly citations?: readonly string[]
  readonly assumptions?: readonly string[]
  readonly unresolved?: readonly string[]
  readonly steps?: readonly LabPlanStep[]
  readonly [key: string]: unknown
}

/** A Skill revision projected alongside a plan review. */
export interface LabSkillRevision {
  readonly skillId?: string
  readonly revisionId?: string
  readonly name?: string
  readonly status?: string
  readonly purpose?: string
  readonly [key: string]: unknown
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
    readonly code?: string
    readonly message?: string
    readonly path?: string
  }[]
  readonly [key: string]: unknown
}

/** A plan review with validation and planning context. */
export interface LabPlanReview {
  readonly plan: LabPlan
  readonly skillRevisions?: readonly LabSkillRevision[]
  readonly validation?: LabValidation
  readonly context?: Readonly<Record<string, unknown>>
  readonly [key: string]: unknown
}

/** A controlled run projected into the Harness workbench. */
export interface LabRun {
  readonly runId?: string
  readonly planId?: string
  readonly runStatus?: string
  readonly currentStepId?: string
  readonly observations?: readonly Readonly<Record<string, unknown>>[]
  readonly [key: string]: unknown
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
  readonly planningContext?: Readonly<Record<string, unknown>>
  readonly planReviews: readonly LabPlanReview[]
  readonly run?: LabRun
  readonly report?: Readonly<Record<string, unknown>>
}

/** Project state projected by the project conversation Facade. */
export interface LabProjectView {
  readonly project?: Readonly<Record<string, unknown>>
  readonly sources: readonly Readonly<Record<string, unknown>>[]
  readonly devices: readonly Readonly<Record<string, unknown>>[]
  readonly sessions: readonly Readonly<Record<string, unknown>>[]
  readonly sharedFacts: readonly Readonly<Record<string, unknown>>[]
  readonly evidence: readonly Readonly<Record<string, unknown>>[]
}

/** Project-scoped command DTO sent to the dedicated project protocol. */
export type LabProjectCommand = { readonly sessionId?: string } & (
  | { readonly command: 'project-list' }
  | { readonly command: 'project-create'; readonly projectId: string; readonly name: string; readonly description?: string }
  | { readonly command: 'project-open'; readonly projectId: string }
  | { readonly command: 'project-scope-update'; readonly projectId: string; readonly sources: readonly { readonly documentId: string; readonly versionId: string }[]; readonly deviceIds: readonly string[] }
  | { readonly command: 'project-session-create'; readonly projectId: string; readonly title?: string }
  | { readonly command: 'project-session-associate'; readonly projectId: string; readonly targetSessionId: string; readonly title?: string }
  | { readonly command: 'project-session-rename'; readonly projectId: string; readonly targetSessionId: string; readonly title: string }
  | { readonly command: 'project-context'; readonly projectId: string }
  | { readonly command: 'project-planning-context'; readonly projectId: string; readonly request: LabExperimentRequest }
)
/** A command sent to the general laboratory Web Facade. */
export type LabCommand = { readonly sessionId?: string } & (
  | { readonly command: 'snapshot'; readonly experimentId: string }
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

/** Result envelope returned by the laboratory Web Facade. */
export interface LabCommandResult {
  readonly kind: string
  readonly value: unknown
}

interface LabSuccessEnvelope {
  readonly ok: true
  readonly result: LabCommandResult
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
    body: JSON.stringify(command),
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
  if (body.result === undefined || typeof body.result.kind !== 'string') {
    throw new LabApiError('INVALID_RESPONSE', '实验 API 返回缺少结果类型', response.status)
  }
  return body.result
}

/** Project an unknown service value into a safe workbench snapshot.
 * @param value - unknown response value returned by the Web Facade.
 * @returns - safe workbench snapshot projection.
 */
export function toSnapshot(value: unknown): LabSnapshot {
  const object = record(value)
  const planningContext = recordOrUndefined(object.planningContext)
  const run = recordOrUndefined(object.run)
  const report = recordOrUndefined(object.report)
  const knowledgeCapability = parseKnowledgeCapability(object.knowledgeCapability)
  return {
    knowledge: array(object.knowledge) as LabKnowledgeItem[],
    knowledgeCapability,
    devices: array(object.devices) as LabDevice[],
    ...planningContext === undefined ? {} : { planningContext },
    planReviews: array(object.planReviews).map((item) => {
      const review = record(item)
      return {
        ...review,
        plan: record(review.plan) as LabPlan,
        ...Array.isArray(review.skillRevisions)
          ? { skillRevisions: review.skillRevisions.map(item => record(item) as LabSkillRevision) }
          : {},
        ...recordOrUndefined(review.validation) === undefined ? {} : { validation: record(review.validation) as LabValidation },
      } as LabPlanReview
    }),
    ...run === undefined ? {} : { run: run as LabRun },
    ...report === undefined ? {} : { report },
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
export async function sendLabProjectCommand(command: LabProjectCommand, signal?: AbortSignal): Promise<LabCommandResult> {
  const response = await fetch('/api/lab', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(command),
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
  if (body.result === undefined || typeof body.result.kind !== 'string') {
    throw new LabApiError('INVALID_RESPONSE', '实验 API 返回缺少结果类型', response.status)
  }
  return body.result
}
