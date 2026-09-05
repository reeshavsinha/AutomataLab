// ============================================================
// AutomataLab — DPDA Engine
// Deterministic Pushdown Automaton simulation engine.
// A single configuration carries the current state + a stack.
// Transition format: (state, read, pop) → (state', push).
// Acceptance: by FINAL STATE with the input fully consumed.
// Stack convention: the TOP of the stack is the LAST array element.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
  Transition,
} from '../core/types'
import { buildConfig, consumedWindow, getStartState, isEpsilon, remainingWindow } from '../core/utils'

/** Safety cap: guards against non-terminating ε-input/ε-pop push loops. */
const DEFAULT_MAX_STEPS = 10_000
/** Keep deterministic ε-push loops from exhausting renderer memory. */
const MAX_STACK_DEPTH = 10_000

export class DPDAEngine implements Automaton {
  private definition: MachineDefinition
  private currentStateId: string | null = null
  /** Stack contents; the top of the stack is the LAST element. */
  private stack: string[] = []
  private inputChars: string[] = []
  private inputIndex: number = 0
  private status: SimulationStatus = 'idle'
  private history: HistoryEntry[] = []
  private stepGuard: number = 0
  private readonly maxSteps: number

  constructor(definition: MachineDefinition, maxSteps: number = DEFAULT_MAX_STEPS) {
    this.definition = definition
    // Guard against a non-positive / non-finite cap bricking the engine.
    this.maxSteps = Number.isFinite(maxSteps) && maxSteps > 0 ? Math.floor(maxSteps) : DEFAULT_MAX_STEPS
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    this.currentStateId = startState.id
    this.stack = []
    this.inputChars = input === '' ? [] : Array.from(input)
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
    this.stepGuard = 0
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      return this._makeResult(this.status === 'idle' ? 'stuck' : this.status)
    }

    // Guard against infinite ε-loops (e.g. a self-loop that only pushes).
    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this._makeResult('stuck')
    }

    // Final-state acceptance: input fully consumed and in an accept state.
    if (this.inputIndex >= this.inputChars.length && this._isAccept(this.currentStateId)) {
      this.status = 'accepted'
      return this._makeResult('accepted')
    }

    const t = this._pickTransition()
    if (!t) {
      // No applicable move → terminal. (We are not in an accepting halt,
      // otherwise the check above would have fired.)
      this.status = 'rejected'
      return this._makeResult('rejected')
    }

    // ── Apply the transition ───────────────────────────────────
    const fromStateId = this.currentStateId
    const read = t.read ?? ''
    const pop = t.pop ?? ''
    const push = t.push ?? ''

    let pushSymbols: string[] = []
    if (!isEpsilon(push)) {
      const gamma = this.definition.stackAlphabet ?? []
      if (push.includes(',')) {
        pushSymbols = push.split(',')
      } else if (gamma.includes(push)) {
        pushSymbols = [push]
      } else {
        pushSymbols = Array.from(push)
      }
    }
    const popCount = isEpsilon(pop) ? 0 : 1
    const nonEmptyPushCount = pushSymbols.reduce((count, symbol) => count + (symbol ? 1 : 0), 0)
    if (this.stack.length - popCount + nonEmptyPushCount > MAX_STACK_DEPTH) {
      this.status = 'stuck'
      return this._makeResult('stuck')
    }
    if (!isEpsilon(pop)) {
      this.stack.pop()
    }
    // Push so the FIRST symbol of `push` ends up on top of the stack.
    for (let i = pushSymbols.length - 1; i >= 0; i--) {
      if (pushSymbols[i]) {
        this.stack.push(pushSymbols[i])
      }
    }

    const consumesInput = !isEpsilon(read)
    if (consumesInput) {
      this.inputIndex += Array.from(read).length
    }
    this.currentStateId = t.to

    // ── Determine the resulting status ─────────────────────────
    const noMoreInput = this.inputIndex >= this.inputChars.length
    let newStatus: SimulationStatus
    if (noMoreInput && this._isAccept(this.currentStateId)) {
      newStatus = 'accepted'
    } else if (this._pickTransition() !== null) {
      newStatus = 'running'
    } else {
      newStatus = 'rejected'
    }
    this.status = newStatus

    const consumed = consumedWindow(this.inputChars, this.inputIndex)
    const remaining = remainingWindow(this.inputChars, this.inputIndex)

    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: [fromStateId],
      toStateIds: [t.to],
      // Log shows ε for stack-only moves; the tape highlight (StepResult.symbol) stays blank.
      symbol: consumesInput ? read : 'ε',
      transitionIds: [t.id],
      status: newStatus,
    }
    this.history.push(entry)

    return {
      status: newStatus,
      activeStateIds: [t.to],
      consumedInput: consumed,
      remainingInput: remaining,
      symbol: consumesInput ? read : '',
      transitionIds: [t.id],
      historyEntry: entry,
      configurations: [this._config(newStatus)],
      stack: [...this.stack],
    }
  }

  reset(): void {
    this.currentStateId = null
    this.stack = []
    this.inputChars = []
    this.inputIndex = 0
    this.status = 'idle'
    this.history = []
    this.stepGuard = 0
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

  // ── Internals ──────────────────────────────────────────────

  private _isAccept(stateId: string): boolean {
    return this.definition.states.find((s) => s.id === stateId)?.isAccept ?? false
  }

  /** A transition applies when its read matches (or is ε) and its pop matches the stack top (or is ε). */
  private _applicable(): Transition[] {
    const top = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null
    return this.definition.transitions.filter((t) => {
      if (t.from !== this.currentStateId) return false
      const read = t.read ?? ''
      const pop = t.pop ?? ''
      const readTokens = Array.from(read)
      const readOk = isEpsilon(read) || (this.inputIndex + readTokens.length <= this.inputChars.length && this.inputChars.slice(this.inputIndex, this.inputIndex + readTokens.length).join('') === read)
      const popOk = isEpsilon(pop) || (top !== null && top === pop)
      return readOk && popOk
    })
  }

  /**
   * Pick the single applicable transition. A well-formed DPDA never has more
   * than one (the validator flags conflicts). When several match — typically an
   * ε-move (e.g. an ε-accept on the bottom marker) overlapping an input-reading
   * move — we deterministically prefer the move that CONSUMES input. This makes
   * the engine independent of transition authoring order (previously the
   * ε-accept move had to be listed last) while leaving strict DPDAs unaffected,
   * since they never have such an overlap. Among equally-ranked moves we keep
   * definition order.
   */
  private _pickTransition(): Transition | null {
    const applicable = this._applicable()
    if (applicable.length === 0) return null
    const inputReading = applicable.find((t) => !isEpsilon(t.read ?? ''))
    return inputReading ?? applicable[0]
  }

  private _config(status: SimulationStatus): Configuration {
    return buildConfig({
      stateId: this.currentStateId!,
      inputChars: this.inputChars,
      inputIndex: this.inputIndex,
      status,
      stack: [...this.stack],
    })
  }

  /** Build a terminal/no-move StepResult that reports the current configuration unchanged. */
  private _makeResult(status: SimulationStatus): StepResult {
    const activeStateIds = this.currentStateId ? [this.currentStateId] : []
    const consumed = consumedWindow(this.inputChars, this.inputIndex)
    const remaining = remainingWindow(this.inputChars, this.inputIndex)
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
      consumedInput: consumed,
      remainingInput: remaining,
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this.currentStateId ? [this._config(status)] : [],
      stack: [...this.stack],
    }
  }
}
