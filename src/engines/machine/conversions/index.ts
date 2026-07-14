// ============================================================
// AutomataLab — Conversions registry (v4.0)
// Single source of truth for the available conversions, which machine types
// each applies to, and a dispatcher to run one. Mirrors the `isPDAType` /
// `isTMType` "one place gates the UI" pattern.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition, MachineType } from '../core/types'
import type { ConversionKind, ConversionMeta, ConversionResult } from './types'
import { enfaToNfa } from './epsilonElimination'
import { nfaToDfa } from './subsetConstruction'
import { minimizeDfa } from './minimizeDfa'
import { regexToNfa } from './regexToNfa'
import { cfgToPda } from './cfgToPda'

export type { ConversionKind, ConversionMeta, ConversionResult, ConversionStep, ConversionMode } from './types'
export { enfaToNfa, nfaToDfa, minimizeDfa, regexToNfa, cfgToPda }

export const CONVERSIONS: ConversionMeta[] = [
  {
    kind: 'enfa-to-nfa',
    label: 'ε-NFA → NFA',
    description: 'Remove ε-transitions (epsilon elimination).',
    mode: 'transform',
    appliesTo: ['ENFA'],
    resultType: 'NFA',
  },
  {
    kind: 'nfa-to-dfa',
    label: 'NFA → DFA',
    description: 'Subset (powerset) construction.',
    mode: 'transform',
    appliesTo: ['NFA', 'ENFA'],
    resultType: 'DFA',
  },
  {
    kind: 'minimize-dfa',
    label: 'Minimize DFA',
    description: 'Partition refinement (Hopcroft / Moore).',
    mode: 'transform',
    appliesTo: ['DFA'],
    resultType: 'DFA',
  },
  {
    kind: 'regex-to-nfa',
    label: 'Regex → NFA',
    description: "Thompson's construction — builds an ε-NFA.",
    mode: 'construct',
    inputKind: 'regex',
    resultType: 'ENFA',
  },
  {
    kind: 'cfg-to-pda',
    label: 'CFG → PDA',
    description: 'Standard one-state construction (NPDA).',
    mode: 'construct',
    inputKind: 'cfg',
    resultType: 'NPDA',
  },
]

export function getConversionMeta(kind: ConversionKind): ConversionMeta {
  const meta = CONVERSIONS.find((c) => c.kind === kind)
  if (!meta) throw new Error(`Unknown conversion: ${kind}`)
  return meta
}

/** Transform conversions whose input type matches `type`. */
export function transformsFor(type: MachineType): ConversionMeta[] {
  return CONVERSIONS.filter((c) => c.mode === 'transform' && c.appliesTo?.includes(type))
}

/** Construction conversions (always available — they build from text). */
export function constructs(): ConversionMeta[] {
  return CONVERSIONS.filter((c) => c.mode === 'construct')
}

/** Run a machine-to-machine transform. */
export function runTransform(kind: ConversionKind, machine: MachineDefinition): ConversionResult {
  switch (kind) {
    case 'enfa-to-nfa':
      return enfaToNfa(machine)
    case 'nfa-to-dfa':
      return nfaToDfa(machine)
    case 'minimize-dfa':
      return minimizeDfa(machine)
    default:
      throw new Error(`${kind} is not a transform conversion.`)
  }
}

/** Run a text-to-machine construction. */
export function runConstruct(kind: ConversionKind, text: string): ConversionResult {
  switch (kind) {
    case 'regex-to-nfa':
      return regexToNfa(text)
    case 'cfg-to-pda':
      return cfgToPda(text)
    default:
      throw new Error(`${kind} is not a construction conversion.`)
  }
}
