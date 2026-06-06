// ============================================================
// ENFAEngine Tests
// Tests an ε-NFA. Uses epsilon transitions to demonstrate closure.
// Machine: accepts strings over {a,b} containing exactly one 'a'
// ε-NFA structure: q0 --ε--> q1, q1 --a--> q2, q2 --ε--> q3(accept)
//                  q0 --b--> q0, q3 --b--> q3
// Simpler test: ε-NFA equivalent to DFA accepting strings ending in 'b'
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { ENFAEngine } from './ENFAEngine'
import type { MachineDefinition } from '../core/types'

// ε-NFA: accepts "a" or "b" (simpler machine with ε-transitions)
// q0 --ε--> q1, q0 --ε--> q2
// q1 --a--> q3 (accept), q2 --b--> q4 (accept)
const enfaDefinition: MachineDefinition = {
  id: 'test-enfa',
  name: 'Test ε-NFA',
  type: 'ENFA',
  language: '',
  alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 100, y: 100, isStart: false, isAccept: false },
    { id: 'q3', label: 'q3', x: 200, y: 0, isStart: false, isAccept: true },
    { id: 'q4', label: 'q4', x: 200, y: 100, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: ['ε'] },
    { id: 't1', from: 'q0', to: 'q2', symbols: ['ε'] },
    { id: 't2', from: 'q1', to: 'q3', symbols: ['a'] },
    { id: 't3', from: 'q2', to: 'q4', symbols: ['b'] },
  ],
}

describe('ENFAEngine', () => {
  let engine: ENFAEngine

  beforeEach(() => {
    engine = new ENFAEngine(enfaDefinition)
  })

  it('initial ε-closure includes q0, q1, q2', () => {
    engine.initialize('a')
    const configs = engine.getCurrentConfigurations()
    const stateIds = configs[0].stateIds
    expect(stateIds).toContain('q0')
    expect(stateIds).toContain('q1')
    expect(stateIds).toContain('q2')
  })

  it('accepts "a"', () => {
    engine.initialize('a')
    const result = engine.step()
    expect(result.status).toBe('accepted')
    expect(engine.isAccepted()).toBe(true)
  })

  it('accepts "b"', () => {
    engine.initialize('b')
    const result = engine.step()
    expect(result.status).toBe('accepted')
  })

  it('rejects "ab"', () => {
    engine.initialize('ab')
    engine.step()
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('rejects empty string', () => {
    engine.initialize('')
    const result = engine.step()
    expect(result.status).toBe('rejected')
  })

  it('resets correctly', () => {
    engine.initialize('a')
    engine.step()
    engine.reset()
    expect(engine.getStatus()).toBe('idle')
    expect(engine.isAccepted()).toBeNull()
  })

  it('handles lambda (λ) transitions exactly like epsilon (ε)', () => {
    const lambdaEnfaDef: MachineDefinition = {
      id: 'test-lambda-enfa',
      name: 'Test λ-NFA',
      type: 'ENFA',
      language: '',
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
        { id: 'q2', label: 'q2', x: 200, y: 0, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q1', symbols: ['λ'] },
        { id: 't1', from: 'q1', to: 'q2', symbols: ['a'] },
      ],
    }
    const lambdaEngine = new ENFAEngine(lambdaEnfaDef)
    lambdaEngine.initialize('a')
    const configs = lambdaEngine.getCurrentConfigurations()
    const stateIds = configs[0].stateIds
    expect(stateIds).toContain('q0')
    expect(stateIds).toContain('q1')

    const result = lambdaEngine.step()
    expect(result.status).toBe('accepted')
  })
})
