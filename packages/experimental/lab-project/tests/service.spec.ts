import { Context } from '@deepseek-ai/cordis'
import { brandId, rebuildProjectEvidence } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { FakeLabKnowledgeConsumer, InMemoryLabProjectStore, LabProjectService, labProjectDomainSpec } from '../src/index.ts'

const projectId = (value: string) => brandId<'LabProjectId'>(value)
const workspaceId = (value: string) => brandId<'WorkspaceId'>(value)
const sessionId = (value: string) => brandId<'SessionId'>(value)
const documentId = (value: string) => brandId<'KnowledgeDocumentId'>(value)
const versionId = (value: string) => brandId<'KnowledgeDocumentVersionId'>(value)
const deviceId = (value: string) => brandId<'DeviceId'>(value)
const factId = (value: string) => brandId<'LabProjectFactId'>(value)
const citationId = (value: string) => brandId<'CitationId'>(value)

function workspace(id: string, path = `/workspace/${id}`) {
  return { id: workspaceId(id), path, sessionIds: [] as ReturnType<typeof sessionId>[] }
}

function installWorkspaces(ctx: Context, items: ReturnType<typeof workspace>[]) {
  ctx.provide('workspaceRegistry', {
    get: (id: ReturnType<typeof workspaceId>) => items.find(item => item.id === id),
    list: () => items,
  })
}

describe('LabProjectService', () => {
  it('uses durable Project schema version 2 and rejects records without Workspace ownership', () => {
    expect(labProjectDomainSpec.version).toBe(2)
    expect(() => labProjectDomainSpec.global?.schema.parse({
      projects: [{ projectId: 'legacy', name: 'Legacy', description: '', status: 'ACTIVE', createdAt: 1, updatedAt: 1 }],
      sources: [], devices: [], sessions: [], facts: [], audits: [], evidence: [],
    })).toThrow()
  })

  it('isolates project scope while sharing explicitly published facts', async () => {
    const ctx = new Context()
    const firstWorkspace = workspace('workspace-1')
    const secondWorkspace = workspace('workspace-2')
    installWorkspaces(ctx, [firstWorkspace, secondWorkspace])
    let nextProject = 0
    const service = new LabProjectService(ctx, {
      clock: () => 100,
      idGenerator: () => projectId(`project-${++nextProject}`),
    })
    const firstProject = projectId('project-1')
    const secondProject = projectId('project-2')
    const firstSession = sessionId('session-1')
    const sameWorkspaceSession = sessionId('session-1b')
    const secondSession = sessionId('session-2')

    firstWorkspace.sessionIds = [firstSession, sameWorkspaceSession]
    secondWorkspace.sessionIds = [secondSession]
    const firstCreated = await service.create({ workspaceId: firstWorkspace.id, name: 'First project', createdBy: firstSession })
    const secondCreated = await service.create({ workspaceId: secondWorkspace.id, name: 'Second project', createdBy: secondSession })
    expect(firstCreated.project.projectId).toBe(firstProject)
    expect(secondCreated.project.projectId).toBe(secondProject)
    await service.updateScope(firstProject, {
      sources: [{ documentId: documentId('doc-1'), versionId: versionId('version-1') }],
      deviceIds: [deviceId('device-1')],
      selectedBy: firstSession,
    })
    await expect(service.attachSession({ projectId: firstProject, sessionId: firstSession, attachedBy: firstSession })).resolves.toMatchObject({ status: 'attached' })
    await expect(service.attachSession({ projectId: firstProject, sessionId: sameWorkspaceSession, attachedBy: firstSession })).resolves.toMatchObject({ status: 'attached' })
    await expect(service.attachSession({
      projectId: firstProject,
      sessionId: secondSession,
      attachedBy: firstSession,
    })).resolves.toMatchObject({
      status: 'conflict', code: 'WORKSPACE_MISMATCH', projectWorkspaceId: firstWorkspace.id, sessionWorkspaceId: secondWorkspace.id,
    })
    await service.publishFact({
      factId: factId('fact-1'),
      projectId: firstProject,
      content: 'The calibration was approved.',
      citationIds: [citationId('citation-1')],
      sourceSessionId: firstSession,
      approvedBy: 'reviewer',
      publishedBy: firstSession,
    })

    await expect(service.context(firstProject, sameWorkspaceSession)).resolves.toMatchObject({
      projectId: firstProject,
      sources: [{ documentId: 'doc-1', versionId: 'version-1' }],
      devices: [{ deviceId: 'device-1' }],
      sharedFacts: [{ factId: 'fact-1', sourceSessionId: firstSession }],
    })
    await expect(service.context(secondProject)).resolves.toMatchObject({
      projectId: secondProject,
      sources: [],
      devices: [],
      sharedFacts: [],
    })
    await expect(service.context(firstProject, sessionId('unassociated'))).rejects.toThrow(/not associated/)
  })

  it('records auditable Session associations and rebuildable evidence projections', async () => {
    const ctx = new Context()
    const projectWorkspace = workspace('workspace-a')
    projectWorkspace.sessionIds = [sessionId('session-audit')]
    installWorkspaces(ctx, [projectWorkspace])
    const service = new LabProjectService(ctx, { clock: () => 200, idGenerator: () => projectId('project-audit') })
    const project = projectId('project-audit')
    const session = sessionId('session-audit')
    await service.create({ workspaceId: projectWorkspace.id, name: 'Audit project', createdBy: session })
    await service.attachSession({ projectId: project, sessionId: session, title: 'Planning', attachedBy: session })
    await service.renameSession(project, session, 'Approved planning', session)
    await service.projectEvidence({
      version: 1,
      projectId: project,
      sessionId: session,
      experimentId: brandId<'ExperimentId'>('experiment-1'),
      kind: 'plan-approval',
      referenceId: 'plan-1',
      status: 'APPROVED',
      updatedAt: 200,
    })

    await expect(service.open(project)).resolves.toMatchObject({
      sessions: [{ sessionId: session, title: 'Approved planning' }],
      evidence: [{ kind: 'plan-approval', referenceId: 'plan-1', status: 'APPROVED' }],
    })
    await expect(service.listAudits(project)).resolves.toHaveLength(4)
    await expect(service.projectEvidence({
      version: 1,
      projectId: project,
      sessionId: session,
      experimentId: brandId<'ExperimentId'>('experiment-1'),
      kind: 'plan-approval',
      referenceId: 'plan-1',
      status: 'SUPERSEDED',
      updatedAt: 201,
    })).resolves.toMatchObject({ evidence: [{ status: 'SUPERSEDED' }] })
  })

  it('rebuilds the latest project evidence projection from Session events', () => {
    const project = projectId('project-replay')
    const session = sessionId('session-replay')
    const first = {
      version: 1 as const,
      projectId: project,
      sessionId: session,
      experimentId: brandId<'ExperimentId'>('experiment-1'),
      kind: 'run' as const,
      referenceId: 'run-1',
      status: 'RUNNING',
      updatedAt: 100,
    }
    const second = { ...first, status: 'COMPLETED', updatedAt: 101 }
    const events: readonly SessionEvent[] = [
      { type: 'lab/project/evidence/projected', seq: 0, time: 100, data: { version: 1, projection: first }, ignorable: true },
      { type: 'lab/project/evidence/projected', seq: 1, time: 101, data: { version: 1, projection: second }, ignorable: true },
    ]

    expect(rebuildProjectEvidence(events, project)).toMatchObject([{ referenceId: 'run-1', status: 'COMPLETED', updatedAt: 101 }])
  })

  it('persists detached project state through a replaceable store', async () => {
    const store = new InMemoryLabProjectStore()
    const project = projectId('project-persisted')
    const session = sessionId('session-persisted')
    const ctx = new Context()
    const projectWorkspace = workspace('workspace-persisted')
    projectWorkspace.sessionIds = [session]
    installWorkspaces(ctx, [projectWorkspace])
    const first = new LabProjectService(ctx, { clock: () => 300, idGenerator: () => projectId('project-persisted') })
    await first.attach(store)
    await first.create({ workspaceId: projectWorkspace.id, name: 'Persisted project', createdBy: session })
    const secondContext = new Context()
    installWorkspaces(secondContext, [projectWorkspace])
    const second = new LabProjectService(secondContext, { clock: () => 301 })
    await second.attach(store)
    await expect(second.open(project)).resolves.toMatchObject({ project: { name: 'Persisted project' } })
  })
  it('does not return Knowledge records while its capability is unavailable', async () => {
    const consumer = new FakeLabKnowledgeConsumer({
      capability: { state: 'unavailable', reason: 'parallel Knowledge workspace is loading' },
    })
    await expect(consumer.listImportStatuses()).resolves.toEqual([])
    await expect(consumer.search({ query: 'calibration' })).resolves.toEqual([])
    await expect(consumer.listConflicts()).resolves.toEqual([])
    await expect(consumer.listPublishedSops?.()).resolves.toEqual([])
  })

  it('generates Project IDs, requires a registered Workspace, and archives without touching Session associations', async () => {
    const ctx = new Context()
    const target = workspace('workspace-archive')
    const session = sessionId('session-archive')
    target.sessionIds = [session]
    installWorkspaces(ctx, [target])
    const service = new LabProjectService(ctx, { clock: () => 400, idGenerator: () => projectId('generated-archive') })

    await expect(service.create({ workspaceId: workspaceId('missing'), name: 'Missing', createdBy: session })).rejects.toThrow(/workspace/)
    const created = await service.create({ workspaceId: target.id, name: 'Archive me', createdBy: session })
    await service.attachSession({ projectId: created.project.projectId, sessionId: session, attachedBy: session })
    await expect(service.archive(created.project.projectId, session)).resolves.toMatchObject({ project: { status: 'ARCHIVED' } })
    await expect(service.open(created.project.projectId)).resolves.toMatchObject({
      project: { status: 'ARCHIVED' }, sessions: [{ sessionId: session, status: 'ACTIVE' }],
    })
    await expect(service.detachSession(created.project.projectId, session, session)).resolves.toMatchObject({ sessions: [] })
  })

  it('creates Host-owned Experiments and records cross-Session provenance inside one Project', async () => {
    const ctx = new Context()
    const target = workspace('workspace-experiment')
    const otherWorkspace = workspace('workspace-experiment-other')
    const creator = sessionId('session-experiment-creator')
    const reviewer = sessionId('session-experiment-reviewer')
    const otherSession = sessionId('session-experiment-other')
    target.sessionIds = [creator, reviewer]
    otherWorkspace.sessionIds = [otherSession]
    installWorkspaces(ctx, [target, otherWorkspace])
    let nextProject = 0
    let nextExperiment = 0
    const service = new LabProjectService(ctx, {
      clock: () => 500,
      idGenerator: () => projectId(`project-experiment-${++nextProject}`),
      experimentIdGenerator: () => brandId<'ExperimentId'>(`experiment-${++nextExperiment}`),
    })

    const project = await service.create({ workspaceId: target.id, name: 'Experiment project', createdBy: creator })
    await service.attachSession({ projectId: project.project.projectId, sessionId: creator, attachedBy: creator })
    await service.attachSession({ projectId: project.project.projectId, sessionId: reviewer, attachedBy: creator })
    const experiment = await service.createExperiment({
      projectId: project.project.projectId,
      title: 'Calibration run',
      objective: 'Calibrate the bench',
      createdInSessionId: creator,
      createdBy: creator,
    })
    await service.linkExperimentSession({
      projectId: project.project.projectId,
      experimentId: experiment.experiment.experimentId,
      sessionId: reviewer,
      role: 'reviewed',
      linkedBy: reviewer,
    })
    const derived = await service.createExperiment({
      projectId: project.project.projectId,
      title: 'Follow-up calibration',
      objective: 'Continue the calibration',
      createdInSessionId: reviewer,
      createdBy: reviewer,
      derivedFromExperimentId: experiment.experiment.experimentId,
    })
    await service.linkExperimentSession({
      projectId: project.project.projectId,
      experimentId: derived.experiment.experimentId,
      sessionId: creator,
      role: 'continued',
      linkedBy: creator,
    })

    const otherProject = await service.create({ workspaceId: otherWorkspace.id, name: 'Other project', createdBy: otherSession })
    await service.attachSession({ projectId: otherProject.project.projectId, sessionId: otherSession, attachedBy: otherSession })
    await expect(service.createExperiment({
      projectId: otherProject.project.projectId,
      title: 'Invalid cross-project derivation',
      objective: 'Must be rejected',
      createdInSessionId: otherSession,
      createdBy: otherSession,
      derivedFromExperimentId: experiment.experiment.experimentId,
    })).rejects.toThrow(/belongs to another project/)

    await expect(service.listExperiments(project.project.projectId)).resolves.toMatchObject([
      { experimentId: 'experiment-1', projectId: project.project.projectId, title: 'Calibration run' },
      { experimentId: 'experiment-2', projectId: project.project.projectId, title: 'Follow-up calibration', derivedFromExperimentId: 'experiment-1' },
    ])
    await expect(service.open(project.project.projectId)).resolves.toMatchObject({
      experiments: expect.arrayContaining([
        expect.objectContaining({ experimentId: 'experiment-1' }),
        expect.objectContaining({ experimentId: 'experiment-2', derivedFromExperimentId: 'experiment-1' }),
      ]) as unknown,
      experimentSessions: expect.arrayContaining([
        expect.objectContaining({ experimentId: 'experiment-1', sessionId: creator, role: 'created' }),
        expect.objectContaining({ experimentId: 'experiment-1', sessionId: reviewer, role: 'reviewed' }),
        expect.objectContaining({ experimentId: 'experiment-2', sessionId: creator, role: 'continued' }),
      ]) as unknown,
    })
  })
})
