import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pythonPath = process.platform === 'win32'
  ? resolve(repositoryRoot, '.venv/Scripts/python.exe')
  : resolve(repositoryRoot, '.venv/bin/python')
const environment = { ...process.env }
if (environment.DOCLING_PYTHON === undefined && existsSync(pythonPath)) {
  environment.DOCLING_PYTHON = pythonPath
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const child = spawn(command, ['dsh', '--profile', 'web', '--patch', 'examples/lab-web/cordis.patch.yml', '--no-open'], {
  cwd: repositoryRoot,
  env: environment,
  stdio: 'inherit',
})
child.once('error', error => {
  console.error(error)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
