// LABWEAVE 的 assembled 浏览器验收；只使用真实 Web Facade，不加载客户端 fixture。
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import { launchWebScaffold, watchConsole, type WebScaffold } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, REPO_ROOT, saveFailureShot } from './support.ts'

const OVERLAY = join(REPO_ROOT, 'examples/lab-web/cordis.patch.yml')
const EVIDENCE_DIR = join(REPO_ROOT, '.artifacts/lab-showcase')
const LAB_INSTALL_ANCHORS = [
  join(REPO_ROOT, 'packages/experimental/lab-mvp/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab-project/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-workbench/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-knowledge-workspace/package.json'),
]

describe('web e2e: LABWEAVE showcase composition', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    await mkdir(EVIDENCE_DIR, { recursive: true })
    scaffold = await launchWebScaffold({
      extraOverlayPath: OVERLAY,
      additionalInstallAnchors: LAB_INSTALL_ANCHORS,
      deepSeekMissingCredential: true,
    })
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.locator('[data-lab-projects]').waitFor({ timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('traverses the real Project shell, lifecycle destinations and one Agent dock', async () => {
    onTestFailed(async () => { await saveFailureShot(page, 'lab-showcase-failure') })

    await expect(page.locator('[data-lab-agent-context]')).toHaveCount(1)
    await expect(page.locator('textarea')).toHaveCount(1)
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click()
    await page.screenshot({ path: join(EVIDENCE_DIR, '01-projects.png'), fullPage: true })

    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.getByRole('textbox', { name: 'Project name' }).fill('Calibration')
    await page.getByRole('button', { name: 'Create and select' }).click()
    await expect(page.locator('[data-lab-project-shell]')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Calibration' })).toBeVisible()
    await expect(page.locator('[data-lab-lifecycle-overview]')).toBeVisible()
    await expect(page.locator('[data-lab-pending-action]')).toBeVisible()
    await expect(page.locator('[data-presentation="agent-dock"]')).toHaveCount(1)
    await expect(page.locator('[data-presentation="default"]')).toHaveCount(0)
    await expect(page.locator('textarea')).toHaveCount(1)
    await page.screenshot({ path: join(EVIDENCE_DIR, '02-overview-agent-dock.png'), fullPage: true })

    const draft = page.locator('textarea')
    await draft.fill('keep this draft while changing destinations')
    for (const destination of ['Planning and Workflow', 'Plan approval', 'Execution monitoring', 'Step orchestration', 'Evidence and reports', 'Archive']) {
      await page.getByRole('button', { name: destination, exact: true }).click()
      await expect.poll(() => page.locator('[data-lab-project-shell]').count()).toBe(1)
      await expect(draft).toHaveValue('keep this draft while changing destinations')
    }
    await page.screenshot({ path: join(EVIDENCE_DIR, '03-lifecycle-destinations.png'), fullPage: true })

    await page.getByRole('button', { name: 'View Agent execution timeline' }).click()
    await expect(page.getByRole('button', { name: 'Collapse Agent execution timeline' })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('textarea')).toHaveCount(1)
    await page.getByRole('button', { name: 'Collapse Agent execution timeline' }).focus()
    await expect(page.getByRole('button', { name: 'Collapse Agent execution timeline' })).toBeFocused()
    await page.screenshot({ path: join(EVIDENCE_DIR, '04-agent-timeline.png'), fullPage: true })

    await page.setViewportSize({ width: 1024, height: 900 })
    await expect(page.locator('[data-lab-agent-context]')).toBeVisible()
    await expect(page.locator('[data-lab-project-shell]')).toBeVisible()
    await page.screenshot({ path: join(EVIDENCE_DIR, '05-tablet.png'), fullPage: true })

    await page.setViewportSize({ width: 700, height: 900 })
    await expect(page.locator('[data-lab-agent-context]')).toBeVisible()
    await expect(page.locator('[data-lab-project-shell]')).toBeVisible()
    await page.screenshot({ path: join(EVIDENCE_DIR, '06-narrow.png'), fullPage: true })
    await page.setViewportSize({ width: 1680, height: 1000 })

    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 180_000)
})
