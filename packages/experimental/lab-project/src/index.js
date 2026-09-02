/** Durable laboratory Project and multi-Session conversation service. */
import { Service } from '@deepseek-ai/cordis';
import { z } from 'zod';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain';
const projectRecord = z.object({
    projectId: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    description: z.string(),
    status: z.enum(['ACTIVE', 'ARCHIVED']),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
});
const experimentRecord = z.object({
    experimentId: z.string(),
    projectId: z.string(),
    title: z.string(),
    objective: z.string(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']),
    createdInSessionId: z.string(),
    derivedFromExperimentId: z.string().optional(),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
});
const experimentSessionLinkRecord = z.object({
    projectId: z.string(),
    experimentId: z.string(),
    sessionId: z.string(),
    role: z.enum(['created', 'continued', 'reviewed']),
    linkedBy: z.string(),
    linkedAt: z.number().int().nonnegative(),
});
const sourceRecord = z.object({
    projectId: z.string(),
    documentId: z.string(),
    versionId: z.string(),
    selectedAt: z.number().int().nonnegative(),
    selectedBy: z.string(),
});
const deviceRecord = z.object({
    projectId: z.string(),
    deviceId: z.string(),
    selectedAt: z.number().int().nonnegative(),
    selectedBy: z.string(),
});
const sessionRecord = z.object({
    projectId: z.string(),
    sessionId: z.string(),
    title: z.string(),
    order: z.number().int().nonnegative(),
    status: z.enum(['ACTIVE', 'ARCHIVED']),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
});
const factRecord = z.object({
    factId: z.string(),
    projectId: z.string(),
    content: z.string(),
    citationIds: z.array(z.string()),
    sourceSessionId: z.string().optional(),
    approvedBy: z.string(),
    createdAt: z.number().int().nonnegative(),
});
const auditRecord = z.object({
    auditId: z.string(),
    projectId: z.string(),
    kind: z.enum([
        'project-created', 'project-archived', 'scope-updated', 'session-attached', 'session-detached', 'session-renamed',
        'experiment-created', 'experiment-session-linked',
        'fact-published', 'evidence-projected',
    ]),
    sessionId: z.string(),
    at: z.number().int().nonnegative(),
    details: z.record(z.string(), z.string()),
});
const evidenceRecord = z.object({
    version: z.literal(1),
    projectId: z.string(),
    sessionId: z.string(),
    experimentId: z.string(),
    kind: z.enum(['plan-proposal', 'plan-approval', 'run', 'report']),
    referenceId: z.string(),
    status: z.string(),
    updatedAt: z.number().int().nonnegative(),
});
const projectStateSchema = z.object({
    projects: z.array(projectRecord),
    experiments: z.array(experimentRecord),
    experimentSessions: z.array(experimentSessionLinkRecord),
    sources: z.array(sourceRecord),
    devices: z.array(deviceRecord),
    sessions: z.array(sessionRecord),
    facts: z.array(factRecord),
    audits: z.array(auditRecord),
    evidence: z.array(evidenceRecord),
});
/** Storage Domain for authoritative project associations and rebuildable evidence. */
export const labProjectDomainSpec = defineDomain({
    name: 'lab_projects',
    version: 2,
    global: {
        schema: projectStateSchema,
        initial: emptyProjectState('stored'),
    },
    tables: {},
});
/** Stable error for a Session reference that crosses project ownership. */
export class LabProjectReferenceError extends Error {
    /** Stable Web and tool error code. */
    code = 'CROSS_PROJECT_REFERENCE';
    constructor(message) {
        super(message);
        this.name = 'LabProjectReferenceError';
    }
}
/** Durable project/session association and scope service. */
export class LabProjectService extends Service {
    state = emptyProjectState('runtime');
    store = new InMemoryLabProjectStore();
    ready = Promise.resolve();
    clock;
    idGenerator;
    experimentIdGenerator;
    /**
     * @param ctx - Cordis context owning the project service.
     * @param config - 持久化元数据和测试所需的可选服务配置。
     */
    constructor(ctx, config = {}) {
        super(ctx, 'labProjects');
        this.clock = config.clock ?? Date.now;
        this.idGenerator = config.idGenerator ?? (() => brandId(`project-${randomUUID()}`));
        this.experimentIdGenerator = config.experimentIdGenerator ?? (() => brandId(`experiment-${randomUUID()}`));
    }
    /** Attach the existing Storage/SQLite domain and restore its state.
     * @param store - durable project state store.
     */
    async attach(store) {
        this.store = store;
        this.ready = this.store.load().then((state) => { this.state = cloneState(state); });
        await this.ready;
    }
    /** Create or reuse the active Project bound to a Workspace.
     * @param request - project creation request.
     * @returns - the existing or newly created project view.
     */
    async create(request) {
        await this.ready;
        const workspace = this.resolveWorkspace(request.workspaceId, request.createdBy);
        const existing = this.state.projects.find(project => project.workspaceId === workspace.id);
        if (existing !== undefined)
            return this.view(existing.projectId);
        const name = request.name === undefined
            ? nonBlank(basename(workspace.path), 'project name derived from Workspace')
            : nonBlank(request.name, 'project name');
        const projectId = this.idGenerator();
        if (this.state.projects.some(project => project.projectId === projectId))
            throw new Error(`project "${projectId}" already exists`);
        const now = this.clock();
        const project = {
            projectId,
            workspaceId: workspace.id,
            name,
            description: request.description?.trim() ?? '',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        };
        const state = {
            ...this.state,
            projects: [...this.state.projects, project],
            audits: [...this.state.audits, this.audit(project.projectId, 'project-created', request.createdBy, now, { name, workspaceId: workspace.id })],
        };
        await this.commit(state);
        return this.view(project.projectId);
    }
    /** Create a Project-owned Experiment with a Host-generated identity.
     * @param request - Experiment metadata and the creating Session.
     * @returns the created Experiment and its updated Project view.
     */
    async createExperiment(request) {
        await this.ready;
        const project = this.requireProject(request.projectId);
        if (project.status === 'ARCHIVED')
            throw new Error(`project "${request.projectId}" is archived`);
        this.requireSession(request.projectId, request.createdInSessionId);
        const title = nonBlank(request.title, 'experiment title');
        const objective = nonBlank(request.objective, 'experiment objective');
        if (request.operationId !== undefined) {
            const audit = this.state.audits.find(item => item.projectId === request.projectId && item.kind === 'experiment-created' && item.details.operationId === String(request.operationId));
            if (audit !== undefined) {
                const existing = this.state.experiments.find(item => item.experimentId === audit.details.experimentId);
                if (existing === undefined)
                    throw new Error(`operation "${request.operationId}" references a missing Experiment`);
                if (audit.details.title !== title || audit.details.objective !== objective) {
                    throw new Error(`operation "${request.operationId}" was already used with different Experiment metadata`);
                }
                return { experiment: clone(existing), project: this.view(request.projectId), created: false };
            }
        }
        if (request.derivedFromExperimentId !== undefined) {
            const source = this.state.experiments.find(item => item.experimentId === request.derivedFromExperimentId);
            if (source === undefined)
                throw new Error(`unknown experiment "${request.derivedFromExperimentId}"`);
            if (source.projectId !== request.projectId) {
                throw new LabProjectReferenceError(`experiment "${request.derivedFromExperimentId}" belongs to another project`);
            }
        }
        const experimentId = this.experimentIdGenerator();
        if (this.state.experiments.some(item => item.experimentId === experimentId))
            throw new Error(`experiment "${experimentId}" already exists`);
        const now = this.clock();
        const experiment = {
            experimentId,
            projectId: request.projectId,
            title,
            objective,
            status: 'DRAFT',
            createdInSessionId: request.createdInSessionId,
            ...request.derivedFromExperimentId === undefined ? {} : { derivedFromExperimentId: request.derivedFromExperimentId },
            createdAt: now,
            updatedAt: now,
        };
        const link = {
            projectId: request.projectId,
            experimentId,
            sessionId: request.createdInSessionId,
            role: 'created',
            linkedBy: request.createdBy,
            linkedAt: now,
        };
        const state = {
            ...this.state,
            experiments: [...this.state.experiments, experiment],
            experimentSessions: [...this.state.experimentSessions, link],
            audits: [
                ...this.state.audits,
                this.audit(request.projectId, 'experiment-created', request.createdBy, now, { experimentId, title, objective, ...request.operationId === undefined ? {} : { operationId: String(request.operationId) } }),
                this.audit(request.projectId, 'experiment-session-linked', request.createdBy, now, { experimentId, sessionId: request.createdInSessionId, role: 'created' }),
            ],
        };
        await this.commit(state);
        return { experiment: clone(experiment), project: this.view(request.projectId), created: true };
    }
    /** Link a Project Session to an Experiment without crossing Project ownership.
     * @param request - Experiment Session provenance link.
     * @returns the updated Project view.
     */
    async linkExperimentSession(request) {
        await this.ready;
        this.requireProject(request.projectId);
        this.requireSession(request.projectId, request.sessionId);
        const experiment = this.state.experiments.find(item => item.experimentId === request.experimentId);
        if (experiment === undefined)
            throw new Error(`unknown experiment "${request.experimentId}"`);
        if (experiment.projectId !== request.projectId)
            throw new LabProjectReferenceError(`experiment "${request.experimentId}" belongs to another project`);
        const existing = this.state.experimentSessions.find(link => link.experimentId === request.experimentId && link.sessionId === request.sessionId);
        if (existing?.role === request.role)
            return this.view(request.projectId);
        const now = this.clock();
        const link = { ...request, linkedAt: now };
        const state = {
            ...this.state,
            experimentSessions: [...this.state.experimentSessions.filter(item => item !== existing), link],
            audits: [...this.state.audits, this.audit(request.projectId, 'experiment-session-linked', request.linkedBy, now, { experimentId: request.experimentId, sessionId: request.sessionId, role: request.role })],
        };
        await this.commit(state);
        return this.view(request.projectId);
    }
    /** List Project Experiments in creation order.
     * @param projectId - Project whose Experiments are requested.
     * @returns Experiment records owned by the Project.
     */
    async listExperiments(projectId) {
        await this.ready;
        this.requireProject(projectId);
        return this.state.experiments.filter(item => item.projectId === projectId).map(clone);
    }
    /** List active and archived projects in creation order.
     * @returns - project views in creation order.
     */
    async list() {
        await this.ready;
        return this.state.projects.map(project => this.view(project.projectId));
    }
    /** Open one project with its explicit scope and Session rows.
     * @param projectId - project identifier to open.
     * @returns - project view.
     */
    async open(projectId) {
        await this.ready;
        return this.view(projectId);
    }
    /** Replace a project selected source versions and devices.
     * @param projectId - project identifier to update.
     * @param request - replacement scope.
     * @returns - updated project view.
     */
    async updateScope(projectId, request) {
        await this.ready;
        const project = this.requireProject(projectId);
        const sources = uniqueSources(request.sources).map(source => ({
            projectId,
            documentId: source.documentId,
            versionId: source.versionId,
            selectedAt: this.clock(),
            selectedBy: request.selectedBy,
        }));
        const deviceIds = uniqueStrings(request.deviceIds, 'device id');
        const devices = deviceIds.map(deviceId => ({ projectId, deviceId, selectedAt: this.clock(), selectedBy: request.selectedBy }));
        const now = this.clock();
        const state = {
            ...this.state,
            projects: this.state.projects.map(item => item.projectId === projectId ? { ...item, updatedAt: now } : item),
            sources: [...this.state.sources.filter(source => source.projectId !== projectId), ...sources],
            devices: [...this.state.devices.filter(device => device.projectId !== projectId), ...devices],
            audits: [...this.state.audits, this.audit(projectId, 'scope-updated', request.selectedBy, now, {
                    sourceCount: String(sources.length),
                    deviceCount: String(devices.length),
                })],
        };
        await this.commit(state);
        return this.view(project.projectId);
    }
    /** Attach one distinct Harness Session to a project when its Workspace matches.
     * @param request - project/session association request.
     * @returns - attach result or an actionable Workspace mismatch.
     */
    async attachSession(request) {
        await this.ready;
        const project = this.requireProject(request.projectId);
        const projectWorkspace = this.requireWorkspace(project.workspaceId);
        const sessionWorkspace = this.workspaceForSession(request.sessionId);
        if (sessionWorkspace?.id !== projectWorkspace.id) {
            return {
                status: 'conflict',
                code: 'WORKSPACE_MISMATCH',
                projectWorkspaceId: projectWorkspace.id,
                ...sessionWorkspace === undefined ? {} : { sessionWorkspaceId: sessionWorkspace.id },
                action: { kind: 'create-session-in-project-workspace', workspaceId: projectWorkspace.id },
            };
        }
        const existing = this.state.sessions.find(session => session.sessionId === request.sessionId);
        if (existing !== undefined) {
            if (existing.projectId !== request.projectId)
                throw new LabProjectReferenceError(`session "${request.sessionId}" already belongs to another project`);
            return { status: 'attached', project: this.view(request.projectId) };
        }
        const order = this.state.sessions
            .filter(session => session.projectId === request.projectId)
            .reduce((maximum, session) => Math.max(maximum, session.order), -1) + 1;
        const now = this.clock();
        const session = {
            projectId: request.projectId,
            sessionId: request.sessionId,
            title: request.title?.trim() || `Conversation ${order + 1}`,
            order,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        };
        const state = {
            ...this.state,
            sessions: [...this.state.sessions, session],
            audits: [...this.state.audits, this.audit(request.projectId, 'session-attached', request.attachedBy, now, {
                    sessionId: request.sessionId,
                    title: session.title,
                })],
        };
        await this.commit(state);
        return { status: 'attached', project: this.view(request.projectId) };
    }
    /** Detach a Session association without changing the Session log or cwd.
     * @param projectId - project to change.
     * @param sessionId - associated Session to detach.
     * @param detachedBy - actor recorded in the audit log.
     * @returns the updated project view.
     */
    async detachSession(projectId, sessionId, detachedBy) {
        await this.ready;
        this.requireSession(projectId, sessionId);
        const now = this.clock();
        const state = {
            ...this.state,
            sessions: this.state.sessions.filter(session => session.projectId !== projectId || session.sessionId !== sessionId),
            audits: [...this.state.audits, this.audit(projectId, 'session-detached', detachedBy, now, { sessionId })],
        };
        await this.commit(state);
        return this.view(projectId);
    }
    /** Archive a Project while retaining all associated Session logs and records.
     * @param projectId - project to archive.
     * @param archivedBy - actor recorded in the audit log.
     * @returns the archived project view.
     */
    async archive(projectId, archivedBy) {
        await this.ready;
        const project = this.requireProject(projectId);
        if (project.status === 'ARCHIVED')
            return this.view(projectId);
        const now = this.clock();
        const state = {
            ...this.state,
            projects: this.state.projects.map(item => item.projectId === projectId ? { ...item, status: 'ARCHIVED', updatedAt: now } : item),
            audits: [...this.state.audits, this.audit(projectId, 'project-archived', archivedBy, now, {})],
        };
        await this.commit(state);
        return this.view(projectId);
    }
    /** Rename a project Session without changing Harness Session messages.
     * @param projectId - project identifier.
     * @param sessionId - associated Session identifier.
     * @param title - new non-blank title.
     * @param renamedBy - Session recording the rename.
     * @returns - updated project view.
     */
    async renameSession(projectId, sessionId, title, renamedBy) {
        await this.ready;
        this.requireSession(projectId, sessionId);
        const nextTitle = nonBlank(title, 'session title');
        const now = this.clock();
        const state = {
            ...this.state,
            sessions: this.state.sessions.map(session => session.projectId === projectId && session.sessionId === sessionId
                ? { ...session, title: nextTitle, updatedAt: now }
                : session),
            audits: [...this.state.audits, this.audit(projectId, 'session-renamed', renamedBy, now, { sessionId, title: nextTitle })],
        };
        await this.commit(state);
        return this.view(projectId);
    }
    /** Return explicit project scope and approved shared facts for a Session.
     * @param projectId - project identifier.
     * @param sessionId - optional associated Session identifier.
     * @returns - project context for the Session.
     */
    async context(projectId, sessionId) {
        await this.ready;
        if (sessionId !== undefined)
            this.requireSession(projectId, sessionId);
        this.requireProject(projectId);
        return {
            projectId,
            ...sessionId === undefined ? {} : { sessionId },
            sources: this.state.sources.filter(source => source.projectId === projectId).map(clone),
            devices: this.state.devices.filter(device => device.projectId === projectId).map(clone),
            sharedFacts: this.state.facts.filter(fact => fact.projectId === projectId).map(clone),
        };
    }
    /** Publish one explicitly approved fact for later Sessions.
     * @param request - project fact publication request.
     * @returns - updated project view.
     */
    async publishFact(request) {
        await this.ready;
        this.requireProject(request.projectId);
        if (request.sourceSessionId !== undefined)
            this.requireSession(request.projectId, request.sourceSessionId);
        if (this.state.facts.some(fact => fact.factId === request.factId))
            throw new Error(`project fact "${request.factId}" already exists`);
        const content = nonBlank(request.content, 'project fact');
        const citationIds = uniqueStrings(request.citationIds, 'citation id');
        const now = this.clock();
        const fact = {
            factId: request.factId,
            projectId: request.projectId,
            content,
            citationIds,
            ...request.sourceSessionId === undefined ? {} : { sourceSessionId: request.sourceSessionId },
            approvedBy: nonBlank(request.approvedBy, 'fact approver'),
            createdAt: now,
        };
        const state = {
            ...this.state,
            facts: [...this.state.facts, fact],
            audits: [...this.state.audits, this.audit(request.projectId, 'fact-published', request.publishedBy, now, {
                    factId: request.factId,
                    citationCount: String(citationIds.length),
                })],
        };
        await this.commit(state);
        return this.view(request.projectId);
    }
    /** Project one proposal, approval, run or report into the rebuildable cache.
     * @param projection - rebuildable project evidence projection.
     * @returns - updated project view.
     */
    async projectEvidence(projection) {
        await this.ready;
        this.requireProject(projection.projectId);
        this.requireSession(projection.projectId, projection.sessionId);
        const key = evidenceKey(projection);
        const now = this.clock();
        const state = {
            ...this.state,
            evidence: [...this.state.evidence.filter(item => evidenceKey(item) !== key), clone(projection)],
            audits: [...this.state.audits, this.audit(projection.projectId, 'evidence-projected', projection.sessionId, now, {
                    kind: projection.kind,
                    referenceId: projection.referenceId,
                    status: projection.status,
                })],
        };
        await this.commit(state);
        return this.view(projection.projectId);
    }
    /** Read audit records for recovery and diagnostics.
     * @param projectId - project identifier.
     * @returns - project audit records.
     */
    async listAudits(projectId) {
        await this.ready;
        this.requireProject(projectId);
        return this.state.audits.filter(audit => audit.projectId === projectId).map(clone);
    }
    /** Return the project owning a Session, when the Session has been associated.
     * @param sessionId - Session identifier to resolve.
     * @returns - owning project, when the Session is associated.
     */
    async projectForSession(sessionId) {
        await this.ready;
        const association = this.state.sessions.find(session => session.sessionId === sessionId);
        if (association === undefined)
            return undefined;
        return clone(this.requireProject(association.projectId));
    }
    /** Assert that a Session is explicitly associated with a project.
     * @param projectId - expected project identifier.
     * @param sessionId - Session identifier to check.
     */
    async assertSession(projectId, sessionId) {
        await this.ready;
        this.requireSession(projectId, sessionId);
    }
    requireProject(projectId) {
        const project = this.state.projects.find(item => item.projectId === projectId);
        if (project === undefined)
            throw new Error(`unknown project "${projectId}"`);
        return project;
    }
    requireWorkspace(workspaceId) {
        const registry = this.workspaceRegistry();
        const workspace = registry.get(workspaceId);
        if (workspace === undefined)
            throw new Error(`unknown workspace "${workspaceId}"`);
        return workspace;
    }
    resolveWorkspace(workspaceId, sessionId) {
        if (workspaceId !== undefined)
            return this.requireWorkspace(workspaceId);
        const workspace = this.workspaceForSession(sessionId);
        if (workspace === undefined)
            throw new Error(`a registered workspace is required for Session "${sessionId}"`);
        return workspace;
    }
    workspaceForSession(sessionId) {
        return this.workspaceRegistry().list().find(workspace => workspace.sessionIds.includes(sessionId));
    }
    workspaceRegistry() {
        const registry = this.ctx.get('workspaceRegistry');
        if (registry === undefined)
            throw new Error('workspace registry is unavailable');
        return registry;
    }
    requireSession(projectId, sessionId) {
        const session = this.state.sessions.find(item => item.sessionId === sessionId);
        if (session === undefined)
            throw new Error(`session "${sessionId}" is not associated with a project`);
        if (session.projectId !== projectId)
            throw new LabProjectReferenceError(`session "${sessionId}" belongs to another project`);
        return session;
    }
    view(projectId) {
        const project = this.requireProject(projectId);
        return {
            project: clone(project),
            sources: this.state.sources.filter(source => source.projectId === projectId).map(clone),
            devices: this.state.devices.filter(device => device.projectId === projectId).map(clone),
            sessions: this.state.sessions
                .filter(session => session.projectId === projectId)
                .sort((left, right) => left.order - right.order)
                .map(clone),
            sharedFacts: this.state.facts.filter(fact => fact.projectId === projectId).map(clone),
            evidence: this.state.evidence.filter(item => item.projectId === projectId).map(clone),
            experiments: this.state.experiments.filter(experiment => experiment.projectId === projectId).map(clone),
            experimentSessions: this.state.experimentSessions.filter(link => link.projectId === projectId).map(clone),
        };
    }
    audit(projectId, kind, sessionId, at, details) {
        const suffix = this.state.audits.filter(audit => audit.projectId === projectId).length + 1;
        return { auditId: brandId(`${projectId}:audit:${suffix}`), projectId, kind, sessionId, at, details: { ...details } };
    }
    async commit(state) {
        const next = cloneState(state);
        await this.store.save(next);
        this.state = next;
    }
}
/** In-memory project store for keyless tests. */
export class InMemoryLabProjectStore {
    state = emptyProjectState('runtime');
    /** Load a detached state snapshot. */
    load() { return Promise.resolve(cloneState(this.state)); }
    /** Save a detached state snapshot. */
    save(state) { this.state = cloneState(state); return Promise.resolve(); }
}
/** Storage Domain backed project store. */
export class DomainLabProjectStore {
    domain;
    constructor(domain) {
        this.domain = domain;
    }
    /** Load the global project state from Storage/SQLite. */
    load() { return Promise.resolve(decodeState(this.domain.global.get())); }
    /** Replace the global project state durably. */
    save(state) { return this.domain.global.set(encodeState(state)); }
    /** Release the opened domain. */
    dispose() { return this.domain.close(); }
}
/** Cordis plugin name. */
export const name = 'lab-project';
/** The project domain requires the existing Storage Domain facility. */
export const inject = ['storageDomain'];
/** Install the project service and open its Storage Domain. */
export async function apply(ctx) {
    await ctx.plugin(LabProjectService);
    const storageDomain = ctx.get('storageDomain');
    if (storageDomain === undefined)
        throw new Error('lab-project requires storageDomain');
    const domain = await storageDomain.open(labProjectDomainSpec);
    const service = ctx.get('labProjects');
    if (service === undefined)
        throw new Error('lab project service did not install');
    await service.attach(new DomainLabProjectStore(domain));
    ctx.effect(() => () => domain.close(), 'lab-project.domain');
}
function emptyProjectState(_kind) {
    return {
        projects: [], experiments: [], experimentSessions: [], sources: [], devices: [], sessions: [], facts: [], audits: [], evidence: [],
    };
}
function encodeState(state) {
    return {
        projects: state.projects.map(project => ({ ...project })),
        experiments: state.experiments.map(experiment => ({ ...experiment })),
        experimentSessions: state.experimentSessions.map(link => ({ ...link })),
        sources: state.sources.map(source => ({ ...source })),
        devices: state.devices.map(device => ({ ...device })),
        sessions: state.sessions.map(session => ({ ...session })),
        facts: state.facts.map(fact => ({
            ...fact,
            citationIds: [...fact.citationIds],
            ...fact.sourceSessionId === undefined ? {} : { sourceSessionId: fact.sourceSessionId },
        })),
        audits: state.audits.map(audit => ({ ...audit, details: { ...audit.details } })),
        evidence: state.evidence.map(item => ({ ...item })),
    };
}
function decodeState(state) {
    return {
        projects: state.projects.map(project => ({
            ...project,
            projectId: brandId(project.projectId),
            workspaceId: brandId(project.workspaceId),
            status: project.status,
        })),
        experiments: state.experiments.map(experiment => ({
            experimentId: brandId(experiment.experimentId),
            projectId: brandId(experiment.projectId),
            title: experiment.title,
            objective: experiment.objective,
            status: experiment.status,
            createdInSessionId: brandId(experiment.createdInSessionId),
            ...experiment.derivedFromExperimentId === undefined ? {} : { derivedFromExperimentId: brandId(experiment.derivedFromExperimentId) },
            createdAt: experiment.createdAt,
            updatedAt: experiment.updatedAt,
        })),
        experimentSessions: state.experimentSessions.map(link => ({
            ...link,
            projectId: brandId(link.projectId),
            experimentId: brandId(link.experimentId),
            sessionId: brandId(link.sessionId),
            linkedBy: brandId(link.linkedBy),
        })),
        sources: state.sources.map(source => ({
            ...source,
            projectId: brandId(source.projectId),
            documentId: brandId(source.documentId),
            versionId: brandId(source.versionId),
            selectedBy: brandId(source.selectedBy),
        })),
        devices: state.devices.map(device => ({
            ...device,
            projectId: brandId(device.projectId),
            deviceId: brandId(device.deviceId),
            selectedBy: brandId(device.selectedBy),
        })),
        sessions: state.sessions.map(session => ({
            ...session,
            projectId: brandId(session.projectId),
            sessionId: brandId(session.sessionId),
            status: session.status,
        })),
        facts: state.facts.map((fact) => {
            const sourceSessionId = fact.sourceSessionId;
            return {
                factId: brandId(fact.factId),
                projectId: brandId(fact.projectId),
                content: fact.content,
                citationIds: fact.citationIds.map(citationId => brandId(citationId)),
                ...(sourceSessionId === undefined ? {} : { sourceSessionId: brandId(sourceSessionId) }),
                approvedBy: fact.approvedBy,
                createdAt: fact.createdAt,
            };
        }),
        audits: state.audits.map(audit => ({ ...audit, auditId: brandId(audit.auditId), projectId: brandId(audit.projectId), sessionId: brandId(audit.sessionId), details: { ...audit.details } })),
        evidence: state.evidence.map(item => ({ ...item, projectId: brandId(item.projectId), sessionId: brandId(item.sessionId), experimentId: brandId(item.experimentId) })),
    };
}
function clone(value) { return structuredClone(value); }
function cloneState(state) { return clone(state); }
function nonBlank(value, label) {
    if (value.trim().length === 0)
        throw new Error(`${label} must be non-blank`);
    return value.trim();
}
function uniqueStrings(values, label) {
    const result = values.map(value => nonBlank(value, label));
    if (new Set(result).size !== result.length)
        throw new Error(`${label}s must be unique`);
    return result;
}
function uniqueSources(values) {
    const result = values.map(source => ({
        documentId: nonBlank(source.documentId, 'document id'),
        versionId: nonBlank(source.versionId, 'version id'),
    }));
    const keys = result.map(source => `${source.documentId}:${source.versionId}`);
    if (new Set(keys).size !== keys.length)
        throw new Error('project source selections must be unique');
    return result;
}
function evidenceKey(projection) {
    return `${projection.projectId}:${projection.kind}:${projection.referenceId}`;
}
export default LabProjectService;
export * from "./knowledge.js";
//# sourceMappingURL=index.js.map