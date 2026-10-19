// Language-equivalence and edge-case tests for FA→Regex and PDA→CFG extraction.

import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from '../core/types'
import { runToCompletion } from '../core/engineFactory'
import { EPSILON } from '../core/utils'
import { dfaToRegex } from './dfaToRegex'
import { pdaToCfg } from './pdaToCfg'
import { regexToNfa } from './regexToNfa'
import { cfgToPda } from './cfgToPda'
import { enfaToNfa } from './epsilonElimination'
import { nfaToDfa } from './subsetConstruction'
import { minimizeDfa } from './minimizeDfa'
import { parseGrammarText } from '../../grammar/parser'

const accepts = (m: MachineDefinition, input: string): boolean =>
  runToCompletion(m, input).accepted === true

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

function expectEquivalent(a: MachineDefinition, b: MachineDefinition, alphabet: string[], maxLen = 4) {
  for (const s of allStrings(alphabet, maxLen)) {
    expect(accepts(b, s), `mismatch on "${s || 'ε'}"`).toBe(accepts(a, s))
  }
}

function expectRegexMatchesFa(fa: MachineDefinition, maxLen = 4) {
  const extracted = dfaToRegex(fa).result as string
  if (extracted === '∅') {
    for (const s of allStrings(fa.alphabet.length ? fa.alphabet : ['a', 'b'], maxLen)) {
      expect(accepts(fa, s), `FA should reject "${s || 'ε'}" when regex is ∅`).toBe(false)
    }
    return
  }
  const viaRegex = regexToNfa(extracted).result as MachineDefinition
  expectEquivalent(fa, viaRegex, fa.alphabet.length ? fa.alphabet : ['a', 'b'], maxLen)
}

/** JFLAP-normal NPDA (pop 1; push 0 or 2) for triplet extraction tests. */
function normalizedSamplePda(): MachineDefinition {
  return {
    id: 'pda_test',
    name: 'normalized',
    type: 'DPDA',
    language: '',
    alphabet: ['a', 'b'],
    blankSymbol: 'Z',
    states: [
      { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
      { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
    ],
    transitions: [
      { id: 't0', from: 'q0', to: 'q1', symbols: [], read: 'a', pop: 'Z', push: 'AZ' },
      { id: 't1', from: 'q1', to: 'q1', symbols: [], read: 'a', pop: 'A', push: 'A' },
      { id: 't2', from: 'q1', to: 'q0', symbols: [], read: 'b', pop: 'A', push: '' },
    ],
  }
}

function expectPdaMatchesExtractedCfg(pda: MachineDefinition, maxLen = 4) {
  const text = pdaToCfg(pda).result as string
  expect(() => parseGrammarText(text)).not.toThrow()
  const roundTrip = cfgToPda(text).result as MachineDefinition
  const alphabet = pda.alphabet.filter((sym) => sym.length === 1)
  expectEquivalent(pda, roundTrip, alphabet.length ? alphabet : ['a', 'b'], maxLen)
}

const dfaEndsInA: MachineDefinition = {
  id: 'e', name: 'ends-a', type: 'DFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['b'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 't2', from: 'q1', to: 'q0', symbols: ['b'] },
    { id: 't3', from: 'q1', to: 'q1', symbols: ['a'] },
  ],
}

const enfaAStar: MachineDefinition = {
  id: 'e', name: 'astar', type: 'ENFA', language: '', alphabet: ['a'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: [EPSILON] },
    { id: 't1', from: 'q0', to: 'q0', symbols: ['a'] },
  ],
}

const nfaEvenAs: MachineDefinition = {
  id: 'e', name: 'even-a', type: 'NFA', language: '', alphabet: ['a'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 't1', from: 'q1', to: 'q2', symbols: ['a'] },
    { id: 't2', from: 'q2', to: 'q1', symbols: ['a'] },
  ],
}

const dfaEmptyLang: MachineDefinition = {
  id: 'e', name: 'empty', type: 'DFA', language: '', alphabet: ['a'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
  ],
  transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: ['a'] }],
}

const dfaOnlyEpsilon: MachineDefinition = {
  id: 'e', name: 'eps', type: 'DFA', language: '', alphabet: ['a'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
  ],
  transitions: [],
}

describe('dfaToRegex — language equivalence via regexToNfa', () => {
  it('DFA for strings ending in a', () => {
    expectRegexMatchesFa(dfaEndsInA, 5)
  })

  it('ε-NFA for a*', () => {
    expect(dfaToRegex(enfaAStar).result).toBe('a*')
    expectRegexMatchesFa(enfaAStar, 5)
  })

  it('NFA for even number of a’s', () => {
    expectRegexMatchesFa(nfaEvenAs, 6)
  })

  it('pipeline: ε-NFA → NFA → DFA → min-DFA', () => {
    const dfa = minimizeDfa(
      nfaToDfa(enfaToNfa(enfaAStar).result as MachineDefinition).result as MachineDefinition,
    ).result as MachineDefinition
    expectRegexMatchesFa(dfa, 5)
  })

  it('empty language (no accept states) → ∅', () => {
    const noAccept = {
      ...dfaEndsInA,
      states: dfaEndsInA.states.map((s) => ({ ...s, isAccept: false })),
    }
    expect(dfaToRegex(noAccept).result).toBe('∅')
  })

  it('accept-only state with no moves → ε', () => {
    const r = dfaToRegex(dfaOnlyEpsilon).result as string
    expect(r).not.toBe('∅')
    expectEquivalent(dfaOnlyEpsilon, regexToNfa(r).result as MachineDefinition, ['a'], 3)
  })

  it('no accept states but traps → ∅ regex and empty language', () => {
    expect(dfaToRegex(dfaEmptyLang).result).toBe('∅')
    expect(accepts(dfaEmptyLang, '')).toBe(false)
  })

  it('rejects non-FA types', () => {
    expect(() => dfaToRegex(normalizedSamplePda())).toThrow(/finite automata/)
  })
})

describe('pdaToCfg — round-trip language via cfgToPda', () => {
  it('normalized hand-built NPDA', () => {
    expectPdaMatchesExtractedCfg(normalizedSamplePda(), 4)
  })

  it('emits parseable grammar text with V_ triplet variables', () => {
    const text = pdaToCfg(normalizedSamplePda()).result as string
    const g = parseGrammarText(text)
    expect(g.startSymbol).toBe('S')
    expect(g.productions.some((p) => p.lhs.startsWith('V_'))).toBe(true)
  })

  it('extracts CFG after CFG→PDA (returns embedded source grammar)', () => {
    const grammar = 'S -> a S b | ε'
    const fromCfg = cfgToPda(grammar).result as MachineDefinition
    expect(pdaToCfg(fromCfg).result).toBe(grammar)
  })

  it('CFG→PDA → PDA→CFG → CFG→PDA preserves language', () => {
    const text = 'S -> a S b | ε'
    const fromCfg = cfgToPda(text).result as MachineDefinition
    expect(fromCfg.grammarText).toBe(text)
    expect(pdaToCfg(fromCfg).result).toBe(text)
    expectPdaMatchesExtractedCfg(fromCfg, 5)
  })

  it('triplet extraction respects comma-separated two-symbol pushes', () => {
    const fromCfg = cfgToPda('S -> a S b | ε').result as MachineDefinition
    expect(fromCfg.transitions.some((t) => (t.push ?? '').includes(','))).toBe(true)
    const forTriplet = { ...fromCfg, grammarText: undefined }
    const text = pdaToCfg(forTriplet).result as string
    // Pre-fix bug treated "," as the second stack symbol (V_*_,_*).
    expect(text).not.toMatch(/V_[^_]+_,_[^_]+/)
    expect(text).toMatch(/V_[^_]+_S_[^_]+/)
  })

  it('throws on ε-pop outside start setup', () => {
    const pda = normalizedSamplePda()
    pda.transitions[1].pop = ''
    expect(() => pdaToCfg(pda)).toThrow(/ε-pop/)
  })

  it('chains >2 push symbols', () => {
    const pda = normalizedSamplePda()
    pda.transitions[0].pop = 'Z'
    pda.transitions[0].push = 'a,B,c'
    expect(() => pdaToCfg(pda)).not.toThrow()
  })

  it('rejects TM input', () => {
    const tm: MachineDefinition = {
      id: 't', name: 'tm', type: 'TM', language: '', alphabet: ['a'],
      states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false }],
      transitions: [],
      tapeAlphabet: ['a', '_'],
      blankSymbol: '_',
    }
    expect(() => pdaToCfg(tm)).toThrow(/pushdown/)
  })
})
