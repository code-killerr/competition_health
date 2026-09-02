// LABWEAVE 的 assembled 浏览器验收；确认原生 Agent 输入与 Host Project 身份贯通。
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import type { ReplayOverrideDoc } from '@deepseek-ai/dsh-llm-replay'
import { availablePdfKnowledgeFixtures, PDF_KNOWLEDGE_ROOT } from '@deepseek-ai/dsh-lab-knowledge-fixtures'
import { toolCallResponse } from '../../../packages/core/agent-loop/tests/mock-adapter.ts'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, REPO_ROOT, saveFailureShot } from './support.ts'

const OVERLAY = join(REPO_ROOT, 'examples/lab-web/cordis.patch.yml')
const LAB_INSTALL_ANCHORS = [
  join(REPO_ROOT, 'packages/experimental/lab-mvp/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab-project/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-workbench/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-knowledge-workspace/package.json'),
]
const QUESTION = 'Which control input is still required before the bench can run?'
const PDF_QUERY = availablePdfKnowledgeFixtures()[0]?.searchQuery ?? 'SeekOne'
const EXPERIMENT_ID = '{{fromRequest:experimentId[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)}}'
const DOCUMENT_ID = '{{fromRequest:documentId[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)}}'
const VERSION_ID = '{{fromRequest:versionId[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)}}'
const CITATION_ID = '{{fromRequest:citationId[^A-Za-z0-9_-]+([A-Za-z0-9_-]+)}}'
const REPLAY: ReplayOverrideDoc = [
  {
    kind: 'chunks',
    chunks: [
      { type: 'block-start', index: 0, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: 0, id: 'lab-question', name: 'ask_user_question', argumentsDelta: JSON.stringify({ questions: [{ id: 'control-input', header: 'Required input', question: QUESTION }] }) },
      { type: 'block-end', index: 0, block: { type: 'tool-call', id: 'lab-question', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'control-input', header: 'Required input', question: QUESTION }] }) } },
      { type: 'finish', reason: { kind: 'tool-calls' } },
    ],
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-project-context', 'lab_project_context', {}),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-knowledge-catalog', 'lab_knowledge_catalog', {}),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-device-catalog', 'lab_device_catalog', {}),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-knowledge-search', 'lab_knowledge_search', {
      query: PDF_QUERY,
      document_ids: [DOCUMENT_ID],
      version_ids: [VERSION_ID],
    }),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-experiment-create', 'lab_experiment_create', {
      title: 'Agent browser lifecycle experiment',
      objective: 'Use the confirmed procedure to record a controlled bench output.',
      expected_outputs: ['observed output recorded'],
    }),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-plan-context', 'lab_project_plan_context', {
      experiment_id: EXPERIMENT_ID,
      objective: PDF_QUERY,
      unresolved: [],
    }),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-plan-propose', 'lab_plan_propose', {
      request: {
        experimentId: EXPERIMENT_ID,
        objective: PDF_QUERY,
        samples: [],
        constraints: [],
        expectedOutputs: ['observed output recorded'],
        unresolved: [],
      },
      plan: {
        planId: 'plan-agent-browser-1',
        experimentId: EXPERIMENT_ID,
        revision: 1,
        status: 'DRAFT',
        objective: 'Use the confirmed procedure to record a controlled bench output.',
        citations: [CITATION_ID],
        assumptions: [],
        unresolved: [],
        steps: [{
          stepId: 'step-agent-browser',
          title: 'Record the observed bench output',
          dependencies: [],
          skillRevisionId: 'skill-agent-browser-r1',
          operationKind: 'human',
          operationResource: 'manual-record',
          requiresApproval: true,
          requiredInputs: [],
          parameters: {},
          citations: [CITATION_ID],
          expectedOutputs: ['observed output recorded'],
        }],
      },
      skill_drafts: [{
        skillId: 'skill-agent-browser',
        revisionId: 'skill-agent-browser-r1',
        status: 'DRAFT',
        name: 'manual-record',
        purpose: 'Record the observed bench output.',
        applicability: ['controlled bench output'],
        inputs: [],
        outputs: ['observed output recorded'],
        parameterConstraints: {},
        completionConditions: ['the observer records the output'],
        failurePolicy: 'REPLAN',
        citations: [CITATION_ID],
        operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }],
      }],
    }),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-skill-validate', 'lab_skill_validate', { skill_revision_id: 'skill-agent-browser-r1' }),
  },
  {
    kind: 'chunks',
    chunks: toolCallResponse('agent-plan-approve', 'lab_plan_approve', {
      experiment_id: EXPERIMENT_ID,
      plan_id: 'plan-agent-browser-1',
      approved_by: 'browser-reviewer',
      skill_revision_ids: ['skill-agent-browser-r1'],
    }),
  },
  {
    kind: 'chunks',
    chunks: [{ type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: 'LABWEAVE Agent prepared the scoped Experiment and is waiting for human approval.' }, { type: 'block-end', index: 0, block: { type: 'text', text: 'LABWEAVE Agent prepared the scoped Experiment and is waiting for human approval.' } }, { type: 'finish', reason: { kind: 'stop' } }],
  },
]

describe('web e2e: LABWEAVE Host lifecycle entry', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let replayDir: string

  beforeAll(async () => {
    replayDir = await mkdtemp(join(tmpdir(), 'dsh-lab-full-lifecycle-'))
    await writeFile(join(replayDir, 'replay.override.json'), JSON.stringify(REPLAY))
    scaffold = await launchWebScaffold({
      extraOverlayPath: OVERLAY,
      additionalInstallAnchors: LAB_INSTALL_ANCHORS,
      replayFixture: join(replayDir, 'override-only.jsonl'),
      replayOverride: join(replayDir, 'replay.override.json'),
      paceMs: 5,
    })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.getByRole('main', { name: 'Execution monitor', exact: true }).waitFor({ timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
    await rm(replayDir, { recursive: true, force: true })
  })

  it('connects a Workspace and completes the Host-backed Agent lifecycle', async () => {
    onTestFailed(() => saveFailureShot(page, 'lab-full-lifecycle-failure'))
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })

    const selectedProjectId = stringValue(await page.locator('[data-lab-project-shell] header strong').first().textContent(), 'selectedProjectId')
    const projectList = await request(page, 'project', { command: 'project-list' })
    const projectView = array(projectList.value).map(object).find(value => object(value.project).projectId === selectedProjectId)
    if (projectView === undefined) throw new Error('Host did not create the Workspace Project')
    const project = object(projectView.project)
    const projectId = stringValue(project.projectId, 'projectId')
    const workspaceId = stringValue(project.workspaceId, 'workspaceId')
    expect(project.name).toBe('workspace')
    expect(workspaceId.length).toBeGreaterThan(0)
    const sessionId = stringValue(array(projectView.sessions)[0] === undefined ? undefined : object(array(projectView.sessions)[0]).sessionId, 'sessionId')

    const pdfFixture = availablePdfKnowledgeFixtures()[0]
    if (pdfFixture === undefined) throw new Error('No PDF fixture is available for the browser Knowledge flow')
    await page.getByRole('button', { name: 'Configuration center', exact: true }).click()
    await page.getByRole('main', { name: 'Configuration center', exact: true }).getByRole('button', { name: 'Device state', exact: true }).click()
    const devices = page.locator('[data-lab-devices]')
    await devices.waitFor({ state: 'visible', timeout: 20_000 })
    await devices.getByRole('button', { name: 'Add to current Project', exact: true }).first().click()
    await devices.getByRole('button', { name: 'Remove from current Project', exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 })
    const deviceScopedProject = await request(page, 'project', { command: 'project-open', projectId, sessionId })
    expect(array(object(deviceScopedProject.value).devices).map(item => object(item).deviceId)).toContain('dev-dispenser')
    await page.getByRole('button', { name: 'Knowledge', exact: true }).click()
    const knowledge = page.locator('[data-lab-knowledge-workspace]')
    await knowledge.waitFor({ state: 'visible', timeout: 20_000 })
    await knowledge.getByLabel('Choose PDF', { exact: true }).setInputFiles(join(PDF_KNOWLEDGE_ROOT, pdfFixture.fileName))
    await knowledge.getByRole('button', { name: 'Import and parse', exact: true }).click()
    await knowledge.getByText('READY', { exact: true }).waitFor({ state: 'visible', timeout: 90_000 })
    await knowledge.getByRole('button', { name: 'Add to project', exact: true }).click()
    await knowledge.getByRole('button', { name: 'Remove from project', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await knowledge.getByLabel('Query', { exact: true }).fill(pdfFixture.searchQuery)
    await knowledge.getByRole('button', { name: 'Search', exact: true }).click()
    const citationPanel = knowledge.locator('section').nth(1)
    await citationPanel.locator('li').first().waitFor({ state: 'visible', timeout: 30_000 })
    expect(await citationPanel.locator('li').count()).toBeGreaterThan(0)
    expect(await citationPanel.getByText(pdfFixture.searchQuery, { exact: false }).count()).toBeGreaterThan(0)
    const knowledgeSnapshot = await request(page, 'lab', { command: 'knowledge-snapshot', sessionId })
    const pdfStatus = array(object(knowledgeSnapshot.value).knowledge)
      .map(object)
      .find(item => item.metadata !== undefined && object(item.metadata).sourceName === pdfFixture.fileName)
    if (pdfStatus === undefined) throw new Error('Host did not return the imported PDF status')
    const documentId = stringValue(pdfStatus.documentId, 'documentId')
    const versionId = stringValue(pdfStatus.versionId, 'versionId')
    const pdfSearch = await request(page, 'lab', { command: 'knowledge-search', sessionId, request: { query: pdfFixture.searchQuery, documentIds: [documentId], versionIds: [versionId] } })
    const pdfCitationId = stringValue(object(array(object(pdfSearch.value).results)[0]).citationId, 'pdfCitationId')
    await request(page, 'lab', { command: 'knowledge-fact-confirm', sessionId, citationId: pdfCitationId, confirmedBy: sessionId })
    const confirmedPdfSearch = await request(page, 'lab', { command: 'knowledge-search', sessionId, request: { query: pdfFixture.searchQuery, documentIds: [documentId], versionIds: [versionId], confirmed: true } })
    expect(array(object(confirmedPdfSearch.value).results).map(item => object(item).citationId)).toContain(pdfCitationId)
    await page.getByRole('button', { name: 'Execution monitor', exact: true }).click()
    const monitor = page.getByRole('main', { name: 'Execution monitor', exact: true })
    await monitor.waitFor({ state: 'visible', timeout: 20_000 })
    await monitor.getByRole('button', { name: 'workspace', exact: false }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })

    const input = page.locator('textarea:enabled[placeholder="Describe what you want to build"]')
    expect(await page.locator('textarea:enabled').count()).toBe(1)
    const agentTurnSettled = scaffold.whenTurnSettled(60_000)
    await input.fill('Design a controlled bench experiment and produce a report.')
    await input.press('Enter')
    const question = page.locator('[data-question-key]')
    await question.waitFor({ timeout: 30_000 })
    await question.getByText(QUESTION, { exact: true }).waitFor({ state: 'visible' })
    await question.getByRole('textbox').fill('Use the calibrated dispenser and record the observed output.')
    await question.getByRole('textbox').press('Enter')
    await agentTurnSettled
    await page.getByText('LABWEAVE Agent prepared the scoped Experiment and is waiting for human approval.', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 })

    const afterAgent = await request(page, 'project', { command: 'project-open', projectId, sessionId })
    const agentExperiments = array(object(afterAgent.value).experiments)
    expect(agentExperiments).toHaveLength(1)
    const agentExperimentId = stringValue(object(agentExperiments[0]).experimentId, 'agentExperimentId')
    expect(agentExperimentId).toMatch(/^experiment-/)

    const experimentId = agentExperimentId
    await page.locator('[data-lab-project-navigation-item="planning"]').click()
    const planActions = page.locator('[data-lab-plan-actions]')
    await planActions.waitFor({ state: 'visible', timeout: 20_000 })
    await planActions.getByRole('button', { name: 'Validate', exact: true }).click()
    const skill = page.locator('[data-lab-skill]').first()
    await skill.getByRole('button', { name: 'Approve Skill', exact: true }).click()
    await skill.getByRole('button', { name: 'Activate Skill', exact: true }).click()
    await planActions.getByRole('button', { name: 'Approve plan', exact: true }).click()
    await planActions.getByRole('button', { name: 'Start controlled run', exact: true }).click()

    const runDetail = page.locator('[data-lab-run-detail]')
    await runDetail.waitFor({ state: 'visible', timeout: 20_000 })
    const runId = stringValue(await runDetail.locator('h2').textContent(), 'runId')
    await request(page, 'lab', { command: 'run-step', sessionId, runId })
    await runDetail.getByText('WAITING_CONFIRMATION', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await runDetail.locator('input').fill('the observed output did not match the expected output')
    await runDetail.getByRole('button', { name: 'Confirm step', exact: true }).click()
    await runDetail.getByText('BLOCKED', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    const report = await request(page, 'project', { command: 'run-report', projectId, sessionId, runId })
    expect(object(report.value)).toMatchObject({ runId, status: 'BLOCKED', assessment: { verdict: 'FAIL' } })
    const files = await request(page, 'project', { command: 'project-file-list', projectId, sessionId })
    expect(array(files.value).some(file => object(file).relativePath === `run-artifacts/report-${runId}.json`)).toBe(true)

    const opened = await request(page, 'project', { command: 'project-open', projectId, sessionId })
    expect(array(object(opened.value).experiments)).toEqual(expect.arrayContaining([expect.objectContaining({ experimentId })]))
    await page.reload({ waitUntil: 'load' })
    await page.getByRole('button', { name: 'Execution monitor', exact: true }).click()
    const reloadedMonitor = page.getByRole('main', { name: 'Execution monitor', exact: true })
    await reloadedMonitor.waitFor({ timeout: 30_000 })
    await reloadedMonitor.locator('section').nth(1).getByRole('button', { name: 'workspace', exact: false }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-project-navigation-item="execution"]').click()
    await page.locator('[data-lab-run-detail]').getByRole('heading', { name: runId, exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-run-detail]').getByText('BLOCKED', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-project-navigation-item="evidence"]').click()
    await page.locator('[data-lab-result-report]').getByText(runId, { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-result-report]').getByText('FAIL', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-project-navigation-item="files"]').click()
    await page.getByText(`report-${runId}.json`, { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  }, 120_000)
})

interface JsonObject { readonly [key: string]: unknown }

async function request(page: Page, namespace: 'lab' | 'project', payload: JsonObject): Promise<JsonObject> {
  const response = await page.evaluate(async ({ namespace, payload }) => {
    const result = await fetch('/api/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ namespace, ...payload }) })
    return await result.json() as JsonObject
  }, { namespace, payload })
  if (response.ok !== true) throw new Error(`LAB request failed: ${JSON.stringify(response)}`)
  return object(response.result)
}

function object(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('expected object')
  return value as JsonObject
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is missing`)
  return value
}
