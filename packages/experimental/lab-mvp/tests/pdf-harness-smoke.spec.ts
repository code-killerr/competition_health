import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { brandId } from '@deepseek-ai/dsh-experimental-lab-domain'
import { availablePdfKnowledgeFixtures, createPdfKnowledgeFixtureParser, readPdfKnowledgeFixture } from '@deepseek-ai/dsh-lab-knowledge-fixtures'
import { parseLabProjectConversationCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import { parseLabWebCommand } from '@deepseek-ai/dsh-experimental-lab-mvp-web'
import * as LabMvp from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('current MVP Knowledge and Harness composition', () => {
  it('runs PDF import through READY, project binding, citation, SOP publication and human plan approval without a model key', async () => {
    const fixture = availablePdfKnowledgeFixtures()[0]
    expect(fixture).toBeDefined()
    if (fixture === undefined) throw new Error('no PDF knowledge fixture is available')

    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(SessionStore)
    await ctx.plugin(LabMvp, {
      knowledgePath: ':memory:',
      storagePath: ':memory:',
      runtime: { statePath: ':memory:' },
      documentParser: createPdfKnowledgeFixtureParser(),
      device: { devices: [{ id: 'device-1', name: 'fixture device', capabilities: ['dispense'] }] },
    })

    const web = ctx.labMvpWeb
    const session = ctx.sessions.create(SessionId('lab-pdf-smoke'))
    const send = async (payload: Record<string, unknown>): Promise<unknown> => {
      const command = parseLabWebCommand({ ...payload, sessionId: session.id })
      const result = await web.dispatch(command)
      return result.value
    }
    const sendProject = async (payload: Record<string, unknown>): Promise<unknown> => {
      const command = parseLabProjectConversationCommand({ ...payload, sessionId: session.id })
      const result = await web.dispatchProject(command)
      return result.value
    }

    const imported = asRecord(await send({
      command: 'knowledge-import',
      name: fixture.fileName,
      bytesBase64: Buffer.from(await readPdfKnowledgeFixture(fixture)).toString('base64'),
      metadata: { dataset: 'pdf-knowledge', role: 'harness-smoke' },
    }))
    expect(imported).toMatchObject({ status: 'READY' })

    const documentId = stringValue(imported.documentId)
    const versionId = stringValue(imported.versionId)
    expect(documentId).toBeDefined()
    expect(versionId).toBeDefined()
    if (documentId === undefined || versionId === undefined) throw new Error('Knowledge import returned no source identity')

    const projectId = brandId<'LabProjectId'>('project-pdf-smoke')
    await sendProject({ command: 'project-create', projectId, name: 'PDF smoke project' })
    await sendProject({ command: 'project-session-associate', projectId, targetSessionId: session.id, title: 'PDF smoke session' })
    await sendProject({
      command: 'project-scope-update',
      projectId,
      sources: [{ documentId, versionId }],
      deviceIds: ['device-1'],
    })

    const search = asRecord(await send({
      command: 'knowledge-search',
      request: { query: fixture.searchQuery, documentIds: [documentId], versionIds: [versionId], limit: 5 },
    }))
    const citation = asRecord(array(search.results)[0])
    const citationId = stringValue(citation.citationId)
    expect(citationId).toBeDefined()
    if (citationId === undefined) throw new Error('PDF import returned no citation')

    const request = {
      experimentId: 'experiment-pdf-smoke',
      objective: fixture.title,
      samples: [],
      constraints: [],
      expectedOutputs: ['operator records completion'],
      unresolved: [],
    }
    const step = {
      order: 1,
      title: 'Follow the cited source',
      instruction: fixture.evidence,
      requiredInputs: [],
      completionCriteria: ['operator records completion'],
      citations: [citationId],
      missingFields: [],
    }
    const draft = asRecord(await send({
      command: 'knowledge-sop-create',
      title: fixture.title,
      steps: [step],
    }))
    const draftId = stringValue(asRecord(draft.draft).draftId)
    expect(draftId).toBeDefined()
    if (draftId === undefined) throw new Error('SOP creation returned no draft identity')

    await send({ command: 'knowledge-fact-confirm', citationId, confirmedBy: 'human-reviewer', note: 'Checked against PDF fixture.' })
    const reviewed = asRecord(await send({ command: 'knowledge-sop-update', draftId, title: fixture.title, steps: [step] }))
    expect(reviewed).toMatchObject({ draft: { status: 'REVIEWED', draftId } })
    const published = asRecord(await send({ command: 'knowledge-sop-publish', draftId, publishedBy: 'human-reviewer' }))
    expect(published).toMatchObject({ draft: { status: 'PUBLISHED', draftId } })

    const publishedSearch = asRecord(await send({
      command: 'knowledge-search',
      request: { query: fixture.searchQuery, documentIds: [documentId], versionIds: [versionId], confirmed: true, limit: 10 },
    }))
    expect(array(publishedSearch.results)).toEqual(expect.arrayContaining([
      expect.objectContaining({ provenance: 'SOP_PUBLISHED', sopDraftId: draftId, confirmed: true }),
    ]))

    const projectContext = asRecord(await sendProject({
      command: 'project-planning-context',
      projectId,
      request,
    }))
    const planningContext = asRecord(projectContext.planningContext)
    const planningCitations = array(planningContext.citations).map(asRecord)
    expect(planningCitations.some(citation => citation.citationId === citationId && citation.confirmed === true)).toBe(true)

    await send({ command: 'experiment-create', request })
    await expect(send({
      command: 'plan-propose',
      input: {
        request,
        plan: {
          planId: 'plan-pdf-smoke',
          experimentId: request.experimentId,
          revision: 1,
          status: 'DRAFT',
          objective: request.objective,
          citations: [citationId],
          assumptions: [],
          unresolved: [],
          steps: [{
            stepId: 'step-pdf-smoke',
            title: 'Review source before execution',
            dependencies: [],
            skillRevisionId: 'skill-pdf-smoke-r1',
            operationKind: 'human',
            operationResource: 'manual-review',
            requiresApproval: true,
            requiredInputs: [],
            parameters: {},
            citations: [citationId],
            expectedOutputs: ['operator records completion'],
          }],
        },
        skillDrafts: [{
          skillId: 'skill-pdf-smoke',
          revisionId: 'skill-pdf-smoke-r1',
          status: 'DRAFT',
          name: 'manual-review',
          purpose: 'Review a cited PDF source',
          applicability: [fixture.title],
          inputs: [],
          outputs: ['operator records completion'],
          parameterConstraints: {},
          completionConditions: ['the reviewer confirms the source'],
          failurePolicy: 'BLOCK',
          citations: [citationId],
          operations: [{ kind: 'human', resourceRef: 'manual-review', installed: true }],
        }],
      },
    })).resolves.toMatchObject({ plan: { status: 'DRAFT', citations: [citationId] } })

    await send({ command: 'skill-validate', revisionId: 'skill-pdf-smoke-r1' })
    await send({ command: 'skill-approve', revisionId: 'skill-pdf-smoke-r1', approvedBy: 'human-reviewer' })
    await send({ command: 'skill-activate', revisionId: 'skill-pdf-smoke-r1' })
    await expect(send({ command: 'plan-validate', planId: 'plan-pdf-smoke' })).resolves.toMatchObject({ validation: { valid: true } })
    await expect(send({ command: 'plan-approve', experimentId: request.experimentId, planId: 'plan-pdf-smoke', approvedBy: 'human-reviewer' })).resolves.toMatchObject({
      plan: { status: 'HUMAN_APPROVED', planId: 'plan-pdf-smoke' },
    })
  })
})

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('expected object')
  return value as Record<string, unknown>
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}
