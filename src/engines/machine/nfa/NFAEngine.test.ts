// ============================================================
// NFAEngine Tests
// Tests an NFA that accepts strings containing 'ab' as substring
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { NFAEngine } from './NFAEngine'
import type { MachineDefinition } from '../core/types'

// NFA: accepts strings containing 'ab'
// q0 --a--> {q0,q1}, q0 --b--> q0, q1 --b--> q2(accept), q2 --a--> q2, q2 --b--> q2
const nfaDefinition: MachineDefinition = {
  id: 'test-nfa',
  name: 'Test NFA',
  type: 'NFA',
  language: '',
  alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 200, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 't2', from: 'q0', to: 'q0', symbols: ['b'] },
    { id: 't3', from: 'q1', to: 'q2', symbols: ['b'] },
    { id: 't4', from: 'q2', to: 'q2', symbols: ['a'] },
    { id: 't5', from: 'q2', to: 'q2', symbols: ['b'] },
  ],
}

describe('NFAEngine', () => {
  let engine: NFAEngine

  beforeEach(() => {
    engine = new NFAEngine(nfaDefinition)
  })

  it('accepts "ab"', () => {
    engine.initialize('ab')
    engine.step() // read 'a'
    const result = engine.step() // read 'b'
    expect(result.status).toBe('accepted')
  })

  it('accepts "aab"', () => {
    engine.initialize('aab')
    engine.step()
    engine.step()
    const result = engine.step()
    expect(result.status).toBe('accepted')
  })

  it('accepts "abb"', () => {
    engine.initialize('abb')
    engine.step()
    engine.step()
    const result = engine.step()
    expect(result.status).toBe('accepted')
  })

  it('rejects "b"', () => {
    engine.initialize('b')
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('rejects "ba"', () => {
    engine.initialize('ba')
    engine.step()
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('rejects empty string', () => {
    engine.initialize('')
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('tracks multiple active states in history', () => {
    engine.initialize('ab')
    engine.step()
    const history = engine.getExecutionHistory()
    // After reading 'a', NFA should be in both q0 and q1
    expect(history[0].toStateIds).toContain('q0')
    expect(history[0].toStateIds).toContain('q1')
  })

  it('resets correctly', () => {
    engine.initialize('ab')
    engine.step()
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
  })

  it('keeps the accepting frontier stable when stepped after halting', () => {
    engine.initialize('ab')
    engine.step()
    engine.step()

    const result = engine.step()
    expect(result.status).toBe('accepted')
    expect(result.activeStateIds).toContain('q2')
    expect(engine.getStatus()).toBe('accepted')
  })
})
