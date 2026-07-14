import { test, expect, describe } from 'vitest'
import {
  getReachability,
  checkEmptiness,
  checkEquivalence,
  checkInclusion
} from './analysis'
import type { MachineDefinition } from './types'

function createMachine(
  type: MachineDefinition['type'],
  states: { id: string; isStart: boolean; isAccept: boolean }[],
  transitions: { from: string; to: string; symbols: string[] }[],
  alphabet: string[] = ['a', 'b']
): MachineDefinition {
  return {
    id: 'test', name: 'Test Machine', type, language: '',
    states: states.map((s, i) => ({ ...s, label: s.id, x: 0, y: 0 })),
    transitions: transitions.map((t, i) => ({ ...t, id: `t${i}` })),
    alphabet,
  }
}

describe('Tricky Reachability', () => {
  test('disconnected machine with multiple components', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
      { id: 'q2', isStart: false, isAccept: false },
      { id: 'q3', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: ['a'] },
      { from: 'q2', to: 'q3', symbols: ['b'] },
    ])
    const res = getReachability(m)
    expect(res.unreachable.sort()).toEqual(['q2', 'q3'])
    expect(res.dead.sort()).toEqual([])
  })

  test('sink state detection', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: false },
      { id: 'q2', isStart: false, isAccept: false },
    ], [
      { from: 'q0', to: 'q1', symbols: ['a'] },
      { from: 'q1', to: 'q1', symbols: ['a', 'b'] },
      { from: 'q2', to: 'q1', symbols: ['a'] },
      { from: 'q2', to: 'q2', symbols: ['b'] },
    ])
    const res = getReachability(m)
    expect(res.unreachable.sort()).toEqual(['q2'])
    expect(res.dead.sort()).toEqual(['q0', 'q1', 'q2'])
    expect(res.sink.sort()).toEqual(['q1'])
  })
})

describe('Tricky Emptiness', () => {
  test('empty transition array is ignored', () => {
    const m = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: [] }, 
    ])
    const res = checkEmptiness(m)
    expect(res.isEmpty).toBe(true)
  })

  test('only epsilon transition', () => {
    const m = createMachine('ENFA', [
      { id: 'q0', isStart: true, isAccept: false },
      { id: 'q1', isStart: false, isAccept: true },
    ], [
      { from: 'q0', to: 'q1', symbols: [''] }, 
    ])
    const res = checkEmptiness(m)
    expect(res.isEmpty).toBe(false)
    expect(res.witness).toBe('')
  })
})

describe('Tricky Equivalence & Inclusion', () => {
  test('machine accepting all strings vs itself', () => {
    const all = createMachine('DFA', [
      { id: 'q0', isStart: true, isAccept: true },
    ], [
      { from: 'q0', to: 'q0', symbols: ['a', 'b'] }
    ])
    expect(checkEquivalence(all, all).equivalent).toBe(true)
    expect(checkInclusion(all, all).included).toBe(true)
  })

  test('epsilon-NFA inclusion', () => {
    const m1 = createMachine('ENFA', [
      { id: 'q0', isStart: true, isAccept: true },
      { id: 'q1', isStart: false, isAccept: false },
    ], [
      { from: 'q0', to: 'q1', symbols: [''] },
      { from: 'q1', to: 'q0', symbols: ['a'] },
    ])
    
    const m2 = createMachine('DFA', [
      { id: 'p0', isStart: true, isAccept: true },
      { id: 'p1', isStart: false, isAccept: false },
    ], [
      { from: 'p0', to: 'p0', symbols: ['a'] },
      { from: 'p0', to: 'p1', symbols: ['b'] },
      { from: 'p1', to: 'p1', symbols: ['a', 'b'] },
    ])
    
    expect(checkEquivalence(m1, m2).equivalent).toBe(true)
  })
})
