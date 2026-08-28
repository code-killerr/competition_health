/** Laboratory project and project-conversation records. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { SessionEvent, SessionEventMap, SessionId } from '@deepseek-ai/dsh-session'
import type {
  CitationId,
  DeviceId,
  ExperimentId,
  KnowledgeDocumentId,
  KnowledgeDocumentVersionId,
  WorkspaceId,
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
/** Project-owned Experiment lifecycle status. */
export type LabExperimentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
/** Session provenance role for one Project Experiment. */
export type LabExperimentSessionRole = 'created' | 'continued' | 'reviewed'
/** Project evidence category projected from authoritative Session events. */
export type LabProjectEvidenceKind = 'plan-proposal' | 'plan-approval' | 'run' | 'report'
/** Project audit category. */
export type LabProjectAuditKind =
  | 'project-created'
  | 'project-archived'
  | 'scope-updated'
  | 'session-attached'
  | 'session-detached'
  | 'session-renamed'
  | 'experiment-created'
  | 'experiment-session-linked'
  | 'fact-published'
  | 'evidence-projected'

/** Durable project identity. Scope and conversation associations live in their own records. */
export interface LabProject {
  readonly projectId: LabProjectId
  readonly workspaceId: WorkspaceId
  readonly name: string
  readonly description: string
  readonly status: LabProjectStatus
  readonly createdAt: number
  readonly updatedAt: number
}

/** Attach failure returned when a Session cwd belongs to another Workspace. */
export interface LabProjectSessionAttachConflict {
  readonly status: 'conflict'
  readonly code: 'WORKSPACE_MISMATCH'
  readonly projectWorkspaceId: WorkspaceId
  readonly sessionWorkspaceId?: WorkspaceId
  readonly action: {
    readonly kind: 'create-session-in-project-workspace'
    readonly workspaceId: WorkspaceId
  }
}

/** Result of explicitly attaching a Session to a Project. */
export type LabProjectSessionAttachResult =
  | { readonly status: 'attached'; readonly project: LabProjectView }
  | LabProjectSessionAttachConflict

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

/** Durable Project-owned Experiment record. */
export interface LabExperimentRecord {
  readonly experimentId: ExperimentId
  readonly projectId: LabProjectId
  readonly title: string
  readonly objective: string
  readonly status: LabExperimentStatus
  readonly createdInSessionId: SessionId
  readonly derivedFromExperimentId?: ExperimentId
  readonly createdAt: number
  readonly updatedAt: number
}

/** One Session's durable provenance link to a Project Experiment. */
export interface LabExperimentSessionLink {
  readonly projectId: LabProjectId
  readonly experimentId: ExperimentId
  readonly sessionId: SessionId
  readonly role: LabExperimentSessionRole
  readonly linkedBy: SessionId
  readonly linkedAt: number
}

/** Experiment 与 Session 的项目内来源关系。 */
export type SessionExperimentLink = LabExperimentSessionLink

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
  readonly experiments: readonly LabExperimentRecord[]
  readonly experimentSessions: readonly LabExperimentSessionLink[]
}

/** Explicit project scope passed to a planning/context builder. */
export interface LabProjectContext {
  readonly projectId: LabProjectId
  readonly sessionId?: SessionId
  readonly sources: readonly LabProjectSource[]
  readonly devices: readonly LabProjectDevice[]
  readonly sharedFacts: readonly LabProjectFact[]
}

/** Rebuild the latest evidence projection for each project/reference pair.
 * @param events - Session events containing evidence projection records.
 * @param projectId - optional project filter.
 * @returns - latest evidence projection for each project/reference pair.
 */
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
      workspaceId: WorkspaceId
      name: string
      sessionId: SessionId
    }
    /** Project archive event; Project Sessions and logs remain available. */
    'lab/project/archived': {
      version: 1
      projectId: LabProjectId
      archivedBy: SessionId
    }
    /** Project-owned Experiment creation event. */
    'lab/project/experiment-created': {
      version: 1
      projectId: LabProjectId
      experimentId: ExperimentId
      title: string
      objective: string
      createdInSessionId: SessionId
    }
    /** Additional Session provenance for a Project Experiment. */
    'lab/project/experiment-session-linked': {
      version: 1
      projectId: LabProjectId
      experimentId: ExperimentId
      sessionId: SessionId
      role: LabExperimentSessionRole
      linkedBy: SessionId
    }
    /** Explicit project Knowledge/device scope replacement. */
    'lab/project/scope-updated': {
      version: 1
      projectId: LabProjectId
      sources: readonly { documentId: KnowledgeDocumentId; versionId: KnowledgeDocumentVersionId }[]
      deviceIds: readonly DeviceId[]
      updatedBy: SessionId
    }
    /** Project-to-Session attach event. */
    'lab/project/session-attached': {
      version: 1
      projectId: LabProjectId
      sessionId: SessionId
      title: string
    }
    /** Project-to-Session detach event. */
    'lab/project/session-detached': {
      version: 1
      projectId: LabProjectId
      sessionId: SessionId
      detachedBy: SessionId
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
