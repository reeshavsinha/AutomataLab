// ============================================================
// AutomataLab — Conversion types (v4.0)
// Shared shapes for the conversion/transformation utilities
// (NFA→DFA, ε-NFA→NFA, DFA minimization, Regex→NFA, CFG→PDA).
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { MachineDefinition, MachineType } from '../core/types'

/** Every conversion the app can perform. */
export type ConversionKind =
  | 'enfa-to-nfa'
  | 'nfa-to-dfa'
  | 'minimize-dfa'
  | 'regex-to-nfa'
  | 'regular-grammar-to-nfa'
  | 'grammar-to-recognizer'
  | 'cfg-to-pda'
  | 'dfa-to-regex'
  | 'pda-to-cfg'
  | 'moore-to-mealy'
  | 'mealy-to-moore'

/**
 * One construction step. Steps reference ids on the FINAL `result` machine;
 * the UI reveals everything in `addedStateIds`/`addedTransitionIds` up to the
 * current step and highlights the current step's additions, giving an
 * animated step-by-step build-up. A step may add nothing (pure explanation,
 * e.g. a partition-refinement pass during DFA minimization).
 */
export interface ConversionStep {
  /** Short heading, e.g. "ε-closure of the start state". */
  title: string
  /** One or two sentence plain-language explanation. */
  detail: string
  /** Result state ids introduced (or newly relevant) at this step. */
  addedStateIds: string[]
  /** Result transition ids introduced at this step. */
  addedTransitionIds: string[]
}

/** Full outcome of a conversion: the new machine plus the construction trace. */
export interface ConversionResult {
  kind: ConversionKind
  /** The converted machine or extracted text. State/transition ids are stable & deterministic. */
  result: MachineDefinition | string
  /** Ordered construction steps (union of added ids covers every result element). */
  steps: ConversionStep[]
  /** Human-readable headline notes (e.g. "5 states → 3 states"). */
  summary: string[]
}

/** Whether a conversion transforms the current machine, constructs one from text, or extracts text from one. */
export type ConversionMode = 'transform' | 'construct' | 'extract'

/** Static description of a conversion, used to drive the UI menu. */
export interface ConversionMeta {
  kind: ConversionKind
  label: string
  /** One-line description shown in the picker. */
  description: string
  mode: ConversionMode
  /** transform: machine types this conversion accepts as input. */
  appliesTo?: MachineType[]
  /** construct: the kind of text the user supplies. */
  inputKind?: 'regex' | 'cfg'
  /** The machine type produced. */
  resultType: MachineType
}
