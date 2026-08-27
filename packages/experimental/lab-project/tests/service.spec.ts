import { Context } from '@deepseek-ai/cordis'
import { brandId, rebuildProjectEvidence } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { FakeLabKnowledgeConsumer, InMemoryLabProjectStore, LabProjectService } from '../src/index.ts'

const projectId = (value: string) => brandId<'LabProjectId'>(value)
const sessionId = (value: string) => brandId<'SessionId'>(value)
const documentId = (value: string) => brandId<'KnowledgeDocumentId'>(value)
const versionId = (value: string) => brandId<'KnowledgeDocumentVersionId'>(value)
const deviceId = (value: string) => brandId<'DeviceId'>(value)
const factId = (value: string) => brandId<'LabProjectFactId'>(value)
const citationId = (value: string) => brandId<'CitationId'>(value)

describe('LabProjectService', () => {
  it('isolates project scope while sharing explicitly published facts', async () => {
    const service = new LabProjectService(new Context(), () => 100)
    const firstProject = projectId('project-1')
    const secondProject = projectId('project-2')
    const firstSession = sessionId('session-1')
    const secondSession = sessionId('session-2')

    await service.create({ projectId: firstProject, name: 'First project', createdBy: firstSession })
    await service.create({ projectId: secondProject, name: 'Second project', createdBy: secondSession })
    await service.updateScope(firstProject, {
      sources: [{ documentId: documentId('doc-1'), versionId: versionId('version-1') }],
      deviceIds: [deviceId('device-1')],
      selectedBy: firstSession,
    })
    await service.associateSession({ projectId: firstProject, sessionId: firstSession, associatedBy: firstSession })
    await service.associateSession({ projectId: firstProject, sessionId: secondSession, associatedBy: firstSession })
    await service.publishFact({
      factId: factId('fact-1'),
      projectId: firstProject,
      content: 'The calibration was approved.',
      citationIds: [citationId('citation-1')],
      sourceSessionId: firstSession,
      approvedBy: 'reviewer',
      publishedBy: firstSession,
    })

    await expect(service.context(firstProject, secondSession)).resolves.toMatchObject({
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
    const service = new LabProjectService(new Context(), () => 200)
    const project = projectId('project-audit')
    const session = sessionId('session-audit')
    await service.create({ projectId: project, name: 'Audit project', createdBy: session })
    await service.associateSession({ projectId: project, sessionId: session, title: 'Planning', associatedBy: session })
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
    const first = new LabProjectService(new Context(), () => 300)
    await first.attach(store)
    await first.create({ projectId: project, name: 'Persisted project', createdBy: session })
    const second = new LabProjectService(new Context(), () => 301)
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
})
