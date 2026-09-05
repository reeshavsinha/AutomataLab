import { describe, expect, it } from 'vitest'
import { findDerivation } from './derivationSearch'
import { parseGeneralGrammarText } from './parser'

describe('bounded general-grammar derivation search', () => {
  it('finds a Type 1 derivation and records rewrite provenance', () => {
    const grammar = parseGeneralGrammarText('S -> a A\nA -> b', 'TYPE_1')
    const result = findDerivation(grammar, ['a', 'b'])

    expect(result.status).toBe('FOUND')
    expect(result.steps.map((step) => step.form)).toEqual([['S'], ['a', 'A'], ['a', 'b']])
    expect(result.steps[1].rewrite).toMatchObject({ productionIndex: 0, position: 0 })
  })

  it('eliminates duplicate sentential forms', () => {
    const grammar = parseGeneralGrammarText('S -> A | B\nA -> a\nB -> a', 'TYPE_2')
    const result = findDerivation(grammar, ['a'])

    expect(result.status).toBe('FOUND')
    expect(result.exploredNodes).toBeLessThanOrEqual(4)
  })

  it('reports resource limits rather than non-membership after a bounded search', () => {
    const grammar = parseGeneralGrammarText('S -> a S | a', 'TYPE_2')
    const result = findDerivation(grammar, ['a', 'a', 'a'], { maxDepth: 1 })

    expect(result.status).toBe('RESOURCE_LIMIT')
  })
})
