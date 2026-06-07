// ============================================================
// AutomataLab — Core Types
// All simulation engines implement these shared interfaces.
// NO React imports in this file or any engine file.
// ============================================================

export type MachineType = 'DFA' | 'NFA' | 'ENFA' | 'DPDA'

// ─── Machine definition types ────────────────────────────────

export interface AutomataState {
  id: string
  label: string
  x: number
  y: number
  isStart: boolean
  isAccept: boolean
  /** TM only — reserved for Phase 3 */
  isReject?: boolean
  /** Text annotation node type */
  isText?: boolean
}

export interface Transition {
  id: string
  from: string
  to: string
  /** Comma-separated symbols (e.g. "a" or "a,b"). ε-transitions use "" or "ε" */
  symbols: string[]
  /** Visual: control point offset for draggable curve bending */
  controlPointOffset?: { x: number; y: number }
  /** PDA only — input symbol read on this transition. ε if empty/omitted. */
  read?: string
  /** PDA only — stack symbol popped from the top. ε (no pop) if empty/omitted. */
  pop?: string
  /** PDA only — string pushed onto the stack; its FIRST char ends up on top. ε (no push) if empty/omitted. */
  push?: string
  /** TM only — reserved for Phase 3 */
  write?: string
  /** TM only — reserved for Phase 3 */
  direction?: 'L' | 'R' | 'S'
}

export interface MachineDefinition {
  id: string
  name: string
  type: MachineType
  /** Description of the language accepted by this machine */
  language: string
  states: AutomataState[]
  transitions: Transition[]
  alphabet: string[]
}

// ─── Simulation types ────────────────────────────────────────

export type SimulationStatus = 'idle' | 'running' | 'accepted' | 'rejected' | 'stuck' | 'error'

/**
 * A single branch of a (possibly nondeterministic) computation.
 *
 * Finite automata that track a powerset of active states expose one
 * Configuration per active state. Pushdown automata (Phase 2) and the
 * computation-tree viewer rely on the per-branch fields below: each branch
 * carries its own state, stack, and position in the input.
 */
export interface Configuration {
  /** Unique id for this branch (used by the computation-tree viewer). */
  id: string
  /** Id of the parent branch, or null for a root configuration. */
  parentId: string | null
  /** The single state this branch currently occupies. */
  stateId: string
  /** PDA stack contents; the top of the stack is the LAST element. Empty for finite automata. */
  stack: string[]
  /** Index of the next input symbol to be read. */
  inputIndex: number
  /** Per-branch execution status. */
  status: SimulationStatus
  /** Input already consumed by this branch (convenience for the ID display). */
  consumedInput: string
  /** Input not yet consumed by this branch (convenience for the ID display). */
  remainingInput: string
}

export interface HistoryEntry {
  step: number
  fromStateIds: string[]
  toStateIds: string[]
  symbol: string
  transitionIds: string[]
  status: SimulationStatus
}

export interface StepResult {
  status: SimulationStatus
  activeStateIds: string[]
  consumedInput: string
  remainingInput: string
  symbol: string
  transitionIds: string[]
  historyEntry: HistoryEntry
  /** Per-branch configurations after this step (computation tree / PDA branches). */
  configurations: Configuration[]
  /** Stack of the primary active configuration (convenience for the stack panel). Empty for finite automata. */
  stack: string[]
}

// ─── Automaton interface — all engines implement this ────────

export interface Automaton {
  // Lifecycle
  initialize(input: string): void
  step(): StepResult
  reset(): void

  // Introspection
  getCurrentConfigurations(): Configuration[]
  getExecutionHistory(): HistoryEntry[]
  isAccepted(): boolean | null // null = still running/idle

  // State
  getStatus(): SimulationStatus
}

// ─── Validation types ────────────────────────────────────────

export interface ValidationError {
  severity: 'error' | 'warning'
  code: string
  message: string
  stateId?: string
  transitionId?: string
}
