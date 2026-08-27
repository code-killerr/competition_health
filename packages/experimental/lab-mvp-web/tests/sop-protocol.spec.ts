import { describe, expect, it } from 'vitest'
import { parseLabWebCommand } from '../src/protocol.ts'

describe('lab Web SOP protocol', () => {
  it('parses a cited SOP draft and publication command', () => {
    const draft = parseLabWebCommand({
      command: 'knowledge-sop-create',
      title: '  Alpha protocol  ',
      steps: [{ order: 1, title: 'Calibrate', instruction: 'Calibrate sample', citations: ['citation-block-1'] }],
    })
    expect(draft).toMatchObject({ command: 'knowledge-sop-create', title: 'Alpha protocol', steps: [{ citations: ['citation-block-1'], requiredInputs: [], completionCriteria: [], missingFields: [] }] })
    expect(parseLabWebCommand({ command: 'knowledge-sop-publish', draftId: 'sop-draft-1', publishedBy: 'reviewer' })).toMatchObject({
      command: 'knowledge-sop-publish',
      draftId: 'sop-draft-1',
      publishedBy: 'reviewer',
    })
  })

  it('rejects incomplete SOP steps and blank publication actors', () => {
    expect(() => parseLabWebCommand({ command: 'knowledge-sop-create', title: 'SOP', steps: [{ order: 1, title: '', instruction: 'Do it', citations: [] }] })).toThrow(/title/)
    expect(() => parseLabWebCommand({ command: 'knowledge-sop-publish', draftId: 'sop-draft-1', publishedBy: ' ' })).toThrow(/publishedBy/)
  })
})
