// ============================================================
// NPDAEngine Tests
// Verifies nondeterministic pushdown automata against known CFLs:
//   • { w wᴿ | w ∈ {a,b}* }  — even-length palindromes (NOT a DPDA language;
//     the machine must GUESS the middle, exercising true nondeterminism)
//   • { aⁿbⁿ | n ≥ 1 }       — a deterministic CFL the NPDA must also accept
// Acceptance: by final state with the input fully consumed.
// Stack convention: top = last array element; push first char ends on top.
// ============================================================

import { describe, it, expect } from 'vitest'
import { NPDAEngine } from './NPDAEngine'
import type { MachineDefinition } from '../core/types'

// ── NPDA for even-length palindromes { w wᴿ } over { a, b } ──
//   qi --(ε, ε → Z)--> q0                 push bottom marker
//   q0 --(a, ε → a)--> q0                 push input symbols (first half)
//   q0 --(b, ε → b)--> q0
//   q0 --(ε, ε → ε)--> q1                 GUESS the middle (nondeterministic)
//   q1 --(a, a → ε)--> q1                 match second half against the stack
//   q1 --(b, b → ε)--> q1
//   q1 --(ε, Z → ε)--> qf                 only Z left ⇒ matched ⇒ accept
const palindrome: MachineDefinition = {
  id: 'npda-wwr',
  name: 'even palindromes',
  type: 'NPDA',
  language: 'w w^R over {a,b}',
  alphabet: ['a', 'b'],
  states: [
    { id: 'qi', label: 'qi', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q0', label: 'q0', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'q1', label: 'q1', x: 200, y: 0, isStart: false, isAccept: false },
    { id: 'qf', label: 'qf', x: 300, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 'ti', from: 'qi', to: 'q0', symbols: [], read: '', pop: '', push: 'Z' },
    { id: 'pa', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'a' },
    { id: 'pb', from: 'q0', to: 'q0', symbols: [], read: 'b', pop: '', push: 'b' },
    { id: 'guess', from: 'q0', to: 'q1', symbols: [], read: '', pop: '', push: '' },
    { id: 'ma', from: 'q1', to: 'q1', symbols: [], read: 'a', pop: 'a', push: '' },
    { id: 'mb', from: 'q1', to: 'q1', symbols: [], read: 'b', pop: 'b', push: '' },
    { id: 'acc', from: 'q1', to: 'qf', symbols: [], read: '', pop: 'Z', push: '' },
  ],
}

// ── NPDA for { aⁿbⁿ | n ≥ 1 } (a deterministic CFL) ─────────
//   qi --(ε, ε → Z)--> q0
//   q0 --(a, ε → A)--> q0
//   q0 --(b, A → ε)--> q1
//   q1 --(b, A → ε)--> q1
//   q1 --(ε, Z → Z)--> qf
const anbn: MachineDefinition = {
  id: 'npda-anbn',
  name: 'aⁿbⁿ',
  type: 'NPDA',
  language: 'a^n b^n, n>=1',
  alphabet: ['a', 'b'],
  states: [
    { id: 'qi', label: 'qi', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q0', label: 'q0', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'q1', label: 'q1', x: 200, y: 0, isStart: false, isAccept: false },
    { id: 'qf', label: 'qf', x: 300, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'qi', to: 'q0', symbols: [], read: '', pop: '', push: 'Z' },
    { id: 't1', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'A' },
    { id: 't2', from: 'q0', to: 'q1', symbols: [], read: 'b', pop: 'A', push: '' },
    { id: 't3', from: 'q1', to: 'q1', symbols: [], read: 'b', pop: 'A', push: '' },
    { id: 't4', from: 'q1', to: 'qf', symbols: [], read: '', pop: 'Z', push: 'Z' },
  ],
}

function run(def: MachineDefinition, input: string): boolean {
  const engine = new NPDAEngine(def)
  engine.initialize(input)
  let guard = 0
  while (engine.getStatus() === 'running' && guard < 5000) {
    engine.step()
    guard++
  }
  return engine.isAccepted() === true
}

describe('NPDAEngine — even-length palindromes { w wᴿ }', () => {
  it('accepts "" (w = ε)', () => expect(run(palindrome, '')).toBe(true))
  it('accepts "aa"', () => expect(run(palindrome, 'aa')).toBe(true))
  it('accepts "bb"', () => expect(run(palindrome, 'bb')).toBe(true))
  it('accepts "abba"', () => expect(run(palindrome, 'abba')).toBe(true))
  it('accepts "baab"', () => expect(run(palindrome, 'baab')).toBe(true))
  it('accepts "aabbaa"', () => expect(run(palindrome, 'aabbaa')).toBe(true))
  it('rejects "ab" (not a palindrome)', () => expect(run(palindrome, 'ab')).toBe(false))
  it('rejects "ba"', () => expect(run(palindrome, 'ba')).toBe(false))
  it('rejects "abab"', () => expect(run(palindrome, 'abab')).toBe(false))
  it('rejects "aba" (odd length)', () => expect(run(palindrome, 'aba')).toBe(false))
  it('rejects "abb"', () => expect(run(palindrome, 'abb')).toBe(false))
})

describe('NPDAEngine — aⁿbⁿ (deterministic CFL on an NPDA)', () => {
  it('accepts "ab"', () => expect(run(anbn, 'ab')).toBe(true))
  it('accepts "aabb"', () => expect(run(anbn, 'aabb')).toBe(true))
  it('accepts "aaabbb"', () => expect(run(anbn, 'aaabbb')).toBe(true))
  it('rejects "aab"', () => expect(run(anbn, 'aab')).toBe(false))
  it('rejects "abb"', () => expect(run(anbn, 'abb')).toBe(false))
  it('rejects "ba"', () => expect(run(anbn, 'ba')).toBe(false))
  it('rejects "" (n ≥ 1 required)', () => expect(run(anbn, '')).toBe(false))
})

describe('NPDAEngine — nondeterministic branching', () => {
  it('explores multiple branches simultaneously', () => {
    const engine = new NPDAEngine(palindrome)
    engine.initialize('aa')
    engine.step() // qi --ε--> q0 (push Z)
    engine.step() // q0 forks: keep reading (q0) AND guess the middle (q1)
    const states = engine.getCurrentConfigurations().map((c) => c.stateId)
    expect(engine.getCurrentConfigurations().length).toBeGreaterThan(1)
    expect(states).toContain('q0')
    expect(states).toContain('q1')
  })

  it('exposes per-branch stacks (top = last element)', () => {
    const engine = new NPDAEngine(palindrome)
    engine.initialize('aa')
    engine.step() // push Z
    const config = engine.getCurrentConfigurations()[0]
    expect(config.stack).toEqual(['Z'])
  })

  it('resets correctly', () => {
    const engine = new NPDAEngine(palindrome)
    engine.initialize('aa')
    engine.step()
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
    expect(engine.isAccepted()).toBeNull()
    expect(engine.getCurrentConfigurations()).toEqual([])
  })

  it('does not hang on an ε-only self-loop (terminates via guards)', () => {
    const loopy: MachineDefinition = {
      id: 'npda-loop',
      name: 'eps loop',
      type: 'NPDA',
      language: '',
      alphabet: ['a'],
      states: [
        { id: 's', label: 's', x: 0, y: 0, isStart: true, isAccept: false },
      ],
      transitions: [
        { id: 'loop', from: 's', to: 's', symbols: [], read: '', pop: '', push: '' },
      ],
    }
    const engine = new NPDAEngine(loopy)
    engine.initialize('a')
    let guard = 0
    while (engine.getStatus() === 'running' && guard < 5000) {
      engine.step()
      guard++
    }
    expect(engine.isAccepted()).toBe(false)
    expect(guard).toBeLessThan(5000)
  })

  it('treats a non-BMP Unicode symbol as one input symbol', () => {
    const unicodeMachine: MachineDefinition = {
      id: 'unicode-npda',
      name: 'Unicode NPDA',
      type: 'NPDA',
      language: '',
      alphabet: ['😀'],
      states: [
        { id: 's', label: 's', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'f', label: 'f', x: 100, y: 0, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 'emoji', from: 's', to: 'f', symbols: [], read: '😀', pop: '', push: '' },
      ],
    }

    expect(run(unicodeMachine, '😀')).toBe(true)
  })

  it('can be initialized and run again without stale visited configurations', () => {
    const engine = new NPDAEngine(anbn)
    const runAgain = () => {
      engine.initialize('ab')
      let guard = 0
      while (engine.getStatus() === 'running' && guard++ < 100) engine.step()
      return engine.isAccepted()
    }

    expect(runAgain()).toBe(true)
    expect(runAgain()).toBe(true)
  })
})
