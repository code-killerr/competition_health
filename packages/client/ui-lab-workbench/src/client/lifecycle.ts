import type { LabArtifactRecord, LabEvidenceRecord, LabExperimentRecord, LabKnowledgeItem, LabReportView, LabResultAssessmentRecord, LabRun, LabSkillRevision, LabValidation, LabWorkflowRecord } from './api.ts'
import type { LabPage } from './LabUiContext.ts'

/** Registered destinations that an Agent may request the workbench to present. */
export type LabPresentationView = 'projects' | 'knowledge' | 'devices' | 'project' | 'experiment' | 'run' | 'evidence' | 'citation'

/** A typed, record-addressed request to change the user-visible workbench selection. */
export type LabPresentationIntent =
  | { readonly view: 'projects' | 'devices' }
  | { readonly view: 'knowledge'; readonly projectId?: string }
  | { readonly view: 'project'; readonly projectId: string; readonly page?: import('./LabUiContext.ts').LabPage }
  | { readonly view: 'experiment'; readonly projectId: string; readonly experimentId: string }
  | { readonly view: 'run'; readonly projectId: string; readonly experimentId: string; readonly runId: string }
  | { readonly view: 'evidence'; readonly projectId: string; readonly experimentId: string; readonly runId: string; readonly artifactId?: string }
  | { readonly view: 'citation'; readonly projectId: string; readonly documentId: string; readonly versionId: string; readonly location?: string }

/** Records authorized for Agent presentation in the active Project. */
export interface LabPresentationScope {
  readonly activeProjectId?: string
  readonly registeredViews: readonly LabPresentationView[]
  readonly projectIds: readonly string[]
  readonly experiments: readonly Pick<LabExperimentRecord, 'projectId' | 'experimentId'>[]
  readonly runs: readonly { readonly projectId: string; readonly experimentId: string; readonly runId: string }[]
  readonly artifacts: readonly Pick<LabArtifactRecord, 'runId' | 'artifactId'>[]
  readonly citations: readonly { readonly projectId: string; readonly documentId: string; readonly versionId: string }[]
}

/** Stable rejection codes for invalid Agent presentation requests. */
export type LabPresentationErrorCode = 'UNKNOWN_VIEW' | 'PROJECT_SCOPE_MISMATCH' | 'RECORD_NOT_AUTHORIZED'

/** Result of validating an Agent presentation request. */
export type LabPresentationValidation =
  | { readonly accepted: true; readonly intent: LabPresentationIntent }
  | { readonly accepted: false; readonly code: LabPresentationErrorCode; readonly message: string }

/** Validate a presentation intent against registered views and the active Project scope. */
export function validateLabPresentationIntent(value: unknown, scope: LabPresentationScope): LabPresentationValidation {
  if (!isRecord(value) || typeof value.view !== 'string') return rejected('UNKNOWN_VIEW', 'Presentation view is missing')
  const view = value.view
  if (!scope.registeredViews.includes(view as LabPresentationView)) return rejected('UNKNOWN_VIEW', `Presentation view is not registered: ${view}`)
  if (view === 'projects' || view === 'devices') return { accepted: true, intent: { view } }
  if (view === 'knowledge') {
    if (value.projectId !== undefined && typeof value.projectId !== 'string') return rejected('RECORD_NOT_AUTHORIZED', 'Knowledge project scope is invalid')
    if (value.projectId !== undefined && !projectAllowed(value.projectId, scope)) return rejected('PROJECT_SCOPE_MISMATCH', 'Knowledge target is outside the active Project')
    return { accepted: true, intent: { view, ...value.projectId === undefined ? {} : { projectId: value.projectId } } }
  }
  const projectId = stringField(value.projectId)
  if (projectId === undefined || !projectAllowed(projectId, scope)) return rejected('PROJECT_SCOPE_MISMATCH', 'Presentation target is outside the active Project')
  if (view === 'project') {
    if (!scope.projectIds.includes(projectId)) return rejected('RECORD_NOT_AUTHORIZED', 'Project is not authorized')
    const page = value.page === undefined ? undefined : stringField(value.page)
    if (value.page !== undefined && page === undefined) return rejected('UNKNOWN_VIEW', 'Project page is not registered')
    if (page !== undefined && !['overview', 'planning', 'approval', 'execution', 'steps', 'evidence', 'archive', 'conversations', 'experiments', 'runs'].includes(page)) return rejected('UNKNOWN_VIEW', 'Project page is not registered')
    return { accepted: true, intent: { view, projectId, ...page === undefined ? {} : { page: page as LabPage } } }
  }
  if (view === 'citation') {
    const documentId = stringField(value.documentId)
    const versionId = stringField(value.versionId)
    if (documentId === undefined || versionId === undefined) return rejected('RECORD_NOT_AUTHORIZED', 'Citation source and version are required')
    if (!scope.citations.some(item => item.projectId === projectId && item.documentId === documentId && item.versionId === versionId)) return rejected('RECORD_NOT_AUTHORIZED', 'Citation is not authorized for the active Project')
    const location = value.location === undefined ? undefined : stringField(value.location)
    return { accepted: true, intent: { view, projectId, documentId, versionId, ...location === undefined ? {} : { location } } }
  }
  const experimentId = stringField(value.experimentId)
  const experiment = experimentId === undefined ? undefined : scope.experiments.find(item => item.projectId === projectId && item.experimentId === experimentId)
  if (experiment === undefined) return rejected('RECORD_NOT_AUTHORIZED', 'Experiment is not authorized for the active Project')
  if (view === 'experiment') return { accepted: true, intent: { view, projectId, experimentId: experiment.experimentId } }
  const runId = stringField(value.runId)
  const run = runId === undefined ? undefined : scope.runs.find(item => item.projectId === projectId && item.experimentId === experiment.experimentId && item.runId === runId)
  if (run === undefined) return rejected('RECORD_NOT_AUTHORIZED', 'Run is not authorized for the active Experiment')
  if (view === 'run') return { accepted: true, intent: { view, projectId, experimentId: experiment.experimentId, runId: run.runId } }
  if (view === 'evidence') {
    const artifactId = value.artifactId === undefined ? undefined : stringField(value.artifactId)
    if (value.artifactId !== undefined && artifactId === undefined) return rejected('RECORD_NOT_AUTHORIZED', 'Artifact is invalid')
    if (artifactId !== undefined && !scope.artifacts.some(item => item.runId === run.runId && item.artifactId === artifactId)) return rejected('RECORD_NOT_AUTHORIZED', 'Artifact is not authorized for the active Run')
    return { accepted: true, intent: { view, projectId, experimentId: experiment.experimentId, runId: run.runId, ...artifactId === undefined ? {} : { artifactId } } }
  }
  return rejected('UNKNOWN_VIEW', 'Presentation view is not supported')
}

/** Typed Agent lifecycle projection used by conversation cards and the workbench timeline. */
export type LabAgentLifecycleProjection =
  | { readonly kind: 'goal'; readonly status: 'clarifying' | 'ready'; readonly objective: string; readonly missingInputs: readonly string[] }
  | { readonly kind: 'knowledge'; readonly status: 'retrieving' | 'ready' | 'unavailable'; readonly sources: readonly LabKnowledgeItem[]; readonly citationIds: readonly string[]; readonly citations?: readonly LabCitationReference[]; readonly message?: string }
  | { readonly kind: 'capability-gap'; readonly status: 'waiting'; readonly capability: string; readonly missing: readonly string[]; readonly message: string }
  | { readonly kind: 'workflow-proposal'; readonly status: 'proposed' | 'validated' | 'approved' | 'locked'; readonly workflow: LabWorkflowRecord; readonly validation?: LabValidation }
  | { readonly kind: 'skill-proposal'; readonly status: 'draft' | 'validated' | 'approved' | 'active'; readonly revision: LabSkillRevision; readonly validation?: LabValidation }
  | { readonly kind: 'execution'; readonly status: LabRun['runStatus']; readonly run: LabRun }
  | { readonly kind: 'replan'; readonly status: 'proposed' | 'approved'; readonly runId: string; readonly reason: string; readonly replacementPlanId?: string }
  | { readonly kind: 'result-assessment'; readonly status: 'pending' | 'passed' | 'failed' | 'human-qc'; readonly runId: string; readonly assessment: LabResultAssessmentRecord }
  | { readonly kind: 'report'; readonly status: 'ready'; readonly report: LabReportView; readonly evidence: readonly LabEvidenceRecord[] }

/** Host-authorized citation target carried by an Agent lifecycle projection. */
export interface LabCitationReference {
  readonly projectId: string
  readonly documentId: string
  readonly versionId: string
  readonly location?: string
  readonly sourceName?: string
}

function projectAllowed(projectId: string, scope: LabPresentationScope): boolean {
  return scope.activeProjectId === undefined || scope.activeProjectId === projectId
}

function rejected(code: LabPresentationErrorCode, message: string): LabPresentationValidation {
  return { accepted: false, code, message }
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
