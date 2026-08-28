import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { Context } from '@deepseek-ai/cordis'
import { LabProviderUnavailableError } from '@deepseek-ai/dsh-experimental-lab-domain'
import { LabProjectReferenceError } from '@deepseek-ai/dsh-experimental-lab-project'
import type { WebRoute, WebServer } from '@deepseek-ai/dsh-host-webserver'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LabMvpWebService } from '../src/index.ts'
import { apply, inject } from '../src/http.ts'

const contexts: Context[] = []

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('lab Web HTTP Consumer', () => {
  it('registers and disposes the namespaced route', async () => {
    const routes: WebRoute[] = []
    const ctx = setupContext(routes)
    await mount(ctx)
    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({ kind: 'prefix', path: '/api/lab' })
    await ctx.fiber.dispose()
    expect(routes).toHaveLength(0)
  })

  it('rejects malformed requests before the Facade is called', async () => {
    const routes: WebRoute[] = []
    const dispatch = vi.fn()
    const ctx = setupContext(routes, dispatch)
    await mount(ctx)
    const response = fakeResponse()
    await routes[0]!.handler(fakeRequest('GET', '{}'), response.response)
    expect(response.state.status).toBe(405)
    expect(dispatch).not.toHaveBeenCalled()

    const invalid = fakeResponse()
    await routes[0]!.handler(fakeRequest('POST', '{not-json}'), invalid.response)
    expect(invalid.state.status).toBe(400)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches a valid JSON command and returns a typed envelope', async () => {
    const routes: WebRoute[] = []
    const dispatch = vi.fn().mockResolvedValue({ kind: 'snapshot', value: { knowledge: [] } })
    const ctx = setupContext(routes, dispatch)
    await mount(ctx)
    const response = fakeResponse()
    await routes[0]!.handler(fakeRequest('POST', JSON.stringify({ command: 'snapshot', experimentId: 'experiment-1' })), response.response)
    expect(response.state.status).toBe(200)
    expect(JSON.parse(response.state.body ?? '')).toEqual({
      ok: true,
      result: { kind: 'snapshot', value: { knowledge: [] } },
    })
    expect(dispatch).toHaveBeenCalledWith({ command: 'snapshot', experimentId: 'experiment-1' })
  })

  it('routes experiment, run and artifact page commands to the project facade', async () => {
    const routes: WebRoute[] = []
    const dispatchProject = vi.fn().mockResolvedValue({ kind: 'run-list', value: [] })
    const ctx = setupContext(routes, vi.fn(), dispatchProject)
    await mount(ctx)
    const response = fakeResponse()

    await routes[0]!.handler(fakeRequest('POST', JSON.stringify({ namespace: 'project', command: 'run-list', experimentId: 'experiment-1' })), response.response)

    expect(response.state.status).toBe(200)
    expect(JSON.parse(response.state.body ?? '')).toMatchObject({ ok: true, result: { kind: 'run-list', value: [] } })
    expect(dispatchProject).toHaveBeenCalledWith({ command: 'run-list', experimentId: 'experiment-1' })
  })

  it('maps an unavailable provider to a retriable service response', async () => {
    const routes: WebRoute[] = []
    const dispatch = vi.fn().mockRejectedValue(new LabProviderUnavailableError('lab-knowledge'))
    const ctx = setupContext(routes, dispatch)
    await mount(ctx)
    const response = fakeResponse()
    await routes[0]!.handler(fakeRequest('POST', JSON.stringify({ command: 'snapshot', experimentId: 'experiment-1' })), response.response)
    expect(response.state.status).toBe(503)
    expect(JSON.parse(response.state.body ?? '')).toMatchObject({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE' } })
  })
  it('maps a cross-project reference to a stable domain response', async () => {
    const routes: WebRoute[] = []
    const dispatch = vi.fn().mockRejectedValue(new LabProjectReferenceError('session belongs to another project'))
    const ctx = setupContext(routes, dispatch)
    await mount(ctx)
    const response = fakeResponse()
    await routes[0]!.handler(fakeRequest('POST', JSON.stringify({ command: 'snapshot', experimentId: 'experiment-1' })), response.response)
    expect(response.state.status).toBe(409)
    expect(JSON.parse(response.state.body ?? '')).toMatchObject({ ok: false, error: { code: 'CROSS_PROJECT_REFERENCE' } })
  })
})

function setupContext(
  routes: WebRoute[],
  dispatch = vi.fn().mockResolvedValue({ kind: 'snapshot', value: {} }),
  dispatchProject = vi.fn().mockResolvedValue({ kind: 'project-list', value: [] }),
): Context {
  const ctx = new Context()
  contexts.push(ctx)
  ctx.provide('webServer', fakeWebServer(routes) as WebServer)
  ctx.provide('labMvpWeb', { dispatch, dispatchProject } as unknown as LabMvpWebService)
  return ctx
}

async function mount(ctx: Context): Promise<void> {
  const fiber = ctx.plugin({ inject, apply })
  await fiber.await()
}

function fakeWebServer(routes: WebRoute[]): Pick<WebServer, 'register'> {
  return {
    register(route) {
      routes.push(route)
      return () => {
        const index = routes.indexOf(route)
        if (index !== -1) routes.splice(index, 1)
      }
    },
  }
}

function fakeRequest(method: string, body: string): IncomingMessage {
  const request = Readable.from([Buffer.from(body)]) as unknown as IncomingMessage
  Object.assign(request, { method, url: '/api/lab', headers: { 'content-type': 'application/json' } })
  return request
}

function fakeResponse(): { response: ServerResponse; state: { status?: number; body?: string } } {
  const state: { status?: number; body?: string } = {}
  const chunks: Buffer[] = []
  const response = Object.assign(new EventEmitter(), {
    writeHead(status: number) { state.status = status; return this },
    end(value?: string) {
      if (value !== undefined) chunks.push(Buffer.from(value))
      state.body = Buffer.concat(chunks).toString('utf8')
      return this
    },
  }) as unknown as ServerResponse
  return { response, state }
}
