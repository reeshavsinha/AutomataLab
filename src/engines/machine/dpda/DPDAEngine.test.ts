// ============================================================
// DPDAEngine Tests
// Verifies deterministic pushdown automata against known CFLs:
//   • { aⁿbⁿ | n ≥ 1 }
//   • balanced parentheses
// Both machines push a bottom marker Z first, then accept via an ε-move
// that fires only when the matching is complete (top of stack is Z again).
// Stack convention: top = last array element; push first char ends on top.
// Acceptance: by final state with the input fully consumed.
// ============================================================

import { describe, it, expect } from 'vitest'
import { DPDAEngine } from './DPDAEngine'
import type { MachineDefinition } from '../core/types'

// ── DPDA for { aⁿbⁿ | n ≥ 1 } ───────────────────────────────
//   qi --(ε, ε → Z)--> q0
//   q0 --(a, ε → A)--> q0        push an A per a
//   q0 --(b, A → ε)--> q1        first b pops an A
//   q1 --(b, A → ε)--> q1        each further b pops an A
//   q1 --(ε, Z → Z)--> qf        only Z left ⇒ matched ⇒ accept
const anbn: MachineDefinition = {
  id: 'dpda-anbn',
  name: 'aⁿbⁿ',
  type: 'DPDA',
  language: 'a^n b^n, n>=1',
  alphabet: ['a', 'b'],
  states: [
    { id: 'qi', label: 'qi', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q0', label: 'q0', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'q1', label: 'q1', x: 200, y: 0, isStart: false, isAccept: false },
    { id: 'qf', label: 'qf', x: 300, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 'ti', from: 'qi', to: 'q0', symbols: [], read: '', pop: '', push: 'Z' },
    { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'A' },
    { id: 't1', from: 'q0', to: 'q1', symbols: [], read: 'b', pop: 'A', push: '' },
    { id: 't2', from: 'q1', to: 'q1', symbols: [], read: 'b', pop: 'A', push: '' },
    { id: 't3', from: 'q1', to: 'qf', symbols: [], read: '', pop: 'Z', push: 'Z' },
  ],
}

// ── DPDA for balanced parentheses over { (, ) } ─────────────
//   si --(ε, ε → Z)--> p
//   p  --( '(', ε → X )--> p     push X per '('
//   p  --( ')', X → ε )--> p     pop X per ')'
//   p  --( ε,  Z → Z )--> pf     only Z left ⇒ balanced ⇒ accept
// (The ε-accept move is listed last so the engine prefers shifting while input
//  remains; this language genuinely needs an endmarker to be a strict DPDA.)
const balanced: MachineDefinition = {
  id: 'dpda-balanced',
  name: 'balanced parens',
  type: 'DPDA',
  language: 'balanced ()',
  alphabet: ['(', ')'],
  states: [
    { id: 'si', label: 'si', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'p', label: 'p', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'pf', label: 'pf', x: 200, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 'bi', from: 'si', to: 'p', symbols: [], read: '', pop: '', push: 'Z' },
    { id: 'bo', from: 'p', to: 'p', symbols: [], read: '(', pop: '', push: 'X' },
    { id: 'bc', from: 'p', to: 'p', symbols: [], read: ')', pop: 'X', push: '' },
    { id: 'ba', from: 'p', to: 'pf', symbols: [], read: '', pop: 'Z', push: 'Z' },
  ],
}

function run(def: MachineDefinition, input: string): boolean {
  const engine = new DPDAEngine(def)
  engine.initialize(input)
  let guard = 0
  while (engine.getStatus() === 'running' && guard < 1000) {
    engine.step()
    guard++
  }
  return engine.isAccepted() === true
}

describe('DPDAEngine — aⁿbⁿ', () => {
  it('accepts "ab"', () => expect(run(anbn, 'ab')).toBe(true))
  it('accepts "aabb"', () => expect(run(anbn, 'aabb')).toBe(true))
  it('accepts "aaabbb"', () => expect(run(anbn, 'aaabbb')).toBe(true))
  it('rejects "aab" (too few b)', () => expect(run(anbn, 'aab')).toBe(false))
  it('rejects "abb" (too many b)', () => expect(run(anbn, 'abb')).toBe(false))
  it('rejects "aabbb"', () => expect(run(anbn, 'aabbb')).toBe(false))
  it('rejects "ba" (wrong order)', () => expect(run(anbn, 'ba')).toBe(false))
  it('rejects "" (n ≥ 1 required)', () => expect(run(anbn, '')).toBe(false))
})

describe('DPDAEngine — balanced parentheses', () => {
  it('accepts "" (empty)', () => expect(run(balanced, '')).toBe(true))
  it('accepts "()"', () => expect(run(balanced, '()')).toBe(true))
  it('accepts "(())"', () => expect(run(balanced, '(())')).toBe(true))
  it('accepts "()()"', () => expect(run(balanced, '()()')).toBe(true))
  it('accepts "(()())"', () => expect(run(balanced, '(()())')).toBe(true))
  it('rejects "("', () => expect(run(balanced, '(')).toBe(false))
  it('rejects ")("', () => expect(run(balanced, ')(')).toBe(false))
  it('rejects "(()"', () => expect(run(balanced, '(()')).toBe(false))
})

describe('DPDAEngine — lifecycle', () => {
  it('exposes the stack in configurations (top = last element)', () => {
    const engine = new DPDAEngine(anbn)
    engine.initialize('aabb')
    engine.step() // ε: push Z  → [Z]
    engine.step() // a: push A  → [Z, A]
    engine.step() // a: push A  → [Z, A, A]
    const config = engine.getCurrentConfigurations()[0]
    expect(config.stack).toEqual(['Z', 'A', 'A'])
    expect(config.stateId).toBe('q0')
  })

  it('resets correctly', () => {
    const engine = new DPDAEngine(anbn)
    engine.initialize('ab')
    engine.step()
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
    expect(engine.isAccepted()).toBeNull()
    expect(engine.getCurrentConfigurations()).toEqual([])
  })

  it('stops before a single transition can exceed the stack-depth cap', () => {
    const pushOverflow: MachineDefinition = {
      id: 'dpda-stack-overflow',
      name: 'stack overflow guard',
      type: 'DPDA',
      language: '',
      alphabet: [],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
      ],
      transitions: [
        {
          id: 'push',
          from: 'q0',
          to: 'q0',
          symbols: [],
          read: '',
          pop: '',
          push: 'A'.repeat(10_001),
        },
      ],
    }

    const engine = new DPDAEngine(pushOverflow)
    engine.initialize('')
    const result = engine.step()

    expect(result.status).toBe('stuck')
    expect(result.stack).toEqual([])
  })
})
