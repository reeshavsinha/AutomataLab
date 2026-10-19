import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from '../core/types'
import { isEpsilon } from '../core/utils'
import { checkEquivalence } from '../core/analysis'
import { runToCompletion } from '../core/engineFactory'
import { convertGrammarToMachine } from './grammarToMachine'
import { regexToNfa } from './regexToNfa'
import { regexToRegularGrammar, regularGrammarToMachine, regularGrammarToNfa } from './regularGrammar'
import { cfgToPda } from './cfgToPda'
import { grammarToRecognizer } from './grammarRecognizer'
import { nfaToDfa } from './subsetConstruction'

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

function expectEquivalent(a: MachineDefinition, b: MachineDefinition, alphabet: string[], maxLen: number) {
  for (const s of allStrings(alphabet, maxLen)) {
    const aa = runToCompletion(a, s).accepted === true
    const bb = runToCompletion(b, s).accepted === true
    expect(bb, `mismatch on "${s || 'ε'}"`).toBe(aa)
  }
}

/** Binary strings whose value mod 3 is 0 (MSB-first). */
function isMod3Zero(bits: string): boolean {
  let r = 0
  for (const ch of bits) r = (r * 2 + (ch === '1' ? 1 : 0)) % 3
  return r === 0
}

describe('conversion edge cases', () => {
  it('preserves mod-3 binary language through regex → grammar → DFA', () => {
    const regex = '(0|1(01*0)*1)*'
    const grammar = regexToRegularGrammar(regex)
    const enfa = regexToNfa(regex).result as MachineDefinition
    const dfa = convertGrammarToMachine(regex, 'REGEX', 'DFA').result as MachineDefinition
    expect(checkEquivalence(enfa, dfa)).toEqual({ equivalent: true, counterexample: null })
    for (const s of allStrings(['0', '1'], 6)) {
      expect(runToCompletion(dfa, s).accepted).toBe(isMod3Zero(s))
    }
    expect(regularGrammarToNfa(grammar).result).toHaveProperty('type')
  })

  it('converts left-linear Type 3 grammar to the same language as reversed right-linear', () => {
    const left = `S -> B a | a
B -> B b | b`
    const nfa = regularGrammarToNfa(left).result as MachineDefinition
    expect(nfa.type).toBe('ENFA')
    const asNfaTarget = regularGrammarToMachine(left, 'NFA').result as MachineDefinition
    expect(asNfaTarget.type).toBe('NFA')
    expect(asNfaTarget.transitions.some((t) => t.symbols.some(isEpsilon))).toBe(false)
    expect(checkEquivalence(nfa, asNfaTarget)).toEqual({ equivalent: true, counterexample: null })
    const dfa = regularGrammarToMachine(left, 'DFA').result as MachineDefinition
    expect(checkEquivalence(nfa, dfa)).toEqual({ equivalent: true, counterexample: null })
    for (const s of ['a', 'ba', 'bba', 'bbba', 'ab', 'b']) {
      const ok = /^b*a+$/.test(s)
      expect(runToCompletion(dfa, s).accepted, s).toBe(ok)
    }
  })

  it('CFG → PDA accepts the empty language grammar S → ε only', () => {
    const pda = cfgToPda('S -> ε').result as MachineDefinition
    expect(runToCompletion(pda, '').accepted).toBe(true)
    expect(runToCompletion(pda, 'a').accepted).toBe(false)
  })

  it('CFG → PDA handles a single-terminal alphabet', () => {
    const pda = cfgToPda('S -> a S | ε').result as MachineDefinition
    expectEquivalent(
      pda,
      cfgToPda('S -> a S | ε').result as MachineDefinition,
      ['a'],
      5,
    )
    for (const s of ['', 'a', 'aa', 'aaa', 'aaaa']) {
      expect(runToCompletion(pda, s).accepted).toBe(true)
    }
    expect(runToCompletion(pda, 'b').accepted).toBe(false)
  })

  it('regex pipeline handles nested stars and alternation (Grammar Lab style)', () => {
    const regex = '1(01*0)*1'
    const dfa = nfaToDfa(regexToNfa(regex).result as MachineDefinition).result as MachineDefinition
    const viaGrammar = regularGrammarToMachine(regexToRegularGrammar(regex), 'DFA').result as MachineDefinition
    expect(checkEquivalence(dfa, viaGrammar)).toEqual({ equivalent: true, counterexample: null })
  })

  it('CFG PDA and bounded NLBA recognizer agree on a^n b^n', () => {
    const grammar = 'S -> a S b | ε'
    const pda = cfgToPda(grammar).result as MachineDefinition
    const nlba = grammarToRecognizer(grammar, 'TYPE_2', 'NLBA').result as MachineDefinition
    for (const s of ['', 'ab', 'aabb', 'aaabbb', 'a', 'b', 'ba', 'abb', 'abab']) {
      const fromPda = runToCompletion(pda, s).accepted === true
      const fromNlba = runToCompletion(nlba, s).accepted === true
      expect(fromNlba, s).toBe(fromPda)
    }
  })

  it('convertGrammarToMachine wires Type 3 and REGEX to the same DFA language', () => {
    const type3 = 'S -> a S | b A | ε\nA -> a S | b'
    const fromType3 = convertGrammarToMachine(type3, 'TYPE_3', 'DFA').result as MachineDefinition
    const fromRegex = convertGrammarToMachine('(a+b)*a', 'REGEX', 'DFA').result as MachineDefinition
    expect(runToCompletion(fromType3, 'aa').accepted).toBe(true)
    expect(runToCompletion(fromRegex, 'aba').accepted).toBe(true)
  })
})
