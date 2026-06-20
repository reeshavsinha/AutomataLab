import type { MachineDefinition, AutomataState, Transition } from '@/engines/core/types'

const st = (s: Partial<AutomataState> & { id: string }): AutomataState => ({
  label: s.id, x: 0, y: 0, isStart: false, isAccept: false, ...s,
})

/** A TM that writes and steps right forever — head travels until the step limit. */
export function tmRightMover(stepLimit: number): MachineDefinition {
  return {
    id: 'tm-rm', name: 'right-mover', type: 'TM', language: '', alphabet: ['0', '1'],
    blankSymbol: '_', stepLimit,
    states: [st({ id: 'q0', isStart: true }), st({ id: 'acc', isAccept: true })],
    transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: [], read: '_', write: 'x', direction: 'R' }],
  }
}

/** 2-state DFA that just consumes a/b and stays live (linear-time baseline). */
export function dfaToggle(): MachineDefinition {
  return {
    id: 'dfa-t', name: 'toggle', type: 'DFA', language: '', alphabet: ['a', 'b'],
    states: [st({ id: 'q0', isStart: true, isAccept: true }), st({ id: 'q1', isAccept: false })],
    transitions: [
      { id: 't0', from: 'q0', to: 'q1', symbols: ['a', 'b'] },
      { id: 't1', from: 'q1', to: 'q0', symbols: ['a', 'b'] },
    ],
  }
}

/** Complete NFA on a single symbol (or multiple symbols): the frontier is the whole state set every step. */
export function nfaComplete(nStates: number, symbols: string[] = ['a']): MachineDefinition {
  const states = Array.from({ length: nStates }, (_, i) =>
    st({ id: `q${i}`, isStart: i === 0, isAccept: i === nStates - 1 }))
  const transitions: Transition[] = []
  let tid = 0
  for (let i = 0; i < nStates; i++)
    for (let j = 0; j < nStates; j++)
      transitions.push({ id: `t${tid++}`, from: `q${i}`, to: `q${j}`, symbols })
  return { id: 'nfa-c', name: 'complete', type: 'NFA', language: '', alphabet: symbols, states, transitions }
}
