// ============================================================
// Machine capabilities — the single source of truth for routing
// and workspace-level feature gates.
//
// Keep this module pure. Future machine types should be added here
// before they are exposed by the UI, file loaders, or engine factory.
// ============================================================

import type { MachineType } from './types'

export type WorkspaceId = 'machine' | 'grammar' | 'parser'

export const AUTOMATON_TYPES = ['DFA', 'NFA', 'ENFA', 'MEALY', 'MOORE', 'DPDA', 'NPDA', 'TM', 'LBA'] as const
export const GRAMMAR_TYPES = ['CFG', 'CSG'] as const
export const PARSER_TYPES = ['CFG_PARSER'] as const
export const SERIALIZABLE_MACHINE_TYPES = [
  ...AUTOMATON_TYPES,
  ...GRAMMAR_TYPES,
  ...PARSER_TYPES,
] as const

export interface MachineCapabilities {
  workspace: WorkspaceId
  isGraph: boolean
  supportsSimulation: boolean
  supportsBatch: boolean
  supportsComputationTree: boolean
  supportsStack: boolean
  supportsTape: boolean
}

const AUTOMATON_CAPABILITIES: MachineCapabilities = {
  workspace: 'machine',
  isGraph: true,
  supportsSimulation: true,
  supportsBatch: true,
  supportsComputationTree: false,
  supportsStack: false,
  supportsTape: false,
}

const CAPABILITIES: Record<MachineType, MachineCapabilities> = {
  DFA: AUTOMATON_CAPABILITIES,
  NFA: { ...AUTOMATON_CAPABILITIES, supportsComputationTree: true },
  ENFA: { ...AUTOMATON_CAPABILITIES, supportsComputationTree: true },
  MEALY: AUTOMATON_CAPABILITIES,
  MOORE: AUTOMATON_CAPABILITIES,
  DPDA: { ...AUTOMATON_CAPABILITIES, supportsStack: true },
  NPDA: { ...AUTOMATON_CAPABILITIES, supportsComputationTree: true, supportsStack: true },
  TM: { ...AUTOMATON_CAPABILITIES, supportsTape: true },
  LBA: { ...AUTOMATON_CAPABILITIES, supportsTape: true },
  CFG: {
    workspace: 'grammar',
    isGraph: false,
    supportsSimulation: false,
    supportsBatch: false,
    supportsComputationTree: false,
    supportsStack: false,
    supportsTape: false,
  },
  CSG: {
    workspace: 'grammar',
    isGraph: false,
    supportsSimulation: false,
    supportsBatch: false,
    supportsComputationTree: false,
    supportsStack: false,
    supportsTape: false,
  },
  CFG_PARSER: {
    workspace: 'parser',
    isGraph: false,
    supportsSimulation: true,
    supportsBatch: true,
    supportsComputationTree: false,
    supportsStack: true,
    supportsTape: false,
  },
}

export function getMachineCapabilities(type: MachineType): MachineCapabilities {
  return CAPABILITIES[type]
}

export function isMachineType(value: unknown): value is MachineType {
  return typeof value === 'string'
    && (SERIALIZABLE_MACHINE_TYPES as readonly string[]).includes(value)
}

export function getWorkspaceForMachineType(type: MachineType): WorkspaceId {
  return CAPABILITIES[type].workspace
}

export function isAutomatonType(type: MachineType | undefined): boolean {
  return type !== undefined && CAPABILITIES[type].workspace === 'machine'
}

export function isGrammarType(type: MachineType | undefined): boolean {
  return type !== undefined && CAPABILITIES[type].workspace === 'grammar'
}

export function isParserType(type: MachineType | undefined): boolean {
  return type !== undefined && CAPABILITIES[type].workspace === 'parser'
}

export function isGraphMachineType(type: MachineType | undefined): boolean {
  return type !== undefined && CAPABILITIES[type].isGraph
}
