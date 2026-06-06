// ============================================================
// AutomataLab — Core Types
// All simulation engines implement these shared interfaces.
// NO React imports in this file or any engine file.
// ============================================================

export type MachineType = 'DFA' | 'NFA' | 'ENFA'

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
  /** PDA only — reserved for Phase 2 */
  pop?: string
  /** PDA only — reserved for Phase 2 */
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

export interface Configuration {
  stateIds: string[]
  remainingInput: string
  consumedInput: string
  /** PDA stack — reserved for Phase 2 */
  stack?: string[]
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
