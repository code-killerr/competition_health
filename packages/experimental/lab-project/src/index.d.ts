/** Durable laboratory Project and multi-Session conversation service. */
import { Context, Service } from '@deepseek-ai/cordis';
import { z } from 'zod';
import type { Domain } from '@deepseek-ai/dsh-storage-domain';
import { type CitationId, type DeviceId, type ExperimentId, type KnowledgeDocumentId, type KnowledgeDocumentVersionId, type LabOperationId, type WorkspaceId } from '@deepseek-ai/dsh-experimental-lab-domain';
import type { LabProject, LabProjectAudit, LabProjectContext, LabProjectDevice, LabProjectEvidenceProjection, LabProjectFact, LabProjectFactId, LabProjectId, LabProjectSession, LabProjectSource, LabProjectView, LabProjectSessionAttachResult, LabExperimentRecord, LabExperimentSessionLink, LabExperimentSessionRole } from '@deepseek-ai/dsh-experimental-lab-domain';
import type { SessionId } from '@deepseek-ai/dsh-session';
/** Storage Domain for authoritative project associations and rebuildable evidence. */
export declare const labProjectDomainSpec: {
    name: string;
    version: number;
    global: {
        schema: z.ZodObject<{
            projects: z.ZodArray<z.ZodObject<{
                projectId: z.ZodString;
                workspaceId: z.ZodString;
                name: z.ZodString;
                description: z.ZodString;
                status: z.ZodEnum<{
                    ACTIVE: "ACTIVE";
                    ARCHIVED: "ARCHIVED";
                }>;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
            }, z.core.$strip>>;
            experiments: z.ZodArray<z.ZodObject<{
                experimentId: z.ZodString;
                projectId: z.ZodString;
                title: z.ZodString;
                objective: z.ZodString;
                status: z.ZodEnum<{
                    ACTIVE: "ACTIVE";
                    ARCHIVED: "ARCHIVED";
                    DRAFT: "DRAFT";
                    COMPLETED: "COMPLETED";
                }>;
                createdInSessionId: z.ZodString;
                derivedFromExperimentId: z.ZodOptional<z.ZodString>;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
            }, z.core.$strip>>;
            experimentSessions: z.ZodArray<z.ZodObject<{
                projectId: z.ZodString;
                experimentId: z.ZodString;
                sessionId: z.ZodString;
                role: z.ZodEnum<{
                    created: "created";
                    continued: "continued";
                    reviewed: "reviewed";
                }>;
                linkedBy: z.ZodString;
                linkedAt: z.ZodNumber;
            }, z.core.$strip>>;
            sources: z.ZodArray<z.ZodObject<{
                projectId: z.ZodString;
                documentId: z.ZodString;
                versionId: z.ZodString;
                selectedAt: z.ZodNumber;
                selectedBy: z.ZodString;
            }, z.core.$strip>>;
            devices: z.ZodArray<z.ZodObject<{
                projectId: z.ZodString;
                deviceId: z.ZodString;
                selectedAt: z.ZodNumber;
                selectedBy: z.ZodString;
            }, z.core.$strip>>;
            sessions: z.ZodArray<z.ZodObject<{
                projectId: z.ZodString;
                sessionId: z.ZodString;
                title: z.ZodString;
                order: z.ZodNumber;
                status: z.ZodEnum<{
                    ACTIVE: "ACTIVE";
                    ARCHIVED: "ARCHIVED";
                }>;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
            }, z.core.$strip>>;
            facts: z.ZodArray<z.ZodObject<{
                factId: z.ZodString;
                projectId: z.ZodString;
                content: z.ZodString;
                citationIds: z.ZodArray<z.ZodString>;
                sourceSessionId: z.ZodOptional<z.ZodString>;
                approvedBy: z.ZodString;
                createdAt: z.ZodNumber;
            }, z.core.$strip>>;
            audits: z.ZodArray<z.ZodObject<{
                auditId: z.ZodString;
                projectId: z.ZodString;
                kind: z.ZodEnum<{
                    "project-created": "project-created";
                    "project-archived": "project-archived";
                    "scope-updated": "scope-updated";
                    "session-attached": "session-attached";
                    "session-detached": "session-detached";
                    "session-renamed": "session-renamed";
                    "experiment-created": "experiment-created";
                    "experiment-session-linked": "experiment-session-linked";
                    "fact-published": "fact-published";
                    "evidence-projected": "evidence-projected";
                }>;
                sessionId: z.ZodString;
                at: z.ZodNumber;
                details: z.ZodRecord<z.ZodString, z.ZodString>;
            }, z.core.$strip>>;
            evidence: z.ZodArray<z.ZodObject<{
                version: z.ZodLiteral<1>;
                projectId: z.ZodString;
                sessionId: z.ZodString;
                experimentId: z.ZodString;
                kind: z.ZodEnum<{
                    "plan-proposal": "plan-proposal";
                    "plan-approval": "plan-approval";
                    run: "run";
                    report: "report";
                }>;
                referenceId: z.ZodString;
                status: z.ZodString;
                updatedAt: z.ZodNumber;
            }, z.core.$strip>>;
        }, z.core.$strip>;
        initial: {
            projects: {
                projectId: string;
                workspaceId: string;
                name: string;
                description: string;
                status: "ACTIVE" | "ARCHIVED";
                createdAt: number;
                updatedAt: number;
            }[];
            experiments: {
                experimentId: string;
                projectId: string;
                title: string;
                objective: string;
                status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "COMPLETED";
                createdInSessionId: string;
                createdAt: number;
                updatedAt: number;
                derivedFromExperimentId?: string | undefined;
            }[];
            experimentSessions: {
                projectId: string;
                experimentId: string;
                sessionId: string;
                role: "created" | "continued" | "reviewed";
                linkedBy: string;
                linkedAt: number;
            }[];
            sources: {
                projectId: string;
                documentId: string;
                versionId: string;
                selectedAt: number;
                selectedBy: string;
            }[];
            devices: {
                projectId: string;
                deviceId: string;
                selectedAt: number;
                selectedBy: string;
            }[];
            sessions: {
                projectId: string;
                sessionId: string;
                title: string;
                order: number;
                status: "ACTIVE" | "ARCHIVED";
                createdAt: number;
                updatedAt: number;
            }[];
            facts: {
                factId: string;
                projectId: string;
                content: string;
                citationIds: string[];
                approvedBy: string;
                createdAt: number;
                sourceSessionId?: string | undefined;
            }[];
            audits: {
                auditId: string;
                projectId: string;
                kind: "project-created" | "project-archived" | "scope-updated" | "session-attached" | "session-detached" | "session-renamed" | "experiment-created" | "experiment-session-linked" | "fact-published" | "evidence-projected";
                sessionId: string;
                at: number;
                details: Record<string, string>;
            }[];
            evidence: {
                version: 1;
                projectId: string;
                sessionId: string;
                experimentId: string;
                kind: "plan-proposal" | "plan-approval" | "run" | "report";
                referenceId: string;
                status: string;
                updatedAt: number;
            }[];
        };
    };
    tables: {};
};
/** In-memory form of the project domain, with opaque identifiers restored. */
export interface LabProjectState {
    readonly projects: readonly LabProject[];
    readonly experiments: readonly LabExperimentRecord[];
    readonly experimentSessions: readonly LabExperimentSessionLink[];
    readonly sources: readonly LabProjectSource[];
    readonly devices: readonly LabProjectDevice[];
    readonly sessions: readonly LabProjectSession[];
    readonly facts: readonly LabProjectFact[];
    readonly audits: readonly LabProjectAudit[];
    readonly evidence: readonly LabProjectEvidenceProjection[];
}
/** Project persistence adapter used by the service. */
export interface LabProjectStore {
    load(): Promise<LabProjectState>;
    save(state: LabProjectState): Promise<void>;
    dispose?(): Promise<void> | void;
}
/** Project creation input. */
export interface CreateLabProjectRequest {
    readonly workspaceId?: WorkspaceId;
    readonly name?: string;
    readonly description?: string;
    readonly createdBy: SessionId;
}
/** Host workspace projection required for Project ownership checks. */
export interface LabProjectWorkspace {
    readonly id: WorkspaceId;
    readonly path: string;
    readonly sessionIds: readonly SessionId[];
}
/** Narrow Host Workspace registry face consumed by the Project service. */
export interface LabProjectWorkspaceRegistry {
    /** @param workspaceId - Workspace to resolve. @returns the Host record, when registered. */
    get(workspaceId: WorkspaceId): LabProjectWorkspace | undefined;
    /** @returns registered Host Workspaces in their authoritative order. */
    list(): readonly LabProjectWorkspace[];
}
/** Explicit Knowledge scope selection. */
export interface LabProjectSourceSelection {
    readonly documentId: KnowledgeDocumentId;
    readonly versionId: KnowledgeDocumentVersionId;
}
/** Project scope replacement input. */
export interface UpdateLabProjectScopeRequest {
    readonly sources: readonly LabProjectSourceSelection[];
    readonly deviceIds: readonly DeviceId[];
    readonly selectedBy: SessionId;
}
/** Project Session association input. */
export interface AttachLabProjectSessionRequest {
    readonly projectId: LabProjectId;
    readonly sessionId: SessionId;
    readonly title?: string;
    readonly attachedBy: SessionId;
}
/** Project Experiment creation input; the Host generates the Experiment ID. */
export interface CreateLabExperimentRequest {
    readonly projectId: LabProjectId;
    readonly title: string;
    readonly objective: string;
    readonly createdInSessionId: SessionId;
    readonly createdBy: SessionId;
    readonly operationId?: LabOperationId;
    readonly derivedFromExperimentId?: ExperimentId;
}
/** Link another Project Session to an existing Experiment. */
export interface LinkLabExperimentSessionRequest {
    readonly projectId: LabProjectId;
    readonly experimentId: ExperimentId;
    readonly sessionId: SessionId;
    readonly role: LabExperimentSessionRole;
    readonly linkedBy: SessionId;
}
/** Project fact publication input. */
export interface PublishLabProjectFactRequest {
    readonly factId: LabProjectFactId;
    readonly projectId: LabProjectId;
    readonly content: string;
    readonly citationIds: readonly CitationId[];
    readonly sourceSessionId?: SessionId;
    readonly approvedBy: string;
    readonly publishedBy: SessionId;
}
/** Stable error for a Session reference that crosses project ownership. */
export declare class LabProjectReferenceError extends Error {
    /** Stable Web and tool error code. */
    readonly code: "CROSS_PROJECT_REFERENCE";
    constructor(message: string);
}
/** 项目服务的部署和测试选项。 */
export interface LabProjectServiceConfig {
    /** 持久化元数据使用的时间源。 */
    readonly clock?: () => number;
    /** Host 负责提供的 Project ID 生成器。 */
    readonly idGenerator?: () => LabProjectId;
    /** Host 负责提供的 Experiment ID 生成器。 */
    readonly experimentIdGenerator?: () => ExperimentId;
}
/** Durable project/session association and scope service. */
export declare class LabProjectService extends Service {
    private state;
    private store;
    private ready;
    private readonly clock;
    private readonly idGenerator;
    private readonly experimentIdGenerator;
    /**
     * @param ctx - Cordis context owning the project service.
     * @param config - 持久化元数据和测试所需的可选服务配置。
     */
    constructor(ctx: Context, config?: LabProjectServiceConfig);
    /** Attach the existing Storage/SQLite domain and restore its state.
     * @param store - durable project state store.
     */
    attach(store: LabProjectStore): Promise<void>;
    /** Create or reuse the active Project bound to a Workspace.
     * @param request - project creation request.
     * @returns - the existing or newly created project view.
     */
    create(request: CreateLabProjectRequest): Promise<LabProjectView>;
    /** Create a Project-owned Experiment with a Host-generated identity.
     * @param request - Experiment metadata and the creating Session.
     * @returns the created Experiment and its updated Project view.
     */
    createExperiment(request: CreateLabExperimentRequest): Promise<{
        readonly experiment: LabExperimentRecord;
        readonly project: LabProjectView;
        readonly created: boolean;
    }>;
    /** Link a Project Session to an Experiment without crossing Project ownership.
     * @param request - Experiment Session provenance link.
     * @returns the updated Project view.
     */
    linkExperimentSession(request: LinkLabExperimentSessionRequest): Promise<LabProjectView>;
    /** List Project Experiments in creation order.
     * @param projectId - Project whose Experiments are requested.
     * @returns Experiment records owned by the Project.
     */
    listExperiments(projectId: LabProjectId): Promise<readonly LabExperimentRecord[]>;
    /** List active and archived projects in creation order.
     * @returns - project views in creation order.
     */
    list(): Promise<readonly LabProjectView[]>;
    /** Open one project with its explicit scope and Session rows.
     * @param projectId - project identifier to open.
     * @returns - project view.
     */
    open(projectId: LabProjectId): Promise<LabProjectView>;
    /** Replace a project selected source versions and devices.
     * @param projectId - project identifier to update.
     * @param request - replacement scope.
     * @returns - updated project view.
     */
    updateScope(projectId: LabProjectId, request: UpdateLabProjectScopeRequest): Promise<LabProjectView>;
    /** Attach one distinct Harness Session to a project when its Workspace matches.
     * @param request - project/session association request.
     * @returns - attach result or an actionable Workspace mismatch.
     */
    attachSession(request: AttachLabProjectSessionRequest): Promise<LabProjectSessionAttachResult>;
    /** Detach a Session association without changing the Session log or cwd.
     * @param projectId - project to change.
     * @param sessionId - associated Session to detach.
     * @param detachedBy - actor recorded in the audit log.
     * @returns the updated project view.
     */
    detachSession(projectId: LabProjectId, sessionId: SessionId, detachedBy: SessionId): Promise<LabProjectView>;
    /** Archive a Project while retaining all associated Session logs and records.
     * @param projectId - project to archive.
     * @param archivedBy - actor recorded in the audit log.
     * @returns the archived project view.
     */
    archive(projectId: LabProjectId, archivedBy: SessionId): Promise<LabProjectView>;
    /** Rename a project Session without changing Harness Session messages.
     * @param projectId - project identifier.
     * @param sessionId - associated Session identifier.
     * @param title - new non-blank title.
     * @param renamedBy - Session recording the rename.
     * @returns - updated project view.
     */
    renameSession(projectId: LabProjectId, sessionId: SessionId, title: string, renamedBy: SessionId): Promise<LabProjectView>;
    /** Return explicit project scope and approved shared facts for a Session.
     * @param projectId - project identifier.
     * @param sessionId - optional associated Session identifier.
     * @returns - project context for the Session.
     */
    context(projectId: LabProjectId, sessionId?: SessionId): Promise<LabProjectContext>;
    /** Publish one explicitly approved fact for later Sessions.
     * @param request - project fact publication request.
     * @returns - updated project view.
     */
    publishFact(request: PublishLabProjectFactRequest): Promise<LabProjectView>;
    /** Project one proposal, approval, run or report into the rebuildable cache.
     * @param projection - rebuildable project evidence projection.
     * @returns - updated project view.
     */
    projectEvidence(projection: LabProjectEvidenceProjection): Promise<LabProjectView>;
    /** Read audit records for recovery and diagnostics.
     * @param projectId - project identifier.
     * @returns - project audit records.
     */
    listAudits(projectId: LabProjectId): Promise<readonly LabProjectAudit[]>;
    /** Return the project owning a Session, when the Session has been associated.
     * @param sessionId - Session identifier to resolve.
     * @returns - owning project, when the Session is associated.
     */
    projectForSession(sessionId: SessionId): Promise<LabProject | undefined>;
    /** Assert that a Session is explicitly associated with a project.
     * @param projectId - expected project identifier.
     * @param sessionId - Session identifier to check.
     */
    assertSession(projectId: LabProjectId, sessionId: SessionId): Promise<void>;
    private requireProject;
    private requireWorkspace;
    private resolveWorkspace;
    private workspaceForSession;
    private workspaceRegistry;
    private requireSession;
    private view;
    private audit;
    private commit;
}
/** In-memory project store for keyless tests. */
export declare class InMemoryLabProjectStore implements LabProjectStore {
    private state;
    /** Load a detached state snapshot. */
    load(): Promise<LabProjectState>;
    /** Save a detached state snapshot. */
    save(state: LabProjectState): Promise<void>;
}
/** Storage Domain backed project store. */
export declare class DomainLabProjectStore implements LabProjectStore {
    private readonly domain;
    constructor(domain: Domain<typeof labProjectDomainSpec>);
    /** Load the global project state from Storage/SQLite. */
    load(): Promise<LabProjectState>;
    /** Replace the global project state durably. */
    save(state: LabProjectState): Promise<void>;
    /** Release the opened domain. */
    dispose(): Promise<void>;
}
/** Cordis plugin name. */
export declare const name = "lab-project";
/** The project domain requires the existing Storage Domain facility. */
export declare const inject: string[];
/** Install the project service and open its Storage Domain. */
export declare function apply(ctx: Context): Promise<void>;
declare module '@deepseek-ai/cordis' {
    interface Context {
        labProjects: LabProjectService;
    }
}
export default LabProjectService;
export * from './knowledge.ts';
//# sourceMappingURL=index.d.ts.map