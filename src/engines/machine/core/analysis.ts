import type { MachineDefinition } from './types'
import { getStartState, isEpsilon, isFAType } from './utils'
import { nfaToDfa } from '../conversions/subsetConstruction'

/**
 * Perform reachability analysis on a machine.
 * Returns arrays of state IDs for unreachable, dead, and sink states.
 */
export function getReachability(machine: MachineDefinition) {
  if (!isFAType(machine.type)) {
    throw new Error('Reachability analysis is only supported for Finite Automata (DFA, NFA, eNFA).')
  }

  const { states, transitions } = machine
  const realStates = states.filter((s) => !s.isText)
  const startState = getStartState(machine)

  // 1. Unreachable: BFS forward from the start state
  const reachable = new Set<string>()
  if (startState) {
    const queue = [startState.id]
    reachable.add(startState.id)
    let head = 0
    while (head < queue.length) {
      const current = queue[head++]
      for (const t of transitions) {
        if (t.from === current && !reachable.has(t.to)) {
          reachable.add(t.to)
          queue.push(t.to)
        }
      }
    }
  }

  const unreachable = realStates.filter((s) => !reachable.has(s.id)).map((s) => s.id)

  // 2. Dead: BFS backward from all accept states
  const reachesAccept = new Set<string>()
  const acceptStates = realStates.filter((s) => s.isAccept)
  const reverseQueue = acceptStates.map((s) => s.id)
  for (const id of reverseQueue) reachesAccept.add(id)

  let head = 0
  while (head < reverseQueue.length) {
    const current = reverseQueue[head++]
    for (const t of transitions) {
      if (t.to === current && !reachesAccept.has(t.from)) {
        reachesAccept.add(t.from)
        reverseQueue.push(t.from)
      }
    }
  }

  // A state is dead if it cannot reach any accept state
  const dead = realStates.filter((s) => !reachesAccept.has(s.id)).map((s) => s.id)

  // 3. Sink: A dead state where ALL its outgoing transitions loop back to itself (or it has no outgoing transitions).
  const sink = realStates
    .filter((s) => {
      if (!dead.includes(s.id)) return false
      const outgoing = transitions.filter((t) => t.from === s.id)
      if (outgoing.length === 0) return true
      return outgoing.every((t) => t.to === s.id)
    })
    .map((s) => s.id)

  return { unreachable, dead, sink }
}

/**
 * Check if the machine's language is empty.
 * Returns a shortest witness string if it is not empty.
 */
export function checkEmptiness(machine: MachineDefinition): { isEmpty: boolean; witness: string | null } {
  if (!isFAType(machine.type)) {
    throw new Error('Emptiness checking is only supported for Finite Automata (DFA, NFA, eNFA).')
  }

  const startState = getStartState(machine)
  if (!startState) return { isEmpty: true, witness: null }

  const visited = new Set<string>()
  const queue: { id: string; path: string }[] = []
  
  queue.push({ id: startState.id, path: '' })
  visited.add(startState.id)
  
  let head = 0
  while (head < queue.length) {
    const { id, path } = queue[head++]
    const state = machine.states.find((s) => s.id === id)
    if (state?.isAccept) {
      return { isEmpty: false, witness: path }
    }
    
    for (const t of machine.transitions) {
      if (t.from === id && !visited.has(t.to)) {
        visited.add(t.to)
        let append = ''
        if (t.symbols && t.symbols.length > 0) {
          const s = t.symbols[0]
          append = isEpsilon(s) ? '' : s
        } else if (t.read !== undefined) {
           append = isEpsilon(t.read) ? '' : t.read
        }
        queue.push({ id: t.to, path: path + append })
      }
    }
  }
  
  return { isEmpty: true, witness: null }
}

function getNextDfaState(dfa: MachineDefinition, q: string, a: string): string {
  if (!q) return ''
  const t = dfa.transitions.find((t) => t.from === q && t.symbols.includes(a))
  return t ? t.to : ''
}

/**
 * Helper to compute the synchronous product of two DFAs and check a condition.
 */
function checkProduct(
  m1: MachineDefinition,
  m2: MachineDefinition,
  condition: (q1Accept: boolean, q2Accept: boolean) => boolean
): { result: boolean; counterexample: string | null } {
  if (!isFAType(m1.type) || !isFAType(m2.type)) {
    throw new Error('Equivalence and Inclusion checking are only supported for Finite Automata (DFA, NFA, eNFA).')
  }

  // Convert to DFA if necessary (handles NFA/ENFA).
  // Will throw if max states exceeded, which bubbles up gracefully to UI.
  const r1 = m1.type === 'DFA' ? m1 : nfaToDfa(m1).result
  const r2 = m2.type === 'DFA' ? m2 : nfaToDfa(m2).result

  if (typeof r1 === 'string' || typeof r2 === 'string') {
    throw new Error('Internal error: Expected structural MachineDefinition, but received extracted text string.')
  }

  const dfa1 = r1
  const dfa2 = r2

  const start1 = getStartState(dfa1)
  const start2 = getStartState(dfa2)

  const s1Id = start1?.id || ''
  const s2Id = start2?.id || ''

  const q1StartAccept = start1?.isAccept ?? false
  const q2StartAccept = start2?.isAccept ?? false

  if (condition(q1StartAccept, q2StartAccept)) {
    return { result: false, counterexample: '' }
  }
  
  if (!s1Id && !s2Id) {
    return { result: true, counterexample: null }
  }

  const queue: { q1: string; q2: string; path: string }[] = [{ q1: s1Id, q2: s2Id, path: '' }]
  const visited = new Set<string>()
  visited.add(`${s1Id},${s2Id}`)

  const alphabet = Array.from(new Set([...(dfa1.alphabet || []), ...(dfa2.alphabet || [])]))

  let head = 0
  while (head < queue.length) {
    const { q1, q2, path } = queue[head++]
    
    for (const a of alphabet) {
      const next1 = getNextDfaState(dfa1, q1, a)
      const next2 = getNextDfaState(dfa2, q2, a)
      
      const q1Accept = dfa1.states.find((s) => s.id === next1)?.isAccept ?? false
      const q2Accept = dfa2.states.find((s) => s.id === next2)?.isAccept ?? false
      
      if (condition(q1Accept, q2Accept)) {
        return { result: false, counterexample: path + a }
      }
      
      const key = `${next1},${next2}`
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ q1: next1, q2: next2, path: path + a })
      }
    }
  }
  
  return { result: true, counterexample: null }
}

/**
 * Check if m1 and m2 recognize the exact same language.
 */
export function checkEquivalence(m1: MachineDefinition, m2: MachineDefinition): { equivalent: boolean; counterexample: string | null } {
  // Fails if exactly one machine accepts the product state.
  const res = checkProduct(m1, m2, (a1, a2) => a1 !== a2)
  return { equivalent: res.result, counterexample: res.counterexample }
}

/**
 * Check if L(m1) is a subset of or equal to L(m2).
 */
export function checkInclusion(m1: MachineDefinition, m2: MachineDefinition): { included: boolean; counterexample: string | null } {
  // Fails if m1 accepts but m2 does not.
  const res = checkProduct(m1, m2, (a1, a2) => a1 && !a2)
  return { included: res.result, counterexample: res.counterexample }
}
