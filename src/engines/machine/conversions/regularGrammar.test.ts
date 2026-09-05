import { describe, expect, it } from 'vitest'
import { runToCompletion } from '../core/engineFactory'
import { checkEquivalence } from '../core/analysis'
import { classifyGrammar, validateGrammarFormat } from '../../grammar/classification'
import { parseGeneralGrammarText } from '../../grammar/parser'
import { minimizeDfa } from './minimizeDfa'
import { regexToNfa } from './regexToNfa'
import { regexToRegularGrammar, regularGrammarToMachine, regularGrammarToNfa } from './regularGrammar'
import { nfaToDfa } from './subsetConstruction'

function assertEquivalentRightLinearGrammar(regex: string): string {
  const grammarText = regexToRegularGrammar(regex)
  const grammar = parseGeneralGrammarText(grammarText, 'TYPE_3')
  expect(classifyGrammar(grammar), regex).toBe('TYPE_3')
  expect(validateGrammarFormat(grammar, 'TYPE_3').isValidForSelectedFormat, regex).toBe(true)

  const source = regexToNfa(regex).result
  const generated = regularGrammarToNfa(grammarText).result
  expect(typeof source).not.toBe('string')
  expect(typeof generated).not.toBe('string')
  if (typeof source !== 'string' && typeof generated !== 'string') {
    const dfa = nfaToDfa(source).result
    expect(typeof dfa).not.toBe('string')
    if (typeof dfa !== 'string') {
      const minimized = minimizeDfa(dfa).result
      expect(typeof minimized).not.toBe('string')
      if (typeof minimized !== 'string') {
        expect(grammar.nonterminals.size, `${regex} should use one nonterminal per minimized DFA state`)
          .toBe(minimized.states.filter((state) => !state.isText).length)
      }
    }
    expect(checkEquivalence(source, generated), regex).toEqual({ equivalent: true, counterexample: null })
  }
  return grammarText
}

describe('regular grammar conversions', () => {
  const grammar = `S -> a S | b A | ε
A -> a S | b`

  it('converts a Type 3 grammar into an equivalent NFA', () => {
    const result = regularGrammarToNfa(grammar).result
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return
    expect(result.type).toBe('NFA')
    expect(runToCompletion(result, 'aa').accepted).toBe(true)
    expect(runToCompletion(result, 'b').accepted).toBe(false)
  })

  it('builds equivalent machine representations for regular grammar targets', () => {
    for (const target of ['DFA', 'DPDA', 'NPDA', 'LBA', 'TM'] as const) {
      const result = regularGrammarToMachine(grammar, target).result
      expect(typeof result).not.toBe('string')
      if (typeof result === 'string') continue
      expect(result.type).toBe(target)
      expect(runToCompletion(result, 'aa').accepted).toBe(true)
    }
  })

  it('adapts a regex into a Type 3 grammar with the start rule first', () => {
    const converted = regexToRegularGrammar('a*b')
    expect(converted.split('\n')[0]).toMatch(/^S ->/)
    expect(regularGrammarToNfa(converted).result).toHaveProperty('type')
  })

  it('keeps Grammar Lab binary + alternation through regex → grammar → DFA', () => {
    const grammar = regexToRegularGrammar('(a+b)*ab')
    const result = regularGrammarToMachine(grammar, 'DFA').result
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return

    for (const input of ['ab', 'aab', 'bab', 'bbab', 'abab']) {
      expect(runToCompletion(result, input).accepted, input).toBe(true)
    }
    for (const input of ['', 'a', 'b', 'aba', 'abb']) {
      expect(runToCompletion(result, input).accepted, input).toBe(false)
    }
  })

  it('retains postfix + for one-or-more when it closes a grouped expression', () => {
    const grammar = regexToRegularGrammar('(a+)b')
    const result = regularGrammarToMachine(grammar, 'DFA').result
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return
    expect(runToCompletion(result, 'ab').accepted).toBe(true)
    expect(runToCompletion(result, 'aaab').accepted).toBe(true)
    expect(runToCompletion(result, 'b').accepted).toBe(false)
  })

  it('emits a compact three-state Type 3 grammar for (a+b)*ab', () => {
    const grammar = assertEquivalentRightLinearGrammar('(a+b)*ab')
    expect(grammar).toBe([
      'S -> a B | b S',
      'A -> a B | b S | ε',
      'B -> a B | b A',
    ].join('\n'))
  })

  it.each([
    '(a+b)*ab',
    'a*',
    '(a+b)*',
    'ab',
    'a+b',
    '(a|b)*abb',
    'a*b*',
    '(a+b)*a(a+b)*',
    'ε',
    '',
    'a',
    '((a+b)*+a)*',
  ])('preserves the exact regular language for %s', (regex) => {
    assertEquivalentRightLinearGrammar(regex)
  })
})
