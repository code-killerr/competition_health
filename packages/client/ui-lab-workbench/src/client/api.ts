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

export interface LabKnowledgeItem {
  readonly documentId?: string
  readonly versionId?: string
  readonly sourceName?: string
  readonly status?: string
  readonly error?: string
  readonly [key: string]: unknown
}

export interface LabSearchResult {
  readonly citationId?: string
  readonly score?: number
  readonly confirmed?: boolean
  readonly conflicted?: boolean
  readonly excerpt?: string
  readonly [key: string]: unknown
}

export interface LabConflict {
  readonly conflictId?: string
  readonly status?: string
  readonly [key: string]: unknown
}

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

export interface LabSkillRevision {
  readonly skillId?: string
  readonly revisionId?: string
  readonly name?: string
  readonly status?: string
  readonly purpose?: string
  readonly [key: string]: unknown
}

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

export interface LabPlanProposalInput {
  readonly request: LabExperimentRequest
  readonly plan: LabPlan
  readonly skillDrafts: readonly LabSkillDraft[]
}

export interface LabValidation {
  readonly valid?: boolean
  readonly issues?: readonly {
    readonly code?: string
    readonly message?: string
    readonly path?: string
  }[]
  readonly [key: string]: unknown
}

export interface LabPlanReview {
  readonly plan: LabPlan
  readonly skillRevisions?: readonly LabSkillRevision[]
  readonly validation?: LabValidation
  readonly context?: Readonly<Record<string, unknown>>
  readonly [key: string]: unknown
}

export interface LabRun {
  readonly runId?: string
  readonly planId?: string
  readonly runStatus?: string
  readonly currentStepId?: string
  readonly observations?: readonly Readonly<Record<string, unknown>>[]
  readonly [key: string]: unknown
}

export interface LabSnapshot {
  readonly knowledge: readonly LabKnowledgeItem[]
  readonly devices: readonly LabDevice[]
  readonly planningContext?: Readonly<Record<string, unknown>>
  readonly planReviews: readonly LabPlanReview[]
  readonly run?: LabRun
  readonly report?: Readonly<Record<string, unknown>>
}

export type LabCommand = { readonly sessionId?: string } & (
  | { readonly command: 'snapshot'; readonly experimentId: string }
  | { readonly command: 'knowledge-import'; readonly name: string; readonly bytesBase64: string; readonly metadata?: Readonly<Record<string, string>> }
  | { readonly command: 'knowledge-search'; readonly request: { readonly query: string; readonly experimentId?: string } }
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

/** 发送一个已类型化的实验命令。 */
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

/** 将服务快照安全投影为浏览器工作台所需的字段。 */
export function toSnapshot(value: unknown): LabSnapshot {
  const object = record(value)
  const planningContext = recordOrUndefined(object.planningContext)
  const run = recordOrUndefined(object.run)
  const report = recordOrUndefined(object.report)
  return {
    knowledge: array(object.knowledge) as LabKnowledgeItem[],
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

/** 将字节文本编码为 Web Consumer 协议使用的 Base64。 */
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

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
