// ============================================================
// AutomataLab — DFA/NFA → Regex (State Elimination Method)
// Extracts a regular expression from an FA by building a GNFA
// and systematically eliminating states.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { isEpsilon, generateId } from '../core/utils'
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
  if (a === 'ε') return b.includes('|') && !isWrapped(b) ? `(${b})?` : `${b}?`
  if (b === 'ε') return a.includes('|') && !isWrapped(a) ? `(${a})?` : `${a}?`
  return `${a}|${b}`
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
  const steps: ConversionStep[] = []
  
  const states = source.states.filter(s => !s.isText).map(s => s.id)
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

  // Initial transitions
  for (const t of source.transitions) {
    let r = ''
    if (t.symbols.length === 0) r = 'ε'
    else r = t.symbols.map(s => isEpsilon(s) ? 'ε' : s).join('|')
    gnfa[t.from][t.to] = gnfa[t.from][t.to] === '∅' ? r : union(gnfa[t.from][t.to], r)
  }

  // Connect S and F
  const startIds = source.states.filter(s => s.isStart).map(s => s.id)
  const acceptIds = source.states.filter(s => s.isAccept).map(s => s.id)
  
  if (acceptIds.length === 0) {
    return {
      kind: 'dfa-to-regex',
      result: '∅',
      steps: [{ title: 'Empty Language', detail: 'The machine has no accept states.', addedStateIds: [], addedTransitionIds: [] }],
      summary: ['Extracted Regex: ∅ (no accept states)']
    }
  }

  for (const id of startIds) gnfa[S][id] = 'ε'
  for (const id of acceptIds) gnfa[id][F] = 'ε'
  
  steps.push({
    title: 'Initialize GNFA',
    detail: `Added a new universal start state and accept state with ε-transitions to original states.`,
    addedStateIds: [], addedTransitionIds: []
  })

  // Eliminate states
  for (const k of states) {
    const kLabel = source.states.find(s => s.id === k)?.label || k
    const incoming = allStates.filter(i => i !== k && gnfa[i][k] !== '∅')
    const outgoing = allStates.filter(j => j !== k && gnfa[k][j] !== '∅')
    const self = gnfa[k][k]

    for (const i of incoming) {
      for (const j of outgoing) {
        const r_ik = gnfa[i][k]
        const r_kk_star = self === '∅' ? 'ε' : star(self)
        const r_kj = gnfa[k][j]
        const path = concat(concat(r_ik, r_kk_star), r_kj)
        gnfa[i][j] = union(gnfa[i][j], path)
      }
    }
    
    for (const s of allStates) {
      gnfa[s][k] = '∅'
      gnfa[k][s] = '∅'
    }
    
    steps.push({
      title: `Eliminated state ${kLabel}`,
      detail: `Rerouted paths through ${kLabel}. Current Regex: ${gnfa[S][F]}`,
      addedStateIds: [], addedTransitionIds: []
    })
  }

  const finalRegex = gnfa[S][F] === '∅' ? '∅' : gnfa[S][F]
  
  return {
    kind: 'dfa-to-regex',
    result: finalRegex,
    steps,
    summary: [`Extracted Regex: ${finalRegex}`]
  }
}
