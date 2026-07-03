// ============================================================
// TMEngine Tests
// Verifies the deterministic single-tape Turing Machine against:
//   • { 0ⁿ1ⁿ | n ≥ 0 }          (a CFL — sanity)
//   • { aⁿbⁿcⁿ | n ≥ 1 }        (context-sensitive — strictly beyond CFLs)
//   • binary increment           (transducer; left-of-origin tape growth)
//   • explicit reject state, halt-no-move reject, step-limit → stuck
// Tape convention: blank '_'; transition (read) → (write, direction).
// Acceptance: by entering an accept (halt) state.
// ============================================================

import { describe, it, expect } from 'vitest'
import { TMEngine } from './TMEngine'
import type { AutomataState, MachineDefinition, Transition } from '../core/types'

type S = Partial<AutomataState> & { id: string }
const st = (s: S): AutomataState => ({
  label: s.id, x: 0, y: 0, isStart: false, isAccept: false, ...s,
})
const tr = (
  id: string, from: string, to: string,
  read: string, write: string, direction: 'L' | 'R' | 'S'
): Transition => ({ id, from, to, symbols: [], read, write, direction })

// ── TM for { 0ⁿ1ⁿ | n ≥ 0 } ─────────────────────────────────
// Mark a 0 as X, scan right for a 1 → mark Y, scan left, repeat.
const zeroN_oneN: MachineDefinition = {
  id: 'tm-0n1n', name: '0ⁿ1ⁿ', type: 'TM', language: '0^n 1^n', alphabet: ['0', '1'],
  states: [
    st({ id: 'q0', isStart: true }),
    st({ id: 'q1' }), st({ id: 'q2' }), st({ id: 'q3' }),
    st({ id: 'acc', isAccept: true }),
  ],
  transitions: [
    tr('a', 'q0', 'q1', '0', 'X', 'R'),
    tr('b', 'q0', 'q3', 'Y', 'Y', 'R'),
    tr('c', 'q0', 'acc', '_', '_', 'S'),   // empty input (n = 0)
    tr('d', 'q1', 'q1', '0', '0', 'R'),
    tr('e', 'q1', 'q1', 'Y', 'Y', 'R'),
    tr('f', 'q1', 'q2', '1', 'Y', 'L'),
    tr('g', 'q2', 'q2', '0', '0', 'L'),
    tr('h', 'q2', 'q2', 'Y', 'Y', 'L'),
    tr('i', 'q2', 'q0', 'X', 'X', 'R'),
    tr('j', 'q3', 'q3', 'Y', 'Y', 'R'),
    tr('k', 'q3', 'acc', '_', '_', 'S'),
  ],
}

// ── TM for { aⁿbⁿcⁿ | n ≥ 1 } — context-sensitive ───────────
const anbncn: MachineDefinition = {
  id: 'tm-anbncn', name: 'aⁿbⁿcⁿ', type: 'TM', language: 'a^n b^n c^n', alphabet: ['a', 'b', 'c'],
  states: [
    st({ id: 'q0', isStart: true }),
    st({ id: 'q1' }), st({ id: 'q2' }), st({ id: 'q3' }), st({ id: 'q4' }),
    st({ id: 'acc', isAccept: true }),
  ],
  transitions: [
    tr('a', 'q0', 'q1', 'a', 'X', 'R'),
    tr('b', 'q0', 'q4', 'Y', 'Y', 'R'),
    // q1: find the first unmarked b
    tr('c', 'q1', 'q1', 'a', 'a', 'R'),
    tr('d', 'q1', 'q1', 'Y', 'Y', 'R'),
    tr('e', 'q1', 'q2', 'b', 'Y', 'R'),
    // q2: find the first unmarked c
    tr('f', 'q2', 'q2', 'b', 'b', 'R'),
    tr('g', 'q2', 'q2', 'Z', 'Z', 'R'),
    tr('h', 'q2', 'q3', 'c', 'Z', 'L'),
    // q3: walk back left to the X just written
    tr('i', 'q3', 'q3', 'a', 'a', 'L'),
    tr('j', 'q3', 'q3', 'b', 'b', 'L'),
    tr('k', 'q3', 'q3', 'Y', 'Y', 'L'),
    tr('l', 'q3', 'q3', 'Z', 'Z', 'L'),
    tr('m', 'q3', 'q0', 'X', 'X', 'R'),
    // q4: verify only Y* Z* remain, then blank
    tr('n', 'q4', 'q4', 'Y', 'Y', 'R'),
    tr('o', 'q4', 'q4', 'Z', 'Z', 'R'),
    tr('p', 'q4', 'acc', '_', '_', 'S'),
  ],
}

// ── TM: binary increment (n → n+1) ──────────────────────────
const increment: MachineDefinition = {
  id: 'tm-inc', name: 'binary +1', type: 'TM', language: 'successor', alphabet: ['0', '1'],
  states: [
    st({ id: 'q0', isStart: true }),
    st({ id: 'q1' }),
    st({ id: 'acc', isAccept: true }),
  ],
  transitions: [
    tr('a', 'q0', 'q0', '0', '0', 'R'),
    tr('b', 'q0', 'q0', '1', '1', 'R'),
    tr('c', 'q0', 'q1', '_', '_', 'L'),   // reached the right end
    tr('d', 'q1', 'q1', '1', '0', 'L'),   // carry
    tr('e', 'q1', 'acc', '0', '1', 'S'),  // no more carry
    tr('f', 'q1', 'acc', '_', '1', 'S'),  // overflow → new leading 1
  ],
}

// ── TM: explicit reject state ───────────────────────────────
const rejectState: MachineDefinition = {
  id: 'tm-rej', name: 'starts-with-a', type: 'TM', language: 'a·Σ*', alphabet: ['a', 'b'],
  states: [
    st({ id: 'q0', isStart: true }),
    st({ id: 'acc', isAccept: true }),
    st({ id: 'rej', isReject: true }),
  ],
  transitions: [
    tr('a', 'q0', 'acc', 'a', 'a', 'R'),
    tr('b', 'q0', 'rej', 'b', 'b', 'R'),
    tr('c', 'q0', 'rej', '_', '_', 'S'),
  ],
}

// ── TM: never halts (for the step-limit guard) ──────────────
const looping: MachineDefinition = {
  id: 'tm-loop', name: 'loop', type: 'TM', language: '∅', alphabet: ['0'],
  states: [st({ id: 'q0', isStart: true })],
  transitions: [
    tr('a', 'q0', 'q0', '0', '0', 'R'),
    tr('b', 'q0', 'q0', '_', '_', 'R'),
  ],
}

// ── Helpers ──────────────────────────────────────────────────
function runTM(def: MachineDefinition, input: string, max = 100_000): TMEngine {
  const engine = new TMEngine(def)
  engine.initialize(input)
  let guard = 0
  while (engine.getStatus() === 'running' && guard < max) {
    engine.step()
    guard++
  }
  return engine
}
const accepts = (def: MachineDefinition, input: string) => runTM(def, input).isAccepted() === true

/** Final tape content with blank padding trimmed off. */
function finalTape(engine: TMEngine): string {
  const tape = engine.getCurrentConfigurations()[0]?.tapes?.[0]
  if (!tape) return ''
  return tape.cells.join('').replace(/^_+/, '').replace(/_+$/, '')
}

describe('TMEngine — { 0ⁿ1ⁿ }', () => {
  it('accepts "" (n = 0)', () => expect(accepts(zeroN_oneN, '')).toBe(true))
  it('accepts "01"', () => expect(accepts(zeroN_oneN, '01')).toBe(true))
  it('accepts "0011"', () => expect(accepts(zeroN_oneN, '0011')).toBe(true))
  it('accepts "000111"', () => expect(accepts(zeroN_oneN, '000111')).toBe(true))
  it('rejects "0"', () => expect(accepts(zeroN_oneN, '0')).toBe(false))
  it('rejects "1"', () => expect(accepts(zeroN_oneN, '1')).toBe(false))
  it('rejects "001"', () => expect(accepts(zeroN_oneN, '001')).toBe(false))
  it('rejects "011"', () => expect(accepts(zeroN_oneN, '011')).toBe(false))
  it('rejects "10"', () => expect(accepts(zeroN_oneN, '10')).toBe(false))
})

describe('TMEngine — { aⁿbⁿcⁿ } (context-sensitive)', () => {
  it('accepts "abc"', () => expect(accepts(anbncn, 'abc')).toBe(true))
  it('accepts "aabbcc"', () => expect(accepts(anbncn, 'aabbcc')).toBe(true))
  it('accepts "aaabbbccc"', () => expect(accepts(anbncn, 'aaabbbccc')).toBe(true))
  it('rejects "" (n ≥ 1)', () => expect(accepts(anbncn, '')).toBe(false))
  it('rejects "ab"', () => expect(accepts(anbncn, 'ab')).toBe(false))
  it('rejects "abcc"', () => expect(accepts(anbncn, 'abcc')).toBe(false))
  it('rejects "aabbc"', () => expect(accepts(anbncn, 'aabbc')).toBe(false))
  it('rejects "abcabc"', () => expect(accepts(anbncn, 'abcabc')).toBe(false))
})

describe('TMEngine — binary increment', () => {
  it('1011 → 1100', () => {
    const e = runTM(increment, '1011')
    expect(e.isAccepted()).toBe(true)
    expect(finalTape(e)).toBe('1100')
  })
  it('111 → 1000 (carry grows the tape left of origin)', () => {
    const e = runTM(increment, '111')
    expect(e.isAccepted()).toBe(true)
    expect(finalTape(e)).toBe('1000')
  })
  it('100 → 101', () => {
    const e = runTM(increment, '100')
    expect(finalTape(e)).toBe('101')
  })
})

describe('TMEngine — reject & halting', () => {
  it('accepts via accept state ("ab…")', () => expect(accepts(rejectState, 'ab')).toBe(true))
  it('rejects via explicit reject state ("ba…")', () => {
    const e = runTM(rejectState, 'ba')
    expect(e.getStatus()).toBe('rejected')
    expect(e.isAccepted()).toBe(false)
  })
  it('halt-no-move rejects when no transition applies', () => {
    // q0 has no move on blank-after-a path beyond acc; use 0ⁿ1ⁿ "0" which
    // reaches q1 on blank with no transition.
    const e = runTM(zeroN_oneN, '0')
    expect(e.getStatus()).toBe('rejected')
  })
  it('hits the step limit → stuck', () => {
    const def = { ...looping, stepLimit: 200 }
    const e = runTM(def, '000')
    expect(e.getStatus()).toBe('stuck')
    expect(e.isAccepted()).toBe(false)
  })
})

describe('TMEngine — lifecycle', () => {
  it('exposes a tape snapshot in configurations', () => {
    const e = new TMEngine(zeroN_oneN)
    e.initialize('01')
    e.step()
    const config = e.getCurrentConfigurations()[0]
    expect(config.tapes).toBeDefined()
    expect(config.tapes![0].cells.length).toBeGreaterThan(0)
    expect(config.stateId).toBe('q1')
  })

  it('resets correctly', () => {
    const e = new TMEngine(zeroN_oneN)
    e.initialize('01')
    e.step()
    e.reset()
    expect(e.getStatus()).toBe('idle')
    expect(e.isAccepted()).toBeNull()
    expect(e.getCurrentConfigurations()).toEqual([])
  })

  it('errors when there is no start state', () => {
    const e = new TMEngine({ ...zeroN_oneN, states: zeroN_oneN.states.map((s) => ({ ...s, isStart: false })) })
    e.initialize('01')
    expect(e.getStatus()).toBe('error')
  })
})

// ── Multi-tape TM for { aⁿbⁿ | n ≥ 0 } (Phase 3D) ────────────
// Tape 1 = input; tape 2 = a counter. Copy each 'a' onto tape 2 (heads move R
// together), then on the first 'b' rewind tape 2 one cell and match every 'b'
// against an 'a' while retreating tape 2. Accept when both tapes hit blank.
const mtr = (
  id: string, from: string, to: string,
  reads: string[], writes: string[], directions: ('L' | 'R' | 'S')[]
): Transition => ({ id, from, to, symbols: [], reads, writes, directions })

const anbn2: MachineDefinition = {
  id: 'tm2-anbn', name: 'aⁿbⁿ (2-tape)', type: 'TM', language: 'a^n b^n',
  alphabet: ['a', 'b'], tapeCount: 2,
  states: [
    st({ id: 'qs', isStart: true }),
    st({ id: 'q0' }),
    st({ id: 'q1' }),
    st({ id: 'acc', isAccept: true }),
  ],
  transitions: [
    // qs (start): empty input accepts; the first 'a' begins the copy loop. With
    // no 'a' first, a stray 'b' has no move → reject. (Distinguishing n = 0 from
    // "copied a's but no b" needs this dedicated start state.)
    mtr('s0', 'qs', 'acc', ['_', '_'], ['_', '_'], ['S', 'S']),
    mtr('s1', 'qs', 'q0', ['a', '_'], ['a', 'a'], ['R', 'R']),
    // q0: copy remaining a's onto tape 2 (no (_,_) move → a's without b's reject)
    mtr('a', 'q0', 'q0', ['a', '_'], ['a', 'a'], ['R', 'R']),
    // first b: stay on tape 1, rewind tape 2 to the last 'a'
    mtr('b', 'q0', 'q1', ['b', '_'], ['b', '_'], ['S', 'L']),
    // q1: match each b against an a, advancing tape 1, retreating tape 2
    mtr('d', 'q1', 'q1', ['b', 'a'], ['b', 'a'], ['R', 'L']),
    // both exhausted → accept
    mtr('e', 'q1', 'acc', ['_', '_'], ['_', '_'], ['S', 'S']),
  ],
}

describe('TMEngine — multi-tape { aⁿbⁿ }', () => {
  it('accepts "" (n = 0)', () => expect(accepts(anbn2, '')).toBe(true))
  it('accepts "ab"', () => expect(accepts(anbn2, 'ab')).toBe(true))
  it('accepts "aabb"', () => expect(accepts(anbn2, 'aabb')).toBe(true))
  it('accepts "aaabbb"', () => expect(accepts(anbn2, 'aaabbb')).toBe(true))
  it('rejects "a"', () => expect(accepts(anbn2, 'a')).toBe(false))
  it('rejects "b"', () => expect(accepts(anbn2, 'b')).toBe(false))
  it('rejects "aab"', () => expect(accepts(anbn2, 'aab')).toBe(false))
  it('rejects "abb"', () => expect(accepts(anbn2, 'abb')).toBe(false))
  it('rejects "ba"', () => expect(accepts(anbn2, 'ba')).toBe(false))

  it('exposes one snapshot per tape', () => {
    const e = new TMEngine(anbn2)
    e.initialize('aabb')
    e.step()
    const tapes = e.getCurrentConfigurations()[0]?.tapes
    expect(tapes).toBeDefined()
    expect(tapes!.length).toBe(2)
  })

  it('runs the counter on tape 2 while leaving the input on tape 1', () => {
    const e = new TMEngine(anbn2)
    e.initialize('aabb')
    e.step() // copies the first 'a' onto tape 2 and moves both heads right
    const [t1, t2] = e.getCurrentConfigurations()[0]!.tapes!
    expect(t1.cells.join('')).toContain('a')
    expect(t2.cells.join('')).toContain('a')
  })
})
