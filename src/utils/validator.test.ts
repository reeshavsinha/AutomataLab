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

describe('validateMachine — TM/LBA rules', () => {
  const tmBase = (
    transitions: MachineDefinition['transitions'],
    states?: MachineDefinition['states']
  ) =>
    machine({
      type: 'TM',
      alphabet: ['a', 'b'],
      states: states ?? [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'acc', label: 'acc', x: 0, y: 0, isStart: false, isAccept: true },
      ],
      transitions,
    })

  it('does not flag empty FA labels for TM transitions', () => {
    const m = tmBase([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'b', direction: 'R' }])
    expect(codes(m)).not.toContain('EMPTY_TRANSITION_LABEL')
  })

  it('flags a multi-character read', () => {
    const m = tmBase([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'ab', write: 'b', direction: 'R' }])
    expect(codes(m)).toContain('TM_BAD_READ')
  })

  it('flags a multi-character write', () => {
    const m = tmBase([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'bb', direction: 'R' }])
    expect(codes(m)).toContain('TM_BAD_WRITE')
  })

  it('flags a missing head direction', () => {
    const m = tmBase([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'b' }])
    expect(codes(m)).toContain('TM_BAD_DIRECTION')
  })

  it('flags nondeterminism (two moves reading the same symbol)', () => {
    const m = tmBase([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', write: 'a', direction: 'R' },
      { id: 't1', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'a', direction: 'R' },
    ])
    expect(codes(m)).toContain('TM_NONDETERMINISTIC')
  })

  it('flags a state marked both accept and reject', () => {
    const m = tmBase(
      [{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'a', direction: 'R' }],
      [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'acc', label: 'acc', x: 0, y: 0, isStart: false, isAccept: true, isReject: true },
      ]
    )
    expect(codes(m)).toContain('TM_ACCEPT_REJECT_CONFLICT')
  })

  it('accepts a clean deterministic TM', () => {
    const m = tmBase([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', write: 'a', direction: 'R' },
      { id: 't1', from: 'q0', to: 'acc', symbols: [], read: 'b', write: 'b', direction: 'R' },
    ])
    const c = codes(m)
    expect(c).not.toContain('TM_NONDETERMINISTIC')
    expect(c).not.toContain('TM_BAD_READ')
    expect(c).not.toContain('TM_BAD_WRITE')
    expect(c).not.toContain('TM_BAD_DIRECTION')
    expect(c).not.toContain('EMPTY_TRANSITION_LABEL')
  })

  it('applies TM rules to LBA and adds the bounded-tape note', () => {
    const m = tmBase(
      [{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'ab', write: 'b', direction: 'R' }]
    )
    m.type = 'LBA'
    const c = codes(m)
    expect(c).toContain('TM_BAD_READ')       // TM rules still apply to LBA
    expect(c).toContain('LBA_BOUNDED_TAPE')  // and the LBA note is present
  })

  it('does not add the LBA note for a plain TM', () => {
    const m = tmBase([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'b', direction: 'R' }])
    expect(codes(m)).not.toContain('LBA_BOUNDED_TAPE')
  })
})

describe('validateMachine — multi-tape TM rules', () => {
  const states: MachineDefinition['states'] = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'acc', label: 'acc', x: 0, y: 0, isStart: false, isAccept: true },
  ]
  const mt = (transitions: MachineDefinition['transitions']) =>
    machine({ type: 'TM', tapeCount: 2, alphabet: ['a', 'b'], states, transitions })

  it('accepts a clean 2-tape transition', () => {
    const m = mt([{ id: 't', from: 'q0', to: 'acc', symbols: [], reads: ['a', '_'], writes: ['a', 'a'], directions: ['R', 'R'] }])
    const c = codes(m)
    expect(c).not.toContain('TM_TAPE_COUNT_MISMATCH')
    expect(c).not.toContain('TM_BAD_READ')
    expect(c).not.toContain('TM_NONDETERMINISTIC')
  })

  it('flags a transition missing the per-tape arrays', () => {
    const m = mt([{ id: 't', from: 'q0', to: 'acc', symbols: [], read: 'a', write: 'a', direction: 'R' }])
    expect(codes(m)).toContain('TM_TAPE_COUNT_MISMATCH')
  })

  it('flags arrays of the wrong length', () => {
    const m = mt([{ id: 't', from: 'q0', to: 'acc', symbols: [], reads: ['a'], writes: ['a'], directions: ['R'] }])
    expect(codes(m)).toContain('TM_TAPE_COUNT_MISMATCH')
  })

  it('flags a multi-character per-tape read', () => {
    const m = mt([{ id: 't', from: 'q0', to: 'acc', symbols: [], reads: ['ab', '_'], writes: ['a', 'a'], directions: ['R', 'R'] }])
    expect(codes(m)).toContain('TM_BAD_READ')
  })

  it('flags nondeterminism on the full read-tuple', () => {
    const m = mt([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], reads: ['a', '_'], writes: ['a', 'a'], directions: ['R', 'R'] },
      { id: 't1', from: 'q0', to: 'acc', symbols: [], reads: ['a', '_'], writes: ['a', 'a'], directions: ['R', 'R'] },
    ])
    expect(codes(m)).toContain('TM_NONDETERMINISTIC')
  })

  it('does NOT flag transitions that differ only on a non-first tape', () => {
    const m = mt([
      { id: 't0', from: 'q0', to: 'q0', symbols: [], reads: ['a', '_'], writes: ['a', 'a'], directions: ['R', 'R'] },
      { id: 't1', from: 'q0', to: 'acc', symbols: [], reads: ['a', 'x'], writes: ['a', 'x'], directions: ['R', 'R'] },
    ])
    expect(codes(m)).not.toContain('TM_NONDETERMINISTIC')
  })
})

describe('declared alphabets Γ vs Σ (UX audit #7)', () => {
  const tmStates = [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'acc', label: 'acc', x: 0, y: 0, isStart: false, isAccept: true },
  ]

  it('warns (not errors) when the blank symbol is in Σ', () => {
    const m = machine({
      type: 'TM', alphabet: ['0', '_'], states: tmStates,
      transitions: [{ id: 't0', from: 'q0', to: 'acc', symbols: [], read: '0', write: '0', direction: 'R' }],
    })
    expect(codes(m)).toContain('TM_BLANK_IN_SIGMA')
    expect(hasBlockingErrors(validateMachine(m))).toBe(false)
  })

  it('warns when a TM read/write falls outside a declared Γ', () => {
    const m = machine({
      type: 'TM', alphabet: ['0'], tapeAlphabet: ['0', '_'], states: tmStates,
      transitions: [{ id: 't0', from: 'q0', to: 'acc', symbols: [], read: '0', write: 'X', direction: 'R' }],
    })
    expect(codes(m)).toContain('TM_SYMBOL_NOT_IN_GAMMA')
  })

  it('warns when Σ ⊄ Γ or the blank is missing from Γ', () => {
    const m = machine({
      type: 'TM', alphabet: ['a'], tapeAlphabet: ['b'], states: tmStates,
      transitions: [{ id: 't0', from: 'q0', to: 'acc', symbols: [], read: 'b', write: 'b', direction: 'R' }],
    })
    const c = codes(m)
    expect(c).toContain('SIGMA_NOT_IN_GAMMA')
    expect(c).toContain('TM_BLANK_NOT_IN_GAMMA')
  })

  it('does NOT run Γ checks when Γ is undeclared', () => {
    const m = machine({
      type: 'TM', alphabet: ['0'], states: tmStates,
      transitions: [{ id: 't0', from: 'q0', to: 'acc', symbols: [], read: '0', write: 'X', direction: 'R' }],
    })
    expect(codes(m)).not.toContain('TM_SYMBOL_NOT_IN_GAMMA')
  })

  it('warns when a PDA push/pop falls outside a declared stack Γ', () => {
    const m = machine({
      type: 'NPDA', alphabet: ['a'], stackAlphabet: ['Z'],
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: 'A', push: 'B' },
      ],
    })
    const c = codes(m)
    expect(c).toContain('PDA_POP_NOT_IN_GAMMA')
    expect(c).toContain('PDA_PUSH_NOT_IN_GAMMA')
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
