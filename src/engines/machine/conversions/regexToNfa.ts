// ============================================================
// AutomataLab — Regex → NFA (Thompson's construction)
// Parses a regular expression and builds an ε-NFA with one start and one accept
// state, composing fragments for symbols, concatenation, union (|), Kleene star
// (*), one-or-more (+) and optional (?). Grouping with ( ). `ε`/`λ`/empty = the
// empty string. Every other non-operator character is a literal.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { ConversionResult, ConversionStep } from './types'
import { EPSILON } from '../core/utils'
import { MachineBuilder } from './helpers'

// ─── Regex AST ──────────────────────────────────────────────────

type Node =
  | { kind: 'empty' }
  | { kind: 'char'; char: string }
  | { kind: 'concat'; parts: Node[] }
  | { kind: 'union'; options: Node[] }
  | { kind: 'star'; node: Node }
  | { kind: 'plus'; node: Node }
  | { kind: 'opt'; node: Node }

const OPERATORS = new Set(['|', '*', '+', '?', '(', ')'])
const MAX_REGEX_LENGTH = 10_000
const MAX_REGEX_NESTING = 256

function parseRegex(input: string): Node {
  const src = input.replace(/\s+/g, '')
  if (src.length > MAX_REGEX_LENGTH) {
    throw new Error(`Regular expression is too long (maximum ${MAX_REGEX_LENGTH} characters).`)
  }
  let pos = 0
  let groupDepth = 0
  const peek = () => src[pos]
  const eof = () => pos >= src.length

  const parseUnion = (): Node => {
    const options = [parseConcat()]
    while (peek() === '|') {
      pos++
      options.push(parseConcat())
    }
    return options.length === 1 ? options[0] : { kind: 'union', options }
  }

  const parseConcat = (): Node => {
    const parts: Node[] = []
    while (!eof() && peek() !== '|' && peek() !== ')') {
      parts.push(parseRepeat())
    }
    if (parts.length === 0) return { kind: 'empty' }
    return parts.length === 1 ? parts[0] : { kind: 'concat', parts }
  }

  const parseRepeat = (): Node => {
    let node = parseAtom()
    let repeatDepth = 0
    while (peek() === '*' || peek() === '+' || peek() === '?') {
      repeatDepth++
      if (repeatDepth > MAX_REGEX_NESTING) {
        throw new Error(`Regular expression nesting is too deep (maximum ${MAX_REGEX_NESTING}).`)
      }
      const op = src[pos++]
      node = op === '*' ? { kind: 'star', node } : op === '+' ? { kind: 'plus', node } : { kind: 'opt', node }
    }
    return node
  }

  const parseAtom = (): Node => {
    const c = peek()
    if (c === undefined) return { kind: 'empty' }
    if (c === '(') {
      groupDepth++
      if (groupDepth > MAX_REGEX_NESTING) {
        throw new Error(`Regular expression nesting is too deep (maximum ${MAX_REGEX_NESTING}).`)
      }
      pos++
      const inner = parseUnion()
      if (peek() !== ')') throw new Error('Unbalanced parentheses: missing ")".')
      pos++
      groupDepth--
      return inner
    }
    if (c === 'ε' || c === 'λ') {
      pos++
      return { kind: 'empty' }
    }
    if (OPERATORS.has(c)) {
      throw new Error(`Unexpected "${c}" in the regular expression.`)
    }
    pos++
    return { kind: 'char', char: c }
  }

  const ast = parseUnion()
  if (!eof()) {
    throw new Error(`Unexpected "${peek()}" — check the parentheses.`)
  }
  return ast
}

interface Fragment {
  start: string
  accept: string
}

export function regexToNfa(regex: string): ConversionResult {
  const ast = parseRegex(regex)
  const builder = new MachineBuilder()
  const steps: ConversionStep[] = []
  const alphabet = new Set<string>()

  const eps = (from: string, to: string) => builder.addTransition(from, to, { symbols: [EPSILON] })

  const build = (node: Node): Fragment => {
    switch (node.kind) {
      case 'empty': {
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const t = eps(start, accept)
        steps.push({
          title: 'Empty string (ε)',
          detail: 'A fragment that accepts ε: a start state with a single ε-edge to its accept state.',
          addedStateIds: [start, accept],
          addedTransitionIds: [t],
        })
        return { start, accept }
      }
      case 'char': {
        alphabet.add(node.char)
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const t = builder.addTransition(start, accept, { symbols: [node.char] })
        steps.push({
          title: `Symbol "${node.char}"`,
          detail: `A fragment for the literal "${node.char}": start —${node.char}→ accept.`,
          addedStateIds: [start, accept],
          addedTransitionIds: [t],
        })
        return { start, accept }
      }
      case 'concat': {
        const frags = node.parts.map(build)
        const added: string[] = []
        for (let i = 1; i < frags.length; i++) {
          added.push(eps(frags[i - 1].accept, frags[i].start))
        }
        steps.push({
          title: 'Concatenation',
          detail: 'Join the fragments in order with ε-edges (each accept links to the next start).',
          addedStateIds: [],
          addedTransitionIds: added,
        })
        return { start: frags[0].start, accept: frags[frags.length - 1].accept }
      }
      case 'union': {
        const frags = node.options.map(build)
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const added: string[] = []
        for (const f of frags) {
          added.push(eps(start, f.start))
          added.push(eps(f.accept, accept))
        }
        steps.push({
          title: 'Alternation (|)',
          detail: 'A new start branches by ε into each option; every option ε-joins a new shared accept.',
          addedStateIds: [start, accept],
          addedTransitionIds: added,
        })
        return { start, accept }
      }
      case 'star': {
        const inner = build(node.node)
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const added = [
          eps(start, inner.start),
          eps(start, accept),
          eps(inner.accept, inner.start),
          eps(inner.accept, accept),
        ]
        steps.push({
          title: 'Kleene star (*)',
          detail: 'Allow zero repetitions (start →ε→ accept) and looping (accept →ε→ start of the inner fragment).',
          addedStateIds: [start, accept],
          addedTransitionIds: added,
        })
        return { start, accept }
      }
      case 'plus': {
        const inner = build(node.node)
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const added = [
          eps(start, inner.start),
          eps(inner.accept, inner.start),
          eps(inner.accept, accept),
        ]
        steps.push({
          title: 'One or more (+)',
          detail: 'Like star but the inner fragment must run at least once — there is no direct start →ε→ accept edge.',
          addedStateIds: [start, accept],
          addedTransitionIds: added,
        })
        return { start, accept }
      }
      case 'opt': {
        const inner = build(node.node)
        const start = builder.addState({ label: '' })
        const accept = builder.addState({ label: '' })
        const added = [eps(start, inner.start), eps(start, accept), eps(inner.accept, accept)]
        steps.push({
          title: 'Optional (?)',
          detail: 'Zero or one occurrence: branch ε to the inner fragment or ε straight to accept.',
          addedStateIds: [start, accept],
          addedTransitionIds: added,
        })
        return { start, accept }
      }
    }
  }

  const top = build(ast)

  // Promote the top fragment's endpoints and give every state a q-label.
  const states = builder.getStates()
  states.forEach((s, i) => {
    s.label = `q${i}`
  })
  const startState = states.find((s) => s.id === top.start)!
  const acceptState = states.find((s) => s.id === top.accept)!
  startState.isStart = true
  acceptState.isAccept = true

  steps.push({
    title: 'Start and accept',
    detail: `Mark the outermost fragment's endpoints: ${startState.label} is the start, ${acceptState.label} is the (only) accept state.`,
    addedStateIds: [],
    addedTransitionIds: [],
  })

  const result = builder.build({
    name: `RE: ${regex || 'ε'} (ε-NFA)`,
    type: 'ENFA',
    language: `L = strings matching ${regex || 'ε'}`,
    alphabet: [...alphabet].sort(),
  })

  return {
    kind: 'regex-to-nfa',
    result,
    summary: [
      `Regex "${regex || 'ε'}" → ε-NFA with ${result.states.length} states.`,
      `Σ = {${[...alphabet].sort().join(', ')}}.`,
    ],
    steps,
  }
}
