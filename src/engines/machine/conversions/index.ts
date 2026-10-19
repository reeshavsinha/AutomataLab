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
import { regularGrammarToMachine, regularGrammarToNfa, regexToRegularGrammar } from './regularGrammar'
import { grammarToRecognizer } from './grammarRecognizer'
import { convertGrammarToMachine, isGrammarToMachineTargetAvailable } from './grammarToMachine'
import { cfgToPda } from './cfgToPda'
import { mealyToMoore, mooreToMealy } from './transducers'
import { dfaToRegex } from './dfaToRegex'
import { pdaToCfg } from './pdaToCfg'

export type { ConversionKind, ConversionMeta, ConversionResult, ConversionStep, ConversionMode } from './types'
export {
  enfaToNfa,
  nfaToDfa,
  minimizeDfa,
  regexToNfa,
  regexToRegularGrammar,
  regularGrammarToNfa,
  regularGrammarToMachine,
  grammarToRecognizer,
  convertGrammarToMachine,
  isGrammarToMachineTargetAvailable,
  cfgToPda,
  dfaToRegex,
  pdaToCfg,
  mealyToMoore,
  mooreToMealy,
}

export const CONVERSIONS: ConversionMeta[] = [
  {
    kind: 'moore-to-mealy',
    label: 'Moore → Mealy',
    description: 'Move destination-state outputs onto transitions.',
    mode: 'transform',
    appliesTo: ['MOORE'],
    resultType: 'MEALY',
  },
  {
    kind: 'mealy-to-moore',
    label: 'Mealy → Moore',
    description: 'Split states when incoming transitions emit different outputs.',
    mode: 'transform',
    appliesTo: ['MEALY'],
    resultType: 'MOORE',
  },
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
  {
    kind: 'dfa-to-regex',
    label: 'FA → Regex',
    description: 'GNFA state elimination (JFLAP Convert FA to RE).',
    mode: 'extract',
    appliesTo: ['DFA', 'NFA', 'ENFA'],
    resultType: 'ENFA',
  },
  {
    kind: 'pda-to-cfg',
    label: 'PDA → CFG',
    description:
      'Triplet construction (auto-normalize PDA, then JFLAP-style extract). CFG→PDA machines return embedded grammar text when present.',
    mode: 'extract',
    appliesTo: ['DPDA', 'NPDA'],
    resultType: 'CFG',
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

/** Extract conversions (machine → text) for the given type. */
export function extractsFor(type: MachineType): ConversionMeta[] {
  return CONVERSIONS.filter((c) => c.mode === 'extract' && c.appliesTo?.includes(type))
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
    case 'moore-to-mealy':
      return mooreToMealy(machine)
    case 'mealy-to-moore':
      return mealyToMoore(machine)
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

/** Run a machine-to-text extraction. */
export function runExtract(kind: ConversionKind, machine: MachineDefinition): ConversionResult {
  switch (kind) {
    case 'dfa-to-regex':
      return dfaToRegex(machine)
    case 'pda-to-cfg':
      return pdaToCfg(machine)
    default:
      throw new Error(`${kind} is not an extract conversion.`)
  }
}
