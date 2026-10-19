// ============================================================
// PDA normalizer for PDA → CFG (JFLAP-style triplet construction).
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { isEpsilon, isPDAType } from '../core/utils'
import { generateId } from '../core/utils'

export function expandPush(push: string | undefined): string[] {
  if (push === undefined || isEpsilon(push)) return []
  if (push.includes(',')) return push.split(',').filter(Boolean)
  return Array.from(push)
}

export function formatPush(syms: string[]): string {
  if (syms.length === 0) return ''
  if (syms.length === 1) return syms[0]
  return `${syms[0]},${syms[1]}`
}

function addNormState(machine: MachineDefinition, label: string): string {
  const id = `norm_${machine.states.length}`
  machine.states.push({
    id,
    label,
    x: 0,
    y: 0,
    isStart: false,
    isAccept: false,
  })
  return id
}

function addNormTransition(
  machine: MachineDefinition,
  from: string,
  to: string,
  read: string,
  pop: string,
  pushSyms: string[],
) {
  machine.transitions.push({
    id: generateId('t'),
    from,
    to,
    symbols: [],
    read,
    pop,
    push: formatPush(pushSyms),
  })
}

/**
 * One move (pop `popSym`, push `pushSyms` with leftmost symbol on stack top)
 * as a chain of moves that each push at most two symbols.
 */
export function chainPushTransition(
  machine: MachineDefinition,
  from: string,
  to: string,
  read: string,
  popSym: string,
  pushSyms: string[],
): MachineDefinition {
  const m: MachineDefinition = {
    ...machine,
    states: [...machine.states],
    transitions: [...machine.transitions],
  }

  if (!popSym || isEpsilon(popSym)) {
    throw new Error('chainPushTransition requires a single-symbol pop.')
  }
  if (pushSyms.length === 0) {
    addNormTransition(m, from, to, read, popSym, [])
    return m
  }
  if (pushSyms.length <= 2) {
    addNormTransition(m, from, to, read, popSym, pushSyms)
    return m
  }

  let cur = from
  let pop = popSym
  let i = pushSyms.length - 1
  while (i > 1) {
    const next = addNormState(m, 'push')
    addNormTransition(m, cur, next, read, pop, [pushSyms[i - 1], pushSyms[i]])
    cur = next
    pop = pushSyms[i]
    i -= 2
  }
  addNormTransition(m, cur, to, read, pop, pushSyms.slice(0, i + 1))
  return m
}

/**
 * Normalize a PDA for triplet extraction: bottom marker on stack when needed,
 * no ε-pop (start setup uses pop marker), ≤2 symbols pushed per move.
 */
export function normalizePdaForCfg(source: MachineDefinition): MachineDefinition {
  if (!isPDAType(source.type)) return source

  const bottom =
    source.initialStack?.[0] ??
    source.blankSymbol ??
    (source.stackAlphabet?.find((s) => s.length === 1) ?? 'Z')

  const start = source.states.find((s) => s.isStart)
  const startId = start?.id

  const hadEpsilonPop = source.transitions.some((t) => isEpsilon(t.pop ?? ''))
  const hadLongPush = source.transitions.some((t) => expandPush(t.push).length > 2)

  let machine: MachineDefinition = {
    ...source,
    states: source.states.map((s) => ({ ...s })),
    transitions: [],
    initialStack:
      source.initialStack?.length ? [...source.initialStack] : hadEpsilonPop || hadLongPush ? [bottom] : undefined,
  }

  for (const t of source.transitions) {
    const read = t.read ?? ''
    const pop = t.pop ?? ''
    const pushSyms = expandPush(t.push)

    if (!isEpsilon(pop)) {
      if (pushSyms.length <= 2) {
        machine.transitions.push({ ...t })
      } else {
        machine = chainPushTransition(machine, t.from, t.to, read, pop, pushSyms)
      }
      continue
    }

    if (t.from === startId && pushSyms.length > 0) {
      if (pushSyms.length <= 2) {
        machine.transitions.push({ ...t, pop: bottom, push: formatPush(pushSyms) })
      } else {
        machine = chainPushTransition(machine, t.from, t.to, read, bottom, pushSyms)
      }
      continue
    }

    if (pushSyms.length === 0) {
      throw new Error(
        `Transition ${t.id} uses ε-pop without pushing symbols. Remove or split pure ε-moves before PDA→CFG.`,
      )
    }

    throw new Error(
      `Transition ${t.id} uses ε-pop outside the start setup. Every move must pop exactly one stack symbol.`,
    )
  }

  return machine
}

export function pdaNeedsNormalization(source: MachineDefinition): boolean {
  if (!isPDAType(source.type)) return false
  return source.transitions.some((t) => {
    const pushSyms = expandPush(t.push)
    return isEpsilon(t.pop ?? '') || pushSyms.length > 2
  })
}
