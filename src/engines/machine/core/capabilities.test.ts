import { describe, expect, it } from 'vitest'
import {
  getMachineCapabilities,
  getWorkspaceForMachineType,
  isAutomatonType,
  isGraphMachineType,
  isMachineType,
  isGrammarType,
  isParserType,
} from './capabilities'
import type { MachineType } from './types'

describe('machine capability registry', () => {
  it('routes every current machine type to exactly one workspace', () => {
    const types: MachineType[] = [
      'DFA',
      'NFA',
      'ENFA',
      'MEALY',
      'MOORE',
      'DPDA',
      'NPDA',
      'TM',
      'LBA',
      'CFG',
      'CSG',
      'CFG_PARSER',
    ]

    for (const type of types) {
      expect(['machine', 'grammar', 'parser']).toContain(getWorkspaceForMachineType(type))
    }
  })

  it('keeps workspace predicates mutually exclusive', () => {
    const types: MachineType[] = ['DFA', 'MEALY', 'MOORE', 'CFG', 'CSG', 'CFG_PARSER']

    for (const type of types) {
      const matches = [isAutomatonType(type), isGrammarType(type), isParserType(type)].filter(Boolean)
      expect(matches).toHaveLength(1)
    }

    expect(isAutomatonType(undefined)).toBe(false)
    expect(isGrammarType(undefined)).toBe(false)
    expect(isParserType(undefined)).toBe(false)
  })

  it('describes current simulation capabilities without conflating machine families', () => {
    expect(getMachineCapabilities('NFA')).toMatchObject({
      workspace: 'machine',
      isGraph: true,
      supportsSimulation: true,
      supportsComputationTree: true,
      supportsStack: false,
      supportsTape: false,
    })
    expect(getMachineCapabilities('NPDA')).toMatchObject({
      supportsComputationTree: true,
      supportsStack: true,
      supportsTape: false,
    })
    expect(getMachineCapabilities('TM')).toMatchObject({
      supportsTape: true,
      supportsStack: false,
    })
    expect(getMachineCapabilities('CFG')).toMatchObject({
      workspace: 'grammar',
      isGraph: false,
      supportsSimulation: false,
    })
    expect(getMachineCapabilities('CFG_PARSER')).toMatchObject({
      workspace: 'parser',
      supportsSimulation: true,
      supportsStack: true,
    })
  })

  it('identifies graph-backed machine types for canvas and toolbar gates', () => {
    expect(isGraphMachineType('DFA')).toBe(true)
    expect(isGraphMachineType('TM')).toBe(true)
    expect(isGraphMachineType('CFG')).toBe(false)
    expect(isGraphMachineType('CFG_PARSER')).toBe(false)
    expect(isGraphMachineType(undefined)).toBe(false)
  })

  it('recognizes transducers as serializable machine types', () => {
    expect(isMachineType('MEALY')).toBe(true)
    expect(isMachineType('MOORE')).toBe(true)
    expect(getMachineCapabilities('MEALY')).toMatchObject({
      workspace: 'machine',
      isGraph: true,
      supportsSimulation: true,
      supportsBatch: true,
    })
  })
})
