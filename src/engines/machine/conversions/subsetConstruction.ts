// ============================================================
// AutomataLab — NFA / ε-NFA → DFA (subset / powerset construction)
// Each DFA state is a set of NFA states. ε-closures are folded in, so this
// works directly on an ε-NFA too. A reachable empty set becomes an explicit
// dead/trap state, keeping the result a complete, deterministic DFA.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { epsilonClosure, move } from '../core/utils'
import type { ConversionResult, ConversionStep } from './types'
import { MachineBuilder, effectiveAlphabet, subsetKey, subsetLabel } from './helpers'

/** Guard against pathological exponential blow-up in the UI. */
const MAX_DFA_STATES = 256

export function nfaToDfa(source: MachineDefinition): ConversionResult {
  const realStates = source.states.filter((s) => !s.isText)
  const start = realStates.find((s) => s.isStart)
  if (!start) {
    throw new Error('The automaton has no start state.')
  }

  const alphabet = effectiveAlphabet(source)
  const transitions = source.transitions
  const labelOf = new Map(realStates.map((s) => [s.id, s.label]))
  const acceptIds = new Set(realStates.filter((s) => s.isAccept).map((s) => s.id))

  const builder = new MachineBuilder()
  const steps: ConversionStep[] = []

  // key (sorted source ids) -> { id, members, label }
  const subsets = new Map<string, { id: string; members: string[]; label: string }>()
  const queue: { key: string; members: string[] }[] = []

  // Each DFA state gets a short, sequential name (q0, q1, …) so the diagram stays
  // readable; the underlying subset is kept as `description` (shown on hover / in
  // the preview's "full labels" mode).
  let dfaCount = 0
  const subsetText = (members: string[]) =>
    subsetLabel(members.map((id) => labelOf.get(id) ?? id))
  const isAcceptingSubset = (members: string[]) => members.some((id) => acceptIds.has(id))

  /** Register a subset (creating its DFA state) if new; return its DFA state id + label. */
  const ensureSubset = (members: string[]): { id: string; label: string; created: boolean } => {
    const key = subsetKey(members)
    const existing = subsets.get(key)
    if (existing) return { id: existing.id, label: existing.label, created: false }
    if (subsets.size >= MAX_DFA_STATES) {
      throw new Error(`Subset construction exceeded ${MAX_DFA_STATES} DFA states — the NFA is too large to convert here.`)
    }
    const label = `q${dfaCount++}`
    const id = builder.addState({
      label,
      description: subsetText(members),
      isStart: false,
      isAccept: isAcceptingSubset(members),
    })
    subsets.set(key, { id, members, label })
    queue.push({ key, members })
    return { id, label, created: true }
  }

  // Lazily-created dead state for empty targets (keeps the DFA total).
  let deadId: string | null = null
  const ensureDead = (): { id: string; created: boolean } => {
    if (deadId) return { id: deadId, created: false }
    deadId = builder.addState({
      label: '∅',
      description: 'dead / trap state — no NFA states (rejects everything)',
      isStart: false,
      isAccept: false,
    })
    subsets.set('', { id: deadId, members: [], label: '∅' })
    queue.push({ key: '', members: [] })
    return { id: deadId, created: true }
  }

  // Start state = ε-closure of the NFA start.
  const startMembers = [...epsilonClosure(new Set([start.id]), transitions)]
  const startEntry = ensureSubset(startMembers)
  builder.getStates().find((s) => s.id === startEntry.id)!.isStart = true
  steps.push({
    title: 'Start state',
    detail:
      `The DFA start state ${startEntry.label} = ${subsetText(startMembers)} is the ` +
      `ε-closure of the NFA start state.`,
    addedStateIds: [startEntry.id],
    addedTransitionIds: [],
  })

  // Process subsets breadth-first.
  while (queue.length > 0) {
    const { members } = queue.shift()!
    const fromKey = subsetKey(members)
    const fromEntry = subsets.get(fromKey)!
    const fromId = fromKey === '' ? deadId! : fromEntry.id
    const fromLabel = fromEntry.label

    const addedStateIds: string[] = []
    const addedTransitionIds: string[] = []
    const byTarget = new Map<string, string[]>() // targetDfaId -> symbols
    const moveDescriptions: string[] = []

    for (const a of alphabet) {
      const targetMembers =
        members.length === 0
          ? [] // dead state self-loops on everything
          : [...epsilonClosure(move(new Set(members), a, transitions), transitions)]

      let targetId: string
      if (targetMembers.length === 0) {
        const dead = ensureDead()
        targetId = dead.id
        if (dead.created) addedStateIds.push(dead.id)
        moveDescriptions.push(`${a} → ∅`)
      } else {
        const entry = ensureSubset(targetMembers)
        targetId = entry.id
        if (entry.created) addedStateIds.push(entry.id)
        moveDescriptions.push(`${a} → ${entry.label}`)
      }
      if (!byTarget.has(targetId)) byTarget.set(targetId, [])
      byTarget.get(targetId)!.push(a)
    }

    for (const [target, syms] of byTarget) {
      addedTransitionIds.push(builder.addTransition(fromId, target, { symbols: syms }))
    }

    steps.push({
      title: members.length === 0 ? 'Transitions from ∅' : `Transitions from ${fromLabel} = ${subsetText(members)}`,
      detail:
        members.length === 0
          ? 'The dead state ∅ has no NFA states, so every symbol loops back to ∅ (a permanent reject).'
          : `Move on each symbol from ${subsetText(members)} and ε-close: ${moveDescriptions.join(',  ')}.`,
      addedStateIds,
      addedTransitionIds,
    })
  }

  const acceptEntries = [...subsets.values()].filter((s) => isAcceptingSubset(s.members))
  steps.push({
    title: 'Accepting states',
    detail:
      acceptEntries.length > 0
        ? `A DFA state accepts when its set contains an NFA accept state: ` +
          `${acceptEntries.map((s) => `${s.label} = ${subsetText(s.members)}`).join(', ')}.`
        : 'No subset contains an NFA accept state.',
    addedStateIds: [],
    addedTransitionIds: [],
  })

  const result = builder.build({
    name: `${source.name} (DFA)`,
    type: 'DFA',
    language: source.language,
    alphabet,
  })

  return {
    kind: 'nfa-to-dfa',
    result,
    summary: [
      `${realStates.length} NFA states → ${result.states.length} DFA states.`,
      `${result.transitions.length} transitions over Σ = {${alphabet.join(', ')}}.`,
      `Each DFA state is named q0, q1, … — hover it (or pick "full" labels) to see the NFA subset it stands for.`,
    ],
    steps,
  }
}
