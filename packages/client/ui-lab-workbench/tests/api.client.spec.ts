import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseLabCommandResult, parseLabProjectCommandResult, sendLabCommand } from '../src/client/api.ts'

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
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const requestBody = typeof requestInit?.body === 'string' ? requestInit.body : '{}'
    expect(JSON.parse(requestBody) as unknown).toMatchObject({ sessionId: 'session-1' })
  })

  it('decodes explicit Agent and Project result variants at the wire boundary', () => {
    const snapshot = parseLabCommandResult({
      kind: 'snapshot',
      value: { knowledge: [], devices: [], planReviews: [] },
    })
    expect(snapshot).toMatchObject({ kind: 'snapshot', value: { knowledge: [], devices: [], planReviews: [] } })

    const project = parseLabProjectCommandResult({
      kind: 'project',
      value: {
        project: { projectId: 'project-1', workspaceId: 'workspace-1', name: 'Demo', description: '', status: 'ACTIVE', createdAt: 1, updatedAt: 1 },
        sources: [], devices: [], sessions: [], sharedFacts: [], evidence: [], experiments: [], experimentSessions: [],
      },
    })
    expect(project.kind).toBe('project')
    if (project.kind !== 'project') throw new Error('project result was not decoded')
    expect(project.value.project?.projectId).toBe('project-1')

    const context = parseLabProjectCommandResult({
      kind: 'project-context',
      value: {
        project: { projectId: 'project-1', sessionId: 'session-1', sources: [{ documentId: 'doc-1', versionId: 'version-1' }], devices: [{ deviceId: 'device-1' }], sharedFacts: [] },
        knowledgeCapability: { state: 'available' },
      },
    })
    expect(context).toMatchObject({ kind: 'project-context', value: { project: { projectId: 'project-1', sources: [{ documentId: 'doc-1' }], devices: [{ deviceId: 'device-1' }] }, knowledgeCapability: { state: 'available' } } })
  })

  it('rejects an unknown result variant before it reaches page state', () => {
    expect(() => parseLabCommandResult({ kind: 'legacy-snapshot', value: {} })).toThrow(/未知结果类型/)
    expect(() => parseLabProjectCommandResult({ kind: 'legacy-project', value: {} })).toThrow(/未知结果类型/)
  })
})
