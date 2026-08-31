// LABWEAVE 的 assembled 浏览器验收；只使用真实 Web Facade，不加载客户端 fixture。
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
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
    const credentialStep = page.locator('[role="dialog"]').first()
    await credentialStep.waitFor({ timeout: 15_000 })
    await credentialStep.getByRole('button', { name: /Configure later|稍后配置/ }).click()
    await credentialStep.waitFor({ state: 'detached', timeout: 15_000 })
    await page.getByRole('main', { name: 'Execution monitor', exact: true }).waitFor({ timeout: 30_000 })
    expect(await page.locator('[data-lab-project-shell]').count()).toBe(0)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('traverses the three-pane Project shell and one shared Agent conversation', async () => {
    onTestFailed(async () => { await saveFailureShot(page, 'lab-showcase-failure') })

    expect(await page.locator('textarea').count()).toBe(1)
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).click()
    await page.screenshot({ path: join(EVIDENCE_DIR, '01-projects.png'), fullPage: true })

    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').waitFor({ state: 'visible', timeout: 20_000 })
    expect(await page.getByRole('textbox', { name: 'Project name' }).count()).toBe(0)
    const projectName = basename(join(scaffold.workspaceCwd, 'workspace'))
    await mkdir(join(scaffold.workspaceCwd, 'workspace', 'configuration'), { recursive: true })
    await mkdir(join(scaffold.workspaceCwd, 'workspace', 'conversation-output'), { recursive: true })
    await mkdir(join(scaffold.workspaceCwd, 'workspace', 'run-artifacts'), { recursive: true })
    await writeFile(join(scaffold.workspaceCwd, 'workspace', 'configuration', 'workflow.json'), '{"source":"assembled"}\n', 'utf8')
    expect(await page.locator('[data-lab-agent-context]').count()).toBe(1)
    await page.getByRole('button', { name: 'Create and select' }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByRole('heading', { name: projectName, exact: true }).waitFor({ state: 'visible' })
    await page.locator('[data-lab-lifecycle-overview]').waitFor({ state: 'visible' })
    await page.locator('[data-lab-pending-action]').waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Configuration center', exact: true }).click()
    await page.getByRole('main', { name: 'Configuration center', exact: true }).waitFor({ state: 'visible' })
    await page.getByText('Workflow registry', { exact: false }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.locator('[data-lab-projects]').getByRole('button', { name: projectName }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible', timeout: 20_000 })
    const projectNavigation = page.locator('[data-lab-project-navigation]')
    await projectNavigation.waitFor({ state: 'visible' })
    for (const name of ['Overview', 'Planning and Workflow', 'Plan approval', 'Execution monitoring', 'Step orchestration', 'Evidence and reports', 'Project files', 'Archive']) {
      await projectNavigation.getByRole('button', { name, exact: true }).waitFor({ state: 'visible' })
    }
    expect(await page.locator('[data-lab-project-navigation]').count()).toBe(1)
    expect(await page.locator('[data-presentation="lab-workspace"]').count()).toBe(1)
    expect(await page.locator('[data-presentation="default"]').count()).toBe(0)
    expect(await page.locator('textarea').count()).toBe(1)
    await page.getByRole('button', { name: 'Close project workspace', exact: true }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Close project workspace', exact: true }).click()
    await page.getByRole('button', { name: 'Open project workspace', exact: true }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Open project workspace', exact: true }).click()
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible' })
    await page.screenshot({ path: join(EVIDENCE_DIR, '02-three-pane-project-workspace.png'), fullPage: true })

    const draft = page.locator('textarea')
    await draft.fill('keep this draft while changing destinations')
    for (const destination of ['Planning and Workflow', 'Plan approval', 'Execution monitoring', 'Step orchestration', 'Evidence and reports', 'Archive']) {
      await page.getByRole('button', { name: destination, exact: true }).click()
      await expect.poll(() => page.locator('[data-lab-project-shell]').count()).toBe(1)
      expect(await draft.evaluate(element => (element as HTMLTextAreaElement).value)).toBe('keep this draft while changing destinations')
    }
    await page.screenshot({ path: join(EVIDENCE_DIR, '03-lifecycle-destinations.png'), fullPage: true })

    await projectNavigation.getByRole('button', { name: 'Project files', exact: true }).click()
    const projectFiles = page.locator('[data-lab-project-file-id]')
    await projectFiles.first().waitFor({ state: 'visible', timeout: 20_000 })
    expect(await page.locator('[data-lab-project-file-group="configuration"]').count()).toBe(1)
    const configurationFile = page.locator('[data-lab-project-file-group="configuration"]').first()
    await configurationFile.getByRole('button', { name: 'Preview', exact: true }).click()
    await configurationFile.locator('pre').waitFor({ state: 'visible', timeout: 15_000 })
    await configurationFile.getByRole('button', { name: 'Download', exact: true }).click()
    await configurationFile.getByRole('button', { name: 'Download ready', exact: true }).waitFor({ state: 'visible', timeout: 15_000 })
    await writeFile(join(scaffold.workspaceCwd, 'workspace', 'conversation-output', 'goal.md'), '# assembled output\n', 'utf8')
    await expect.poll(() => page.locator('[data-lab-project-file-id]').count(), { timeout: 20_000 }).toBe(2)

    expect(await page.locator('textarea').count()).toBe(1)
    await page.locator('[data-conversation-scroll]').waitFor({ state: 'visible' })
    await page.screenshot({ path: join(EVIDENCE_DIR, '04-central-conversation.png'), fullPage: true })

    await page.setViewportSize({ width: 1024, height: 900 })
    await page.locator('[data-lab-agent-context]').waitFor({ state: 'visible' })
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible' })
    await page.screenshot({ path: join(EVIDENCE_DIR, '05-tablet.png'), fullPage: true })

    await page.setViewportSize({ width: 700, height: 900 })
    await page.locator('[data-lab-agent-context]').waitFor({ state: 'visible' })
    await page.locator('[data-lab-project-shell]').waitFor({ state: 'visible' })
    await page.screenshot({ path: join(EVIDENCE_DIR, '06-narrow.png'), fullPage: true })
    await page.setViewportSize({ width: 1680, height: 1000 })

    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  }, 180_000)
})
