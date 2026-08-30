import { describe, expect, it } from 'vitest'
import { LAB_FIXTURE_IDS, createLabFixtureAdapter, parseLabFixtureEvents, serializeLabFixtureEvents } from '../src/client/index.ts'

describe('deterministic Lab fixture adapter', () => {
  it('covers the four Agent lifecycle scenarios with fixed Host-style records', async () => {
    for (const scenario of ['success', 'waiting', 'failed', 'replan'] as const) {
      const adapter = createLabFixtureAdapter(scenario)
      const run = await adapter.openRun(LAB_FIXTURE_IDS.runId)
      expect(run.state).toBe('ready')
      if (run.state === 'ready') {
        expect(run.value.runId).toBe(LAB_FIXTURE_IDS.runId)
        expect(run.value.planId).toBe(LAB_FIXTURE_IDS.planId)
      }
      expect(adapter.events.some(event => event.kind === 'goal')).toBe(true)
      expect(adapter.events.some(event => event.kind === 'execution')).toBe(true)
      expect(adapter.events.some(event => event.kind === 'result-assessment')).toBe(true)
      if (scenario === 'replan') expect(adapter.events.some(event => event.kind === 'replan')).toBe(true)
      if (scenario === 'success' || scenario === 'failed') expect(adapter.events.some(event => event.kind === 'report')).toBe(true)
    }
  })

  it('returns stable action results without advancing the fixture or generating IDs', async () => {
    const adapter = createLabFixtureAdapter('success')
    const before = await adapter.openRun(LAB_FIXTURE_IDS.runId)
    await adapter.startRun({ experimentId: LAB_FIXTURE_IDS.experimentId, planId: LAB_FIXTURE_IDS.planId })
    await adapter.confirmStep({ runId: LAB_FIXTURE_IDS.runId, evidence: ['evidence-fixture'], confirmedBy: 'user-fixture' })
    await adapter.stopRun({ runId: LAB_FIXTURE_IDS.runId, requestedBy: 'user-fixture' })
    await adapter.retryRun({ runId: LAB_FIXTURE_IDS.runId, actor: 'user-fixture' })
    const after = await adapter.openRun(LAB_FIXTURE_IDS.runId)
    expect(after).toEqual(before)
    expect(adapter.events).toEqual(createLabFixtureAdapter('success').events)
    expect(JSON.stringify(after)).not.toContain('generated')
  })

  it('keeps assessment as a fixed Host record instead of calculating a verdict', async () => {
    const adapter = createLabFixtureAdapter('failed')
    const assessment = await adapter.getResultAssessment(LAB_FIXTURE_IDS.runId)
    expect(assessment.state).toBe('ready')
    if (assessment.state === 'ready') {
      expect(assessment.value.method).toBe('fixture-record')
      expect(assessment.value.verdict).toBe('FAIL')
    }
  })

  it('round-trips the deterministic lifecycle transcript and rejects malformed JSON', () => {
    const adapter = createLabFixtureAdapter('replan')
    const serialized = serializeLabFixtureEvents(adapter.events)
    const restored = parseLabFixtureEvents(serialized)
    expect(restored).toEqual(adapter.events)
    expect(restored.map(event => event.kind)).toEqual(adapter.events.map(event => event.kind))
    expect(() => parseLabFixtureEvents('null')).toThrow('Invalid fixture lifecycle transcript')
  })

  it('preserves one Experiment across its linked Sessions and locks its reviewed revisions', async () => {
    const adapter = createLabFixtureAdapter('success')
    const project = await adapter.openProject(LAB_FIXTURE_IDS.projectId)
    const workflow = await adapter.getWorkflow(LAB_FIXTURE_IDS.experimentId)
    const skill = await adapter.listSkillRevisions(LAB_FIXTURE_IDS.experimentId)
    expect(project).toMatchObject({ state: 'ready', value: { experimentSessions: [{ experimentId: LAB_FIXTURE_IDS.experimentId, role: 'created' }] } })
    expect(workflow).toMatchObject({ state: 'ready', value: { status: 'LOCKED', revision: 1 } })
    expect(skill).toMatchObject({ state: 'ready', value: [{ revisionId: LAB_FIXTURE_IDS.revisionId, status: 'ACTIVE' }] })

    await adapter.approvePlan({ experimentId: LAB_FIXTURE_IDS.experimentId, planId: LAB_FIXTURE_IDS.planId, approvedBy: 'user-fixture' })
    await adapter.activateSkill(LAB_FIXTURE_IDS.revisionId)
    expect(await adapter.getWorkflow(LAB_FIXTURE_IDS.experimentId)).toEqual(workflow)
    expect(await adapter.listSkillRevisions(LAB_FIXTURE_IDS.experimentId)).toEqual(skill)
  })

  it('composes Project-scoped Knowledge and device records without a Session', async () => {
    const adapter = createLabFixtureAdapter('success')
    const withoutProject = await adapter.getKnowledgeScope()
    const projectScope = await adapter.getKnowledgeScope(LAB_FIXTURE_IDS.projectId)
    const wrongProject = await adapter.getKnowledgeScope('project-other')

    expect(withoutProject).toMatchObject({ state: 'ready', value: { capability: { state: 'available' } } })
    expect(projectScope).toMatchObject({ state: 'ready', value: { sources: [{ documentId: LAB_FIXTURE_IDS.documentId, versionId: LAB_FIXTURE_IDS.versionId }] } })
    expect(wrongProject).toMatchObject({ state: 'empty', code: 'NO_RECORDS' })

    const project = await adapter.openProject(LAB_FIXTURE_IDS.projectId)
    expect(project).toMatchObject({ state: 'ready', value: { devices: [{ deviceId: 'device-fixture' }] } })
    const failedRun = await createLabFixtureAdapter('failed').openRun(LAB_FIXTURE_IDS.runId)
    expect(failedRun).toMatchObject({ state: 'ready', value: { runStatus: 'FAILED' } })
  })
})
