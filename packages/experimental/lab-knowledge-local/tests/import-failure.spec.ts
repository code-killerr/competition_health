import { describe, expect, it } from 'vitest'
import { LocalKnowledgeProvider } from '../src/index.ts'

describe('Knowledge import failures', () => {
  it('marks empty text input as failed instead of ready', async () => {
    const provider = new LocalKnowledgeProvider({ path: ':memory:' })
    const imported = await provider.importDocument({
      source: { kind: 'bytes', name: 'empty.txt', bytes: new TextEncoder().encode('\n') },
    })
    expect(imported.status).toBe('FAILED')
    await expect(provider.getImportStatus(imported.documentId, imported.versionId)).resolves.toMatchObject({ status: 'FAILED', error: 'parser returned no usable blocks' })
    await provider.dispose()
  })
})
