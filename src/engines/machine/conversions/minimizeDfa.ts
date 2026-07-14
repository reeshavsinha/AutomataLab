// ============================================================
// AutomataLab — DFA minimization (partition refinement / Hopcroft)
// Completes the DFA (missing moves → a trap), drops unreachable states, then
// refines the partition {accepting, non-accepting} until no group splits. Each
// surviving block becomes one state of the unique minimal DFA.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import type { ConversionResult, ConversionStep } from './types'
import { MachineBuilder, effectiveAlphabet, subsetLabel } from './helpers'

const DEAD = '\u0000dead'

export function minimizeDfa(source: MachineDefinition): ConversionResult {
  const realStates = source.states.filter((s) => !s.isText)
  const start = realStates.find((s) => s.isStart)
  if (!start) {
    throw new Error('The DFA has no start state.')
  }

  const alphabet = effectiveAlphabet(source)
  const stateIds = new Set(realStates.map((s) => s.id))
  const labelOf = (id: string) => (id === DEAD ? '∅' : realStates.find((s) => s.id === id)?.label ?? id)
  const acceptIds = new Set(realStates.filter((s) => s.isAccept).map((s) => s.id))

  // ── Complete transition function δ (missing move → DEAD trap) ──
  let needsDead = false
  const delta = (id: string, a: string): string => {
    if (id === DEAD) return DEAD
    for (const t of source.transitions) {
      if (t.from === id && t.symbols.includes(a) && stateIds.has(t.to)) return t.to
    }
    needsDead = true
    return DEAD
  }
  // Probe once so `needsDead` is known up front.
  for (const s of realStates) for (const a of alphabet) delta(s.id, a)

  const allIds = needsDead ? [...stateIds, DEAD] : [...stateIds]

  // ── Reachability from the start ──
  const reachable = new Set<string>([start.id])
  const bfs = [start.id]
  while (bfs.length > 0) {
    const cur = bfs.shift()!
    for (const a of alphabet) {
      const nxt = delta(cur, a)
      if (allIds.includes(nxt) && !reachable.has(nxt)) {
        reachable.add(nxt)
        bfs.push(nxt)
      }
    }
  }
  const removed = allIds.filter((id) => !reachable.has(id) && id !== DEAD)

  const steps: ConversionStep[] = []
  if (needsDead) {
    steps.push({
      title: 'Complete the DFA',
      detail:
        'Some state was missing a move, so a trap state ∅ is added and every missing transition routes to it. ' +
        'Minimization works on a total DFA.',
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }
  if (removed.length > 0) {
    steps.push({
      title: 'Remove unreachable states',
      detail: `These states can't be reached from the start and are dropped: ${removed.map(labelOf).join(', ')}.`,
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }

  // ── Partition refinement (Moore) ──
  const live = [...reachable]
  const describe = (groups: string[][]) =>
    groups.map((g) => subsetLabel(g.map(labelOf))).join('  |  ')

  let groups: string[][] = []
  const accepting = live.filter((id) => acceptIds.has(id))
  const nonAccepting = live.filter((id) => !acceptIds.has(id))
  if (accepting.length) groups.push(accepting)
  if (nonAccepting.length) groups.push(nonAccepting)

  steps.push({
    title: 'Initial partition',
    detail: `Split states into accepting and non-accepting groups: ${describe(groups)}.`,
    addedStateIds: [],
    addedTransitionIds: [],
  })

  let pass = 0
  for (;;) {
    const indexOf = new Map<string, number>()
    groups.forEach((g, i) => g.forEach((id) => indexOf.set(id, i)))

    const next: string[][] = []
    for (const group of groups) {
      const bySig = new Map<string, string[]>()
      for (const id of group) {
        const sig = alphabet.map((a) => indexOf.get(delta(id, a)) ?? -1).join('|')
        if (!bySig.has(sig)) bySig.set(sig, [])
        bySig.get(sig)!.push(id)
      }
      for (const sub of bySig.values()) next.push(sub)
    }

    if (next.length === groups.length) break
    groups = next
    pass++
    steps.push({
      title: `Refinement pass ${pass}`,
      detail:
        `Two states stay together only if every symbol leads them into the same group. ` +
        `New partition: ${describe(groups)}.`,
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }

  // ── Build the minimized DFA: one state per block ──
  const builder = new MachineBuilder()
  const blockIndex = new Map<string, number>()
  groups.forEach((g, i) => g.forEach((id) => blockIndex.set(id, i)))

  // Short, sequential names (q0, q1, …) keep the minimal DFA readable; the group
  // of equivalent source states it replaces is kept as `description` (hover / the
  // preview's "full labels" mode).
  const blockStateId: string[] = groups.map((g, i) =>
    builder.addState({
      label: `q${i}`,
      description: subsetLabel(g.map(labelOf)),
      isStart: g.includes(start.id),
      isAccept: g.some((id) => acceptIds.has(id)),
    })
  )

  const mergeMapping = groups.map((g, i) => `q${i} = ${subsetLabel(g.map(labelOf))}`).join(',  ')
  steps.push({
    title: 'Merge equivalent states',
    detail:
      `Each remaining group becomes one state of the minimal DFA (${groups.length} in total): ${mergeMapping}.`,
    addedStateIds: [...blockStateId],
    addedTransitionIds: [],
  })

  const addedTransitionIds: string[] = []
  groups.forEach((g, i) => {
    const rep = g[0]
    const byTarget = new Map<number, string[]>()
    for (const a of alphabet) {
      const tBlock = blockIndex.get(delta(rep, a))
      if (tBlock === undefined) continue
      if (!byTarget.has(tBlock)) byTarget.set(tBlock, [])
      byTarget.get(tBlock)!.push(a)
    }
    for (const [tBlock, syms] of byTarget) {
      addedTransitionIds.push(builder.addTransition(blockStateId[i], blockStateId[tBlock], { symbols: syms }))
    }
  })

  steps.push({
    title: 'Connect the states',
    detail: 'Add one transition per symbol between the merged blocks.',
    addedStateIds: [],
    addedTransitionIds,
  })

  const result = builder.build({
    name: `${source.name} (min)`,
    type: 'DFA',
    language: source.language,
    alphabet,
  })

  return {
    kind: 'minimize-dfa',
    result,
    summary: [
      `${realStates.length} states → ${result.states.length} states.`,
      removed.length > 0 ? `${removed.length} unreachable state(s) removed.` : 'All states were reachable.',
      `Minimal states are named q0, q1, … — hover one (or pick "full" labels) to see the states it merges.`,
    ],
    steps,
  }
}
