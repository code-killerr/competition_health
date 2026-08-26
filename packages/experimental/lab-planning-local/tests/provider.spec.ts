import { describe, expect, it } from 'vitest'
import { brandId, type ExperimentPlan, type ExperimentRequest, type KnowledgeConflict, type KnowledgeSearchResult } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { LabDeviceService, DeviceView } from '@deepseek-ai/dsh-experimental-lab-device'
import type { KnowledgeService } from '@deepseek-ai/dsh-experimental-lab-knowledge'
import type { LabSkillService } from '@deepseek-ai/dsh-experimental-lab-skill'
import { LocalLabPlanningProvider } from '../src/index.ts'

describe('LocalLabPlanningProvider', () => {
  it('assembles cited context, reports conflicts, and keeps proposed skills non-active', async () => {
    const citation: KnowledgeSearchResult = {
      citationId: brandId<'CitationId'>('citation-1'),
      documentId: brandId<'KnowledgeDocumentId'>('document-1'),
      versionId: brandId<'KnowledgeDocumentVersionId'>('version-1'),
      location: 'row:2',
      excerpt: 'dispense sample',
      confirmed: true,
      conflicted: false,
      score: 0.9,
    }
    const conflict: KnowledgeConflict = {
      conflictId: brandId<'KnowledgeConflictId'>('conflict-1'),
      citationIds: [citation.citationId],
      summary: 'requires review',
      status: 'OPEN',
    }
    const devices: readonly DeviceView[] = [{
      id: brandId<'DeviceId'>('device-1'),
      name: 'mock dispenser',
      capabilities: [{ name: 'dispense', parameters: { volume: 'uL' } }],
      healthy: true,
      reserved: false,
    }]
    const knowledge = {
      search: async (_request: unknown) => [citation],
      listConflicts: async (_experimentId: unknown) => [conflict],
    } as unknown as KnowledgeService
    const skills = {
      createDraft: async (draft: Parameters<LabSkillService['createDraft']>[0]) => ({ ...draft, definitionHash: 'hash-1' }),
    } as unknown as LabSkillService
    const deviceService = { listDevices: () => devices } as unknown as LabDeviceService
    const provider = new LocalLabPlanningProvider(knowledge, skills, deviceService)
    const request = makeRequest()
    const context = await provider.buildContext(request)

    expect(context.queries).toEqual(['map sample', 'volume 10 uL'])
    expect(context.citations).toEqual([citation])
    expect(context.devices).toEqual(devices)
    expect(context.unresolved).toEqual(['knowledge conflict conflict-1: requires review'])

    const result = await provider.propose({ request, plan: makePlan(request), skillDrafts: [makeSkillDraft()] })
    expect(result.skillRevisions).toMatchObject([{ revisionId: 'skill-revision-1', status: 'DRAFT' }])
    expect(result.validation.valid).toBe(false)
    expect(result.validation.issues.map(issue => issue.code)).toEqual(['UNRESOLVED_INFORMATION', 'SKILL_NOT_ACTIVE'])
  })

  it('requires rejected-plan lineage and an incremented revision for replacements', async () => {
    const citation: KnowledgeSearchResult = {
      citationId: brandId<'CitationId'>('citation-1'),
      documentId: brandId<'KnowledgeDocumentId'>('document-1'),
      versionId: brandId<'KnowledgeDocumentVersionId'>('version-1'),
      location: 'row:2',
      excerpt: 'dispense sample',
      confirmed: true,
      conflicted: false,
      score: 0.9,
    }
    const knowledge = {
      search: async (_request: unknown) => [citation],
      listConflicts: async (_experimentId: unknown) => [],
    } as unknown as KnowledgeService
    const skills = {
      createDraft: async (draft: Parameters<LabSkillService['createDraft']>[0]) => ({ ...draft, definitionHash: 'hash-1' }),
    } as unknown as LabSkillService
    const provider = new LocalLabPlanningProvider(knowledge, skills, { listDevices: () => [] } as unknown as LabDeviceService)
    const request = makeRequest()
    await provider.propose({ request, plan: makePlan(request), skillDrafts: [makeSkillDraft()] })
    await provider.rejectPlan(brandId<'PlanId'>('plan-1'), 'missing reviewer confirmation')

    const replacement = makePlan(request)
    const replacementSkill = makeSkillDraft()
    const replacementPlan: ExperimentPlan = {
      ...replacement,
      planId: brandId<'PlanId'>('plan-2'),
      revision: 2,
      supersedesPlanId: brandId<'PlanId'>('plan-1'),
      steps: replacement.steps.map(step => ({ ...step, skillRevisionId: brandId<'SkillRevisionId'>('skill-revision-2') })),
    }
    await expect(provider.propose({ request, plan: replacementPlan, skillDrafts: [{ ...replacementSkill, skillId: brandId<'LabSkillId'>('skill-2'), revisionId: brandId<'SkillRevisionId'>('skill-revision-2') }] })).resolves.toMatchObject({
      plan: { planId: 'plan-2', revision: 2, supersedesPlanId: 'plan-1' },
    })
  })
})

function makeRequest(): ExperimentRequest {
  return {
    experimentId: brandId<'ExperimentId'>('experiment-1'),
    objective: 'map sample',
    samples: [{ name: 'sample', attributes: { species: 'mouse' } }],
    constraints: [{ name: 'volume', value: 'volume 10 uL', citations: [] }],
    expectedOutputs: ['mapped result'],
    unresolved: [],
  }
}

function makePlan(request: ExperimentRequest): ExperimentPlan {
  return {
    planId: brandId<'PlanId'>('plan-1'),
    experimentId: request.experimentId,
    revision: 1,
    status: 'DRAFT',
    objective: request.objective,
    citations: [brandId<'CitationId'>('citation-1')],
    assumptions: [],
    unresolved: [],
    steps: [{
      stepId: brandId<'PlanStepId'>('step-1'),
      title: 'dispense sample',
      dependencies: [],
      skillRevisionId: brandId<'SkillRevisionId'>('skill-revision-1'),
      operationKind: 'device',
      operationResource: 'dispense',
      deviceId: brandId<'DeviceId'>('device-1'),
      deviceCapability: 'dispense',
      requiresApproval: true,
      requiredInputs: ['sample'],
      parameters: { volume: { value: 10, unit: 'uL' } },
      citations: [brandId<'CitationId'>('citation-1')],
      expectedOutputs: ['dispensed sample'],
    }],
  }
}

function makeSkillDraft() {
  return {
    skillId: brandId<'LabSkillId'>('skill-1'),
    revisionId: brandId<'SkillRevisionId'>('skill-revision-1'),
    status: 'DRAFT' as const,
    name: 'dispense-sample',
    purpose: 'Dispense a sample with a configured device.',
    applicability: ['configured dispenser'],
    inputs: ['sample'],
    outputs: ['dispensed sample'],
    parameterConstraints: { volume: 'positive uL volume' },
    completionConditions: ['receipt recorded'],
    failurePolicy: 'STOP' as const,
    citations: [brandId<'CitationId'>('citation-1')],
    operations: [{ kind: 'device' as const, resourceRef: 'dispense', installed: true }],
  }
}
