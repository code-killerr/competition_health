import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pythonPath = process.platform === 'win32'
  ? resolve(repositoryRoot, '.venv/Scripts/python.exe')
  : resolve(repositoryRoot, '.venv/bin/python')

if (!existsSync(pythonPath)) {
  console.error('未找到项目 Docling Python 环境，请先运行：pnpm run docling:setup')
  process.exit(1)
}

const environment = { ...process.env, DOCLING_PYTHON: pythonPath }
for (const [lower, upper] of [['https_proxy', 'HTTPS_PROXY'], ['http_proxy', 'HTTP_PROXY'], ['all_proxy', 'ALL_PROXY']]) {
  const value = environment[lower] ?? environment[upper]
  if (value !== undefined) {
    environment[lower] = value
    environment[upper] = value
  }
}

const result = spawnSync(
  process.execPath,
  ['node_modules/vitest/vitest.mjs', 'run', 'packages/experimental/lab-knowledge-local/tests/docling-smoke.spec.ts'],
  { cwd: repositoryRoot, env: environment, stdio: 'inherit' },
)
if (result.error !== undefined) throw result.error
process.exit(result.status ?? 1)
