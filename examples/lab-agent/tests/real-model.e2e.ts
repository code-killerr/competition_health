import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'

const binScript = fileURLToPath(new URL('./fixtures/lab-driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('../../headless-agent/cordis.yml', import.meta.url))
const patchPath = fileURLToPath(new URL('../cordis.patch.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const hasKey = Boolean(process.env.DEEPSEEK_API_KEY)

describe.skipIf(!hasKey)('lab-agent with real model', () => {
  it('runs the Harness laboratory Agent through the existing credential layer', async () => {
    const { stdout } = await runLoaderSmoke({
      label: 'lab-agent real model',
      tempDirPrefix: 'lab-agent-real-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [
        configPath,
        patchPath,
        'Use the laboratory Agent tools to inspect the current project-scoped context if available, then propose a concise experiment plan for calibrating the development dispenser. Do not approve the plan, activate a Skill, or start a run. If a project or required field is missing, report that clearly and keep the response brief.',
      ],
      tsconfigPath,
      processTimeoutMs: 120_000,
    })
    expect(stdout.trim().length).toBeGreaterThan(0)
  }, 135_000)
})
