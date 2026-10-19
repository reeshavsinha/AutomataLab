import { describe, expect, it } from 'vitest'
import { parseMealyLabel, supportsComputationTree } from './utils'

describe('supportsComputationTree', () => {
  it('matches capabilities.ts for tree-backed automaton types', () => {
    expect(supportsComputationTree('NFA')).toBe(true)
    expect(supportsComputationTree('ENFA')).toBe(true)
    expect(supportsComputationTree('NPDA')).toBe(true)
    expect(supportsComputationTree('NLBA')).toBe(true)
    expect(supportsComputationTree('DFA')).toBe(false)
    expect(supportsComputationTree('TM')).toBe(false)
    expect(supportsComputationTree('not-a-type')).toBe(false)
  })
})

describe('Mealy edge labels', () => {
  it('parses input/output notation as pairs instead of input symbols', () => {
    expect(parseMealyLabel('0 / 1')).toEqual([{ input: '0', output: '1' }])
    expect(parseMealyLabel('0 / 1, 1 / 0')).toEqual([
      { input: '0', output: '1' },
      { input: '1', output: '0' },
    ])
  })

  it('rejects incomplete pairs', () => {
    expect(parseMealyLabel('0 / 1, / / 1')).toBeNull()
  })
})
