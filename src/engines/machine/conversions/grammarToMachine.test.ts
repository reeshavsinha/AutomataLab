import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from '../core/types'
import { convertGrammarToMachine, isGrammarToMachineTargetAvailable } from './grammarToMachine'

describe('convertGrammarToMachine', () => {
  it('builds an NPDA from a Type 2 grammar', () => {
    const result = convertGrammarToMachine('S -> a S b | eps', 'TYPE_2', 'NPDA')
    const def = result.result as MachineDefinition
    expect(def.type).toBe('NPDA')
    expect(def.states.length).toBeGreaterThan(0)
  })

  it('builds a DFA from a Type 3 grammar', () => {
    const result = convertGrammarToMachine('S -> a S | b', 'TYPE_3', 'DFA')
    expect((result.result as MachineDefinition).type).toBe('DFA')
  })

  it('rejects empty grammar text', () => {
    expect(() => convertGrammarToMachine('  ', 'TYPE_2', 'NPDA')).toThrow(/empty/i)
  })

  it('reports unavailable Type 2 → DFA pairs', () => {
    expect(isGrammarToMachineTargetAvailable('TYPE_2', 'DFA')).toBe(false)
    expect(isGrammarToMachineTargetAvailable('TYPE_2', 'NPDA')).toBe(true)
  })
})
