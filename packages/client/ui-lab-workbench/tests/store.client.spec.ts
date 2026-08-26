import { describe, expect, it } from 'vitest'
import { textToBase64, toSnapshot } from '../src/client/api.ts'
import { createLabWorkbenchStore, firstPlanId } from '../src/client/store.ts'

describe('lab workbench client state', () => {
  it('starts with an explicit empty state and keeps draft mutations local', () => {
    const instance = createLabWorkbenchStore().create()
    expect(instance.getSnapshot()).toMatchObject({ stage: 'knowledge', experimentId: 'experiment-1', searchResults: [], conflicts: [] })
    instance.actions.setObjective('plan a controlled experiment')
    instance.actions.setStage('request')
    expect(instance.getSnapshot()).toMatchObject({ stage: 'request', objective: 'plan a controlled experiment' })
  })

  it('projects a snapshot and finds the first plan revision without service imports', () => {
    const snapshot = toSnapshot({
      knowledge: [{ documentId: 'doc-1', status: 'READY' }],
      devices: [{ id: 'device-1', status: 'READY' }],
      planReviews: [{ plan: { planId: 'plan-1', status: 'DRAFT', steps: [] } }],
    })
    expect(snapshot.knowledge[0]?.status).toBe('READY')
    expect(firstPlanId(snapshot)).toBe('plan-1')
  })

  it('encodes UTF-8 source text for the Web Consumer protocol', () => {
    const binary = atob(textToBase64('步骤,输出'))
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe('步骤,输出')
  })
})
