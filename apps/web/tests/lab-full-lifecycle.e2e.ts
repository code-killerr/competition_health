// LABWEAVE 的 assembled 浏览器验收；确认原生 Agent 输入与 Host Project 身份贯通。
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import type { ReplayOverrideDoc } from '@deepseek-ai/dsh-llm-replay'
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
    chunks: [
      { type: 'block-start', index: 0, blockType: 'text' },
      { type: 'text-delta', index: 0, text: 'Clarification recorded.' },
      { type: 'block-end', index: 0, block: { type: 'text', text: 'Clarification recorded.' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ],
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
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByRole('button', { name: 'Create and select', exact: true }).click()
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

    const input = page.locator('textarea:enabled[placeholder="Describe what you want to build"]')
    expect(await page.locator('textarea:enabled').count()).toBe(1)
    const settled = scaffold.whenTurnSettled(60_000)
    await input.fill('Design a controlled bench experiment and produce a report.')
    await input.press('Enter')
    const question = page.locator('[data-question-key]')
    await question.waitFor({ timeout: 30_000 })
    await question.getByText(QUESTION, { exact: true }).waitFor({ state: 'visible' })
    await question.getByRole('textbox').fill('Use the calibrated dispenser and record the observed output.')
    await question.getByRole('textbox').press('Enter')
    await settled
    await page.getByText('Clarification recorded.', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 })

    const imported = await request(page, 'lab', {
      command: 'knowledge-import',
      sessionId,
      name: 'bench-procedure.txt',
      bytesBase64: Buffer.from('Controlled bench procedure\nRecord the observed bench output.\n').toString('base64'),
    })
    expect(object(imported.value).status).toBe('READY')
    const documentId = stringValue(object(imported.value).documentId, 'documentId')
    const versionId = stringValue(object(imported.value).versionId, 'versionId')
    await request(page, 'project', {
      command: 'project-scope-update',
      projectId,
      sessionId,
      sources: [{ documentId, versionId }],
      deviceIds: ['dev-dispenser'],
    })
    const search = await request(page, 'lab', { command: 'knowledge-search', sessionId, request: { query: 'bench', documentIds: [documentId], versionIds: [versionId] } })
    const citationId = stringValue(object(array(object(search.value).results)[0]).citationId, 'citationId')
    await request(page, 'lab', { command: 'knowledge-fact-confirm', sessionId, citationId, confirmedBy: sessionId })

    const created = await request(page, 'project', { command: 'experiment-create', projectId, sessionId, title: 'Browser lifecycle experiment', objective: 'Controlled bench procedure' })
    const experiment = object(array(object(created.value).experiments)[0])
    const experimentId = stringValue(experiment.experimentId, 'experimentId')
    const experimentRequest = {
      experimentId,
      objective: 'Controlled bench procedure',
      samples: [],
      constraints: [],
      expectedOutputs: ['observed output recorded'],
      unresolved: [],
    }
    const planning = await request(page, 'lab', { command: 'planning-context', sessionId, request: experimentRequest })
    const planningCitationId = stringValue(object(array(object(planning.value).citations)[0]).citationId, 'planningCitationId')
    const planId = 'plan-browser-lifecycle-1'
    const revisionId = 'skill-browser-lifecycle-r1'
    await request(page, 'lab', {
      command: 'plan-propose',
      sessionId,
      input: {
        request: experimentRequest,
        plan: {
          planId,
          experimentId,
          revision: 1,
          status: 'DRAFT',
          objective: experimentRequest.objective,
          citations: [planningCitationId],
          assumptions: [],
          unresolved: [],
          steps: [{
            stepId: 'step-browser-lifecycle',
            title: 'Record the observed bench output',
            dependencies: [],
            skillRevisionId: revisionId,
            operationKind: 'human',
            operationResource: 'manual-record',
            requiresApproval: true,
            requiredInputs: [],
            parameters: {},
            citations: [planningCitationId],
            expectedOutputs: ['observed output recorded'],
          }],
        },
        skillDrafts: [{
          skillId: 'skill-browser-lifecycle',
          revisionId,
          status: 'DRAFT',
          name: 'manual-record',
          purpose: 'Record a human-observed output.',
          applicability: ['controlled bench output'],
          inputs: [],
          outputs: ['observed output recorded'],
          parameterConstraints: {},
          completionConditions: ['the observer records the output'],
          failurePolicy: 'REPLAN',
          citations: [planningCitationId],
          operations: [{ kind: 'human', resourceRef: 'manual-record', installed: true }],
        }],
      },
    })
    await request(page, 'lab', { command: 'skill-validate', sessionId, revisionId })
    await request(page, 'lab', { command: 'skill-approve', sessionId, revisionId, approvedBy: sessionId })
    await request(page, 'lab', { command: 'skill-activate', sessionId, revisionId })
    const validated = await request(page, 'lab', { command: 'plan-validate', sessionId, planId })
    expect(object(validated.value).validation).toMatchObject({ valid: true })
    await request(page, 'lab', { command: 'plan-approve', sessionId, experimentId, planId, approvedBy: sessionId })

    const started = await request(page, 'project', { command: 'run-start', projectId, sessionId, experimentId, planId })
    const runId = stringValue(object(started.value).runId, 'runId')
    await request(page, 'lab', { command: 'run-step', sessionId, runId })
    const blocked = await request(page, 'lab', {
      command: 'run-confirm',
      sessionId,
      runId,
      evidence: ['the observed output did not match the expected output'],
      confirmedBy: sessionId,
      stepId: 'step-browser-lifecycle',
    })
    expect(object(blocked.value)).toMatchObject({ runId, runStatus: 'BLOCKED', replanRequest: { runId } })
    const report = await request(page, 'project', { command: 'run-report', projectId, sessionId, runId })
    expect(object(report.value)).toMatchObject({ runId, status: 'BLOCKED', assessment: { verdict: 'FAIL' } })
    const files = await request(page, 'project', { command: 'project-file-list', projectId, sessionId })
    expect(array(files.value).some(file => object(file).relativePath === `run-artifacts/report-${runId}.json`)).toBe(true)

    const opened = await request(page, 'project', { command: 'project-open', projectId, sessionId })
    expect(array(object(opened.value).experiments)).toEqual(expect.arrayContaining([expect.objectContaining({ experimentId })]))
    await page.reload({ waitUntil: 'load' })
    await page.getByRole('main', { name: 'Execution monitor', exact: true }).waitFor({ timeout: 30_000 })
    await page.locator(`[data-project-id="${projectId}"]`).getByRole('button', { name: 'workspace', exact: true }).click()
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
