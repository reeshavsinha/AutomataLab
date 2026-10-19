import { describe, expect, it } from 'vitest'
import { parseGeneralGrammarText } from './parser'
import { validateGrammarFormat } from './classification'
import { computeGrammarFundamentals, generalGrammarProblemMessages } from './grammarFundamentals'
import { parseGrammarText } from './parser'
import { analyzeGrammar } from './analysis'

describe('grammarFundamentals', () => {
  it('reports right-linear Type 3 properties', () => {
    const grammar = parseGeneralGrammarText('S -> a S | b', 'TYPE_3')
    const classification = validateGrammarFormat(grammar, 'TYPE_3')
    const cfg = parseGrammarText('S -> a S | b')
    const sections = computeGrammarFundamentals('TYPE_3', grammar, classification, cfg, analyzeGrammar(cfg))
    const type3 = sections.find((s) => s.title.includes('Type 3'))
    expect(type3?.rows.some((r) => r.label === 'Linear form' && r.value === 'Right-linear')).toBe(true)
  })

  it('flags contracting rules for Type 1', () => {
    const grammar = parseGeneralGrammarText('S A -> a\nS -> a A', 'TYPE_0')
    const messages = generalGrammarProblemMessages('TYPE_1', grammar)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('includes semi-decision note for Type 0', () => {
    const grammar = parseGeneralGrammarText('S A -> a\nS -> a A', 'TYPE_0')
    const classification = validateGrammarFormat(grammar, 'TYPE_0')
    const sections = computeGrammarFundamentals('TYPE_0', grammar, classification, null, null)
    expect(sections.some((s) => s.rows.some((r) => r.label === 'Membership in the lab'))).toBe(true)
  })
})
