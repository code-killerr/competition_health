/** 实验 Web Facade 的 HTTP Consumer；只在显式 Web 配置中挂载。 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import { LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { parseLabWebCommand, type LabWebErrorCode } from './protocol.ts'
import { parseLabProjectConversationCommand } from './project-protocol.ts'

/** HTTP Consumer 配置。 */
export interface Config {
  /** 实验 API 的绝对路径前缀。 */
  readonly apiPath?: string
  /** 单次 JSON 请求体上限，单位为字节。 */
  readonly maxBodyBytes?: number
}

const DEFAULT_API_PATH = '/api/lab'
const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024

/** Cordis 插件名称。 */
export const name = 'lab-mvp-web-http'
/** 只依赖实验 Facade 和 Harness WebServer。 */
export const inject = ['labMvpWeb', 'webServer']

/** 挂载实验命名空间 HTTP 路由。 */
export function apply(ctx: Context, config: Config = {}): void {
  const apiPath = normalizeApiPath(config.apiPath ?? DEFAULT_API_PATH)
  const maxBodyBytes = config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1) throw new Error('lab-mvp-web-http maxBodyBytes must be a positive safe integer')
  const route: WebRoute = {
    kind: 'prefix',
    path: apiPath,
    handler: async (req, res) => { await handleRequest(ctx, maxBodyBytes, req, res) },
  }
  ctx.effect(() => ctx.webServer.register(route), 'lab-mvp-web-http: route')
}

async function handleRequest(
  ctx: Context,
  maxBodyBytes: number,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', '实验 API 只接受 POST 请求')
    return
  }
  const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    sendError(res, 415, 'INVALID_COMMAND', '请求 Content-Type 必须是 application/json')
    return
  }
  try {
    const body = await readJson(req, maxBodyBytes)
    const command = parseHttpCommand(body)
    const result = command.kind === 'project' ? await ctx.labMvpWeb.dispatchProject(command.value) : await ctx.labMvpWeb.dispatch(command.value)
    sendJson(res, 200, { ok: true, result })
  } catch (error) {
    const response = classifyError(error)
    sendError(res, response.status, response.code, response.message)
  }
}

async function readJson(req: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    size += buffer.byteLength
    if (size > maxBodyBytes) throw new HttpCommandError(413, 'PAYLOAD_TOO_LARGE', '请求体超过配置的大小限制')
    chunks.push(buffer)
  }
  if (chunks.length === 0) throw new HttpCommandError(400, 'INVALID_JSON', '请求体不能为空')
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new HttpCommandError(400, 'INVALID_JSON', '请求体不是合法 JSON')
  }
}
type HttpCommand =
  | { readonly kind: 'lab'; readonly value: ReturnType<typeof parseLabWebCommand> }
  | { readonly kind: 'project'; readonly value: ReturnType<typeof parseLabProjectConversationCommand> }

function parseHttpCommand(value: unknown): HttpCommand {
  try {
    const namespace = httpNamespace(value)
    if (namespace === 'project' || (namespace === undefined && isProjectCommand(value))) {
      return { kind: 'project', value: parseLabProjectConversationCommand(value) }
    }
    return { kind: 'lab', value: parseLabWebCommand(value) }
  } catch (error) {
    throw new HttpCommandError(400, 'INVALID_COMMAND', error instanceof Error ? error.message : String(error))
  }
}

function httpNamespace(value: unknown): 'lab' | 'project' | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const namespace = (value as Record<string, unknown>).namespace
  if (namespace === undefined) return undefined
  if (namespace !== 'lab' && namespace !== 'project') throw new Error('namespace must be lab or project')
  return namespace
}

function isProjectCommand(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const command = (value as Record<string, unknown>).command
  return typeof command === 'string' && command.startsWith('project-')
}

function classifyError(error: unknown): { readonly status: number; readonly code: LabWebErrorCode; readonly message: string } {
  if (error instanceof HttpCommandError) return error
  if (error instanceof LabProviderUnavailableError) return { status: 503, code: 'PROVIDER_UNAVAILABLE', message: error.message }
  if (error instanceof Error && errorCode(error) === 'CROSS_PROJECT_REFERENCE') return { status: 409, code: 'CROSS_PROJECT_REFERENCE', message: error.message }
  if (error instanceof Error) return { status: 409, code: 'DOMAIN_ERROR', message: error.message }
  return { status: 500, code: 'INTERNAL_ERROR', message: '实验 Web Consumer 发生未知错误' }
}

function errorCode(error: Error): string | undefined {
  const code = (error as Error & { readonly code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function sendError(res: ServerResponse, status: number, code: LabWebErrorCode, message: string): void {
  sendJson(res, status, { ok: false, error: { code, message } })
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

function normalizeApiPath(path: string): string {
  if (!/^\/[^/]+(?:\/[^/]+)*$/.test(path)) throw new Error('lab-mvp-web-http apiPath must be an absolute path without a trailing slash')
  return path
}

class HttpCommandError extends Error {
  constructor(
    readonly status: number,
    readonly code: LabWebErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'LabMvpWebHttpError'
  }
}
