import { test, expect, describe } from 'vitest'
import {
  enfaToNfa,
  nfaToDfa,
  minimizeDfa,
  regexToNfa,
  cfgToPda
} from './index'
import type { MachineDefinition } from '../core/types'
import { checkEquivalence, checkEmptiness } from '../core/analysis'

function createMachine(
  type: MachineDefinition['type'],
  states: { id: string; isStart: boolean; isAccept: boolean }[],
  transitions: { from: string; to: string; symbols: string[] }[],
  alphabet: string[] = ['a', 'b']
): MachineDefinition {
  return {
    id: 'test', name: 'Test', type, language: '',
    states: states.map((s) => ({ ...s, label: s.id, x: 0, y: 0 })),
    transitions: transitions.map((t, i) => ({ ...t, id: `t${i}` })),
    alphabet,
  }
}

describe('Tricky Epsilon Elimination (enfaToNfa)', () => {
  test('epsilon loop', () => {
    const m = createMachine('ENFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: [''] },
      { from: 'q1', to: 'q0', symbols: [''] }, // Epsilon loop!
      { from: 'q1', to: 'q1', symbols: ['a'] }
    ])
    const res = enfaToNfa(m)
    const out = res.result as MachineDefinition
    expect(out.type).toBe('NFA')
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })

  test('epsilon chain to accept state', () => {
    const m = createMachine('ENFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: [''] },
      { from: 'q1', to: 'q2', symbols: [''] },
    ])
    const res = enfaToNfa(m)
    const out = res.result as MachineDefinition
    // Start state should become an accept state because it can reach q2 via epsilons.
    const start = out.states.find(s => s.isStart)
    expect(start?.isAccept).toBe(true)
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })
})

describe('Tricky Subset Construction (nfaToDfa)', () => {
  test('empty NFA (rejects all strings)', () => {
    const m = createMachine('NFA', [
      { id: 'q0', isStart: true, isAccept: false },
    ], [])
    const res = nfaToDfa(m)
    const out = res.result as MachineDefinition
    expect(out.type).toBe('DFA')
    expect(checkEmptiness(out).isEmpty).toBe(true)
  })

  test('NFA with multiple paths to the same state', () => {
    const m = createMachine('NFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: ['a'] },
      { from: 'q0', to: 'q1', symbols: ['a'] }, // Duplicate transition
      { from: 'q1', to: 'q2', symbols: ['b'] }
    ])
    const res = nfaToDfa(m)
    const out = res.result as MachineDefinition
    expect(out.type).toBe('DFA')
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })
})

describe('Tricky DFA Minimization (minimizeDfa)', () => {
  test('DFA with unreachable states', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: true },
      { id: 'q1', isStart: false, isAccept: false }, // unreachable
    ], [
      { from: 'q0', to: 'q0', symbols: ['a', 'b'] },
      { from: 'q1', to: 'q1', symbols: ['a', 'b'] }
    ])
    const res = minimizeDfa(m)
    const out = res.result as MachineDefinition
    // Should remove q1 and minimize to 1 state
    expect(out.states.length).toBe(1)
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })

  test('DFA with a single state', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: false },
    ], [
      { from: 'q0', to: 'q0', symbols: ['a', 'b'] }
    ])
    const res = minimizeDfa(m)
    const out = res.result as MachineDefinition
    expect(out.states.length).toBe(1)
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })

  test('DFA where all states are accept states', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: true },
      { id: 'q1', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: ['a', 'b'] },
      { from: 'q1', to: 'q1', symbols: ['a', 'b'] }
    ])
    const res = minimizeDfa(m)
    const out = res.result as MachineDefinition
    expect(out.states.length).toBe(1)
    expect(checkEquivalence(m, out).equivalent).toBe(true)
  })
})

describe('Tricky Regex to NFA', () => {
  test('nested kleene stars', () => {
    const res = regexToNfa('(a*)*')
    const out = res.result as MachineDefinition
    // Should accept '', 'a', 'aa', etc.
    expect(checkEmptiness(out).isEmpty).toBe(false)
  })
  
  test('empty string vs epsilon', () => {
    const res1 = regexToNfa('')
    const out1 = res1.result as MachineDefinition
    expect(checkEmptiness(out1).isEmpty).toBe(false) // accepts epsilon
    expect(checkEmptiness(out1).witness).toBe('')
    
    const res2 = regexToNfa('ε')
    const out2 = res2.result as MachineDefinition
    expect(checkEmptiness(out2).isEmpty).toBe(false) // accepts epsilon
    expect(checkEquivalence(out1, out2).equivalent).toBe(true)
  })
})

describe('Tricky CFG to PDA', () => {
  test('empty grammar', () => {
    const cfg = `S -> ε`
    const res = cfgToPda(cfg)
    const out = res.result as MachineDefinition
    expect(out.type).toBe('NPDA')
    // We cannot easily do checkEmptiness/Equivalence for PDA yet,
    // but at least it should not crash.
    expect(out.states.length).toBeGreaterThan(0)
  })
})
