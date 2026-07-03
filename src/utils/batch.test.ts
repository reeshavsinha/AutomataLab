// ============================================================
// Batch runner tests — parsing the case list and running it headlessly.
// ============================================================

import { describe, it, expect } from 'vitest'
import { parseBatchCases, runBatch, batchSummary } from './batch'
import type { MachineDefinition } from '@/engines/machine/core/types'

// DFA over {a,b} accepting strings that END in 'b'.
const endsInB: MachineDefinition = {
  id: 'd', name: 'ends-in-b', type: 'DFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['b'] },
    { id: 't2', from: 'q1', to: 'q0', symbols: ['a'] },
    { id: 't3', from: 'q1', to: 'q1', symbols: ['b'] },
  ],
}

describe('parseBatchCases', () => {
  it('skips blanks/comments and reads expectation tags', () => {
    const cases = parseBatchCases('ab\n# a comment\n\nreject: a\naccept: b\nε')
    expect(cases).toHaveLength(4)
    expect(cases[0]).toEqual({ input: 'ab', expected: null, raw: 'ab' })
    expect(cases[1]).toEqual({ input: 'a', expected: 'reject', raw: 'a' })
    expect(cases[2]).toEqual({ input: 'b', expected: 'accept', raw: 'b' })
    // ε token maps to the empty string but is displayed as ε.
    expect(cases[3]).toEqual({ input: '', expected: null, raw: 'ε' })
  })

  it('supports an empty-string expectation via ε', () => {
    const cases = parseBatchCases('accept: ε')
    expect(cases[0]).toEqual({ input: '', expected: 'accept', raw: 'ε' })
  })
})

describe('runBatch', () => {
  it('runs each case and verdicts against expectations', () => {
    const cases = parseBatchCases('ab\nreject: a\naccept: b\nε')
    const results = runBatch(endsInB, cases)

    expect(results[0]).toMatchObject({ input: 'ab', accepted: true, pass: null })
    expect(results[1]).toMatchObject({ input: 'a', accepted: false, expected: 'reject', pass: true })
    expect(results[2]).toMatchObject({ input: 'b', accepted: true, expected: 'accept', pass: true })
    expect(results[3]).toMatchObject({ input: '', accepted: false, pass: null })
  })

  it('flags a failed expectation', () => {
    const results = runBatch(endsInB, parseBatchCases('accept: a'))
    expect(results[0].pass).toBe(false)
  })

  it('summarises counts', () => {
    const results = runBatch(endsInB, parseBatchCases('ab\nreject: a\naccept: b\nε'))
    const sum = batchSummary(results)
    expect(sum).toEqual({ total: 4, accepted: 2, rejected: 2, expected: 2, passed: 2, failed: 0 })
  })
})
