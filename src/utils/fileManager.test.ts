// ============================================================
// fileManager — loader robustness against malformed / untrusted files.
// `parseMachineJson` is the single trust boundary for opened files, so it must
// reject garbage with a clear Error (never a raw TypeError / crash) and sanitise
// every field it does accept.
// ============================================================

import { describe, it, expect } from 'vitest'
import { parseMachineJson, exportMachineJSON } from './fileManager'
import type { MachineDefinition } from '@/engines/machine/core/types'

describe('parseMachineJson — rejects malformed input cleanly', () => {
  it('non-object JSON (null / primitives / arrays) → friendly error, not a TypeError', () => {
    for (const bad of ['null', '42', '"hi"', 'true', '[]', '[1,2,3]']) {
      expect(() => parseMachineJson(bad), `for ${bad}`).toThrowError(/Expected a machine object/)
    }
  })

  it('invalid JSON syntax → friendly error', () => {
    expect(() => parseMachineJson('{ not json')).toThrowError(/Not a valid JSON file/)
    expect(() => parseMachineJson('')).toThrowError(/Not a valid JSON file/)
  })

  it('missing required fields → friendly error', () => {
    expect(() => parseMachineJson('{"type":"DFA"}')).toThrowError(/Missing required fields/)
    expect(() => parseMachineJson('{"states":[],"transitions":[]}')).toThrowError(
      /Missing required fields/
    )
  })

  it('unknown machine type → friendly error', () => {
    expect(() =>
      parseMachineJson('{"type":"XYZ","states":[],"transitions":[]}')
    ).toThrowError(/Unknown machine type/)
  })

  it('rejects a project file from a newer major format', () => {
    expect(() =>
      parseMachineJson('{"version":3,"type":"DFA","states":[],"transitions":[]}')
    ).toThrowError(/newer than this application supports/)
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
      states: [{ id: '5', label: null, x: 'NaN', y: 10, isStart: 'yes', evil: 1 }],
      transitions: [{ from: '5', to: '5', symbols: [1, 'a', null] }],
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
    expect(t.from).toBe('5') // String(5)
    expect(t.to).toBe('5')
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

  it('caps step limits and rejects tape counts that could exhaust memory', () => {
    const base = {
      type: 'TM',
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true }],
      transitions: [],
      alphabet: [],
    }

    expect(parseMachineJson(JSON.stringify({ ...base, stepLimit: 1_000_000 })).stepLimit).toBe(100_000)
    expect(() => parseMachineJson(JSON.stringify({ ...base, tapeCount: 1_000_000 }))).toThrow(
      /Tape count cannot exceed 9/
    )
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

  it('preserves grammar/parser fields and writes the stable file contract', () => {
    const parser: MachineDefinition = {
      id: 'parser-id',
      name: 'Expression Parser',
      type: 'CFG_PARSER',
      language: '',
      states: [],
      transitions: [],
      alphabet: [],
      grammarText: 'E -> id',
      parserAlgorithm: 'LL1',
      parserInput: 'id',
      activeViewMode: 'table',
      grammarDerivationInput: 'id',
      grammarSamplerMaxLength: '8',
      grammarSamplerMaxSteps: '100',
    }

    const serialized = exportMachineJSON(parser)
    expect(JSON.parse(serialized)).toMatchObject({
      version: 2,
      workspaceType: 'parser',
    })

    const back = parseMachineJson(serialized)
    expect(back.type).toBe('CFG_PARSER')
    expect(back.grammarText).toBe(parser.grammarText)
    expect(back.parserAlgorithm).toBe(parser.parserAlgorithm)
    expect(back.parserInput).toBe(parser.parserInput)
    expect(back.activeViewMode).toBe('table')
    expect(back.grammarDerivationInput).toBe(parser.grammarDerivationInput)
    expect(back.grammarSamplerMaxLength).toBe(parser.grammarSamplerMaxLength)
    expect(back.grammarSamplerMaxSteps).toBe(parser.grammarSamplerMaxSteps)
  })

  it('preserves Mealy/Moore output metadata', () => {
    const transducer: MachineDefinition = {
      id: 'mealy-id',
      name: 'Parity Mealy',
      type: 'MEALY',
      language: '',
      alphabet: ['a'],
      outputAlphabet: ['0', '1'],
      initialOutput: '0',
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true }],
      transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: ['a'], output: '1' }],
    }
    const back = parseMachineJson(exportMachineJSON(transducer))
    expect(back.outputAlphabet).toEqual(['0', '1'])
    expect(back.initialOutput).toBe('0')
    expect(back.states[0].output).toBeUndefined()
    expect(back.transitions[0].output).toBe('1')
  })
})
