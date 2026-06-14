// ============================================================
// LBAEngine Tests
// An LBA is a TM whose head cannot leave the input region [0, n] (the input
// cells plus the trailing end-of-input blank). Verifies:
//   • { aⁿbⁿcⁿ | n ≥ 1 } accepted within the linear bound (same machine as TM)
//   • a head that runs off the RIGHT end halts-and-rejects (FR-8.5)
//   • a head that runs off the LEFT end halts-and-rejects
//   • the same right-runner LOOPS (stuck) on an unbounded TM — proving the
//     rejection is caused by the bound, not the machine
//   • snapshots expose the [leftBound, rightBound] window for the ⊢/⊣ markers
// ============================================================

import { describe, it, expect } from 'vitest'
import { LBAEngine } from './LBAEngine'
import { TMEngine } from '../tm/TMEngine'
import type { AutomataState, MachineDefinition, Transition } from '../core/types'

type S = Partial<AutomataState> & { id: string }
const st = (s: S): AutomataState => ({
  label: s.id, x: 0, y: 0, isStart: false, isAccept: false, ...s,
})
const tr = (
  id: string, from: string, to: string,
  read: string, write: string, direction: 'L' | 'R' | 'S'
): Transition => ({ id, from, to, symbols: [], read, write, direction })

// ── LBA for { aⁿbⁿcⁿ | n ≥ 1 } — a classic context-sensitive language ──
// Identical to the TM decider: mark a→X, b→Y, c→Z in rounds; verify Y*Z* then
// the trailing blank. It only ever uses the input cells + the end blank, so it
// stays inside the LBA's linear bound.
const anbncn: MachineDefinition = {
  id: 'lba-anbncn', name: 'aⁿbⁿcⁿ', type: 'LBA', language: 'a^n b^n c^n', alphabet: ['a', 'b', 'c'],
  states: [
    st({ id: 'q0', isStart: true }),
    st({ id: 'q1' }), st({ id: 'q2' }), st({ id: 'q3' }), st({ id: 'q4' }),
    st({ id: 'acc', isAccept: true }),
  ],
  transitions: [
    tr('a', 'q0', 'q1', 'a', 'X', 'R'),
    tr('b', 'q0', 'q4', 'Y', 'Y', 'R'),
    tr('c', 'q1', 'q1', 'a', 'a', 'R'),
    tr('d', 'q1', 'q1', 'Y', 'Y', 'R'),
    tr('e', 'q1', 'q2', 'b', 'Y', 'R'),
    tr('f', 'q2', 'q2', 'b', 'b', 'R'),
    tr('g', 'q2', 'q2', 'Z', 'Z', 'R'),
    tr('h', 'q2', 'q3', 'c', 'Z', 'L'),
    tr('i', 'q3', 'q3', 'a', 'a', 'L'),
    tr('j', 'q3', 'q3', 'b', 'b', 'L'),
    tr('k', 'q3', 'q3', 'Y', 'Y', 'L'),
    tr('l', 'q3', 'q3', 'Z', 'Z', 'L'),
    tr('m', 'q3', 'q0', 'X', 'X', 'R'),
    tr('n', 'q4', 'q4', 'Y', 'Y', 'R'),
    tr('o', 'q4', 'q4', 'Z', 'Z', 'R'),
    tr('p', 'q4', 'acc', '_', '_', 'S'),
  ],
}

// ── A machine that marches RIGHT forever (never halts on its own). ──
// On an LBA it must reject when it tries to step past the right boundary;
// on an unbounded TM it loops until the step-limit guard trips (stuck).
const rightRunner: MachineDefinition = {
  id: 'lba-right', name: 'runs right', type: 'LBA', language: '∅', alphabet: ['0', '1'],
  states: [st({ id: 'q0', isStart: true })],
  transitions: [
    tr('a', 'q0', 'q0', '0', '0', 'R'),
    tr('b', 'q0', 'q0', '1', '1', 'R'),
    tr('c', 'q0', 'q0', '_', '_', 'R'),
  ],
}

// ── A machine that marches LEFT on the first step → off the left end. ──
const leftRunner: MachineDefinition = {
  id: 'lba-left', name: 'runs left', type: 'LBA', language: '∅', alphabet: ['0', '1'],
  states: [st({ id: 'q0', isStart: true })],
  transitions: [
    tr('a', 'q0', 'q0', '0', '0', 'L'),
    tr('b', 'q0', 'q0', '1', '1', 'L'),
    tr('c', 'q0', 'q0', '_', '_', 'L'),
  ],
}

// ── Helpers ──────────────────────────────────────────────────
function run(Engine: typeof TMEngine, def: MachineDefinition, input: string, max = 100_000): TMEngine {
  const engine = new Engine(def)
  engine.initialize(input)
  let guard = 0
  while (engine.getStatus() === 'running' && guard < max) {
    engine.step()
    guard++
  }
  return engine
}
const lbaAccepts = (def: MachineDefinition, input: string) => run(LBAEngine, def, input).isAccepted() === true

describe('LBAEngine — { aⁿbⁿcⁿ } within the linear bound', () => {
  it('accepts "abc"', () => expect(lbaAccepts(anbncn, 'abc')).toBe(true))
  it('accepts "aabbcc"', () => expect(lbaAccepts(anbncn, 'aabbcc')).toBe(true))
  it('accepts "aaabbbccc"', () => expect(lbaAccepts(anbncn, 'aaabbbccc')).toBe(true))
  it('rejects "" (n ≥ 1)', () => expect(lbaAccepts(anbncn, '')).toBe(false))
  it('rejects "ab"', () => expect(lbaAccepts(anbncn, 'ab')).toBe(false))
  it('rejects "aabbc"', () => expect(lbaAccepts(anbncn, 'aabbc')).toBe(false))
  it('rejects "abcabc"', () => expect(lbaAccepts(anbncn, 'abcabc')).toBe(false))
})

describe('LBAEngine — boundary enforcement (FR-8.5)', () => {
  it('rejects when the head runs off the RIGHT end', () => {
    const e = run(LBAEngine, rightRunner, '0011')
    expect(e.getStatus()).toBe('rejected')
    expect(e.isAccepted()).toBe(false)
  })

  it('rejects when the head runs off the LEFT end', () => {
    const e = run(LBAEngine, leftRunner, '0011')
    expect(e.getStatus()).toBe('rejected')
    expect(e.isAccepted()).toBe(false)
  })

  it('the SAME right-runner only loops (stuck) on an unbounded TM', () => {
    // Proves the LBA rejection is due to the bound, not the machine itself.
    const e = run(TMEngine, { ...rightRunner, type: 'TM', stepLimit: 500 }, '0011')
    expect(e.getStatus()).toBe('stuck')
  })

  it('an empty input still gets one usable cell', () => {
    // Bound is [0, 0]; the head reads the single blank cell. rightRunner has no
    // halting move, so it rejects at the boundary rather than crashing.
    const e = run(LBAEngine, rightRunner, '')
    expect(e.getStatus()).toBe('rejected')
  })
})

describe('LBAEngine — tape snapshot exposes the bounds', () => {
  it('reports leftBound/rightBound for the ⊢/⊣ markers', () => {
    const e = new LBAEngine(anbncn)
    e.initialize('aabbcc')
    e.step()
    const tape = e.getCurrentConfigurations()[0]?.tapes?.[0]
    expect(tape?.leftBound).toBe(0)
    expect(tape?.rightBound).toBe(6) // n = 6 → head may reach the end blank at index 6
  })

  it('an unbounded TM omits the bounds', () => {
    const e = new TMEngine({ ...anbncn, type: 'TM' })
    e.initialize('aabbcc')
    e.step()
    const tape = e.getCurrentConfigurations()[0]?.tapes?.[0]
    expect(tape?.leftBound).toBeUndefined()
    expect(tape?.rightBound).toBeUndefined()
  })
})
