// ============================================================
// Validator tests — covers FA rules and the PDA-specific rules
// added in PR-2 (PDA_BAD_READ/POP, DPDA_NONDETERMINISTIC).
// ============================================================

import { describe, it, expect } from 'vitest'
import { validateMachine, hasBlockingErrors } from './validator'
import type { MachineDefinition } from '@/engines/core/types'

function machine(partial: Partial<MachineDefinition>): MachineDefinition {
  return {
    id: 'm',
    name: 'm',
    type: 'DFA',
    language: '',
    states: [],
    transitions: [],
    alphabet: [],
    ...partial,
  }
}

const codes = (m: MachineDefinition) => validateMachine(m).map((e) => e.code)

describe('validateMachine — start/accept rules', () => {
  it('flags a missing start state', () => {
    const m = machine({
      states: [{ id: 'a', label: 'a', x: 0, y: 0, isStart: false, isAccept: true }],
    })
    expect(codes(m)).toContain('NO_START_STATE')
  })

  it('flags multiple start states', () => {
    const m = machine({
      states: [
        { id: 'a', label: 'a', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'b', label: 'b', x: 0, y: 0, isStart: true, isAccept: true },
      ],
    })
    expect(codes(m)).toContain('MULTIPLE_START_STATES')
  })

  it('warns when there is no accept state', () => {
    const m = machine({
      states: [{ id: 'a', label: 'a', x: 0, y: 0, isStart: true, isAccept: false }],
    })
    expect(codes(m)).toContain('NO_ACCEPT_STATE')
  })
})

describe('validateMachine — DFA rules', () => {
  it('flags nondeterminism (two transitions on one symbol)', () => {
    const m = machine({
      type: 'DFA',
      alphabet: ['a'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
        { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
        { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
      ],
    })
    expect(codes(m)).toContain('DFA_NONDETERMINISTIC')
  })

  it('flags a missing transition when an alphabet is defined', () => {
    const m = machine({
      type: 'DFA',
      alphabet: ['a', 'b'],
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true }],
      transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: ['a'] }],
    })
    expect(codes(m)).toContain('DFA_MISSING_TRANSITION')
  })

  it('rejects epsilon labels outside of ε-NFA', () => {
    const m = machine({
      type: 'NFA',
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true }],
      transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: ['ε'] }],
    })
    expect(codes(m)).toContain('EMPTY_TRANSITION_LABEL')
  })
})

describe('validateMachine — PDA rules', () => {
  const base = (transitions: MachineDefinition['transitions']) =>
    machine({
      type: 'DPDA',
      alphabet: ['a'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
      ],
      transitions,
    })

  it('does not flag empty FA labels for PDA transitions', () => {
    const m = base([{ id: 't', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: '', push: 'A' }])
    expect(codes(m)).not.toContain('EMPTY_TRANSITION_LABEL')
  })

  it('flags a multi-character read', () => {
    const m = base([{ id: 't', from: 'q0', to: 'q1', symbols: [], read: 'ab', pop: '', push: '' }])
    expect(codes(m)).toContain('PDA_BAD_READ')
  })

  it('flags a multi-character pop', () => {
    const m = base([{ id: 't', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: 'AB', push: '' }])
    expect(codes(m)).toContain('PDA_BAD_POP')
  })

  it('flags conflicting deterministic moves (same read + pop)', () => {
    const m = base([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: 'A', push: '' },
      { id: 't1', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: 'A', push: '' },
    ])
    expect(codes(m)).toContain('DPDA_NONDETERMINISTIC')
  })

  it('flags an ε-read move overlapping an input move', () => {
    const m = base([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'A' },
      { id: 't1', from: 'q0', to: 'q1', symbols: [], read: '', pop: '', push: '' },
    ])
    expect(codes(m)).toContain('DPDA_NONDETERMINISTIC')
  })

  it('accepts a clean deterministic machine (distinct reads)', () => {
    const m = base([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'A' },
      { id: 't1', from: 'q0', to: 'q1', symbols: [], read: 'b', pop: 'A', push: '' },
    ])
    expect(codes(m)).not.toContain('DPDA_NONDETERMINISTIC')
    expect(codes(m)).not.toContain('PDA_BAD_READ')
    expect(codes(m)).not.toContain('PDA_BAD_POP')
  })

  it('allows nondeterminism for an NPDA (no determinism error)', () => {
    const m = machine({
      type: 'NPDA',
      alphabet: ['a'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: 'A', push: '' },
        { id: 't1', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: 'A', push: '' },
      ],
    })
    expect(codes(m)).not.toContain('DPDA_NONDETERMINISTIC')
  })

  it('still flags a multi-character pop for an NPDA', () => {
    const m = machine({
      type: 'NPDA',
      alphabet: ['a'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: 'AB', push: '' },
      ],
    })
    expect(codes(m)).toContain('PDA_BAD_POP')
  })
})

describe('hasBlockingErrors', () => {
  it('is true when any error severity is present', () => {
    expect(hasBlockingErrors([{ severity: 'error', code: 'X', message: '' }])).toBe(true)
  })
  it('is false for warnings only', () => {
    expect(hasBlockingErrors([{ severity: 'warning', code: 'X', message: '' }])).toBe(false)
  })
})
