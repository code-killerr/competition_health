// LABWEAVE 的 assembled 浏览器验收；验证 Host capability 故障以可恢复状态呈现。
import { join } from 'node:path'
import type { Browser, Page, Route } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
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

type Fault = 'none' | 'workspace' | 'knowledge' | 'run' | 'capability'

describe('web e2e: LABWEAVE Host capability recovery', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let fault: Fault = 'none'
  let capabilityRequests = 0

  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      extraOverlayPath: OVERLAY,
      additionalInstallAnchors: LAB_INSTALL_ANCHORS,
      deepSeekMissingCredential: true,
    })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    await page.route('**/api/lab', async (route) => { await handleFault(route, () => fault, () => { capabilityRequests += 1 }) })
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await dismissCredentialDialog(page)
    await waitForMonitor(page)
  }, 120_000)

  afterAll(async () => {
    await page?.unroute('**/api/lab')
    await browser?.close()
    await scaffold?.close()
  })

  it('keeps the workbench navigable when Host capabilities fail and recover', async () => {
    onTestFailed(() => saveFailureShot(page, 'lab-workbench-failure'))

    fault = 'workspace'
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').waitFor({ state: 'visible', timeout: 20_000 })
    expect(await page.locator('[data-lab-projects] [role="status"]').textContent()).toContain('workspace is unavailable')

    fault = 'none'
    await page.getByRole('button', { name: 'Refresh list', exact: true }).click()
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.getByRole('button', { name: 'Create and select', exact: true }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    const projectList = await request(page, 'project', { command: 'project-list' })
    const projectView = array(projectList.value).map(object).find(value => object(value.project).name === 'workspace')
    if (projectView === undefined) throw new Error('Host did not create the Workspace Project')
    const projectId = stringValue(object(projectView.project).projectId, 'projectId')
    const sessionId = stringValue(array(object(projectView).sessions)[0] === undefined ? undefined : object(array(object(projectView).sessions)[0]).sessionId, 'sessionId')
    await request(page, 'project', { command: 'experiment-create', projectId, sessionId, title: 'Capability recovery', objective: 'Verify Host failure states.' })

    fault = 'knowledge'
    await page.getByRole('button', { name: 'Knowledge', exact: true }).click()
    await page.locator('[data-lab-knowledge-workspace]').waitFor({ state: 'visible', timeout: 20_000 })
    const query = page.locator('[data-lab-knowledge-workspace] input').nth(1)
    await query.fill('fixture protocol')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    expect(await page.locator('[data-lab-knowledge-workspace] [role="status"]').textContent()).toContain('Operation failed')

    fault = 'none'
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').getByRole('button', { name: 'workspace', exact: false }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })

    fault = 'run'
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('[data-lab-projects]').getByRole('button', { name: 'workspace', exact: false }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByRole('button', { name: 'Execution monitoring', exact: true }).click()
    await expect.poll(() => page.locator('[data-lab-project-shell] [role="status"]').count()).toBeGreaterThan(0)
    expect(await page.locator('[data-lab-project-shell] [role="status"]').textContent()).toContain('PROVIDER_UNAVAILABLE')

    fault = 'capability'
    await page.getByRole('button', { name: 'Configuration center', exact: true }).click()
    await page.getByRole('main', { name: 'Configuration center', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await expect.poll(() => capabilityRequests).toBeGreaterThan(0)
    expect(await page.locator('[data-lab-configuration]').textContent()).toContain('Host capability is currently unavailable')

    fault = 'none'
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').getByRole('button', { name: 'workspace', exact: false }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByRole('button', { name: 'Configuration center', exact: true }).click()
    await page.getByRole('main', { name: 'Configuration center', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await expect.poll(async () => await page.locator('[data-lab-configuration]').textContent(), { timeout: 20_000 }).toContain('Host capability is available')
  }, 180_000)
})

async function handleFault(route: Route, getFault: () => Fault, onCapabilityRequest: () => void): Promise<void> {
  const body = route.request().postDataJSON() as { readonly command?: unknown }
  const command = typeof body.command === 'string' ? body.command : undefined
  if (command === 'configuration-capabilities') onCapabilityRequest()
  const current = getFault()
  const shouldFail = current === 'workspace' && command === 'project-list'
    || current === 'knowledge' && command === 'knowledge-search'
    || current === 'run' && command === 'run-list'
    || current === 'capability' && command === 'configuration-capabilities'
  if (!shouldFail) {
    await route.continue()
    return
  }
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: `${current} is unavailable` } }),
  })
}

async function dismissCredentialDialog(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"]').first()
  await dialog.waitFor({ timeout: 15_000 })
  await dialog.getByRole('button', { name: /Configure later|稍后配置/ }).click()
  await dialog.waitFor({ state: 'detached', timeout: 15_000 })
}

async function waitForMonitor(page: Page): Promise<void> {
  await page.getByRole('main', { name: 'Execution monitor', exact: true }).waitFor({ timeout: 30_000 })
}

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
