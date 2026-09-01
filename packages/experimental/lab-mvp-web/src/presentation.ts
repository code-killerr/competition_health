import type { ArtifactManifest, LabPresentationView } from '@deepseek-ai/dsh-experimental-lab-domain'

/** Host-normalized presentation request received from an Agent surface. */
export interface LabHostPresentationIntent {
  readonly view: LabPresentationView
  readonly projectId?: string
  readonly experimentId?: string
  readonly runId?: string
  readonly artifactId?: string
  readonly documentId?: string
  readonly versionId?: string
  readonly location?: string
  readonly page?: string
}

/** Registered records that the Host permits a Session to present. */
export interface LabHostPresentationScope {
  readonly activeProjectId?: string
  readonly registeredViews: readonly LabPresentationView[]
  readonly projects: readonly string[]
  readonly experiments: readonly { readonly projectId: string; readonly experimentId: string }[]
  readonly runs: readonly { readonly projectId: string; readonly experimentId: string; readonly runId: string }[]
  readonly artifacts: readonly Pick<ArtifactManifest, 'runId' | 'artifactId'>[]
  readonly citations: readonly { readonly projectId: string; readonly documentId: string; readonly versionId: string }[]
}

/** Host validation result for an Agent presentation request. */
export type LabHostPresentationValidation =
  | { readonly accepted: true; readonly intent: LabHostPresentationIntent }
  | { readonly accepted: false; readonly code: 'UNKNOWN_VIEW' | 'PROJECT_SCOPE_MISMATCH' | 'RECORD_NOT_AUTHORIZED'; readonly message: string }

/** Validate one presentation request against registered views and Project records.
 * @param value - untrusted Agent presentation payload.
 * @param scope - Host-authorized records for the current Session.
 * @returns - accepted typed intent or a stable rejection.
 */
export function validateHostPresentationIntent(value: unknown, scope: LabHostPresentationScope): LabHostPresentationValidation {
  if (!isRecord(value) || typeof value.view !== 'string') return reject('UNKNOWN_VIEW', 'Presentation view is missing')
  const view = value.view
  if (!scope.registeredViews.includes(view as LabPresentationView)) return reject('UNKNOWN_VIEW', 'Presentation view is not registered')
  if (view === 'projects' || view === 'devices') return { accepted: true, intent: { view } }
  const projectId = stringValue(value.projectId)
  if (projectId === undefined || (scope.activeProjectId !== undefined && scope.activeProjectId !== projectId)) return reject('PROJECT_SCOPE_MISMATCH', 'Presentation target is outside the active Project')
  if (view === 'knowledge') return {
    accepted: true,
    intent: { view, projectId, ...optionalField(value.location, 'location') },
  }
  if (view === 'project') {
    if (!scope.projects.includes(projectId)) return reject('RECORD_NOT_AUTHORIZED', 'Project is not authorized')
    const page = stringValue(value.page)
    if (value.page !== undefined && page === undefined) return reject('UNKNOWN_VIEW', 'Project page is invalid')
    if (page !== undefined && !['overview', 'planning', 'approval', 'execution', 'steps', 'evidence', 'archive', 'experiments', 'runs'].includes(page)) return reject('UNKNOWN_VIEW', 'Project page is not registered')
    return { accepted: true, intent: { view, projectId, ...page === undefined ? {} : { page } } }
  }
  const experimentId = stringValue(value.experimentId)
  if (experimentId === undefined) return reject('RECORD_NOT_AUTHORIZED', 'Experiment is not authorized')
  const experiment = scope.experiments.find(item => item.projectId === projectId && item.experimentId === experimentId)
  if (experiment === undefined) return reject('RECORD_NOT_AUTHORIZED', 'Experiment is not authorized')
  if (view === 'experiment') return { accepted: true, intent: { view, projectId, experimentId } }
  const runId = stringValue(value.runId)
  if (runId === undefined) return reject('RECORD_NOT_AUTHORIZED', 'Run is not authorized')
  const run = scope.runs.find(item => item.projectId === projectId && item.experimentId === experimentId && item.runId === runId)
  if (run === undefined) return reject('RECORD_NOT_AUTHORIZED', 'Run is not authorized')
  if (view === 'run') return { accepted: true, intent: { view, projectId, experimentId, runId } }
  if (view === 'evidence') {
    const artifactId = stringValue(value.artifactId)
    if (artifactId !== undefined && !scope.artifacts.some(item => String(item.runId) === runId && String(item.artifactId) === artifactId)) return reject('RECORD_NOT_AUTHORIZED', 'Artifact is not authorized')
    return { accepted: true, intent: { view, projectId, experimentId, runId, ...artifactId === undefined ? {} : { artifactId } } }
  }
  const documentId = stringValue(value.documentId)
  const versionId = stringValue(value.versionId)
  if (documentId === undefined || versionId === undefined || !scope.citations.some(item => item.projectId === projectId && item.documentId === documentId && item.versionId === versionId)) return reject('RECORD_NOT_AUTHORIZED', 'Citation is not authorized')
  return { accepted: true, intent: { view: 'citation', projectId, documentId, versionId, ...optionalField(value.location, 'location') } }
}

type HostPresentationErrorCode = 'UNKNOWN_VIEW' | 'PROJECT_SCOPE_MISMATCH' | 'RECORD_NOT_AUTHORIZED'

function reject(code: HostPresentationErrorCode, message: string): LabHostPresentationValidation {
  return { accepted: false, code, message }
}

function optionalField<K extends string>(value: unknown, key: K): Partial<Record<K, string>> {
  return typeof value === 'string' && value.trim() !== '' ? { [key]: value.trim() } as Partial<Record<K, string>> : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
