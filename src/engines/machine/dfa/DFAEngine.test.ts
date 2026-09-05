// ============================================================
// DFAEngine Tests
// Tests a DFA that accepts strings over {a,b} ending in 'b'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { DFAEngine } from './DFAEngine'
import type { MachineDefinition } from '../core/types'

// DFA: accepts strings ending in 'b' over alphabet {a,b}
// q0 --a--> q0, q0 --b--> q1(accept), q1 --a--> q0, q1 --b--> q1
const dfaDefinition: MachineDefinition = {
  id: 'test-dfa',
  name: 'Test DFA',
  type: 'DFA',
  language: '',
  alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['b'] },
    { id: 't2', from: 'q1', to: 'q0', symbols: ['a'] },
    { id: 't3', from: 'q1', to: 'q1', symbols: ['b'] },
  ],
}

describe('DFAEngine', () => {
  let engine: DFAEngine

  beforeEach(() => {
    engine = new DFAEngine(dfaDefinition)
  })

  it('accepts "b"', () => {
    engine.initialize('b')
    let result = engine.step()
    expect(result.status).toBe('accepted')
    expect(engine.isAccepted()).toBe(true)
  })

  it('accepts "ab"', () => {
    engine.initialize('ab')
    engine.step() // q0 --a--> q0
    const result = engine.step() // q0 --b--> q1
    expect(result.status).toBe('accepted')
  })

  it('rejects "a"', () => {
    engine.initialize('a')
    const result = engine.step()
    expect(result.status).toBe('rejected')
    expect(engine.isAccepted()).toBe(false)
  })

  it('rejects "ba"', () => {
    engine.initialize('ba')
    engine.step() // q0 --b--> q1
    const result = engine.step() // q1 --a--> q0
    expect(result.status).toBe('rejected')
  })

  it('accepts "aab"', () => {
    engine.initialize('aab')
    engine.step()
    engine.step()
    const result = engine.step()
    expect(result.status).toBe('accepted')
  })

  it('rejects empty string (q0 is not accepting)', () => {
    engine.initialize('')
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('returns null from isAccepted() before simulation', () => {
    expect(engine.isAccepted()).toBeNull()
  })

  it('resets correctly', () => {
    engine.initialize('b')
    engine.step()
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
    expect(engine.isAccepted()).toBeNull()
  })

  it('tracks history correctly', () => {
    engine.initialize('ab')
    engine.step()
    engine.step()
    const history = engine.getExecutionHistory()
    expect(history).toHaveLength(2)
    expect(history[0].symbol).toBe('a')
    expect(history[1].symbol).toBe('b')
  })

  it('keeps the terminal result stable when stepped after acceptance', () => {
    engine.initialize('b')
    engine.step()

    expect(engine.step()).toMatchObject({ status: 'accepted', activeStateIds: ['q1'] })
    expect(engine.getStatus()).toBe('accepted')
  })

  it('handles no valid transition (stuck/reject)', () => {
    const dfaDef: MachineDefinition = {
      ...dfaDefinition,
      alphabet: ['a', 'b', 'c'],
    }
    const eng = new DFAEngine(dfaDef)
    eng.initialize('c')
    const result = eng.step()
    expect(result.status).toBe('rejected')
  })
})
