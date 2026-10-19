// ============================================================
// AutomataLab — FA → Regex (GNFA state elimination, JFLAP-style)
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { generateId, isEpsilon, isFAType } from '../core/utils'
import type { ConversionResult, ConversionStep } from './types'

function isWrapped(s: string): boolean {
  if (!s.startsWith('(') || !s.endsWith(')')) return false
  let depth = 0
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    if (depth === 0) return false
  }
  return depth === 1
}

function union(a: string, b: string): string {
  if (!a || a === '∅') return b || '∅'
  if (!b || b === '∅') return a || '∅'
  if (a === b) return a
  const wrap = (s: string) => (s.includes('|') && !isWrapped(s) ? `(${s})` : s)
  if (a === 'ε') return b === 'ε' ? 'ε' : `ε|${wrap(b)}`
  if (b === 'ε') return `ε|${wrap(a)}`
  return `${wrap(a)}|${wrap(b)}`
}

function concat(a: string, b: string): string {
  if (!a || a === 'ε') return b || 'ε'
  if (!b || b === 'ε') return a || 'ε'
  if (a === '∅' || b === '∅') return '∅'
  const wrapA = a.includes('|') && !isWrapped(a) ? `(${a})` : a
  const wrapB = b.includes('|') && !isWrapped(b) ? `(${b})` : b
  return `${wrapA}${wrapB}`
}

function star(a: string): string {
  if (!a || a === 'ε' || a === '∅') return 'ε'
  if (a.length === 1) return `${a}*`
  if (a.endsWith('*') && isWrapped(a.slice(0, -1))) return a
  const wrapA = isWrapped(a) ? a : `(${a})`
  return `${wrapA}*`
}

export function dfaToRegex(source: MachineDefinition): ConversionResult {
  if (!isFAType(source.type)) {
    throw new Error('FA → Regex applies only to finite automata (DFA, NFA, ε-NFA).')
  }

  const steps: ConversionStep[] = []
  const states = source.states.filter((s) => !s.isText).map((s) => s.id)
  const S = generateId('gnfaS')
  const F = generateId('gnfaA')

  const gnfa: Record<string, Record<string, string>> = {}
  const allStates = [S, ...states, F]
  for (const from of allStates) {
    gnfa[from] = {}
    for (const to of allStates) {
      gnfa[from][to] = '∅'
    }
  }

  for (const t of source.transitions) {
    const labels = t.symbols.length === 0
      ? ['ε']
      : t.symbols.map((s) => (isEpsilon(s) ? 'ε' : s))
    let r = labels[0]
    for (let i = 1; i < labels.length; i++) {
      r = union(r, labels[i])
    }
    gnfa[t.from][t.to] = gnfa[t.from][t.to] === '∅' ? r : union(gnfa[t.from][t.to], r)
  }

  const startIds = source.states.filter((s) => s.isStart).map((s) => s.id)
  const acceptIds = source.states.filter((s) => s.isAccept).map((s) => s.id)

  if (acceptIds.length === 0) {
    return {
      kind: 'dfa-to-regex',
      result: '∅',
      steps: [{
        title: 'Empty language',
        detail: 'The machine has no accept states.',
        addedStateIds: [],
        addedTransitionIds: [],
      }],
      summary: ['Extracted regex: ∅ (no accept states)'],
    }
  }

  for (const id of startIds) gnfa[S][id] = 'ε'
  for (const id of acceptIds) gnfa[id][F] = 'ε'

  steps.push({
    title: 'Initialize GNFA',
    detail: 'Added universal start and accept states with ε-transitions (JFLAP FA→RE setup).',
    addedStateIds: [],
    addedTransitionIds: [],
  })

  for (const k of states) {
    const kLabel = source.states.find((s) => s.id === k)?.label || k
    const incoming = allStates.filter((i) => i !== k && gnfa[i][k] !== '∅')
    const outgoing = allStates.filter((j) => j !== k && gnfa[k][j] !== '∅')
    const self = gnfa[k][k]

    for (const i of incoming) {
      for (const j of outgoing) {
        const rIk = gnfa[i][k]
        const rKkStar = self === '∅' ? 'ε' : star(self)
        const rKj = gnfa[k][j]
        const path = concat(concat(rIk, rKkStar), rKj)
        gnfa[i][j] = union(gnfa[i][j], path)
      }
    }

    for (const s of allStates) {
      gnfa[s][k] = '∅'
      gnfa[k][s] = '∅'
    }

    steps.push({
      title: `Eliminate state ${kLabel}`,
      detail: `Rerouted paths through ${kLabel}. Partial regex: ${gnfa[S][F]}`,
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }

  const finalRegex = gnfa[S][F] === '∅' ? '∅' : gnfa[S][F]

  return {
    kind: 'dfa-to-regex',
    result: finalRegex,
    steps,
    summary: [`Extracted regex: ${finalRegex}`],
  }
}
