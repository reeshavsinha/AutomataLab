// ============================================================
// AutomataLab — PDA → CFG (Standard Triplet Construction)
// Extracts a Context-Free Grammar from a Pushdown Automaton.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { isEpsilon } from '../core/utils'
import type { ConversionResult, ConversionStep } from './types'

export function pdaToCfg(source: MachineDefinition): ConversionResult {
  const steps: ConversionStep[] = []
  
  if (source.type !== 'NPDA' && source.type !== 'DPDA') {
    throw new Error('Only Pushdown Automata can be converted to Context-Free Grammars.')
  }

  const startState = source.states.find(s => s.isStart)
  if (!startState) throw new Error('PDA has no start state.')

  // Validate strict normal form
  for (const t of source.transitions) {
    if (!t.pop || isEpsilon(t.pop)) {
      throw new Error(`Transition ${t.id} pops ε. PDA-to-CFG requires all transitions to pop exactly 1 stack symbol.`)
    }
    if (t.pop.length > 1) {
      throw new Error(`Transition ${t.id} pops multiple symbols. Only 1 stack symbol pop is supported.`)
    }
    if (t.push && !isEpsilon(t.push) && t.push.length > 2) {
      throw new Error(`Transition ${t.id} pushes ${t.push.length} symbols. Only up to 2 pushes are supported for CFG extraction.`)
    }
  }

  const rules: string[] = []
  const states = source.states.filter(s => !s.isText).map(s => s.id)
  
  // Format variables like [p,X,q]
  const v = (p: string, X: string, q: string) => {
    const pl = source.states.find(s => s.id === p)?.label || p
    const ql = source.states.find(s => s.id === q)?.label || q
    return `[${pl},${X},${ql}]`
  }

  // 1. S -> [q0, Z0, p] for all p
  const Z0 = source.blankSymbol || 'Z'
  const S_rules: string[] = []
  for (const p of states) {
    S_rules.push(v(startState.id, Z0, p))
  }
  if (S_rules.length > 0) {
    rules.push(`S -> ${S_rules.join(' | ')}`)
    steps.push({
      title: 'Start Rules',
      detail: `Created start rules S -> [startState, Z0, p] for every state p.`,
      addedStateIds: [], addedTransitionIds: []
    })
  }

  // 2. Process each transition
  for (const t of source.transitions) {
    const p = t.from
    const q = t.to
    const a = !t.read || isEpsilon(t.read) ? 'ε' : t.read
    const X = t.pop!
    const push = !t.push || isEpsilon(t.push) ? '' : t.push

    if (push.length === 0) {
      // Pop: [p,X,q] -> a
      rules.push(`${v(p, X, q)} -> ${a}`)
    } else if (push.length === 1) {
      // 1-push: [p,X,r] -> a[q,Y1,r] for all r
      const Y1 = push[0]
      for (const r of states) {
        rules.push(`${v(p, X, r)} -> ${a === 'ε' ? '' : a} ${v(q, Y1, r)}`.trim())
      }
    } else if (push.length === 2) {
      // 2-push: [p,X,r] -> a[q,Y1,s][s,Y2,r] for all r,s
      const Y1 = push[0]
      const Y2 = push[1]
      for (const r of states) {
        for (const s of states) {
          rules.push(`${v(p, X, r)} -> ${a === 'ε' ? '' : a} ${v(q, Y1, s)} ${v(s, Y2, r)}`.trim())
        }
      }
    }
  }

  steps.push({
    title: 'Transition Rules',
    detail: `Generated triplet rules for each PDA transition.`,
    addedStateIds: [], addedTransitionIds: []
  })

  const finalCfg = rules.join('\n')

  return {
    kind: 'pda-to-cfg',
    result: finalCfg,
    steps,
    summary: [`Extracted CFG with ${rules.length} rules.`]
  }
}
