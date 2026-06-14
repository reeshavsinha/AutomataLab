// ============================================================
// fileManager — loader robustness against malformed / untrusted files.
// `parseMachineJson` is the single trust boundary for opened files, so it must
// reject garbage with a clear Error (never a raw TypeError / crash) and sanitise
// every field it does accept.
// ============================================================

import { describe, it, expect } from 'vitest'
import { parseMachineJson, exportMachineJSON } from './fileManager'
import type { MachineDefinition } from '@/engines/core/types'

describe('parseMachineJson — rejects malformed input cleanly', () => {
  it('non-object JSON (null / primitives / arrays) → friendly error, not a TypeError', () => {
    for (const bad of ['null', '42', '"hi"', 'true', '[]', '[1,2,3]']) {
      expect(() => parseMachineJson(bad), `for ${bad}`).toThrowError(/Invalid machine file/)
    }
  })

  it('invalid JSON syntax → friendly error', () => {
    expect(() => parseMachineJson('{ not json')).toThrowError(/not valid JSON/)
    expect(() => parseMachineJson('')).toThrowError(/not valid JSON/)
  })

  it('missing required fields → friendly error', () => {
    expect(() => parseMachineJson('{"type":"DFA"}')).toThrowError(/missing required fields/)
    expect(() => parseMachineJson('{"states":[],"transitions":[]}')).toThrowError(
      /missing required fields/
    )
  })

  it('unknown machine type → friendly error', () => {
    expect(() =>
      parseMachineJson('{"type":"XYZ","states":[],"transitions":[]}')
    ).toThrowError(/unknown machine type/)
  })

  it('does not pollute Object.prototype via a crafted __proto__ key', () => {
    parseMachineJson(
      '{"type":"DFA","states":[],"transitions":[],"__proto__":{"polluted":true}}'
    )
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('parseMachineJson — sanitises accepted fields', () => {
  it('coerces / drops malformed state, transition and metadata fields', () => {
    const json = JSON.stringify({
      type: 'DFA',
      name: 123, // not a string → must fall back to a string name
      language: { nope: 1 }, // not a string → ''
      states: [{ id: 5, label: null, x: 'NaN', y: 10, isStart: 'yes', evil: 1 }],
      transitions: [{ from: 1, to: 2, symbols: [1, 'a', null] }],
      alphabet: ['a', 2, null],
    })
    const back = parseMachineJson(json)

    expect(typeof back.name).toBe('string')
    expect(typeof back.language).toBe('string')

    const s = back.states[0]
    expect(typeof s.id).toBe('string') // numeric id → generated string id
    expect(s.label).toBe('') // null → ''
    expect(s.x).toBe(0) // 'NaN' → 0
    expect(s.y).toBe(10)
    expect(s.isStart).toBe(true) // 'yes' is truthy
    expect((s as unknown as Record<string, unknown>).evil).toBeUndefined() // unknown field dropped

    const t = back.transitions[0]
    expect(typeof t.id).toBe('string')
    expect(t.from).toBe('1') // String(1)
    expect(t.to).toBe('2')
    expect(t.symbols).toEqual(['1', 'a', 'null']) // every symbol coerced to string

    expect(back.alphabet).toEqual(['a', '2', 'null'])
  })

  it('rejects a negative / zero step limit and a tape count ≤ 1', () => {
    const json = JSON.stringify({
      type: 'TM',
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true }],
      transitions: [],
      alphabet: ['a'],
      stepLimit: -5,
      tapeCount: 0,
    })
    const back = parseMachineJson(json)
    expect(back.stepLimit).toBeUndefined()
    expect(back.tapeCount).toBeUndefined()
  })
})

describe('exportMachineJSON ↔ parseMachineJson round-trip', () => {
  it('preserves states, transitions and alphabet (machine id is regenerated)', () => {
    const m: MachineDefinition = {
      id: 'orig-id',
      name: 'Round Trip',
      type: 'DPDA',
      language: 'aⁿbⁿ',
      states: [
        { id: 'q0', label: 'q0', x: 10, y: 20, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 30, y: 40, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: '', push: 'A' },
      ],
      alphabet: ['a', 'b'],
      stackAlphabet: ['A', 'Z'],
    }
    const back = parseMachineJson(exportMachineJSON(m))

    expect(back.type).toBe(m.type)
    expect(back.name).toBe(m.name)
    expect(back.language).toBe(m.language)
    expect(back.states).toEqual(m.states)
    expect(back.transitions).toEqual(m.transitions)
    expect(back.alphabet).toEqual(m.alphabet)
    expect(back.stackAlphabet).toEqual(m.stackAlphabet)
    expect(back.id).not.toBe(m.id) // a fresh id is always assigned on load
  })
})
