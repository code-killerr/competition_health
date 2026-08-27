import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LocalSubprocess from '@deepseek-ai/dsh-subprocess-local'
import { createDoclingAdapter } from '../src/docling.ts'
import { availablePdfKnowledgeFixtures, readPdfKnowledgeFixture } from './pdf-knowledge-fixtures.ts'

const contexts: Context[] = []
const pythonCommand = process.env.DOCLING_PYTHON

afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe('real Docling runtime', () => {
  it.skipIf(pythonCommand === undefined)('parses a real PDF fixture when DOCLING_PYTHON is configured', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(LocalSubprocess)
    const adapter = createDoclingAdapter(ctx, pythonCommand === undefined ? {} : { pythonCommand })
    const fixture = availablePdfKnowledgeFixtures()[0]
    if (fixture === undefined) return
    const bytes = await readPdfKnowledgeFixture(fixture)
    const blocks = await adapter.parse({ name: fixture.fileName, bytes })

    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks.some(block => block.page !== undefined)).toBe(true)
    expect(blocks.every(block => block.location.length > 0 && block.content.length > 0)).toBe(true)
  }, 600_000)
})
