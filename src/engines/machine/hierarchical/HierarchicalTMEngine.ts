// ============================================================
// AutomataLab — Hierarchical Turing Machine Engine
// Deterministic TM execution with embedded, call-and-return child TMs.
// All frames share the same sparse tapes and head positions.
// ============================================================

import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
  SubmachineCallFrame,
  TapeSnapshot,
  Transition,
} from '../core/types'
import { BLANK, formatTmTransition, getStartState, isBlank, tmTapeOps, type TapeDir } from '../core/utils'

const DEFAULT_MAX_STEPS = 10_000
const DEFAULT_DEPTH_LIMIT = 16
const WINDOW_PAD = 3
const WINDOW_MAX_HALF = 150

interface RuntimeCallFrame extends SubmachineCallFrame {
  callerDefinition: MachineDefinition
  localSteps: number
}

/**
 * A deterministic hierarchical TM. `submachineId` on a transition performs its
 * write/move first, then transfers control to that child. The parent's `to`
 * state is retained in the frame and becomes active on the child's explicit
 * return step.
 */
export class HierarchicalTMEngine implements Automaton {
  private readonly rootDefinition: MachineDefinition
  private readonly tapeCount: number
  private readonly blank: string
  private readonly maxSteps: number
  private readonly depthLimit: number

  private currentDefinition: MachineDefinition
  private currentStateId: string | null = null
  private tapes: Map<number, string>[] = []
  private heads: number[] = []
  private usedMin: number[] = []
  private usedMax: number[] = []
  private tapeHashesA: number[] = []
  private tapeHashesB: number[] = []
  private lastDirections: TapeDir[] = []
  private callStack: RuntimeCallFrame[] = []
  private history: HistoryEntry[] = []
  private status: SimulationStatus = 'idle'
  private stepGuard = 0
  private visitedConfigs = new Set<string>()

  constructor(definition: MachineDefinition, maxSteps?: number) {
    this.rootDefinition = definition
    this.currentDefinition = definition
    this.blank = definition.blankSymbol || BLANK
    this.tapeCount = normalizedTapeCount(definition)
    this.maxSteps = validLimit(maxSteps ?? definition.stepLimit)
    this.depthLimit = validLimit(definition.submachineDepthLimit, DEFAULT_DEPTH_LIMIT)
  }

  initialize(input: string): void {
    this.reset()
    if (this.rootDefinition.type !== 'TM') {
      this.status = 'error'
      return
    }

    const startState = getStartState(this.rootDefinition)
    if (!startState) {
      this.status = 'error'
      return
    }

    const chars = input === '' ? [] : Array.from(input)
    this.currentDefinition = this.rootDefinition
    this.currentStateId = startState.id
    this.tapes = Array.from({ length: this.tapeCount }, (_, tapeIndex) => {
      const tape = new Map<number, string>()
      if (tapeIndex === 0) {
        chars.forEach((symbol, index) => {
          if (!isBlank(symbol, this.blank)) tape.set(index, symbol)
        })
      }
      return tape
    })
    this.heads = Array(this.tapeCount).fill(0)
    this.usedMin = Array(this.tapeCount).fill(0)
    this.usedMax = Array.from(
      { length: this.tapeCount },
      (_, tapeIndex) => tapeIndex === 0 ? Math.max(0, chars.length - 1) : 0,
    )
    this.tapeHashesA = this.tapes.map((tape) => this.tapeHash(tape, 0x811c9dc5))
    this.tapeHashesB = this.tapes.map((tape) => this.tapeHash(tape, 0x9e3779b9))
    this.status = 'running'
    this.visitedConfigs.add(this.configKey())
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      return this.makeResult(this.status === 'idle' ? 'stuck' : this.status)
    }

    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this.recordTerminal('stuck')
    }

    const currentKey = this.configKey()
    if (this.stepGuard > 1 && this.visitedConfigs.has(currentKey)) {
      this.status = 'stuck'
      return this.recordTerminal('stuck')
    }
    this.visitedConfigs.add(currentKey)

    // A child accept never accepts the root: it consumes one visible return
    // event. A root accept retains ordinary TM behavior and simply halts.
    if (this.isAccept(this.currentStateId)) {
      if (this.callStack.length > 0) return this.returnFromChild()
      this.status = 'accepted'
      return this.makeResult('accepted')
    }
    if (this.isReject(this.currentStateId)) {
      this.status = 'rejected'
      return this.makeResult('rejected')
    }

    if (this.callStack.length > 0) {
      const activeFrame = this.callStack[this.callStack.length - 1]
      activeFrame.localSteps++
      if (activeFrame.localSteps > validLimit(this.currentDefinition.stepLimit)) {
        this.status = 'stuck'
        return this.recordTerminal('stuck')
      }
    }

    const transition = this.pickTransition(this.readSymbols())
    if (!transition) {
      this.status = 'rejected'
      return this.makeResult('rejected')
    }

    if (transition.submachineId !== undefined) {
      const child = this.currentDefinition.submachines?.[transition.submachineId]
      if (!child || !this.isCompatibleChild(child) || !getStartState(child)) {
        this.status = 'error'
        return this.makeResult('error')
      }
      if (this.callStack.length >= this.depthLimit) {
        this.status = 'error'
        return this.makeResult('error')
      }
      return this.applyCall(transition, child)
    }

    return this.applyOrdinaryTransition(transition)
  }

  reset(): void {
    this.currentDefinition = this.rootDefinition
    this.currentStateId = null
    this.tapes = []
    this.heads = []
    this.usedMin = []
    this.usedMax = []
    this.tapeHashesA = []
    this.tapeHashesB = []
    this.lastDirections = []
    this.callStack = []
    this.history = []
    this.status = 'idle'
    this.stepGuard = 0
    this.visitedConfigs.clear()
  }

  getCurrentConfigurations(): Configuration[] {
    return this.currentStateId === null ? [] : [this.config(this.status)]
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

  private applyOrdinaryTransition(transition: Transition): StepResult {
    const fromStateId = this.currentStateId!
    if (!this.applyTapeMove(transition)) {
      this.status = 'rejected'
      return this.recordTerminal('rejected')
    }
    this.currentStateId = transition.to
    this.status = this.resultingStatus()
    const entry = this.historyEntry(fromStateId, [this.currentStateId], transition, this.status)
    this.history.push(entry)
    return this.stepResult(this.status, transition, entry)
  }

  private applyCall(transition: Transition, child: MachineDefinition): StepResult {
    const fromStateId = this.currentStateId!
    if (!this.applyTapeMove(transition)) {
      this.status = 'rejected'
      return this.recordTerminal('rejected')
    }

    const childStart = getStartState(child)!
    this.callStack.push({
      submachineId: transition.submachineId!,
      machineName: child.name,
      returnStateId: transition.to,
      callerTransitionId: transition.id,
      callerDefinition: this.currentDefinition,
      localSteps: 0,
    })
    this.currentDefinition = child
    this.currentStateId = childStart.id
    // A call plus its invoking TM move is one deterministic CALL event.
    this.status = 'running'
    const entry = this.historyEntry(
      fromStateId,
      [childStart.id],
      transition,
      'running',
      `CALL ${transition.submachineId}: ${formatTmTransition(transition, this.tapeCount, this.blank)}`,
    )
    this.history.push(entry)
    return this.stepResult('running', transition, entry)
  }

  private returnFromChild(): StepResult {
    const fromStateId = this.currentStateId!
    const frame = this.callStack.pop()!
    this.currentDefinition = frame.callerDefinition
    this.currentStateId = frame.returnStateId
    this.status = this.resultingStatus()
    const entry = this.historyEntry(
      fromStateId,
      [this.currentStateId],
      { id: frame.callerTransitionId } as Transition,
      this.status,
      `RETURN ${frame.submachineId}`,
    )
    this.history.push(entry)
    return this.stepResult(this.status, { id: frame.callerTransitionId } as Transition, entry)
  }

  /** Apply the write/move atomically; false means an invalid out-of-bounds move. */
  private applyTapeMove(transition: Transition): boolean {
    const { writes, directions } = tmTapeOps(transition, this.tapeCount)
    const nextHeads = this.heads.map((head, index) => {
      const direction = directions[index]
      return direction === 'L' ? head - 1 : direction === 'R' ? head + 1 : head
    })
    // Hierarchical TMs are unbounded, but keeping this atomic check makes the
    // method safe if bounded behavior is later introduced.
    if (!nextHeads.every(Number.isFinite)) return false

    this.lastDirections = directions
    for (let index = 0; index < this.tapeCount; index++) {
      const write = isBlank(writes[index], this.blank) ? this.blank : writes[index]
      this.writeSymbol(index, write)
      this.heads[index] = nextHeads[index]
      this.usedMin[index] = Math.min(this.usedMin[index], this.heads[index])
      this.usedMax[index] = Math.max(this.usedMax[index], this.heads[index])
    }
    return true
  }

  private resultingStatus(): SimulationStatus {
    const stateId = this.currentStateId!
    if (this.isAccept(stateId)) {
      // A child accept must remain observable so the following `step()` can
      // produce the explicit RETURN history entry.
      return this.callStack.length === 0 ? 'accepted' : 'running'
    }
    if (this.isReject(stateId)) return 'rejected'
    return this.pickTransition(this.readSymbols()) ? 'running' : 'rejected'
  }

  private isCompatibleChild(child: MachineDefinition): boolean {
    return child.type === 'TM'
      && normalizedTapeCount(child) === this.tapeCount
      && (child.blankSymbol || BLANK) === this.blank
  }

  private readSymbols(): string[] {
    return this.heads.map((head, index) => this.tapes[index].get(head) ?? this.blank)
  }

  private pickTransition(symbols: string[]): Transition | null {
    return this.currentDefinition.transitions.find((transition) => {
      if (transition.from !== this.currentStateId) return false
      const { reads } = tmTapeOps(transition, this.tapeCount)
      return reads.every((read, index) => (isBlank(read, this.blank) ? this.blank : read) === symbols[index])
    }) ?? null
  }

  private isAccept(stateId: string): boolean {
    return this.currentDefinition.states.find((state) => state.id === stateId)?.isAccept ?? false
  }

  private isReject(stateId: string): boolean {
    return this.currentDefinition.states.find((state) => state.id === stateId)?.isReject ?? false
  }

  private writeSymbol(tapeIndex: number, symbol: string): void {
    const tape = this.tapes[tapeIndex]
    const head = this.heads[tapeIndex]
    const previous = tape.get(head) ?? this.blank
    if (!isBlank(previous, this.blank)) {
      this.tapeHashesA[tapeIndex] ^= this.cellHash(head, previous, 0x811c9dc5)
      this.tapeHashesB[tapeIndex] ^= this.cellHash(head, previous, 0x9e3779b9)
    }
    if (isBlank(symbol, this.blank)) {
      tape.delete(head)
    } else {
      tape.set(head, symbol)
      this.tapeHashesA[tapeIndex] ^= this.cellHash(head, symbol, 0x811c9dc5)
      this.tapeHashesB[tapeIndex] ^= this.cellHash(head, symbol, 0x9e3779b9)
    }
    this.tapeHashesA[tapeIndex] >>>= 0
    this.tapeHashesB[tapeIndex] >>>= 0
    this.usedMin[tapeIndex] = Math.min(this.usedMin[tapeIndex], head)
    this.usedMax[tapeIndex] = Math.max(this.usedMax[tapeIndex], head)
  }

  private snapshots(): TapeSnapshot[] {
    return this.tapes.map((tape, tapeIndex) => {
      const head = this.heads[tapeIndex]
      const from = Math.max(
        Math.min(this.usedMin[tapeIndex], head) - WINDOW_PAD,
        head - WINDOW_MAX_HALF,
      )
      const to = Math.min(
        Math.max(this.usedMax[tapeIndex], head) + WINDOW_PAD,
        head + WINDOW_MAX_HALF,
      )
      const cells: string[] = []
      for (let index = from; index <= to; index++) cells.push(tape.get(index) ?? this.blank)
      const snapshot: TapeSnapshot = { cells, head: head - from, left: from }
      if (this.lastDirections[tapeIndex]) snapshot.lastMove = this.lastDirections[tapeIndex]
      return snapshot
    })
  }

  private config(status: SimulationStatus): Configuration {
    const callStack = this.publicCallStack()
    return {
      id: `${this.scopeKey()}:${this.currentStateId}`,
      parentId: null,
      stateId: this.currentStateId!,
      stack: [],
      inputIndex: this.heads[0] ?? 0,
      status,
      consumedInput: '',
      remainingInput: '',
      tapes: this.snapshots(),
      activeSubmachinePath: callStack.map((frame) => frame.submachineId),
      callStack,
    }
  }

  private historyEntry(
    fromStateId: string,
    toStateIds: string[],
    transition: Transition | null,
    status: SimulationStatus,
    symbol = transition ? formatTmTransition(transition, this.tapeCount, this.blank) : '',
  ): HistoryEntry {
    const callStack = this.publicCallStack()
    return {
      step: this.history.length,
      fromStateIds: [fromStateId],
      toStateIds,
      symbol,
      transitionIds: transition ? [transition.id] : [],
      status,
      tapes: this.snapshots(),
      activeSubmachinePath: callStack.map((frame) => frame.submachineId),
      callStack,
    }
  }

  private stepResult(status: SimulationStatus, transition: Transition, entry: HistoryEntry): StepResult {
    const configuration = this.config(status)
    return {
      status,
      activeStateIds: this.currentStateId ? [this.currentStateId] : [],
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [transition.id],
      historyEntry: entry,
      configurations: [configuration],
      stack: [],
      tapes: configuration.tapes,
    }
  }

  private recordTerminal(status: SimulationStatus): StepResult {
    // A terminal guard/no-move condition is not a TM transition, CALL, or
    // RETURN event, so it does not add a phantom row to the replayable trace.
    return this.makeResult(status)
  }

  private makeResult(status: SimulationStatus, historyEntry?: HistoryEntry): StepResult {
    const configuration = this.currentStateId === null ? undefined : this.config(status)
    const entry = historyEntry ?? this.historyEntry(
      this.currentStateId ?? '',
      this.currentStateId ? [this.currentStateId] : [],
      null,
      status,
    )
    return {
      status,
      activeStateIds: this.currentStateId ? [this.currentStateId] : [],
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: configuration ? [configuration] : [],
      stack: [],
      tapes: configuration?.tapes,
    }
  }

  /** Scope and return targets are part of loop identity, not just tape/state. */
  private configKey(): string {
    return [
      this.scopeKey(),
      this.currentStateId,
      this.heads.join(','),
      this.tapeHashesA.join(','),
      this.tapeHashesB.join(','),
    ].join('|')
  }

  private scopeKey(): string {
    const callers = this.callStack.map(
      (frame) => `${frame.callerDefinition.id}:${frame.submachineId}:${frame.returnStateId}:${frame.callerTransitionId}`,
    )
    return [...callers, `active:${this.currentDefinition.id}`].join('>')
  }

  private publicCallStack(): SubmachineCallFrame[] {
    return this.callStack.map(({ submachineId, machineName, returnStateId, callerTransitionId }) => ({
      submachineId,
      machineName,
      returnStateId,
      callerTransitionId,
    }))
  }

  private tapeHash(tape: Map<number, string>, seed: number): number {
    let hash = 0
    for (const [index, symbol] of tape) hash ^= this.cellHash(index, symbol, seed)
    return hash >>> 0
  }

  private cellHash(index: number, symbol: string, seed: number): number {
    let hash = seed >>> 0
    for (const char of `${index}:${symbol}`) {
      hash ^= char.charCodeAt(0)
      hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
  }
}

function normalizedTapeCount(definition: MachineDefinition): number {
  return Math.max(1, Math.floor(definition.tapeCount ?? 1) || 1)
}

function validLimit(value: number | undefined, fallback = DEFAULT_MAX_STEPS): number {
  return Number.isFinite(value) && value! > 0 ? Math.floor(value!) : fallback
}
