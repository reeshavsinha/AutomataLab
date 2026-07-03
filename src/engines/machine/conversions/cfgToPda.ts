// ============================================================
// AutomataLab — CFG → PDA (NPDA, accept by final state)
// Standard one-loop-state construction with a bottom-of-stack marker:
//   • qStart —(ε, ε → S·Z)→ qLoop          push the start symbol over a marker
//   • qLoop  —(ε, A → α)→ qLoop            for each production A → α (α reversed
//                                          so its leftmost symbol ends on top)
//   • qLoop  —(a, a → ε)→ qLoop            match each terminal a ∈ Σ
//   • qLoop  —(ε, Z → ε)→ qAccept          empty the stack to accept
// Grammar symbols are single characters; A–Z are nonterminals, everything else
// is a terminal. `ε`/`λ`/empty RHS is the empty production.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { ConversionResult, ConversionStep } from './types'
import { MachineBuilder } from './helpers'

interface Production {
  lhs: string
  rhs: string[]
}

interface Grammar {
  start: string
  productions: Production[]
  nonterminals: string[]
  terminals: string[]
}

const ARROW = /\s*(?:->|→|::=|=>)\s*/
const EPSILON_TOKENS = new Set(['', 'ε', 'λ', 'eps', 'epsilon', 'lambda'])

function isNonterminal(ch: string): boolean {
  return /^[A-Z]$/.test(ch)
}

export function parseGrammar(text: string): Grammar {
  const productions: Production[] = []
  const nonterminals = new Set<string>()
  const terminals = new Set<string>()

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const parts = line.split(ARROW)
    if (parts.length < 2) {
      throw new Error(`Line "${line}" is missing a "->" (use e.g. S -> a S b | ε).`)
    }
    const lhs = parts[0].trim()
    if (!isNonterminal(lhs)) {
      throw new Error(`Left-hand side "${lhs}" must be a single uppercase nonterminal (A–Z).`)
    }
    nonterminals.add(lhs)

    const rhs = parts.slice(1).join(' ')
    for (const alt of rhs.split('|')) {
      const stripped = alt.replace(/\s+/g, '')
      if (EPSILON_TOKENS.has(stripped)) {
        productions.push({ lhs, rhs: [] })
        continue
      }
      const symbols = [...stripped]
      for (const sym of symbols) {
        if (isNonterminal(sym)) nonterminals.add(sym)
        else terminals.add(sym)
      }
      productions.push({ lhs, rhs: symbols })
    }
  }

  if (productions.length === 0) {
    throw new Error('Enter at least one production, e.g. S -> a S b | ε')
  }

  return {
    start: productions[0].lhs,
    productions,
    nonterminals: [...nonterminals].sort(),
    terminals: [...terminals].sort(),
  }
}

/** Pick a single-char bottom-of-stack marker that doesn't clash with a grammar symbol. */
function pickMarker(g: Grammar): string {
  const used = new Set([...g.nonterminals, ...g.terminals])
  for (const cand of ['Z', '$', '#', '⊥', '◊', '§', '@']) {
    if (!used.has(cand)) return cand
  }
  return '⊥'
}

export function cfgToPda(text: string): ConversionResult {
  const grammar = parseGrammar(text)
  const marker = pickMarker(grammar)
  const builder = new MachineBuilder()
  const steps: ConversionStep[] = []

  const qStart = builder.addState({ label: 'q_start', isStart: true })
  const qLoop = builder.addState({ label: 'q_loop' })
  const qAccept = builder.addState({ label: 'q_accept', isAccept: true })

  // Push the start symbol on top of the bottom marker.
  const tInit = builder.addTransition(qStart, qLoop, {
    read: '',
    pop: '',
    push: grammar.start + marker,
  })
  steps.push({
    title: 'Set up the PDA',
    detail:
      `Push the grammar's start symbol ${grammar.start} on top of a bottom marker ${marker}. ` +
      `All work happens at q_loop; q_accept is reached only when the stack is empty.`,
    addedStateIds: [qStart, qLoop, qAccept],
    addedTransitionIds: [tInit],
  })

  // One self-loop per production: pop the LHS, push the RHS (leftmost on top).
  for (const p of grammar.productions) {
    const pushStr = p.rhs.join('')
    const t = builder.addTransition(qLoop, qLoop, {
      read: '',
      pop: p.lhs,
      push: pushStr,
    })
    const rhsDisplay = p.rhs.length === 0 ? 'ε' : p.rhs.join('')
    steps.push({
      title: `Rule ${p.lhs} → ${rhsDisplay}`,
      detail:
        `On ε, pop ${p.lhs} and push "${rhsDisplay}" (its leftmost symbol ending on top), ` +
        `expanding the nonterminal in a leftmost derivation.`,
      addedStateIds: [],
      addedTransitionIds: [t],
    })
  }

  // Match each terminal against the stack top.
  const matchIds: string[] = []
  for (const a of grammar.terminals) {
    matchIds.push(
      builder.addTransition(qLoop, qLoop, { read: a, pop: a, push: '' })
    )
  }
  if (matchIds.length > 0) {
    steps.push({
      title: 'Match terminals',
      detail:
        `For each terminal, read it from the input while popping the matching symbol off the stack: ` +
        `${grammar.terminals.map((a) => `(${a}, ${a} → ε)`).join(', ')}.`,
      addedStateIds: [],
      addedTransitionIds: matchIds,
    })
  }

  // Empty the stack (pop the marker) to move into the accept state.
  const tAccept = builder.addTransition(qLoop, qAccept, {
    read: '',
    pop: marker,
    push: '',
  })
  steps.push({
    title: 'Accept on empty stack',
    detail:
      `When only the marker ${marker} remains and the input is consumed, pop it and move to q_accept.`,
    addedStateIds: [],
    addedTransitionIds: [tAccept],
  })

  const result = builder.build({
    name: 'CFG → PDA',
    type: 'NPDA',
    language: `L(G), start symbol ${grammar.start}`,
    alphabet: grammar.terminals,
    stackAlphabet: [...grammar.nonterminals, ...grammar.terminals, marker],
  })

  return {
    kind: 'cfg-to-pda',
    result,
    summary: [
      `${grammar.productions.length} production(s), start symbol ${grammar.start}.`,
      `Σ = {${grammar.terminals.join(', ')}}, Γ = {${[...grammar.nonterminals, ...grammar.terminals, marker].join(', ')}}.`,
    ],
    steps,
  }
}
