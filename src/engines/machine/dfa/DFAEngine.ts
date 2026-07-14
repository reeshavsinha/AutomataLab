// ============================================================
// AutomataLab — DFA Engine
// Deterministic Finite Automaton simulation engine.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
} from '../core/types'
import {
  buildConfig,
  consumedWindow,
  getStartState,
  getTransitionsOn,
  hasAcceptState,
  remainingWindow,
} from '../core/utils'

export class DFAEngine implements Automaton {
  private definition: MachineDefinition
  private currentStateId: string | null = null
  private inputChars: string[] = []
  private inputIndex: number = 0
  private status: SimulationStatus = 'idle'
  private history: HistoryEntry[] = []

  constructor(definition: MachineDefinition) {
    this.definition = definition
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    this.currentStateId = startState.id
    this.inputChars = input === '' ? [] : Array.from(input)
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      return this._makeResult('stuck', [], '', '')
    }

    // If input exhausted, determine accept/reject
    if (this.inputIndex >= this.inputChars.length) {
      const accepted = hasAcceptState(
        new Set([this.currentStateId]),
        this.definition.states
      )
      this.status = accepted ? 'accepted' : 'rejected'
      return this._makeResult(
        this.status,
        [this.currentStateId],
        consumedWindow(this.inputChars, this.inputIndex),
        ''
      )
    }

    const symbol = this.inputChars[this.inputIndex]
    const consumed = consumedWindow(this.inputChars, this.inputIndex)
    const remaining = remainingWindow(this.inputChars, this.inputIndex + 1)

    const transitions = getTransitionsOn(
      this.definition.transitions,
      this.currentStateId,
      symbol
    )

    if (transitions.length === 0) {
      // No transition → stuck (implicit reject)
      this.status = 'rejected'
      const entry: HistoryEntry = {
        step: this.history.length,
        fromStateIds: [this.currentStateId],
        toStateIds: [],
        symbol,
        transitionIds: [],
        status: 'rejected',
      }
      this.history.push(entry)
      return {
        status: 'rejected',
        activeStateIds: [],
        consumedInput: consumed + symbol,
        remainingInput: remaining,
        symbol,
        transitionIds: [],
        historyEntry: entry,
        configurations: [],
        stack: [],
      }
    }

    // DFA: exactly one transition
    const t = transitions[0]
    const prevStateId = this.currentStateId
    this.currentStateId = t.to
    this.inputIndex++

    const newConsumed = consumed + symbol

    // Check accept on final symbol consumed
    let newStatus: SimulationStatus = 'running'
    if (this.inputIndex >= this.inputChars.length) {
      newStatus = hasAcceptState(
        new Set([this.currentStateId]),
        this.definition.states
      )
        ? 'accepted'
        : 'rejected'
    }

    this.status = newStatus

    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: [prevStateId],
      toStateIds: [this.currentStateId],
      symbol,
      transitionIds: [t.id],
      status: newStatus,
    }
    this.history.push(entry)

    return {
      status: newStatus,
      activeStateIds: [this.currentStateId],
      consumedInput: newConsumed,
      remainingInput: remaining,
      symbol,
      transitionIds: [t.id],
      historyEntry: entry,
      configurations: this._configsFor([this.currentStateId], newStatus),
      stack: [],
    }
  }

  reset(): void {
    this.currentStateId = null
    this.inputChars = []
    this.inputIndex = 0
    this.status = 'idle'
    this.history = []
  }

  getCurrentConfigurations(): Configuration[] {
    if (this.currentStateId === null) return []
    return this._configsFor([this.currentStateId], this.status)
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

  private _configsFor(stateIds: string[], status: SimulationStatus): Configuration[] {
    return stateIds.map((stateId) =>
      buildConfig({ stateId, inputChars: this.inputChars, inputIndex: this.inputIndex, status })
    )
  }

  private _makeResult(
    status: SimulationStatus,
    stateIds: string[],
    consumed: string,
    remaining: string
  ): StepResult {
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: stateIds,
      toStateIds: stateIds,
      symbol: '',
      transitionIds: [],
      status,
    }
    return {
      status,
      activeStateIds: stateIds,
      consumedInput: consumed,
      remainingInput: remaining,
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this._configsFor(stateIds, status),
      stack: [],
    }
  }
}
