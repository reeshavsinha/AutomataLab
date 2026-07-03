// ============================================================
// AutomataLab — Conversion helpers
// A small deterministic machine builder + alphabet utilities shared by the
// conversion algorithms. Deterministic ids (s0, s1… / t0, t1…) keep results
// stable for tests and let conversion steps reference result elements.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type { AutomataState, MachineDefinition, MachineType, Transition } from '../core/types'
import { isEpsilon } from '../core/utils'

export interface StateOptions {
  label: string
  /** Optional provenance text (e.g. the subset of source states this represents). */
  description?: string
  isStart?: boolean
  isAccept?: boolean
  isReject?: boolean
}

export interface TransitionOptions {
  symbols?: string[]
  read?: string
  pop?: string
  push?: string
  write?: string
  direction?: 'L' | 'R' | 'S'
}

/**
 * Accumulates states + transitions with deterministic ids, then emits a
 * MachineDefinition with a simple grid layout (the UI re-runs auto-layout for a
 * nicer diagram, but a grid keeps the machine renderable on its own).
 */
export class MachineBuilder {
  private states: AutomataState[] = []
  private transitions: Transition[] = []
  private sSeq = 0
  private tSeq = 0

  addState(opts: StateOptions): string {
    const id = `s${this.sSeq++}`
    const st: AutomataState = {
      id,
      label: opts.label,
      x: 0,
      y: 0,
      isStart: !!opts.isStart,
      isAccept: !!opts.isAccept,
    }
    if (opts.description) st.description = opts.description
    if (opts.isReject) st.isReject = true
    this.states.push(st)
    return id
  }

  /** Mark an existing state as accepting (used after the fact, e.g. subset accept). */
  markAccept(id: string): void {
    const st = this.states.find((s) => s.id === id)
    if (st) st.isAccept = true
  }

  addTransition(from: string, to: string, opts: TransitionOptions = {}): string {
    const id = `t${this.tSeq++}`
    const t: Transition = { id, from, to, symbols: opts.symbols ?? [] }
    if (opts.read !== undefined) t.read = opts.read
    if (opts.pop !== undefined) t.pop = opts.pop
    if (opts.push !== undefined) t.push = opts.push
    if (opts.write !== undefined) t.write = opts.write
    if (opts.direction !== undefined) t.direction = opts.direction
    this.transitions.push(t)
    return id
  }

  getStates(): AutomataState[] {
    return this.states
  }

  getTransitions(): Transition[] {
    return this.transitions
  }

  /** Emit the machine with a deterministic grid layout. */
  build(meta: {
    name: string
    type: MachineType
    language?: string
    alphabet: string[]
    stackAlphabet?: string[]
    tapeAlphabet?: string[]
    blankSymbol?: string
  }): MachineDefinition {
    layoutGrid(this.states)
    const def: MachineDefinition = {
      id: `conv-${meta.type}-${this.states.length}`,
      name: meta.name,
      type: meta.type,
      language: meta.language ?? '',
      states: this.states,
      transitions: this.transitions,
      alphabet: meta.alphabet,
    }
    if (meta.stackAlphabet && meta.stackAlphabet.length > 0) def.stackAlphabet = meta.stackAlphabet
    if (meta.tapeAlphabet && meta.tapeAlphabet.length > 0) def.tapeAlphabet = meta.tapeAlphabet
    if (meta.blankSymbol) def.blankSymbol = meta.blankSymbol
    return def
  }
}

/** Place states on a simple left-to-right grid (overwritten by UI auto-layout). */
export function layoutGrid(states: AutomataState[], spacingX = 200, spacingY = 140): void {
  const cols = Math.max(1, Math.ceil(Math.sqrt(states.length)))
  states.forEach((s, i) => {
    s.x = (i % cols) * spacingX
    s.y = Math.floor(i / cols) * spacingY
  })
}

/**
 * The working input alphabet of a finite automaton: the declared Σ plus any
 * non-ε symbol that actually appears on a transition, sorted for determinism.
 */
export function effectiveAlphabet(machine: MachineDefinition): string[] {
  const set = new Set<string>()
  for (const sym of machine.alphabet ?? []) {
    if (!isEpsilon(sym)) set.add(sym)
  }
  for (const t of machine.transitions) {
    for (const sym of t.symbols) {
      if (!isEpsilon(sym)) set.add(sym)
    }
  }
  return [...set].sort()
}

/** Stable key for a set of state ids (sorted, comma-joined). */
export function subsetKey(ids: Iterable<string>): string {
  return [...ids].sort().join(',')
}

/** Render a subset of source-state labels as `{a, b, c}` (or `∅`). */
export function subsetLabel(labels: string[]): string {
  if (labels.length === 0) return '∅'
  return `{${[...labels].sort().join(',')}}`
}
