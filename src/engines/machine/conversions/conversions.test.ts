// ============================================================
// Conversion tests — correctness is checked by LANGUAGE EQUIVALENCE:
// run the source and the converted machine on every string up to a small length
// and assert identical accept/reject. Plus structural invariants (no ε after
// elimination, determinism after subset construction, minimality, and that the
// construction steps cover every element of the result).
// ============================================================

import { describe, it, expect } from 'vitest'
import type { MachineDefinition } from '../core/types'
import { isEpsilon } from '../core/utils'
import { runToCompletion } from '../core/engineFactory'
import type { ConversionResult } from './types'
import { enfaToNfa } from './epsilonElimination'
import { nfaToDfa } from './subsetConstruction'
import { minimizeDfa } from './minimizeDfa'
import { regexToNfa } from './regexToNfa'
import { cfgToPda } from './cfgToPda'
import { parseGrammarText } from '../../grammar/parser'
// ─── helpers ────────────────────────────────────────────────────

function allStrings(alphabet: string[], maxLen: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLen; len++) {
    const next: string[] = []
    for (const s of frontier) for (const a of alphabet) next.push(s + a)
    out.push(...next)
    frontier = next
  }
  return out
}

const accepts = (m: MachineDefinition, input: string): boolean =>
  runToCompletion(m, input).accepted === true

function expectEquivalent(a: MachineDefinition, b: MachineDefinition, alphabet: string[], maxLen = 4) {
  for (const s of allStrings(alphabet, maxLen)) {
    expect(accepts(b, s), `mismatch on "${s || 'ε'}"`).toBe(accepts(a, s))
  }
}

function expectMemberships(m: MachineDefinition, accept: string[], reject: string[]) {
  for (const s of accept) expect(accepts(m, s), `expected to accept "${s || 'ε'}"`).toBe(true)
  for (const s of reject) expect(accepts(m, s), `expected to reject "${s || 'ε'}"`).toBe(false)
}

/** Every result state/transition must be introduced by some step (reveal completeness). */
function expectStepsCoverResult(r: ConversionResult) {
  const stateIds = new Set<string>()
  const transIds = new Set<string>()
  for (const step of r.steps) {
    for (const id of step.addedStateIds) stateIds.add(id)
    for (const id of step.addedTransitionIds) transIds.add(id)
  }
  const result = r.result as MachineDefinition
  for (const s of result.states) expect(stateIds.has(s.id), `state ${s.id} never revealed`).toBe(true)
  for (const t of result.transitions) expect(transIds.has(t.id), `transition ${t.id} never revealed`).toBe(true)
}

function isDeterministic(m: MachineDefinition): boolean {
  for (const s of m.states) {
    const seen = new Set<string>()
    for (const t of m.transitions) {
      if (t.from !== s.id) continue
      for (const sym of t.symbols) {
        if (seen.has(sym)) return false
        seen.add(sym)
      }
    }
  }
  return true
}

// ─── fixtures ───────────────────────────────────────────────────

// ε-NFA over {a,b} for a*b* (start accepts via ε to the accept state).
const enfaAStarBStar: MachineDefinition = {
  id: 'e', name: 'a*b*', type: 'ENFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: [''] }, // ε
    { id: 't2', from: 'q1', to: 'q1', symbols: ['b'] },
  ],
}

// NFA over {a,b} accepting strings that END in 'a' (nondeterministic on 'a').
const nfaEndsInA: MachineDefinition = {
  id: 'n', name: 'ends-in-a', type: 'NFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q0', symbols: ['b'] },
    { id: 't2', from: 'q0', to: 'q1', symbols: ['a'] },
  ],
}

// Non-minimal DFA over {a,b} for "ends in a" (4 states; minimal is 2).
const dfaRedundant: MachineDefinition = {
  id: 'd', name: 'redundant', type: 'DFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
    { id: 'q2', label: 'q2', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q3', label: 'q3', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q2', symbols: ['b'] },
    { id: 't2', from: 'q1', to: 'q3', symbols: ['a'] },
    { id: 't3', from: 'q1', to: 'q2', symbols: ['b'] },
    { id: 't4', from: 'q2', to: 'q1', symbols: ['a'] },
    { id: 't5', from: 'q2', to: 'q2', symbols: ['b'] },
    { id: 't6', from: 'q3', to: 'q3', symbols: ['a'] },
    { id: 't7', from: 'q3', to: 'q2', symbols: ['b'] },
  ],
}

// ─── ε-NFA → NFA ─────────────────────────────────────────────────

describe('enfaToNfa (epsilon elimination)', () => {
  it('preserves the language', () => {
    const r = enfaToNfa(enfaAStarBStar)
    const result = r.result as MachineDefinition
    expect(result.type).toBe('NFA')
    expectEquivalent(enfaAStarBStar, result, ['a', 'b'], 5)
  })

  it('produces no ε-transitions', () => {
    const r = enfaToNfa(enfaAStarBStar)
    const result = r.result as MachineDefinition
    for (const t of result.transitions) {
      expect(t.symbols.some(isEpsilon)).toBe(false)
    }
  })

  it('steps reveal every result element', () => {
    expectStepsCoverResult(enfaToNfa(enfaAStarBStar))
  })
})

// ─── NFA / ε-NFA → DFA ───────────────────────────────────────────

describe('nfaToDfa (subset construction)', () => {
  it('preserves the language of an NFA', () => {
    const r = nfaToDfa(nfaEndsInA)
    const result = r.result as MachineDefinition
    expect(result.type).toBe('DFA')
    expectEquivalent(nfaEndsInA, result, ['a', 'b'], 5)
  })

  it('produces a deterministic machine', () => {
    expect(isDeterministic(nfaToDfa(nfaEndsInA).result as MachineDefinition)).toBe(true)
  })

  it('works directly on an ε-NFA', () => {
    const r = nfaToDfa(enfaAStarBStar)
    const result = r.result as MachineDefinition
    expectEquivalent(enfaAStarBStar, result, ['a', 'b'], 5)
    expect(isDeterministic(result)).toBe(true)
  })

  it('steps reveal every result element', () => {
    expectStepsCoverResult(nfaToDfa(nfaEndsInA))
  })
})

// ─── DFA minimization ────────────────────────────────────────────

describe('minimizeDfa', () => {
  it('preserves the language and reduces state count', () => {
    const r = minimizeDfa(dfaRedundant)
    const result = r.result as MachineDefinition
    expectEquivalent(dfaRedundant, result, ['a', 'b'], 5)
    expect(result.states.length).toBe(2) // minimal DFA for "ends in a"
  })

  it('leaves an already-minimal DFA at the same size', () => {
    const min = minimizeDfa(dfaRedundant).result as MachineDefinition
    const again = minimizeDfa(min).result as MachineDefinition
    expect(again.states.length).toBe(min.states.length)
    expectEquivalent(min, again, ['a', 'b'], 5)
  })

  it('drops unreachable states', () => {
    const withOrphan: MachineDefinition = {
      ...dfaRedundant,
      states: [...dfaRedundant.states, { id: 'orphan', label: 'orphan', x: 0, y: 0, isStart: false, isAccept: true }],
    }
    const r = minimizeDfa(withOrphan)
    const result = r.result as MachineDefinition
    expect(result.states.length).toBe(2)
  })

  it('steps reveal every result element', () => {
    expectStepsCoverResult(minimizeDfa(dfaRedundant))
  })
})

// ─── Regex → NFA (Thompson) ─────────────────────────────────────

describe('regexToNfa (Thompson construction)', () => {
  it('handles a single symbol', () => {
    const r = regexToNfa('a')
    expectMemberships(r.result as MachineDefinition, ['a'], ['', 'b', 'aa'])
  })

  it('handles union', () => {
    expectMemberships(regexToNfa('a|b').result as MachineDefinition, ['a', 'b'], ['', 'ab', 'aa'])
  })

  it('handles Kleene star', () => {
    expectMemberships(regexToNfa('a*').result as MachineDefinition, ['', 'a', 'aaaa'], ['b', 'ab'])
  })

  it('handles one-or-more (+) and optional (?)', () => {
    expectMemberships(regexToNfa('a+').result as MachineDefinition, ['a', 'aaa'], ['', 'b'])
    expectMemberships(regexToNfa('ab?').result as MachineDefinition, ['a', 'ab'], ['', 'b', 'abb'])
  })

  it('handles a compound regex (a|b)*abb', () => {
    const r = regexToNfa('(a|b)*abb')
    const result = r.result as MachineDefinition
    expectMemberships(
      result,
      ['abb', 'aabb', 'babb', 'abababb', 'bbabb'],
      ['', 'ab', 'abba', 'b', 'aab']
    )
    expect(result.type).toBe('ENFA')
  })

  it('the result round-trips through ε-elimination and subset construction', () => {
    const enfa = regexToNfa('(a|b)*abb').result as MachineDefinition
    const dfa = nfaToDfa(enfa).result as MachineDefinition
    expectEquivalent(enfa, dfa, ['a', 'b'], 5)
  })

  it('rejects malformed input', () => {
    expect(() => regexToNfa('(a')).toThrow()
    expect(() => regexToNfa('*a')).toThrow()
  })

  it('steps reveal every result element', () => {
    expectStepsCoverResult(regexToNfa('(a|b)*abb'))
  })
})

// ─── CFG → PDA ──────────────────────────────────────────────────

describe('cfgToPda', () => {
  it('parses a grammar', () => {
    const g = parseGrammarText('S -> a S b | ε')
    expect(g.startSymbol).toBe('S')
    expect(Array.from(g.terminals)).toEqual(['a', 'b'])
    expect(g.productions).toHaveLength(2)
  })

  it('builds a PDA for { aⁿbⁿ }', () => {
    const r = cfgToPda('S -> a S b | ε')
    const result = r.result as MachineDefinition
    expect(result.type).toBe('NPDA')
    expectMemberships(
      result,
      ['', 'ab', 'aabb', 'aaabbb'],
      ['a', 'b', 'abb', 'ba', 'aab', 'abab']
    )
  })

  it('builds a PDA for balanced parentheses', () => {
    const r = cfgToPda('S -> (S)S | ε')
    expectMemberships(
      r.result as MachineDefinition,
      ['', '()', '(())', '()()', '(()())'],
      ['(', ')', '(()', '())', ')(']
    )
  })

  it('steps reveal every result element', () => {
    expectStepsCoverResult(cfgToPda('S -> a S b | ε'))
  })

  it('rejects a malformed grammar', () => {
    expect(() => parseGrammarText('x -> a')).toThrow()
    expect(() => parseGrammarText('no arrow here')).toThrow()
    expect(() => parseGrammarText('# only a comment')).toThrow()
  })
})

