// ============================================================
// AutomataLab — Engine Utilities
// Pure functions with no side effects. Used by all engines.
// ============================================================

import type {
  AutomataState,
  Configuration,
  MachineDefinition,
  SimulationStatus,
  Transition,
} from './types'

/** Normalize a symbol — empty string and 'ε' both represent epsilon */
export const EPSILON = 'ε'

export function isEpsilon(symbol: string | undefined): boolean {
  return symbol === undefined || symbol === '' || symbol === EPSILON || symbol === 'eps' || symbol === 'λ' || symbol === 'lambda'
}

/**
 * Machine types backed by a stack. `'NPDA'` is listed ahead of its engine so
 * the PDA-aware UI/validator branches light up the moment the type is added.
 * This is the single source of truth — do not redeclare it elsewhere.
 */
export const PDA_TYPES = ['DPDA', 'NPDA'] as const

export function isPDAType(type: string): boolean {
  return (PDA_TYPES as readonly string[]).includes(type)
}

/**
 * Machine types that explore multiple branches and therefore have a
 * computation tree to visualise. Single source of truth gating the tree tab /
 * panel, mirroring `PDA_TYPES`/`isPDAType`.
 */
export const NONDETERMINISTIC_TYPES = ['NFA', 'ENFA', 'NPDA'] as const

export function supportsComputationTree(type: string): boolean {
  return (NONDETERMINISTIC_TYPES as readonly string[]).includes(type)
}

/**
 * Format a PDA transition for display as `read, pop → push`, rendering any
 * epsilon (empty/undefined) component as ε. Pure: no UI imports.
 */
export function formatPdaLabel(read?: string, pop?: string, push?: string): string {
  const r = isEpsilon(read) ? EPSILON : read
  const p = isEpsilon(pop) ? EPSILON : pop
  const u = isEpsilon(push) ? EPSILON : push
  return `${r}, ${p} → ${u}`
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

/**
 * Build a per-branch Configuration. `inputChars` + `inputIndex` are used to
 * derive the consumed/remaining input strings so panels don't need the raw
 * input. For finite automata the stack is empty and there is no branch lineage
 * (parentId defaults to null, id defaults to the stateId, which is unique
 * within a powerset of active states).
 */
export function buildConfig(params: {
  stateId: string
  inputChars: string[]
  inputIndex: number
  status: SimulationStatus
  stack?: string[]
  parentId?: string | null
  id?: string
}): Configuration {
  const { stateId, inputChars, inputIndex, status } = params
  return {
    id: params.id ?? stateId,
    parentId: params.parentId ?? null,
    stateId,
    stack: params.stack ?? [],
    inputIndex,
    status,
    consumedInput: inputChars.slice(0, inputIndex).join(''),
    remainingInput: inputChars.slice(inputIndex).join(''),
  }
}
