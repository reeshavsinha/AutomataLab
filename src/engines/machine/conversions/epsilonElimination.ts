// ============================================================
// AutomataLab — ε-NFA → NFA (epsilon elimination)
// Removes ε-transitions while preserving the language. Standard construction:
//   • δ'(q, a) = ε-closure( move( ε-closure(q), a ) )
//   • a state is accepting iff its ε-closure contains an accept state
//   • the start state is unchanged
// (Proof: ε-closure(Bₙ) = Aₙ for the ε-NFA's active set Aₙ.)
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { epsilonClosure, isEpsilon, move } from '../core/utils'
import type { ConversionResult, ConversionStep } from './types'
import { MachineBuilder, effectiveAlphabet } from './helpers'

export function enfaToNfa(source: MachineDefinition): ConversionResult {
  const realStates = source.states.filter((s) => !s.isText)
  const start = realStates.find((s) => s.isStart)
  if (!start) {
    throw new Error('The ε-NFA has no start state.')
  }

  const alphabet = effectiveAlphabet(source)
  const transitions = source.transitions
  const labelOf = new Map(realStates.map((s) => [s.id, s.label]))

  // ε-closure of each source state (as source ids).
  const closure = new Map<string, Set<string>>()
  for (const s of realStates) {
    closure.set(s.id, epsilonClosure(new Set([s.id]), transitions))
  }

  const acceptIds = new Set(realStates.filter((s) => s.isAccept).map((s) => s.id))
  /** A state is accepting iff its ε-closure reaches an old accept state. */
  const isAcceptingNow = (id: string): boolean =>
    [...(closure.get(id) ?? [])].some((c) => acceptIds.has(c))

  const builder = new MachineBuilder()
  const newId = new Map<string, string>()
  for (const s of realStates) {
    // Record the ε-closure as provenance (hover / "full labels") — but only when
    // it adds information (the state reaches others via ε), so simple states stay
    // un-annotated.
    const ecl = closure.get(s.id)!
    const eclLabels = [...ecl].map((id) => labelOf.get(id) ?? id).sort()
    const description = eclLabels.length > 1 ? `ε-closure: {${eclLabels.join(', ')}}` : undefined
    newId.set(
      s.id,
      builder.addState({
        label: s.label,
        description,
        isStart: s.isStart,
        isAccept: isAcceptingNow(s.id),
      })
    )
  }

  const steps: ConversionStep[] = []
  steps.push({
    title: 'Keep all states',
    detail:
      'ε-elimination produces an NFA over the same states; only the transitions change. ' +
      'First record the ε-closure of every state.',
    addedStateIds: realStates.map((s) => newId.get(s.id)!),
    addedTransitionIds: [],
  })

  // New non-ε transitions, one step per source state.
  for (const s of realStates) {
    const ecl = closure.get(s.id)!
    const byTarget = new Map<string, Set<string>>() // newTargetId -> symbols
    for (const a of alphabet) {
      const moved = move(ecl, a, transitions)
      const reached = new Set<string>()
      for (const m of moved) for (const c of epsilonClosure(new Set([m]), transitions)) reached.add(c)
      for (const r of reached) {
        const tid = newId.get(r)
        if (!tid) continue
        if (!byTarget.has(tid)) byTarget.set(tid, new Set())
        byTarget.get(tid)!.add(a)
      }
    }
    if (byTarget.size === 0) continue

    const added: string[] = []
    for (const [target, syms] of byTarget) {
      added.push(builder.addTransition(newId.get(s.id)!, target, { symbols: [...syms].sort() }))
    }
    const eclLabels = [...ecl].map((id) => labelOf.get(id) ?? id).sort().join(', ')
    steps.push({
      title: `Moves from ${s.label}`,
      detail:
        `ε-closure(${s.label}) = {${eclLabels}}. For each input symbol, move from that ` +
        `closure and ε-close the result, giving direct (ε-free) edges out of ${s.label}.`,
      addedStateIds: [],
      addedTransitionIds: added,
    })
  }

  const newAccepts = realStates.filter((s) => isAcceptingNow(s.id))
  steps.push({
    title: 'Mark accepting states',
    detail:
      newAccepts.length > 0
        ? `A state is accepting when its ε-closure reaches an original accept state: ` +
          `${newAccepts.map((s) => s.label).join(', ')}.`
        : 'No state can reach an accept state via ε-moves, so the accept set is unchanged.',
    addedStateIds: [],
    addedTransitionIds: [],
  })

  const result = builder.build({
    name: `${source.name} (NFA)`,
    type: 'NFA',
    language: source.language,
    alphabet,
  })

  const epsilonCount = transitions.filter((t) => t.symbols.some(isEpsilon)).length
  return {
    kind: 'enfa-to-nfa',
    result,
    steps,
    summary: [
      `Removed ${epsilonCount} ε-transition${epsilonCount === 1 ? '' : 's'}.`,
      `${result.states.length} states, ${result.transitions.length} transitions.`,
    ],
  }
}
