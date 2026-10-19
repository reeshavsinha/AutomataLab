import { describe, expect, it } from 'vitest'
import { getGrammarLabTabs, isGrammarLabTabAvailable } from './grammarLabCapabilities'

describe('grammarLabCapabilities', () => {
  it('limits regex to properties and sampler', () => {
    const tabs = getGrammarLabTabs('REGEX')
    expect(isGrammarLabTabAvailable('REGEX', 'properties')).toBe(true)
    expect(isGrammarLabTabAvailable('REGEX', 'sampler')).toBe(true)
    expect(isGrammarLabTabAvailable('REGEX', 'derivations')).toBe(false)
    expect(tabs.find((t) => t.id === 'transformations')?.available).toBe(false)
  })

  it('enables CFG tools for Type 2', () => {
    expect(isGrammarLabTabAvailable('TYPE_2', 'transformations')).toBe(true)
    expect(isGrammarLabTabAvailable('TYPE_2', 'ambiguity')).toBe(true)
    expect(isGrammarLabTabAvailable('TYPE_2', 'firstfollow')).toBe(true)
  })

  it('enables derivations and general diagnostics for Type 0', () => {
    expect(isGrammarLabTabAvailable('TYPE_0', 'derivations')).toBe(true)
    expect(isGrammarLabTabAvailable('TYPE_0', 'diagnostics')).toBe(true)
    expect(isGrammarLabTabAvailable('TYPE_0', 'transformations')).toBe(false)
  })

  it('enables derivations but not ambiguity for Type 3', () => {
    expect(isGrammarLabTabAvailable('TYPE_3', 'derivations')).toBe(true)
    expect(isGrammarLabTabAvailable('TYPE_3', 'ambiguity')).toBe(false)
    expect(isGrammarLabTabAvailable('TYPE_3', 'transformations')).toBe(true)
  })
})
