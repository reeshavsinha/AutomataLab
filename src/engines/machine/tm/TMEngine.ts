// ============================================================
// AutomataLab — TM Engine
// Deterministic Turing Machine simulation engine (single- or multi-tape).
// A single configuration carries the current state + one or more two-way-infinite
// tapes. Transition format (single-tape): (state, read) → (state', write, dir).
// Multi-tape transitions carry per-tape read/write/direction arrays and fire only
// when EVERY tape's head symbol matches.
// Acceptance: by entering an ACCEPT (halt) state. Entering a REJECT state or
// having no applicable move halts-and-rejects; exceeding the step limit → stuck.
// Tape convention: a sparse Map<index, symbol> per tape; missing indices read as
// blank. Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
  TapeSnapshot,
  Transition,
} from '../core/types'
import { BLANK, formatTmTransition, getStartState, isBlank, tmTapeOps, type TapeDir } from '../core/utils'

/** Safety cap: guards against a non-halting TM hanging the UI (NFR-8). */
const DEFAULT_MAX_STEPS = 10_000
/** Cells of blank padding shown on each side of the used tape window. */
const WINDOW_PAD = 3
/**
 * Max cells rendered on EITHER side of the head. The snapshot is a moving window
 * — never the whole visited tape. Without this, a head that travels far (or a
 * huge seeded input) would make `_snapshotTape` build, and the TapePanel render,
 * a cell array as wide as the entire tape on every single step (O(n²) + a DOM
 * blow-up). The panel auto-scrolls the head into view, so a window is sufficient.
 */
const WINDOW_MAX_HALF = 150

export class TMEngine implements Automaton {
  protected definition: MachineDefinition
  protected currentStateId: string | null = null
  /** Number of tapes (≥ 1). Single-tape machines use 1. */
  protected readonly tapeCount: number
  /** Sparse tapes: index → symbol, one Map per tape. Missing indices read as blank. */
  protected tapes: Map<number, string>[] = []
  /** Head index per tape. */
  protected heads: number[] = []
  protected status: SimulationStatus = 'idle'
  protected history: HistoryEntry[] = []
  protected stepGuard: number = 0
  protected readonly maxSteps: number
  protected readonly blank: string
  /** Per-tape range of indices ever written/visited — drives each render window. */
  protected usedMin: number[] = []
  protected usedMax: number[] = []
  /** Incremental fingerprints of non-blank tape cells for O(1) loop keys. */
  protected tapeHashesA: number[] = []
  protected tapeHashesB: number[] = []
  /** Direction each tape head moved on the most recent applied transition (history cue for the panel). */
  protected lastDirections: TapeDir[] = []
  /** Head movement bounds, applied to EVERY tape (LBA narrows these; base TM leaves them infinite). */
  protected leftBound: number = -Infinity
  protected rightBound: number = Infinity
  protected visitedConfigs = new Set<string>()

  constructor(definition: MachineDefinition, maxSteps?: number) {
    this.definition = definition
    // A non-positive / non-finite limit would trip the step guard on the first
    // move and brick the machine, so fall back to the default in that case.
    const limit = maxSteps ?? definition.stepLimit ?? DEFAULT_MAX_STEPS
    this.maxSteps = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_MAX_STEPS
    this.blank = definition.blankSymbol || BLANK
    this.tapeCount = Math.max(1, Math.floor(definition.tapeCount ?? 1) || 1)
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    const chars = input === '' ? [] : Array.from(input)
    this.tapes = []
    this.heads = []
    this.usedMin = []
    this.usedMax = []
    this.tapeHashesA = []
    this.tapeHashesB = []
    for (let i = 0; i < this.tapeCount; i++) {
      const tape = new Map<number, string>()
      // The input is seeded onto tape 0; all other tapes start blank.
      if (i === 0) {
        for (let j = 0; j < chars.length; j++) {
          if (!isBlank(chars[j], this.blank)) tape.set(j, chars[j])
        }
      }
      this.tapes.push(tape)
      let hashA = 0
      let hashB = 0
      for (const [index, symbol] of tape) {
        hashA ^= this._cellHash(index, symbol, 0x811c9dc5)
        hashB ^= this._cellHash(index, symbol, 0x9e3779b9)
      }
      this.tapeHashesA.push(hashA >>> 0)
      this.tapeHashesB.push(hashB >>> 0)
      this.heads.push(0)
      this.usedMin.push(0)
      this.usedMax.push(i === 0 ? Math.max(0, chars.length - 1) : 0)
    }
    this.currentStateId = startState.id
    this.status = 'running'
    this.history = []
    this.stepGuard = 0
    this.lastDirections = []
    this.visitedConfigs = new Set<string>()
    this.visitedConfigs.add(this._configKey())
    this._setupBounds(chars.length)
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      // Idle → nothing to step ('stuck'); otherwise report the terminal status
      // unchanged so a stray call after a halt is idempotent.
      return this._makeResult(this.status === 'idle' ? 'stuck' : this.status)
    }

    // Infinite-loop guard (NFR-8): a non-halting TM stops as `stuck`.
    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this._makeResult('stuck')
    }

    const currentKey = this._configKey()
    if (this.stepGuard > 1 && this.visitedConfigs.has(currentKey)) {
      this.status = 'stuck'
      const entry = this._historyEntry(this.currentStateId, null as any, 'stuck')
      // overwrite the transitionIds inside the entry to signal loop
      this.history.push({
        ...entry,
        status: 'stuck'
      })
      const result = this._makeResult('stuck')
      if (result.historyEntry) {
         result.historyEntry.status = 'stuck'
      }
      return result
    }
    this.visitedConfigs.add(currentKey)

    // Halting states resolve immediately (also handles an accept/reject start).
    if (this._isAccept(this.currentStateId)) {
      this.status = 'accepted'
      return this._makeResult('accepted')
    }
    if (this._isReject(this.currentStateId)) {
      this.status = 'rejected'
      return this._makeResult('rejected')
    }

    const syms = this._readSymbols()
    const t = this._pickTransition(syms)
    if (!t) {
      // No applicable move from a non-accept state → halt-reject.
      this.status = 'rejected'
      return this._makeResult('rejected')
    }

    const { writes, directions } = tmTapeOps(t, this.tapeCount)
    const nextHeads = this.heads.map((h, i) => {
      const d = directions[i]
      return d === 'L' ? h - 1 : d === 'R' ? h + 1 : h
    })

    // Boundary enforcement (LBA): if ANY tape head would move out of bounds the
    // machine halts-and-rejects and the transition does not fire. For an unbounded
    // TM the bounds are ±∞, so this branch never trips.
    if (nextHeads.some((nh) => nh < this.leftBound || nh > this.rightBound)) {
      this.status = 'rejected'
      // The rejected boundary move was considered but never fired. Keep the
      // trace truthful by recording the retained configuration without a
      // transition id or an apparent ε move.
      const entry = this._historyEntry(this.currentStateId, null, 'rejected')
      this.history.push(entry)
      return this._makeResult('rejected')
    }

    // ── Apply the transition on every tape: write under the head, then move ──
    const fromStateId = this.currentStateId
    this.lastDirections = directions
    for (let i = 0; i < this.tapeCount; i++) {
      const writeSym = isBlank(writes[i], this.blank) ? this.blank : writes[i]
      this._writeSymbol(i, writeSym)
      this.heads[i] = nextHeads[i]
      this.usedMin[i] = Math.min(this.usedMin[i], this.heads[i])
      this.usedMax[i] = Math.max(this.usedMax[i], this.heads[i])
    }
    this.currentStateId = t.to

    // ── Resolve the resulting status (look-ahead, mirrors DPDAEngine) ──
    let newStatus: SimulationStatus
    if (this._isAccept(this.currentStateId)) {
      newStatus = 'accepted'
    } else if (this._isReject(this.currentStateId)) {
      newStatus = 'rejected'
    } else if (this._pickTransition(this._readSymbols()) !== null) {
      newStatus = 'running'
    } else {
      newStatus = 'rejected'
    }
    this.status = newStatus

    const entry = this._historyEntry(fromStateId, t, newStatus)
    this.history.push(entry)
    return this._stepResult(newStatus, t, entry)
  }

  reset(): void {
    this.currentStateId = null
    this.tapes = []
    this.heads = []
    this.usedMin = []
    this.usedMax = []
    this.tapeHashesA = []
    this.tapeHashesB = []
    this.lastDirections = []
    this.status = 'idle'
    this.history = []
    this.stepGuard = 0
    this.leftBound = -Infinity
    this.rightBound = Infinity
    this.visitedConfigs.clear()
  }

  getCurrentConfigurations(): Configuration[] {
    if (this.currentStateId === null) return []
    return [this._config(this.status)]
  }

  getExecutionHistory(): HistoryEntry[] {
    return [...this.history]
  }

  isAccepted(): boolean | null {
    if (this.status === 'accepted') return true
    if (this.status === 'rejected' || this.status === 'stuck') return false
    return null
  }

  getStatus(): SimulationStatus {
    return this.status
  }

  // ── Hooks for the bounded LBA subclass ─────────────────────

  /** Configure head bounds. The base TM is unbounded; LBA overrides this. */
  protected _setupBounds(_inputLength: number): void {
    this.leftBound = -Infinity
    this.rightBound = Infinity
  }

  // ── Internals ──────────────────────────────────────────────

  /** Symbol currently under each tape's head. */
  protected _readSymbols(): string[] {
    return this.heads.map((h, i) => this.tapes[i].get(h) ?? this.blank)
  }

  protected _writeSymbol(tapeIndex: number, sym: string): void {
    const tape = this.tapes[tapeIndex]
    const head = this.heads[tapeIndex]
    const previous = tape.get(head) ?? this.blank
    if (!isBlank(previous, this.blank)) {
      this.tapeHashesA[tapeIndex] ^= this._cellHash(head, previous, 0x811c9dc5)
      this.tapeHashesB[tapeIndex] ^= this._cellHash(head, previous, 0x9e3779b9)
    }
    if (isBlank(sym, this.blank)) {
      tape.delete(head)
    } else {
      tape.set(head, sym)
      this.tapeHashesA[tapeIndex] ^= this._cellHash(head, sym, 0x811c9dc5)
      this.tapeHashesB[tapeIndex] ^= this._cellHash(head, sym, 0x9e3779b9)
    }
    this.tapeHashesA[tapeIndex] >>>= 0
    this.tapeHashesB[tapeIndex] >>>= 0
    this.usedMin[tapeIndex] = Math.min(this.usedMin[tapeIndex], head)
    this.usedMax[tapeIndex] = Math.max(this.usedMax[tapeIndex], head)
  }

  protected _isAccept(stateId: string): boolean {
    return this.definition.states.find((s) => s.id === stateId)?.isAccept ?? false
  }

  protected _isReject(stateId: string): boolean {
    return this.definition.states.find((s) => s.id === stateId)?.isReject ?? false
  }

  /** Applicable transitions: from the current state whose per-tape reads all match the head symbols. */
  protected _applicable(syms: string[]): Transition[] {
    return this.definition.transitions.filter((t) => {
      if (t.from !== this.currentStateId) return false
      const { reads } = tmTapeOps(t, this.tapeCount)
      return reads.every((r, i) => (isBlank(r, this.blank) ? this.blank : r) === syms[i])
    })
  }

  /** A well-formed DTM has ≤1 applicable move (validator-enforced); take definition order otherwise. */
  protected _pickTransition(syms: string[]): Transition | null {
    const applicable = this._applicable(syms)
    return applicable.length > 0 ? applicable[0] : null
  }

  /** Emit a finite render window around one tape's head, filling unwritten cells with blank. */
  protected _snapshotTape(tapeIndex: number): TapeSnapshot {
    const head = this.heads[tapeIndex]
    const tape = this.tapes[tapeIndex]
    // Window over the used range, but clamped to a bounded span around the head
    // so a far-travelling head / huge input never materialises the whole tape.
    const usedFrom = Math.min(this.usedMin[tapeIndex], head) - WINDOW_PAD
    const usedTo = Math.max(this.usedMax[tapeIndex], head) + WINDOW_PAD
    const from = Math.max(usedFrom, head - WINDOW_MAX_HALF)
    const to = Math.min(usedTo, head + WINDOW_MAX_HALF)
    const cells: string[] = []
    for (let i = from; i <= to; i++) {
      cells.push(tape.get(i) ?? this.blank)
    }
    const snap: TapeSnapshot = { cells, head: head - from, left: from }
    // Bounded machines (LBA) carry their head limits so the panel can draw the
    // ⊢/⊣ markers; an unbounded TM leaves them ±Infinity and omits them.
    if (Number.isFinite(this.leftBound)) snap.leftBound = this.leftBound
    if (Number.isFinite(this.rightBound)) snap.rightBound = this.rightBound
    // The most recent head move, so the panel can show a "came from here" cue.
    if (this.lastDirections[tapeIndex]) snap.lastMove = this.lastDirections[tapeIndex]
    return snap
  }

  /** One snapshot per tape (length === tapeCount). */
  protected _snapshots(): TapeSnapshot[] {
    return this.tapes.map((_, i) => this._snapshotTape(i))
  }

  protected _config(status: SimulationStatus): Configuration {
    return {
      id: this.currentStateId!,
      parentId: null,
      stateId: this.currentStateId!,
      stack: [],
      // A TM has no FA-style input cursor; this is its absolute primary-head
      // position for consumers that need a numeric configuration coordinate.
      inputIndex: this.heads[0] ?? 0,
      status,
      consumedInput: '',
      remainingInput: '',
      tapes: this._snapshots(),
    }
  }

  protected _historyEntry(fromStateId: string, t: Transition | null, status: SimulationStatus): HistoryEntry {
    return {
      step: this.history.length,
      fromStateIds: [fromStateId],
      toStateIds: t ? [t.to] : [fromStateId],
      // The tape move descriptor (read → write, dir per tape) lives in the history log.
      symbol: t ? formatTmTransition(t, this.tapeCount, this.blank) : '',
      transitionIds: t ? [t.id] : [],
      status,
    }
  }

  protected _stepResult(status: SimulationStatus, t: Transition, entry: HistoryEntry): StepResult {
    const config = this._config(status)
    return {
      status,
      activeStateIds: this.currentStateId ? [this.currentStateId] : [],
      // FA-centric tape fields are unused for TM; the TapePanel is canonical.
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [t.id],
      historyEntry: entry,
      configurations: [config],
      stack: [],
      tapes: config.tapes,
    }
  }

  /** Build a terminal/no-move StepResult that reports the current configuration unchanged. */
  protected _makeResult(status: SimulationStatus): StepResult {
    const activeStateIds = this.currentStateId ? [this.currentStateId] : []
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: activeStateIds,
      toStateIds: activeStateIds,
      symbol: '',
      transitionIds: [],
      status,
    }
    return {
      status,
      activeStateIds,
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this.currentStateId ? [this._config(status)] : [],
      stack: [],
      tapes: this.currentStateId ? this._snapshots() : undefined,
    }
  }

  protected _configKey(): string {
    return `${this.currentStateId}|${this.heads.join(',')}|${this.tapeHashesA.join(',')}|${this.tapeHashesB.join(',')}`
  }

  /** Stable 32-bit hash for one sparse tape cell. */
  private _cellHash(index: number, symbol: string, seed: number): number {
    let hash = seed >>> 0
    const text = `${index}:${symbol}`
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }
}
