import type { MachineDefinition, MachineType, Transition } from '../core/types'
import { EPSILON } from '../core/utils'
import { classifyGrammar, validateGrammarFormat } from '../../grammar/classification'
import { parseGeneralGrammarText } from '../../grammar/parser'
import type { GeneralGrammar } from '../../grammar/types'
import { MachineBuilder } from './helpers'
import { minimizeDfa } from './minimizeDfa'
import { nfaToDfa } from './subsetConstruction'
import { regexToNfa } from './regexToNfa'
import type { ConversionResult, ConversionStep } from './types'

function normaliseRegularGrammar(text: string): GeneralGrammar {
  const grammar = parseGeneralGrammarText(text, 'TYPE_3')
  const validation = validateGrammarFormat(grammar, 'TYPE_3')
  if (!validation.isValidForSelectedFormat || classifyGrammar(grammar) !== 'TYPE_3') {
    throw new Error(validation.violations[0] ?? 'The supplied grammar is not Type 3 (regular).')
  }
  return grammar
}

function addRightLinearNfa(grammar: GeneralGrammar): {
  result: MachineDefinition
  steps: ConversionStep[]
} {
  const builder = new MachineBuilder()
  const stateByNonterminal = new Map<string, string>()
  for (const nonterminal of grammar.nonterminals) {
    stateByNonterminal.set(nonterminal, builder.addState({
      label: nonterminal,
      isStart: nonterminal === grammar.startSymbol,
    }))
  }
  const final = builder.addState({ label: 'q_accept', isAccept: true })
  const steps: ConversionStep[] = [{
    title: 'Create nonterminal states',
    detail: 'Each regular-grammar nonterminal becomes an automaton state; the grammar start symbol is the initial state.',
    addedStateIds: builder.getStates().map((state) => state.id),
    addedTransitionIds: [],
  }]
  const transitionIds: string[] = []

  for (const production of grammar.productions) {
    const from = stateByNonterminal.get(production.lhs[0])!
    if (production.rhs.length === 0) {
      builder.markAccept(from)
      continue
    }
    const [terminal, destination] = production.rhs
    const to = destination ? stateByNonterminal.get(destination)! : final
    transitionIds.push(builder.addTransition(from, to, { symbols: [terminal] }))
  }
  steps.push({
    title: 'Translate productions',
    detail: 'Rules A → aB become a transition A —a→ B; terminal-only rules lead to q_accept.',
    addedStateIds: [],
    addedTransitionIds: transitionIds,
  })
  return {
    result: builder.build({
      name: 'Type 3 grammar → NFA',
      type: 'NFA',
      language: `L(G), start symbol ${grammar.startSymbol}`,
      alphabet: [...grammar.terminals].sort(),
    }),
    steps,
  }
}

/** Convert a right- or left-linear Type 3 grammar to an equivalent NFA/ε-NFA. */
export function regularGrammarToNfa(text: string): ConversionResult {
  const grammar = normaliseRegularGrammar(text)
  const hasLeftLinearRule = grammar.productions.some((production) =>
    production.rhs.length === 2 && grammar.nonterminals.has(production.rhs[0]),
  )
  if (!hasLeftLinearRule) {
    const { result, steps } = addRightLinearNfa(grammar)
    return {
      kind: 'regular-grammar-to-nfa',
      result,
      steps,
      summary: [`Converted ${grammar.productions.length} regular productions into an NFA.`],
    }
  }

  // Reverse a left-linear grammar to a right-linear NFA, then reverse that
  // automaton. Multiple accepting states become ε-reachable from a fresh start.
  const reversed: GeneralGrammar = {
    ...grammar,
    productions: grammar.productions.map((production) => ({
      lhs: [...production.lhs],
      rhs: production.rhs.length === 2 ? [production.rhs[1], production.rhs[0]] : [...production.rhs],
    })),
  }
  const forward = addRightLinearNfa(reversed).result
  const builder = new MachineBuilder()
  const stateIds = new Map<string, string>()
  const reverseStart = builder.addState({ label: 'q_start', isStart: true })
  for (const state of forward.states) {
    stateIds.set(state.id, builder.addState({
      label: state.label,
      isAccept: state.isStart,
    }))
  }
  const transitionIds: string[] = []
  for (const accept of forward.states.filter((state) => state.isAccept)) {
    transitionIds.push(builder.addTransition(reverseStart, stateIds.get(accept.id)!, { symbols: [EPSILON] }))
  }
  for (const transition of forward.transitions) {
    transitionIds.push(builder.addTransition(
      stateIds.get(transition.to)!,
      stateIds.get(transition.from)!,
      { symbols: [...transition.symbols] },
    ))
  }
  return {
    kind: 'regular-grammar-to-nfa',
    result: builder.build({
      name: 'Left-linear Type 3 grammar → ε-NFA',
      type: 'ENFA',
      language: `L(G), start symbol ${grammar.startSymbol}`,
      alphabet: [...grammar.terminals].sort(),
    }),
    steps: [{
      title: 'Reverse the left-linear grammar',
      detail: 'Left-linear productions are converted through reversal, then the automaton is reversed to preserve the original language.',
      addedStateIds: builder.getStates().map((state) => state.id),
      addedTransitionIds: transitionIds,
    }],
    summary: [`Converted ${grammar.productions.length} left-linear productions into an ε-NFA.`],
  }
}

/**
 * Generate a compact right-linear grammar from a complete minimized DFA.
 * The start state is always `S`; remaining states use A, B, … (skipping S)
 * with numeric suffixes after the alphabet is exhausted.
 */
function minimizedDfaToRightLinearGrammar(dfa: MachineDefinition): string {
  const realStates = dfa.states.filter((state) => !state.isText)
  const start = realStates.find((state) => state.isStart)
  if (!start) throw new Error('The minimized DFA has no start state.')

  const orderedStates = [start, ...realStates.filter((state) => state.id !== start.id)]
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((letter) => letter !== 'S')
  const nonterminalFor = (index: number): string => {
    if (index === 0) return 'S'
    const ordinal = index - 1
    const letter = letters[ordinal % letters.length]
    const cycle = Math.floor(ordinal / letters.length)
    return cycle === 0 ? letter : `${letter}${cycle + 1}`
  }
  const names = new Map(orderedStates.map((state, index) => [state.id, nonterminalFor(index)]))
  const alphabet = [...new Set(dfa.alphabet)].sort()
  const lines: string[] = []

  for (const state of orderedStates) {
    const rhs = new Set<string>()
    for (const symbol of alphabet) {
      const transition = dfa.transitions.find((candidate) =>
        candidate.from === state.id && candidate.symbols.includes(symbol),
      )
      if (!transition) {
        throw new Error(`The minimized DFA is missing a transition from ${state.label || state.id} on "${symbol}".`)
      }
      const target = names.get(transition.to)
      if (!target) throw new Error('The minimized DFA transition points outside its state set.')
      rhs.add(`${symbol} ${target}`)
    }
    if (state.isAccept) rhs.add('ε')
    if (rhs.size > 0) lines.push(`${names.get(state.id)} -> ${[...rhs].join(' | ')}`)
  }

  const grammarText = lines.join('\n')
  const grammar = parseGeneralGrammarText(grammarText, 'TYPE_3')
  const validation = validateGrammarFormat(grammar, 'TYPE_3')
  if (!validation.isValidForSelectedFormat || classifyGrammar(grammar) !== 'TYPE_3') {
    throw new Error(validation.violations[0] ?? 'Internal error: minimized DFA did not yield a right-linear Type 3 grammar.')
  }
  return grammarText
}

/** Regex → ε-NFA → DFA → minimal DFA → right-linear Type 3 grammar. */
export function regexToRegularGrammar(regex: string): string {
  const enfa = regexToNfa(regex).result as MachineDefinition
  const dfa = nfaToDfa(enfa).result as MachineDefinition
  const minimized = minimizeDfa(dfa).result as MachineDefinition
  return minimizedDfaToRightLinearGrammar(minimized)
}

function toDfa(text: string): MachineDefinition {
  const nfa = regularGrammarToNfa(text).result as MachineDefinition
  return nfaToDfa(nfa).result as MachineDefinition
}

function finiteToPda(dfa: MachineDefinition, type: 'DPDA' | 'NPDA'): MachineDefinition {
  const transitions: Transition[] = dfa.transitions.flatMap((transition) =>
    transition.symbols.map((symbol, index) => ({
      id: `${transition.id}-${index}`,
      from: transition.from,
      to: transition.to,
      symbols: [],
      read: symbol,
      pop: '',
      push: '',
    })),
  )
  return {
    ...dfa,
    id: `${dfa.id}-${type.toLowerCase()}`,
    name: `${dfa.name} (${type})`,
    type,
    transitions,
    stackAlphabet: undefined,
  }
}

function finiteToTapeMachine(dfa: MachineDefinition, type: 'LBA' | 'NLBA' | 'TM'): MachineDefinition {
  const blank = '_'
  const acceptId = 'accept'
  const states = [
    ...dfa.states.map((state) => ({ ...state, isAccept: false, isReject: false })),
    { id: acceptId, label: 'q_accept', x: 0, y: 0, isStart: false, isAccept: true, isReject: false },
  ]
  const transitions: Transition[] = dfa.transitions.flatMap((transition) =>
    transition.symbols.map((symbol, index) => ({
      id: `${transition.id}-${index}`,
      from: transition.from,
      to: transition.to,
      symbols: [],
      read: symbol,
      write: symbol,
      direction: 'R' as const,
    })),
  )
  for (const state of dfa.states.filter((state) => state.isAccept)) {
    transitions.push({
      id: `${state.id}-eof`,
      from: state.id,
      to: acceptId,
      symbols: [],
      read: blank,
      write: blank,
      direction: 'S',
    })
  }
  return {
    id: `${dfa.id}-${type.toLowerCase()}`,
    name: `${dfa.name} (${type})`,
    type,
    language: dfa.language,
    states,
    transitions,
    alphabet: [...dfa.alphabet],
    tapeAlphabet: [...dfa.alphabet, blank],
    blankSymbol: blank,
  }
}

/** Construct a requested equivalent recognizer from a Type 3 grammar. */
export function regularGrammarToMachine(text: string, target: MachineType): ConversionResult {
  if (!['DFA', 'NFA', 'ENFA', 'DPDA', 'NPDA', 'LBA', 'NLBA', 'TM'].includes(target)) {
    throw new Error(`${target} is not a recognizer target for a regular grammar.`)
  }
  const base = regularGrammarToNfa(text)
  let result = base.result as MachineDefinition
  if (target === 'DFA') result = toDfa(text)
  else if (target === 'ENFA') result = { ...result, type: 'ENFA', name: `${result.name} (ε-NFA)` }
  else if (target === 'DPDA' || target === 'NPDA') result = finiteToPda(toDfa(text), target)
  else if (target === 'LBA' || target === 'NLBA' || target === 'TM') result = finiteToTapeMachine(toDfa(text), target)
  else result = { ...result, type: 'NFA' }
  return {
    ...base,
    kind: 'regular-grammar-to-nfa',
    result,
    summary: [...base.summary, `Opened as an equivalent ${target}.`],
  }
}
