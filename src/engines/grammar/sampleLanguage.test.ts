import { describe, expect, it } from 'vitest'
import { parseGeneralGrammarText } from './parser'
import { sampleStringsFromGeneralGrammar } from './sampleLanguage'

describe('sampleStringsFromGeneralGrammar', () => {
  it('samples strings from a tiny Type 0 grammar', () => {
    const grammar = parseGeneralGrammarText('S -> a\nS -> b', 'TYPE_0')
    const samples = sampleStringsFromGeneralGrammar(grammar, { maxLength: 3, maxSteps: 500, maxSamples: 20 })
    expect(samples).toContain('a')
    expect(samples).toContain('b')
  })
})
