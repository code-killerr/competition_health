import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'
import { REPO_ROOT } from './support.ts'

const OVERLAY = join(REPO_ROOT, 'examples/lab-web/cordis.patch.yml')
const LAB_INSTALL_ANCHORS = [
  join(REPO_ROOT, 'packages/experimental/lab-mvp/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab/package.json'),
  join(REPO_ROOT, 'packages/experimental/tool-lab-project/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-workbench/package.json'),
  join(REPO_ROOT, 'packages/client/ui-lab-knowledge-workspace/package.json'),
]

describe('temporary browser hold for the LABWEAVE scaffold', () => {
  let scaffold: WebScaffold

  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      extraOverlayPath: OVERLAY,
      additionalInstallAnchors: LAB_INSTALL_ANCHORS,
      deepSeekMissingCredential: true,
    })
    await writeFile('/private/tmp/labweave-url.txt', scaffold.baseUrl)
  }, 120_000)

  afterAll(async () => {
    await scaffold?.close()
  })

  it('keeps the assembled Web service available for manual inspection', async () => {
    await new Promise<void>(() => {})
  }, 3_600_000)
})
