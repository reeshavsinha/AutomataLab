// ============================================================
// AutomataLab — Multi-track Turing Machine Engine
// One physical, sparse tape stores a vector of symbols per cell. A single
// shared head reads/writes every track atomically and then moves once.
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
import { BLANK, getStartState } from '../core/utils'

const DEFAULT_MAX_STEPS = 10_000
const WINDOW_PAD = 3
const WINDOW_MAX_HALF = 150

/**
 * Compatibility shape until the parent adds these fields to the shared types.
 * Keeping it local means this engine is usable before that integration lands.
 */
type MultiTrackDefinition = MachineDefinition & {
  trackCount?: number
  trackAlphabets?: string[][]
  trackBlanks?: string[]
}

type MultiTrackTransition = Transition & {
  trackReads?: string[]
  trackWrites?: string[]
}

type MultiTrackSnapshot = TapeSnapshot & {
  tracks: string[][]
}

type TapeDir = 'L' | 'R' | 'S'

/**
 * Deterministic multi-track TM.
 *
 * This is deliberately not a multi-tape TM: all tracks share each physical
 * cell and the sole head position. A transition is applicable only when its
 * entire read vector equals the vector currently under that one head.
 */
export class MultiTrackTMEngine implements Automaton {
  private readonly definition: MultiTrackDefinition
  private readonly trackCount: number
  private readonly blanks: string[]
  private readonly maxSteps: number

  /** Sparse physical tape: only cells with a non-blank track are stored. */
  private tape = new Map<number, string[]>()
  private head = 0
  private currentStateId: string | null = null
  private status: SimulationStatus = 'idle'
  private history: HistoryEntry[] = []
  private stepGuard = 0
  private usedMin = 0
  private usedMax = 0
  private lastDirection: TapeDir | undefined
  private tapeHashA = 0
  private tapeHashB = 0
  private visitedConfigs = new Set<string>()

  constructor(definition: MachineDefinition, maxSteps?: number) {
    this.definition = definition
    const declaredTracks = Math.floor(definition.trackCount ?? 2)
    this.trackCount = Math.max(2, Number.isFinite(declaredTracks) ? declaredTracks : 2)
    this.blanks = Array.from(
      { length: this.trackCount },
      (_, index) => definition.trackBlanks?.[index] || definition.blankSymbol || BLANK,
    )
    const limit = maxSteps ?? definition.stepLimit ?? DEFAULT_MAX_STEPS
    this.maxSteps = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_MAX_STEPS
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }

    this.tape.clear()
    this.head = 0
    this.currentStateId = startState.id
    this.status = 'running'
    this.history = []
    this.stepGuard = 0
    this.usedMin = 0
    this.usedMax = 0
    this.lastDirection = undefined
    this.tapeHashA = 0
    this.tapeHashB = 0

    const chars = Array.from(input)
    for (let index = 0; index < chars.length; index++) {
      const cell = [...this.blanks]
      cell[0] = chars[index]
      this._setCell(index, cell)
    }
    this.usedMax = Math.max(0, chars.length - 1)
    this.visitedConfigs = new Set([this._configKey()])
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      return this._makeResult(this.status === 'idle' ? 'stuck' : this.status)
    }

    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this._makeResult('stuck')
    }

    const currentKey = this._configKey()
    if (this.stepGuard > 1 && this.visitedConfigs.has(currentKey)) {
      this.status = 'stuck'
      const entry = this._historyEntry(this.currentStateId, null, 'stuck')
      this.history.push(entry)
      return { ...this._makeResult('stuck'), historyEntry: entry }
    }
    this.visitedConfigs.add(currentKey)

    if (this._isAccept(this.currentStateId)) {
      this.status = 'accepted'
      return this._makeResult('accepted')
    }
    if (this._isReject(this.currentStateId)) {
      this.status = 'rejected'
      return this._makeResult('rejected')
    }

    const transition = this._pickTransition(this._readVector())
    if (!transition) {
      this.status = 'rejected'
      return this._makeResult('rejected')
    }

    const fromStateId = this.currentStateId
    const writes = this._writeVector(transition)
    this._setCell(this.head, writes)
    this.lastDirection = this._direction(transition)
    if (this.lastDirection === 'L') this.head--
    if (this.lastDirection === 'R') this.head++
    this.usedMin = Math.min(this.usedMin, this.head)
    this.usedMax = Math.max(this.usedMax, this.head)
    this.currentStateId = transition.to

    let newStatus: SimulationStatus
    if (this._isAccept(this.currentStateId)) {
      newStatus = 'accepted'
    } else if (this._isReject(this.currentStateId)) {
      newStatus = 'rejected'
    } else if (this._pickTransition(this._readVector()) !== null) {
      newStatus = 'running'
    } else {
      newStatus = 'rejected'
    }
    this.status = newStatus

    const entry = this._historyEntry(fromStateId, transition, newStatus)
    this.history.push(entry)
    return this._stepResult(newStatus, transition, entry)
  }

  reset(): void {
    this.tape.clear()
    this.head = 0
    this.currentStateId = null
    this.status = 'idle'
    this.history = []
    this.stepGuard = 0
    this.usedMin = 0
    this.usedMax = 0
    this.lastDirection = undefined
    this.tapeHashA = 0
    this.tapeHashB = 0
    this.visitedConfigs.clear()
  }

  getCurrentConfigurations(): Configuration[] {
    return this.currentStateId === null ? [] : [this._config(this.status)]
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

  private _readVector(): string[] {
    return [...(this.tape.get(this.head) ?? this.blanks)]
  }

  private _readVectorFor(transition: MultiTrackTransition): string[] {
    return Array.from(
      { length: this.trackCount },
      (_, index) => this._normalizeSymbol(transition.trackReads?.[index], index),
    )
  }

  private _writeVector(transition: MultiTrackTransition): string[] {
    return Array.from(
      { length: this.trackCount },
      (_, index) => this._normalizeSymbol(transition.trackWrites?.[index], index),
    )
  }

  private _normalizeSymbol(symbol: string | undefined, track: number): string {
    return symbol === undefined || symbol === '' ? this.blanks[track] : symbol
  }

  private _direction(transition: MultiTrackTransition): TapeDir {
    const direction = transition.direction
    return direction === 'L' || direction === 'R' || direction === 'S' ? direction : 'S'
  }

  private _pickTransition(read: string[]): MultiTrackTransition | null {
    return (this.definition.transitions as MultiTrackTransition[]).find((transition) => (
      transition.from === this.currentStateId
      && this._vectorsEqual(this._readVectorFor(transition), read)
    )) ?? null
  }

  private _vectorsEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((symbol, index) => symbol === right[index])
  }

  private _setCell(position: number, next: string[]): void {
    const previous = this.tape.get(position) ?? this.blanks
    if (!this._vectorsEqual(previous, this.blanks)) {
      this.tapeHashA ^= this._cellHash(position, previous, 0x811c9dc5)
      this.tapeHashB ^= this._cellHash(position, previous, 0x9e3779b9)
    }

    if (this._vectorsEqual(next, this.blanks)) {
      this.tape.delete(position)
    } else {
      this.tape.set(position, [...next])
      this.tapeHashA ^= this._cellHash(position, next, 0x811c9dc5)
      this.tapeHashB ^= this._cellHash(position, next, 0x9e3779b9)
    }
    this.tapeHashA >>>= 0
    this.tapeHashB >>>= 0
    this.usedMin = Math.min(this.usedMin, position)
    this.usedMax = Math.max(this.usedMax, position)
  }

  private _isAccept(stateId: string): boolean {
    return this.definition.states.find((state) => state.id === stateId)?.isAccept ?? false
  }

  private _isReject(stateId: string): boolean {
    return this.definition.states.find((state) => state.id === stateId)?.isReject ?? false
  }

  private _snapshotTape(): MultiTrackSnapshot {
    const usedFrom = Math.min(this.usedMin, this.head) - WINDOW_PAD
    const usedTo = Math.max(this.usedMax, this.head) + WINDOW_PAD
    const from = Math.max(usedFrom, this.head - WINDOW_MAX_HALF)
    const to = Math.min(usedTo, this.head + WINDOW_MAX_HALF)
    const tracks = Array.from({ length: this.trackCount }, () => [] as string[])
    const cells: string[] = []

    for (let position = from; position <= to; position++) {
      const vector = this.tape.get(position) ?? this.blanks
      cells.push(this._formatVector(vector))
      vector.forEach((symbol, track) => tracks[track].push(symbol))
    }

    const snapshot: MultiTrackSnapshot = {
      cells,
      tracks,
      head: this.head - from,
      left: from,
    }
    if (this.lastDirection) snapshot.lastMove = this.lastDirection
    return snapshot
  }

  private _snapshots(): TapeSnapshot[] {
    return [this._snapshotTape()]
  }

  private _config(status: SimulationStatus): Configuration {
    return {
      id: this.currentStateId!,
      parentId: null,
      stateId: this.currentStateId!,
      stack: [],
      inputIndex: this.head,
      status,
      consumedInput: '',
      remainingInput: '',
      tapes: this._snapshots(),
    }
  }

  private _historyEntry(
    fromStateId: string,
    transition: MultiTrackTransition | null,
    status: SimulationStatus,
  ): HistoryEntry {
    return {
      step: this.history.length,
      fromStateIds: [fromStateId],
      toStateIds: transition ? [transition.to] : [fromStateId],
      symbol: transition ? this._formatTransition(transition) : '',
      transitionIds: transition ? [transition.id] : [],
      status,
    }
  }

  private _stepResult(
    status: SimulationStatus,
    transition: MultiTrackTransition,
    entry: HistoryEntry,
  ): StepResult {
    const config = this._config(status)
    return {
      status,
      activeStateIds: this.currentStateId ? [this.currentStateId] : [],
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [transition.id],
      historyEntry: entry,
      configurations: [config],
      stack: [],
      tapes: config.tapes,
    }
  }

  private _makeResult(status: SimulationStatus): StepResult {
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

  private _formatTransition(transition: MultiTrackTransition): string {
    return `${this._formatVector(this._readVectorFor(transition))} → ${this._formatVector(this._writeVector(transition))}, ${this._direction(transition)}`
  }

  private _formatVector(vector: readonly string[]): string {
    return `[${vector.join(', ')}]`
  }

  private _configKey(): string {
    return `${this.currentStateId}|${this.head}|${this.tapeHashA}|${this.tapeHashB}`
  }

  private _cellHash(position: number, vector: readonly string[], seed: number): number {
    let hash = seed >>> 0
    const text = `${position}:${JSON.stringify(vector)}`
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }
}
