import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const environmentPath = resolve(repositoryRoot, '.venv')
const requirementsPath = resolve(repositoryRoot, 'packages/experimental/lab-knowledge-local/runtime/requirements.txt')
const proxyKeys = ['https_proxy', 'http_proxy', 'all_proxy']

function proxyEnvironment() {
  const environment = { ...process.env }
  const aliases = { https_proxy: 'HTTPS_PROXY', http_proxy: 'HTTP_PROXY', all_proxy: 'ALL_PROXY' }
  for (const key of proxyKeys) {
    const value = environment[key] ?? environment[aliases[key]]
    if (value !== undefined) {
      environment[key] = value
      environment[aliases[key]] = value
    }
  }
  if (environment.https_proxy === undefined || environment.http_proxy === undefined) {
    throw new Error('安装 Docling 需要先设置 https_proxy 和 http_proxy；当前项目代理为 http://127.0.0.1:7897')
  }
  return environment
}

function commandResult(command, args, environment, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: environment,
    stdio: options.capture === true ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  })
  if (result.error !== undefined) throw result.error
  return result
}

function pythonVersion(command, environment) {
  const result = commandResult(command, ['--version'], environment, { capture: true })
  if (result.status !== 0) return undefined
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const match = /Python (\d+)\.(\d+)\.(\d+)/.exec(output)
  if (match === null) return undefined
  return { major: Number(match[1]), minor: Number(match[2]), text: match[0] }
}

function findPython(environment) {
  const candidates = [process.env.DOCLING_BOOTSTRAP_PYTHON, 'python3.13', 'python3'].filter(
    (candidate, index, values) => candidate !== undefined && values.indexOf(candidate) === index,
  )
  for (const candidate of candidates) {
    const version = pythonVersion(candidate, environment)
    if (version?.major === 3 && version.minor === 13) return { command: candidate, version: version.text }
  }
  throw new Error(`未找到 Python 3.13.x，请安装后重试。已检查：${candidates.join(', ')}`)
}

function virtualEnvironmentPython() {
  return process.platform === 'win32' ? resolve(environmentPath, 'Scripts/python.exe') : resolve(environmentPath, 'bin/python')
}

const environment = proxyEnvironment()
const bootstrap = findPython(environment)
const pythonPath = virtualEnvironmentPython()

console.log(`使用 ${bootstrap.command} (${bootstrap.version}) 创建 ${environmentPath}`)
if (!existsSync(pythonPath)) commandResult(bootstrap.command, ['-m', 'venv', environmentPath], environment)
if (!existsSync(pythonPath)) throw new Error(`Python 虚拟环境创建失败：${pythonPath}`)

commandResult(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip'], environment)
commandResult(pythonPath, ['-m', 'pip', 'install', '--requirement', requirementsPath], environment)
console.log(`Docling 已安装。运行前设置：export DOCLING_PYTHON=${pythonPath}`)
