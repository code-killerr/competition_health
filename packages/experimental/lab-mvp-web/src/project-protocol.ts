/** Dedicated JSON protocol for laboratory projects and project conversations. */

import { brandId, type DeviceId, type ExperimentRequest, type LabProjectId } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabProjectSourceSelection } from '@deepseek-ai/dsh-experimental-lab-project'
import type { SessionId } from '@deepseek-ai/dsh-session'

/** Project/conversation command parsed at the Web boundary. */
export type LabProjectConversationCommand = { readonly sessionId?: SessionId } & (
  | { readonly command: 'project-create'; readonly projectId: LabProjectId; readonly name: string; readonly description?: string }
  | { readonly command: 'project-list' }
  | { readonly command: 'project-open'; readonly projectId: LabProjectId }
  | { readonly command: 'project-scope-update'; readonly projectId: LabProjectId; readonly sources: readonly LabProjectSourceSelection[]; readonly deviceIds: readonly DeviceId[] }
  | { readonly command: 'project-session-create'; readonly projectId: LabProjectId; readonly title?: string }
  | { readonly command: 'project-session-associate'; readonly projectId: LabProjectId; readonly targetSessionId: SessionId; readonly title?: string }
  | { readonly command: 'project-session-rename'; readonly projectId: LabProjectId; readonly targetSessionId: SessionId; readonly title: string }
  | { readonly command: 'project-context'; readonly projectId: LabProjectId }
  | { readonly command: 'project-planning-context'; readonly projectId: LabProjectId; readonly request: ExperimentRequest }
)

/** Project/conversation Facade result envelope. */
export type LabProjectConversationResult =
  | { readonly kind: 'project-list'; readonly value: unknown }
  | { readonly kind: 'project'; readonly value: unknown }
  | { readonly kind: 'project-context'; readonly value: unknown }

/** Parse one unknown JSON value into a project/conversation command.
 * @param value - unknown JSON value at the Web boundary.
 * @returns - validated project/conversation command.
 */
export function parseLabProjectConversationCommand(value: unknown): LabProjectConversationCommand {
  const object = record(value, 'command')
  const command = literal(object.command, 'command.command', [
    'project-create', 'project-list', 'project-open', 'project-scope-update',
    'project-session-create',
    'project-session-associate', 'project-session-rename', 'project-context',
    'project-planning-context',
  ] as const)
  const sessionId = object.sessionId === undefined ? undefined : brandId<'SessionId'>(nonBlankString(object.sessionId, 'command.sessionId'))
  const parsed = (() => {
    switch (command) {
      case 'project-create':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
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
      case 'project-session-associate':
        return {
          command,
          projectId: projectId(object.projectId, 'command.projectId'),
          targetSessionId: sessionIdValue(object.targetSessionId, 'command.targetSessionId'),
          ...object.title === undefined ? {} : { title: nonBlankString(object.title, 'command.title') },
        }
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
function sessionIdValue(value: unknown, path: string): SessionId { return brandId<'SessionId'>(nonBlankString(value, path)) }
