import { describe, expect, it } from 'vitest'
import { classifyGrammar, validateGrammarFormat } from './classification'
import { parseGeneralGrammarText } from './parser'

describe('Chomsky grammar classification', () => {
  it('accepts multi-symbol Type 1 left sides that are non-contracting', () => {
    const grammar = parseGeneralGrammarText('S A -> A S\nS -> a S A | a A\nA -> b', 'TYPE_1')

    expect(classifyGrammar(grammar)).toBe('TYPE_1')
    expect(validateGrammarFormat(grammar, 'TYPE_1')).toMatchObject({ isValidForSelectedFormat: true })
  })

  it('classifies a contracting multi-symbol production as Type 0', () => {
    const grammar = parseGeneralGrammarText('S A -> a\nS -> a A', 'TYPE_0')

    expect(classifyGrammar(grammar)).toBe('TYPE_0')
    expect(validateGrammarFormat(grammar, 'TYPE_1')).toMatchObject({ isValidForSelectedFormat: false })
  })

  it('recognizes a right-linear regular grammar', () => {
    const grammar = parseGeneralGrammarText('S -> a S | b A | ε\nA -> a S | b', 'TYPE_3')

    expect(classifyGrammar(grammar)).toBe('TYPE_3')
    expect(validateGrammarFormat(grammar, 'TYPE_3')).toMatchObject({ isValidForSelectedFormat: true })
  })
})
