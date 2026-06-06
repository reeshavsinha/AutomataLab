// ============================================================
// AutomataLab — Engine Utilities
// Pure functions with no side effects. Used by all engines.
// ============================================================

import type { AutomataState, MachineDefinition, Transition } from './types'

/** Normalize a symbol — empty string and 'ε' both represent epsilon */
export const EPSILON = 'ε'

export function isEpsilon(symbol: string): boolean {
  return symbol === '' || symbol === EPSILON || symbol === 'eps' || symbol === 'λ' || symbol === 'lambda'
}

/** Get all transitions leaving a given state */
export function getTransitionsFrom(
  transitions: Transition[],
  stateId: string
): Transition[] {
  return transitions.filter((t) => t.from === stateId)
}

/** Get all transitions from a state on a given input symbol (non-epsilon) */
export function getTransitionsOn(
  transitions: Transition[],
  stateId: string,
  symbol: string
): Transition[] {
  return transitions.filter(
    (t) => t.from === stateId && t.symbols.some((s) => s === symbol)
  )
}

/** Compute ε-closure of a set of state IDs */
export function epsilonClosure(
  stateIds: Set<string>,
  transitions: Transition[]
): Set<string> {
  const closure = new Set<string>(stateIds)
  const stack = [...stateIds]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const t of transitions) {
      if (t.from === current && t.symbols.some(isEpsilon)) {
        if (!closure.has(t.to)) {
          closure.add(t.to)
          stack.push(t.to)
        }
      }
    }
  }

  return closure
}

/** Move: compute the set of states reachable from a set of states on a symbol */
export function move(
  stateIds: Set<string>,
  symbol: string,
  transitions: Transition[]
): Set<string> {
  const result = new Set<string>()
  for (const stateId of stateIds) {
    for (const t of transitions) {
      if (t.from === stateId && t.symbols.includes(symbol) && !isEpsilon(symbol)) {
        result.add(t.to)
      }
    }
  }
  return result
}

/** Get state by id */
export function getState(
  states: AutomataState[],
  id: string
): AutomataState | undefined {
  return states.find((s) => s.id === id)
}

/** Get the start state of a machine */
export function getStartState(
  definition: MachineDefinition
): AutomataState | undefined {
  return definition.states.find((s) => s.isStart)
}

/** Check if any state in a set is an accept state */
export function hasAcceptState(
  stateIds: Set<string>,
  states: AutomataState[]
): boolean {
  return [...stateIds].some((id) => {
    const state = states.find((s) => s.id === id)
    return state?.isAccept ?? false
  })
}

/** Generate a unique ID */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
