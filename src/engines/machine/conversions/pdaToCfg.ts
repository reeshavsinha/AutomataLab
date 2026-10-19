// ============================================================
// AutomataLab — PDA → CFG (triplet / JFLAP-style construction)
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition } from '../core/types'
import { isEpsilon, isPDAType } from '../core/utils'
import type { ConversionResult, ConversionStep } from './types'
import { expandPush, normalizePdaForCfg, pdaNeedsNormalization } from './pdaNormalize'

export function pdaToCfg(source: MachineDefinition): ConversionResult {
  const steps: ConversionStep[] = []

  if (!isPDAType(source.type)) {
    throw new Error('Only pushdown automata (DPDA/NPDA) can be converted to a context-free grammar.')
  }

  const embeddedGrammar = source.grammarText?.trim()
  if (embeddedGrammar) {
    steps.push({
      title: 'Source grammar',
      detail:
        'This PDA was produced from a CFG (CFG → PDA). Returning the embedded grammar text so PDA → CFG → CFG → PDA preserves the language.',
      addedStateIds: [],
      addedTransitionIds: [],
    })
    return {
      kind: 'pda-to-cfg',
      result: embeddedGrammar,
      steps,
      summary: ['Returned embedded source grammar (not triplet extraction).'],
    }
  }

  const normalized = normalizePdaForCfg(source)
  if (pdaNeedsNormalization(source)) {
    steps.push({
      title: 'Normalize PDA',
      detail:
        'Rewrote ε-setup and long pushes into JFLAP-normal moves (pop one symbol; push 0–2) for triplet extraction.',
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }

  const startState = normalized.states.find((s) => s.isStart)
  if (!startState) throw new Error('PDA has no start state.')

  for (const t of normalized.transitions) {
    if (!t.pop || isEpsilon(t.pop)) {
      throw new Error(
        `Transition ${t.id} pops ε. PDA→CFG needs JFLAP-style moves (pop exactly one stack symbol; push 0 or 2). ` +
          `CFG→PDA machines must be normalized first — split ε-setup and ε-match transitions.`,
      )
    }
    if (t.pop.length > 1) {
      throw new Error(`Transition ${t.id} pops multiple symbols. Only one stack symbol per pop is supported.`)
    }
    if (expandPush(t.push).length > 2) {
      throw new Error(`Transition ${t.id} pushes more than two stack symbols. Use JFLAP normal form.`)
    }
  }

  const rules: string[] = []
  const states = normalized.states.filter((s) => !s.isText).map((s) => s.id)

  /** Parseable nonterminal: one identifier (Grammar Lab treats A–Z words as NTs). */
  const v = (p: string, X: string, q: string) => `V_${p}_${X}_${q}`

  const Z0 = normalized.initialStack?.[0] ?? (normalized.blankSymbol || 'Z')
  const S_rules: string[] = []
  for (const p of states) {
    S_rules.push(v(startState.id, Z0, p))
  }
  if (S_rules.length > 0) {
    rules.push(`S -> ${S_rules.join(' | ')}`)
    steps.push({
      title: 'Start production',
      detail: `S → [q₀,${Z0},p] for every state p (net pop of initial stack marker).`,
      addedStateIds: [],
      addedTransitionIds: [],
    })
  }

  for (const t of normalized.transitions) {
    const p = t.from
    const q = t.to
    const a = !t.read || isEpsilon(t.read) ? 'ε' : t.read
    const X = t.pop!
    const pushSyms = expandPush(t.push)

    if (pushSyms.length === 0) {
      rules.push(`${v(p, X, q)} -> ${a === 'ε' ? 'ε' : a}`)
    } else if (pushSyms.length === 1) {
      const Y1 = pushSyms[0]
      for (const r of states) {
        const rhs = a === 'ε' ? v(q, Y1, r) : `${a} ${v(q, Y1, r)}`
        rules.push(`${v(p, X, r)} -> ${rhs}`)
      }
    } else if (pushSyms.length === 2) {
      const Y1 = pushSyms[0]
      const Y2 = pushSyms[1]
      for (const r of states) {
        for (const s of states) {
          const rhs = a === 'ε'
            ? `${v(q, Y1, s)} ${v(s, Y2, r)}`
            : `${a} ${v(q, Y1, s)} ${v(s, Y2, r)}`
          rules.push(`${v(p, X, r)} -> ${rhs}`)
        }
      }
    } else {
      throw new Error(`Transition ${t.id} pushes ${pushSyms.length} symbols after normalization.`)
    }
  }

  steps.push({
    title: 'Transition productions',
    detail: 'Triplet rules for each pop / push pattern (Type 1: pop only; Type 2: push two with all state pairs).',
    addedStateIds: [],
    addedTransitionIds: [],
  })

  const finalCfg = rules.join('\n')

  return {
    kind: 'pda-to-cfg',
    result: finalCfg,
    steps,
    summary: [`Extracted CFG with ${rules.length} productions.`],
  }
}
