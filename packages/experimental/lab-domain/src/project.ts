/** Laboratory project and project-conversation records. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionEvent, SessionEventMap, SessionId } from '@deepseek-ai/dsh-session'
import type {
  CitationId,
  DeviceId,
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
} from './types.ts'

/** Durable laboratory project identifier. */
export type LabProjectId = Branded<'LabProjectId'>
/** Durable identifier for one approved/shared project fact. */
export type LabProjectFactId = Branded<'LabProjectFactId'>
/** Durable identifier for one project audit record. */
export type LabProjectAuditId = Branded<'LabProjectAuditId'>

/** Project lifecycle status. */
export type LabProjectStatus = 'ACTIVE' | 'ARCHIVED'
/** Project Session association status. */
export type LabProjectSessionStatus = 'ACTIVE' | 'ARCHIVED'
/** Project evidence category projected from authoritative Session events. */
export type LabProjectEvidenceKind = 'plan-proposal' | 'plan-approval' | 'run' | 'report'
/** Project audit category. */
export type LabProjectAuditKind =
  | 'project-created'
  | 'scope-updated'
  | 'session-associated'
  | 'session-renamed'
  | 'fact-published'
  | 'evidence-projected'

/** Durable project identity. Scope and conversation associations live in their own records. */
export interface LabProject {
  readonly projectId: LabProjectId
  readonly name: string
  readonly description: string
  readonly status: LabProjectStatus
  readonly createdAt: number
  readonly updatedAt: number
}

/** One opaque Knowledge document/version selection in a project scope. */
export interface LabProjectSource {
  readonly projectId: LabProjectId
  readonly documentId: KnowledgeDocumentId
  readonly versionId: KnowledgeDocumentVersionId
  readonly selectedAt: number
  readonly selectedBy: SessionId
}

/** One device selection in a project scope. */
export interface LabProjectDevice {
  readonly projectId: LabProjectId
  readonly deviceId: DeviceId
  readonly selectedAt: number
  readonly selectedBy: SessionId
}

/** One Harness Session associated with a laboratory project. */
export interface LabProjectSession {
  readonly projectId: LabProjectId
  readonly sessionId: SessionId
  readonly title: string
  readonly order: number
  readonly status: LabProjectSessionStatus
  readonly createdAt: number
  readonly updatedAt: number
}

/** A fact explicitly published for reuse by later project Sessions. */
export interface LabProjectFact {
  readonly factId: LabProjectFactId
  readonly projectId: LabProjectId
  readonly content: string
  readonly citationIds: readonly CitationId[]
  readonly sourceSessionId?: SessionId
  readonly approvedBy: string
  readonly createdAt: number
}

/** Audit record stored with the project domain. */
export interface LabProjectAudit {
  readonly auditId: LabProjectAuditId
  readonly projectId: LabProjectId
  readonly kind: LabProjectAuditKind
  readonly sessionId: SessionId
  readonly at: number
  readonly details: Readonly<Record<string, string>>
}

/** Rebuildable project evidence projection derived from Session events. */
export interface LabProjectEvidenceProjection {
  readonly version: 1
  readonly projectId: LabProjectId
  readonly sessionId: SessionId
  readonly experimentId: Branded<'ExperimentId'>
  readonly kind: LabProjectEvidenceKind
  readonly referenceId: string
  readonly status: string
  readonly updatedAt: number
}

/** Complete project view returned to a project workspace. */
export interface LabProjectView {
  readonly project: LabProject
  readonly sources: readonly LabProjectSource[]
  readonly devices: readonly LabProjectDevice[]
  readonly sessions: readonly LabProjectSession[]
  readonly sharedFacts: readonly LabProjectFact[]
  readonly evidence: readonly LabProjectEvidenceProjection[]
}

/** Explicit project scope passed to a planning/context builder. */
export interface LabProjectContext {
  readonly projectId: LabProjectId
  readonly sessionId?: SessionId
  readonly sources: readonly LabProjectSource[]
  readonly devices: readonly LabProjectDevice[]
  readonly sharedFacts: readonly LabProjectFact[]
}

/** Rebuild the latest evidence projection for each project/reference pair. */
export function rebuildProjectEvidence(
  events: readonly SessionEvent[],
  projectId?: LabProjectId,
): readonly LabProjectEvidenceProjection[] {
  const latest = new Map<string, LabProjectEvidenceProjection>()
  for (const event of events) {
    if (event.type !== 'lab/project/evidence/projected') continue
    const projection = event.data.projection
    if (projectId !== undefined && projection.projectId !== projectId) continue
    latest.set(`${projection.projectId}:${projection.kind}:${projection.referenceId}`, projection)
  }
  return [...latest.values()]
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Project creation audit event. */
    'lab/project/created': {
      version: 1
      projectId: LabProjectId
      name: string
      sessionId: SessionId
    }
    /** Explicit project Knowledge/device scope replacement. */
    'lab/project/scope-updated': {
      version: 1
      projectId: LabProjectId
      sources: readonly { documentId: KnowledgeDocumentId; versionId: KnowledgeDocumentVersionId }[]
      deviceIds: readonly DeviceId[]
      updatedBy: SessionId
    }
    /** Project-to-Session association event. */
    'lab/project/session-associated': {
      version: 1
      projectId: LabProjectId
      sessionId: SessionId
      title: string
    }
    /** Project Session title change event. */
    'lab/project/session-renamed': {
      version: 1
      projectId: LabProjectId
      sessionId: SessionId
      title: string
      renamedBy: SessionId
    }
    /** Explicitly published project fact. */
    'lab/project/fact-published': {
      version: 1
      projectId: LabProjectId
      factId: LabProjectFactId
      citationIds: readonly CitationId[]
      sourceSessionId?: SessionId
      approvedBy: string
    }
    /** Rebuildable proposal/approval/run/report projection. */
    'lab/project/evidence/projected': {
      version: 1
      projection: LabProjectEvidenceProjection
    }
  }
}

/** Keep the event-map import live for declaration-merging consumers. */
export type LabProjectEventMap = SessionEventMap
