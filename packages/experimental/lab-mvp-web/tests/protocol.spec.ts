import { describe, expect, it } from 'vitest'
import { parseLabWebCommand } from '../src/protocol.ts'

describe('lab Web protocol', () => {
  it('parses a typed snapshot command', () => {
    expect(parseLabWebCommand({ command: 'snapshot', experimentId: 'experiment-1' })).toEqual({
      command: 'snapshot',
      experimentId: 'experiment-1',
    })
  })

  it('decodes byte sources and trims metadata fields', () => {
    expect(parseLabWebCommand({
      command: 'knowledge-import',
      name: 'protocol.csv',
      bytesBase64: Buffer.from('step,output').toString('base64'),
      metadata: { title: '  protocol  ' },
    })).toMatchObject({
      command: 'knowledge-import',
      name: 'protocol.csv',
      metadata: { title: 'protocol' },
      bytes: new Uint8Array(Buffer.from('step,output')),
    })
  })

  it('rejects unknown commands and incomplete plan payloads', () => {
    expect(() => parseLabWebCommand({ command: 'unknown' })).toThrow(/command\.command must be one of/)
    expect(() => parseLabWebCommand({ command: 'plan-validate', planId: '' })).toThrow(/planId must be a non-blank string/)
  })
})
