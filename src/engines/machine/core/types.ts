// ============================================================
// AutomataLab — Core Types
// All simulation engines implement these shared interfaces.
// NO React imports in this file or any engine file.
// ============================================================

export type MachineType = 'DFA' | 'NFA' | 'ENFA' | 'DPDA' | 'NPDA' | 'TM' | 'LBA' | 'CFG' | 'CSG' | 'CFG_PARSER'

// ─── Machine definition types ────────────────────────────────

export interface AutomataState {
  id: string
  label: string
  x: number
  y: number
  isStart: boolean
  isAccept: boolean
  /**
   * Optional provenance / explanation for the state, shown on hover and in the
   * conversion preview's "full labels" mode. Conversions use it to keep the
   * visible label short (e.g. `q3`) while still recording what the state means
   * (e.g. `{q6,q7,q14}` for a subset-construction state, or an ε-closure).
   */
  description?: string
  /** TM/LBA only — halt-and-reject state. */
  isReject?: boolean
  /** Text annotation node type */
  isText?: boolean
  /** Explicit box size (text annotation nodes only) */
  width?: number
  height?: number
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
  /** TM/LBA only — symbol written under the head. Blank if empty/omitted. */
  write?: string
  /** TM/LBA only — head move direction after writing. */
  direction?: 'L' | 'R' | 'S'
  /** Multi-tape TM only — per-tape symbols read (index = tape). Tape 0 falls back to `read`. */
  reads?: string[]
  /** Multi-tape TM only — per-tape symbols written. Tape 0 falls back to `write`. */
  writes?: string[]
  /** Multi-tape TM only — per-tape head directions. Tape 0 falls back to `direction`. */
  directions?: ('L' | 'R' | 'S')[]
}

export interface MachineDefinition {
  id: string
  version?: number
  name: string
  type: MachineType
  /** Description of the language accepted by this machine */
  language: string
  states: AutomataState[]
  transitions: Transition[]
  /** Input alphabet Σ. */
  alphabet: string[]
  /**
   * PDA only — declared stack alphabet Γ. Optional and declarative: when set, the
   * validator warns if a pop/push uses a symbol outside it. The engine itself does
   * not constrain stack symbols (UX audit #7).
   */
  stackAlphabet?: string[]
  /**
   * TM/LBA only — declared tape alphabet Γ (should include the blank and all of Σ).
   * Optional and declarative: when set, the validator warns if a read/write uses a
   * symbol outside it. The engine does not constrain tape symbols (UX audit #7).
   */
  tapeAlphabet?: string[]
  /** TM/LBA only — the blank tape symbol. Defaults to '_'. */
  blankSymbol?: string
  /** TM/LBA only — max steps before halting as `stuck` (infinite-loop guard). Defaults to 10,000. */
  stepLimit?: number
  /** TM only — number of tapes (≥ 1). Defaults to 1 (single-tape). */
  tapeCount?: number
  /** Grammar/Parser Workspaces — The raw grammar text. */
  grammarText?: string
  /** Parser Workspace — The selected parser algorithm. */
  parserAlgorithm?: string
  /** Parser Workspace — The raw input string to parse. */
  parserInput?: string
  /** Parser Workspace — Cached UI coordinates for the automaton graph. */
  parserLayoutCache?: { algorithm: string; nodes: any[]; edges: any[] }
  /** Parser Workspace — Active view mode (table vs automaton graph). */
  activeViewMode?: 'table' | 'automaton'
  /** Grammar Workspace — Derivation string input. */
  grammarDerivationInput?: string
  /** Grammar Workspace — Sampler configuration. */
  grammarSamplerMaxLength?: string
  grammarSamplerMaxSteps?: string
}

// ─── Simulation types ────────────────────────────────────────

export type SimulationStatus = 'idle' | 'running' | 'accepted' | 'rejected' | 'stuck' | 'error'

/**
 * A windowed snapshot of one Turing-machine tape for rendering. The engine
 * never materialises an unbounded array — it emits a finite window around the
 * head. `left` is the absolute tape index of `cells[0]` so the panel can render
 * LBA boundary markers and keep positions stable as the head moves.
 */
export interface TapeSnapshot {
  /** Contiguous window of the tape (blanks filled in). */
  cells: string[]
  /** Index into `cells` of the head cell. */
  head: number
  /** Absolute tape index of `cells[0]`. */
  left: number
  /** LBA only — absolute index of the leftmost usable cell (the `⊢` boundary sits just before it). Omitted for an unbounded TM. */
  leftBound?: number
  /** LBA only — absolute index of the rightmost usable cell (the `⊣` boundary sits just after it). Omitted for an unbounded TM. */
  rightBound?: number
  /** Direction the head moved on the transition that produced this snapshot (history cue). Omitted before the first move. */
  lastMove?: 'L' | 'R' | 'S'
}

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
  /** TM/LBA tapes for this branch (length 1 single-tape, N multi-tape). Undefined for FA/PDA. */
  tapes?: TapeSnapshot[]
  /**
   * Number of *additional* parent branches that reached this same configuration
   * this step and were merged into it (per-level dedup, first-parent-wins). 0/undefined
   * means a single parent. Lets the viewer be honest that an FA "tree" is really a
   * merged trellis/DAG (UX audit #3). Always 0 for the true per-branch NPDA tree.
   */
  mergedParents?: number
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
  /** TM/LBA tapes of the active configuration (convenience for the tape panel). Undefined for FA/PDA. */
  tapes?: TapeSnapshot[]
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
