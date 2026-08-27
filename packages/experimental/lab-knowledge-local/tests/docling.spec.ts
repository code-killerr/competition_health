import { access } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  DoclingAdapter,
  DoclingParserError,
  type DoclingProcessRunner,
} from '../src/docling.ts'
import { LocalKnowledgeProvider } from '../src/index.ts'

const pdf = new TextEncoder().encode('%PDF-1.7\nfixture')

function runnerFor(output: unknown): DoclingProcessRunner & { readonly requests: string[] } {
  const requests: string[] = []
  return {
    requests,
    async run(request) {
      requests.push(request.inputPath)
      return { exitCode: 0, stdout: JSON.stringify(output), stderr: '' }
    },
  }
}

describe('DoclingAdapter', () => {
  it('converts headings, paragraphs, and basic tables into knowledge blocks', async () => {
    const runner = runnerFor({
      schemaVersion: 1,
      parser: { name: 'docling', version: '2.50.0' },
      blocks: [
        { kind: 'heading', location: 'page:1:item:1', content: 'Sample preparation', page: 1, level: 1 },
        { kind: 'text', location: 'page:1:item:2', content: 'Add 10 µL buffer.', page: 1, titlePath: ['Sample preparation'] },
        { kind: 'table', location: 'page:2:item:3', content: 'Tube: A | Volume: 10 µL', page: 2, titlePath: ['Sample preparation'], tableHeaders: ['Tube', 'Volume'], tableRow: 1 },
      ],
    })
    const adapter = new DoclingAdapter({ runner, runnerPath: '/trusted/docling_runner.py', pythonCommand: '/trusted/python' })

    await expect(adapter.parse({ name: 'protocol.pdf', bytes: pdf })).resolves.toEqual([
      { location: 'page:1:item:1', content: 'Sample preparation', kind: 'text', page: 1, titlePath: ['Sample preparation'] },
      { location: 'page:1:item:2', content: 'Add 10 µL buffer.', kind: 'text', page: 1, titlePath: ['Sample preparation'] },
      { location: 'page:2:item:3', content: 'Tube: A | Volume: 10 µL', kind: 'table', page: 2, titlePath: ['Sample preparation'], tableHeaders: ['Tube', 'Volume'], tableRow: 1 },
    ])
    expect(runner.requests).toHaveLength(1)
    await expect(access(runner.requests[0]!)).rejects.toThrow()
  })

  it('rejects non-PDF input before starting the runner', async () => {
    const runner = runnerFor({})
    const adapter = new DoclingAdapter({ runner })

    await expect(adapter.parse({ name: 'protocol.pdf', bytes: new TextEncoder().encode('plain text') })).rejects.toMatchObject({
      code: 'PDF_INPUT_INVALID',
      phase: 'input',
      retryable: false,
    })
    expect(runner.requests).toHaveLength(0)
  })

  it('classifies malformed and empty runner output', async () => {
    const malformed = new DoclingAdapter({ runner: runnerFor('{not-json') })
    await expect(malformed.parse({ name: 'protocol.pdf', bytes: pdf })).rejects.toMatchObject({ code: 'DOCLING_OUTPUT_INVALID', phase: 'output' })

    const empty = new DoclingAdapter({ runner: runnerFor({ schemaVersion: 1, parser: { name: 'docling', version: '2.50.0' }, blocks: [] }) })
    await expect(empty.parse({ name: 'protocol.pdf', bytes: pdf })).rejects.toMatchObject({ code: 'DOCLING_NO_TEXT', phase: 'output' })
  })

  it('maps timeout and process errors to stable parser errors', async () => {
    const timeout = new DoclingAdapter({ runner: { run: vi.fn().mockRejectedValue(new DoclingParserError('DOCLING_TIMEOUT', 'process', true, 'timed out')) } })
    await expect(timeout.parse({ name: 'protocol.pdf', bytes: pdf })).rejects.toMatchObject({ code: 'DOCLING_TIMEOUT', retryable: true })

    const failed = new DoclingAdapter({ runner: { run: vi.fn().mockResolvedValue({ exitCode: 7, stdout: '', stderr: 'docling failed' }) } })
    await expect(failed.parse({ name: 'protocol.pdf', bytes: pdf })).rejects.toMatchObject({ code: 'DOCLING_PROCESS_FAILED', phase: 'process', retryable: false })
  })

  it('persists a classified parser failure without creating searchable blocks', async () => {
    const provider = new LocalKnowledgeProvider({
      path: ':memory:',
      documentParser: new DoclingAdapter({ runner: runnerFor('{not-json') }),
    })
    const imported = await provider.importDocument({ source: { kind: 'bytes', name: 'protocol.pdf', bytes: pdf } })

    expect(imported).toMatchObject({ status: 'FAILED', errorCode: 'DOCLING_OUTPUT_INVALID' })
    await expect(provider.getImportStatus(imported.documentId, imported.versionId)).resolves.toMatchObject({
      status: 'FAILED',
      errorCode: 'DOCLING_OUTPUT_INVALID',
    })
    await expect(provider.search({ query: 'not-json', documentIds: [imported.documentId] })).resolves.toEqual([])
    await provider.dispose()
  })
})
