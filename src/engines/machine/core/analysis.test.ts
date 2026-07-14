import { test, expect } from 'vitest'
import {
  getReachability,
  checkEmptiness,
  checkEquivalence,
  checkInclusion
} from './analysis'
import type { MachineDefinition } from './types'

function createTestMachine(
  type: MachineDefinition['type'],
  states: { id: string; isStart: boolean; isAccept: boolean }[],
  transitions: { from: string; to: string; symbols: string[] }[],
  alphabet: string[] = ['0', '1']
): MachineDefinition {
  return {
    id: 'test',
    name: 'Test Machine',
    type,
    language: '',
    states: states.map((s, i) => ({
      ...s,
      label: `q${i}`,
      x: 0,
      y: 0,
    })),
    transitions: transitions.map((t, i) => ({
      ...t,
      id: `t${i}`,
    })),
    alphabet,
  }
}

test('Reachability Analysis', () => {
  const machine = createTestMachine(
    'DFA',
    [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
      { id: 'q2', isStart: false, isAccept: false }, // Unreachable
      { id: 'q3', isStart: false, isAccept: false }, // Dead
      { id: 'q4', isStart: false, isAccept: false }, // Sink
    ],
    [
      { from: 'q0', to: 'q1', symbols: ['0'] },
      { from: 'q0', to: 'q3', symbols: ['1'] },
      { from: 'q1', to: 'q1', symbols: ['0', '1'] },
      { from: 'q3', to: 'q4', symbols: ['0', '1'] },
      { from: 'q4', to: 'q4', symbols: ['0', '1'] },
      { from: 'q2', to: 'q1', symbols: ['0', '1'] }, // Unreachable state transition
    ]
  )

  const result = getReachability(machine)
  expect(result.unreachable).toContain('q2')
  expect(result.dead).toContain('q3')
  expect(result.dead).toContain('q4')
  expect(result.sink).toContain('q4')
  expect(result.sink).not.toContain('q3') // q3 goes to q4, so it's not a sink
})

test('Emptiness Checking', () => {
  const emptyMachine = createTestMachine(
    'DFA',
    [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
    ],
    [{ from: 'q0', to: 'q1', symbols: ['0'] }]
  )
  expect(checkEmptiness(emptyMachine).isEmpty).toBe(true)

  const nonEmptyMachine = createTestMachine(
    'DFA',
    [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: true },
    ],
    [
      { from: 'q0', to: 'q1', symbols: ['0'] },
      { from: 'q1', to: 'q2', symbols: ['1'] },
    ]
  )
  const result = checkEmptiness(nonEmptyMachine)
  expect(result.isEmpty).toBe(false)
  expect(result.witness).toBe('01')
})

test('Equivalence Checking', () => {
  const m1 = createTestMachine(
    'DFA',
    [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
      { id: 'q2', isStart: false, isAccept: false },
    ],
    [
      { from: 'q0', to: 'q1', symbols: ['0'] },
      { from: 'q0', to: 'q2', symbols: ['1'] },
      { from: 'q1', to: 'q1', symbols: ['0', '1'] },
      { from: 'q2', to: 'q2', symbols: ['0', '1'] },
    ]
  ) // Accepts words starting with 0

  const m2 = createTestMachine(
    'DFA',
    [
      { id: 'p0', isStart: true, isAccept: false },
      { id: 'p1', isStart: false, isAccept: true },
    ],
    [
      { from: 'p0', to: 'p1', symbols: ['0'] },
      { from: 'p1', to: 'p1', symbols: ['0', '1'] },
    ]
  ) 
  
  expect(checkEquivalence(m1, m2).equivalent).toBe(true)

  const m3 = createTestMachine(
    'DFA',
    [
      { id: 's0', isStart: true, isAccept: false },
      { id: 's1', isStart: false, isAccept: true },
    ],
    [
      { from: 's0', to: 's1', symbols: ['1'] },
      { from: 's1', to: 's1', symbols: ['0', '1'] },
    ]
  ) // Accepts words starting with 1
  
  const result = checkEquivalence(m1, m3)
  expect(result.equivalent).toBe(false)
  expect(result.counterexample).toBe('0') // m1 accepts '0', m3 does not
})

test('Inclusion Checking', () => {
  const m1 = createTestMachine(
    'DFA',
    [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ],
    [
      { from: 'q0', to: 'q1', symbols: ['0'] },
    ]
  ) // Accepts only '0'

  const m2 = createTestMachine(
    'DFA',
    [
      { id: 'p0', isStart: true, isAccept: false },
      { id: 'p1', isStart: false, isAccept: true },
    ],
    [
      { from: 'p0', to: 'p1', symbols: ['0'] },
      { from: 'p1', to: 'p1', symbols: ['0', '1'] },
    ]
  ) // Accepts words starting with 0

  expect(checkInclusion(m1, m2).included).toBe(true)
  expect(checkInclusion(m2, m1).included).toBe(false)
  expect(checkInclusion(m2, m1).counterexample).toBe('00')
})

test('Throws on unsupported machine types (PDA/TM)', () => {
  const pda = createTestMachine('DPDA', [], [])
  const tm = createTestMachine('TM', [], [])
  const dfa = createTestMachine('DFA', [], [])

  expect(() => getReachability(pda)).toThrow(/supported for Finite Automata/)
  expect(() => checkEmptiness(tm)).toThrow(/supported for Finite Automata/)

  expect(() => checkEquivalence(pda, dfa)).toThrow(/supported for Finite Automata/)
  expect(() => checkEquivalence(dfa, tm)).toThrow(/supported for Finite Automata/)

  expect(() => checkInclusion(pda, dfa)).toThrow(/supported for Finite Automata/)
  expect(() => checkInclusion(dfa, tm)).toThrow(/supported for Finite Automata/)
})
