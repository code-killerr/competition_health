import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendLabCommand } from '../src/client/api.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('lab workbench browser API', () => {
  it('preserves stable provider-unavailable errors for the explicit Agent path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: { code: 'PROVIDER_UNAVAILABLE', message: 'Agent provider is not configured' },
    }), { status: 503, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendLabCommand({ command: 'snapshot', experimentId: 'experiment-1', sessionId: 'session-1' })).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      status: 503,
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ sessionId: 'session-1' })
  })
})
