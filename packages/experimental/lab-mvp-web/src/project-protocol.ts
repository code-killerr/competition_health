/** Dedicated JSON protocol for laboratory projects and project conversations. */

import { brandId, type ArtifactId, type ArtifactManifest, type DeviceId, type ExperimentId, type ExperimentRequest, type LabExperimentRecord, type LabExperimentSessionRole, type LabProjectContext, type LabProjectId, type LabProjectView, type PlanId, type PlanParameter, type RunId, type WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { KnowledgeCapabilityStatus, LabProjectSourceSelection } from '@deepseek-ai/dsh-experimental-lab-project'
import type { PlanProposalResult, PlanningContext } from '@deepseek-ai/dsh-experimental-lab-planning'
import type { LabRunReport, RunView } from '@deepseek-ai/dsh-experimental-lab-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session'

/** 两次 Run 的可展示比较结果。 */
export interface LabRunComparison {
  readonly leftRunId: RunId
  readonly rightRunId: RunId
  readonly status: { readonly left: RunView['runStatus']; readonly right: RunView['runStatus'] }
  readonly durationMs: { readonly left: number; readonly right: number }
  readonly parameters: {
    readonly left: readonly { readonly stepId: string; readonly values: Readonly<Record<string, PlanParameter>> }[]
    readonly right: readonly { readonly stepId: string; readonly values: Readonly<Record<string, PlanParameter>> }[]
  }
  readonly stepStatuses: readonly {
    readonly stepId: string
    readonly left: string | undefined
    readonly right: string | undefined
  }[]
  readonly observations: readonly {
    readonly stepId: string
    readonly left?: { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] }
    readonly right?: { readonly operationId: string; readonly status: string; readonly valid: boolean; readonly artifactIds: readonly string[] }
  }[]
  readonly artifactCounts: { readonly left: number; readonly right: number }
  readonly artifactMetadata: {
    readonly left: readonly ArtifactComparisonMetadata[]
    readonly right: readonly ArtifactComparisonMetadata[]
  }
}

type ArtifactComparisonMetadata = Pick<ArtifactManifest, 'artifactId' | 'displayName' | 'kind' | 'mediaType' | 'size' | 'digest' | 'createdAt'>

type ArtifactOpenValue = ArtifactManifest & { readonly preview: { readonly kind: 'unsupported' } }

/** Project scope and capability status returned by a project query. */
export interface LabProjectContextView {
  readonly project: LabProjectContext
  readonly knowledgeCapability: KnowledgeCapabilityStatus
}

/** Project scope plus the Agent-facing planning projection. */
export interface LabProjectPlanningContextView {
  readonly project: LabProjectContext
  readonly knowledgeCapability: KnowledgeCapabilityStatus
  readonly planningContext: PlanningContext
}

/** Project/conversation command parsed at the Web boundary. */
export type LabProjectConversationCommand = { readonly sessionId?: SessionId } & (
  | { readonly command: 'project-create'; readonly workspaceId?: WorkspaceId; readonly name: string; readonly description?: string }
  | { readonly command: 'project-list' }
  | { readonly command: 'project-open'; readonly projectId: LabProjectId }
  | { readonly command: 'project-scope-update'; readonly projectId: LabProjectId; readonly sources: readonly LabProjectSourceSelection[]; readonly deviceIds: readonly DeviceId[] }
  | { readonly command: 'project-session-create'; readonly projectId: LabProjectId; readonly title?: string }
  | { readonly command: 'project-session-attach'; readonly projectId: LabProjectId; readonly targetSessionId: SessionId; readonly title?: string }
  | { readonly command: 'project-session-detach'; readonly projectId: LabProjectId; readonly targetSessionId: SessionId }
  | { readonly command: 'project-archive'; readonly projectId: LabProjectId }
  | { readonly command: 'project-session-rename'; readonly projectId: LabProjectId; readonly targetSessionId: SessionId; readonly title: string }
  | { readonly command: 'project-context'; readonly projectId: LabProjectId }
  | { readonly command: 'project-planning-context'; readonly projectId: LabProjectId; readonly request: ExperimentRequest }
  | { readonly command: 'experiment-list'; readonly projectId: LabProjectId }
  | { readonly command: 'experiment-reviews'; readonly experimentId: ExperimentId }
  | { readonly command: 'experiment-open'; readonly projectId: LabProjectId; readonly experimentId: ExperimentId }
  | { readonly command: 'experiment-create'; readonly projectId: LabProjectId; readonly title: string; readonly objective: string }
  | { readonly command: 'experiment-derive'; readonly projectId: LabProjectId; readonly sourceExperimentId: ExperimentId; readonly title: string; readonly objective: string }
  | { readonly command: 'experiment-session-link'; readonly projectId: LabProjectId; readonly experimentId: ExperimentId; readonly targetSessionId: SessionId; readonly role: LabExperimentSessionRole }
  | { readonly command: 'run-list'; readonly experimentId: ExperimentId }
  | { readonly command: 'run-open'; readonly runId: RunId }
  | { readonly command: 'run-start'; readonly experimentId: ExperimentId; readonly planId: PlanId }
  | { readonly command: 'run-stop'; readonly runId: RunId }
  | { readonly command: 'run-retry'; readonly runId: RunId }
  | { readonly command: 'run-compare'; readonly leftRunId: RunId; readonly rightRunId: RunId }
  | { readonly command: 'run-report'; readonly runId: RunId }
  | { readonly command: 'artifact-list'; readonly runId: RunId }
  | { readonly command: 'artifact-open'; readonly runId: RunId; readonly artifactId: ArtifactId }
)

/** Project/conversation Facade result envelope. */
export type LabProjectConversationResult =
  | { readonly kind: 'project-list'; readonly value: readonly LabProjectView[] }
  | { readonly kind: 'project'; readonly value: LabProjectView }
  | { readonly kind: 'project-context'; readonly value: LabProjectContextView | LabProjectPlanningContextView }
  | { readonly kind: 'project-session-attach-conflict'; readonly value: import('@deepseek-ai/dsh-experimental-lab-domain').LabProjectSessionAttachConflict }
  | { readonly kind: 'experiment-list'; readonly value: readonly LabExperimentRecord[] }
  | { readonly kind: 'experiment-reviews'; readonly value: readonly PlanProposalResult[] }
  | { readonly kind: 'experiment'; readonly value: LabExperimentRecord }
  | { readonly kind: 'experiment-project'; readonly value: LabProjectView }
  | { readonly kind: 'run-list'; readonly value: readonly RunView[] }
  | { readonly kind: 'run'; readonly value: RunView }
  | { readonly kind: 'run-report'; readonly value: LabRunReport }
  | { readonly kind: 'run-comparison'; readonly value: LabRunComparison }
  | { readonly kind: 'artifact-list'; readonly value: RunView['artifacts'] }
  | { readonly kind: 'artifact'; readonly value: ArtifactOpenValue }

/** Parse one unknown JSON value into a project/conversation command.
 * @param value - unknown JSON value at the Web boundary.
 * @returns - validated project/conversation command.
 */
export function parseLabProjectConversationCommand(value: unknown): LabProjectConversationCommand {
  const object = record(value, 'command')
  const command = literal(object.command, 'command.command', [
    'project-create', 'project-list', 'project-open', 'project-scope-update',
    'project-session-create',
    'project-session-attach', 'project-session-detach', 'project-session-rename', 'project-archive', 'project-context',
    'project-planning-context', 'experiment-list', 'experiment-reviews', 'experiment-open', 'experiment-create', 'experiment-derive',
    'experiment-session-link', 'run-list', 'run-open', 'run-start', 'run-stop', 'run-retry', 'run-compare', 'run-report',
    'artifact-list', 'artifact-open',
  ] as const)
  const sessionId = object.sessionId === undefined ? undefined : brandId<'SessionId'>(nonBlankString(object.sessionId, 'command.sessionId'))
  const parsed = (() => {
    switch (command) {
      case 'project-create':
        if (object.projectId !== undefined) throw new Error('project-create must not accept projectId')
        return {
          command,
          ...object.workspaceId === undefined ? {} : { workspaceId: workspaceId(object.workspaceId, 'command.workspaceId') },
          name: nonBlankString(object.name, 'command.name'),
          ...object.description === undefined ? {} : { description: stringValue(object.description, 'command.description') },
        }
      case 'project-list':
        return { command }
      case 'project-open':
        return { command, projectId: projectId(object.projectId, 'command.projectId') }
      case 'project-scope-update':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          sources: array(object.sources, 'command.sources').map((item, index) => {
            const source = record(item, `command.sources[${index}]`)
            return {
              documentId: brandId<'KnowledgeDocumentId'>(nonBlankString(source.documentId, `command.sources[${index}].documentId`)),
              versionId: brandId<'KnowledgeDocumentVersionId'>(nonBlankString(source.versionId, `command.sources[${index}].versionId`)),
            }
          }),
          deviceIds: stringArray(object.deviceIds, 'command.deviceIds').map(item => brandId<'DeviceId'>(item)),
        }
      case 'project-session-create':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          ...object.title === undefined ? {} : { title: nonBlankString(object.title, 'command.title') },
        }
      case 'project-session-attach':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          targetSessionId: sessionIdValue(object.targetSessionId, 'command.targetSessionId'),
          ...object.title === undefined ? {} : { title: nonBlankString(object.title, 'command.title') },
        }
      case 'project-session-detach':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          targetSessionId: sessionIdValue(object.targetSessionId, 'command.targetSessionId'),
        }
      case 'project-archive':
        return { command, projectId: projectId(object.projectId, 'command.projectId') }
      case 'project-session-rename':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          targetSessionId: sessionIdValue(object.targetSessionId, 'command.targetSessionId'),
          title: nonBlankString(object.title, 'command.title'),
        }
      case 'project-context':
        return { command, projectId: projectId(object.projectId, 'command.projectId') }
      case 'project-planning-context':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          request: parseExperimentRequest(object.request, 'command.request'),
        }
      case 'experiment-list':
        return { command, projectId: projectId(object.projectId, 'command.projectId') }
      case 'experiment-reviews':
        return { command, experimentId: experimentId(object.experimentId, 'command.experimentId') }
      case 'experiment-open':
        return { command, projectId: projectId(object.projectId, 'command.projectId'), experimentId: experimentId(object.experimentId, 'command.experimentId') }
      case 'experiment-create':
        return { command, projectId: projectId(object.projectId, 'command.projectId'), title: nonBlankString(object.title, 'command.title'), objective: nonBlankString(object.objective, 'command.objective') }
      case 'experiment-derive':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          sourceExperimentId: experimentId(object.sourceExperimentId, 'command.sourceExperimentId'),
          title: nonBlankString(object.title, 'command.title'),
          objective: nonBlankString(object.objective, 'command.objective'),
        }
      case 'experiment-session-link':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          experimentId: experimentId(object.experimentId, 'command.experimentId'),
          targetSessionId: sessionIdValue(object.targetSessionId, 'command.targetSessionId'),
          role: literal(object.role, 'command.role', ['created', 'continued', 'reviewed'] as const),
        }
      case 'run-list':
        return { command, experimentId: experimentId(object.experimentId, 'command.experimentId') }
      case 'run-open':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'run-start':
        return { command, experimentId: experimentId(object.experimentId, 'command.experimentId'), planId: planId(object.planId, 'command.planId') }
      case 'run-stop':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'run-retry':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'run-compare':
        return { command, leftRunId: runId(object.leftRunId, 'command.leftRunId'), rightRunId: runId(object.rightRunId, 'command.rightRunId') }
      case 'run-report':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'artifact-list':
        return { command, runId: runId(object.runId, 'command.runId') }
      case 'artifact-open':
        return { command, runId: runId(object.runId, 'command.runId'), artifactId: brandId<'ArtifactId'>(nonBlankString(object.artifactId, 'command.artifactId')) }
    }
  })()
  return sessionId === undefined ? parsed : { ...parsed, sessionId }
}

function parseExperimentRequest(value: unknown, path: string): ExperimentRequest {
  const object = record(value, path)
  return {
    experimentId: brandId<'ExperimentId'>(nonBlankString(object.experimentId, `${path}.experimentId`)),
    objective: nonBlankString(object.objective, `${path}.objective`),
    samples: array(object.samples, `${path}.samples`).map((item, index) => {
      const sample = record(item, `${path}.samples[${index}]`)
      return {
        name: nonBlankString(sample.name, `${path}.samples[${index}].name`),
        attributes: stringRecord(sample.attributes, `${path}.samples[${index}].attributes`),
      }
    }),
    constraints: array(object.constraints, `${path}.constraints`).map((item, index) => {
      const constraint = record(item, `${path}.constraints[${index}]`)
      return {
        name: nonBlankString(constraint.name, `${path}.constraints[${index}].name`),
        value: nonBlankString(constraint.value, `${path}.constraints[${index}].value`),
        citations: stringArray(constraint.citations, `${path}.constraints[${index}].citations`).map(item => brandId<'CitationId'>(item)),
      }
    }),
    expectedOutputs: stringArray(object.expectedOutputs, `${path}.expectedOutputs`),
    unresolved: stringArray(object.unresolved, `${path}.unresolved`),
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`)
  return value as Record<string, unknown>
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)
  return value
}
function stringArray(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => nonBlankString(item, `${path}[${index}]`))
}
function stringRecord(value: unknown, path: string): Readonly<Record<string, string>> {
  const object = record(value, path)
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, nonBlankString(item, `${path}.${key}`)]))
}
function nonBlankString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-blank string`)
  return value.trim()
}
function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`)
  return value.trim()
}
function literal<const T extends readonly string[]>(value: unknown, path: string, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) throw new Error(`${path} must be one of ${values.join(', ')}`)
  return value
}
function projectId(value: unknown, path: string): LabProjectId { return brandId<'LabProjectId'>(nonBlankString(value, path)) }
function workspaceId(value: unknown, path: string): WorkspaceId { return brandId<'WorkspaceId'>(nonBlankString(value, path)) }
function sessionIdValue(value: unknown, path: string): SessionId { return brandId<'SessionId'>(nonBlankString(value, path)) }
function experimentId(value: unknown, path: string): ExperimentId { return brandId<'ExperimentId'>(nonBlankString(value, path)) }
function planId(value: unknown, path: string): PlanId { return brandId<'PlanId'>(nonBlankString(value, path)) }
function runId(value: unknown, path: string): RunId { return brandId<'RunId'>(nonBlankString(value, path)) }
