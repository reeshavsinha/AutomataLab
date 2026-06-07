// ============================================================
// AutomataLab — NFA Engine
// Nondeterministic Finite Automaton simulation engine.
// Tracks a SET of active states via powerset approach.
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
  getStartState,
  getTransitionsOn,
  hasAcceptState,
} from '../core/utils'

export class NFAEngine implements Automaton {
  protected definition: MachineDefinition
  protected activeStateIds: Set<string> = new Set()
  protected inputChars: string[] = []
  protected inputIndex: number = 0
  protected status: SimulationStatus = 'idle'
  protected history: HistoryEntry[] = []

  constructor(definition: MachineDefinition) {
    this.definition = definition
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    this.activeStateIds = new Set([startState.id])
    this.inputChars = input === '' ? [] : input.split('')
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
  }

  step(): StepResult {
    if (this.status !== 'running' || this.activeStateIds.size === 0) {
      return this._makeResult('stuck', new Set(), '', '')
    }

    // If input exhausted, determine accept/reject
    if (this.inputIndex >= this.inputChars.length) {
      const accepted = hasAcceptState(this.activeStateIds, this.definition.states)
      this.status = accepted ? 'accepted' : 'rejected'
      return this._makeResult(
        this.status,
        this.activeStateIds,
        this.inputChars.slice(0, this.inputIndex).join(''),
        ''
      )
    }

    const symbol = this.inputChars[this.inputIndex]
    const consumed = this.inputChars.slice(0, this.inputIndex).join('')
    const remaining = this.inputChars.slice(this.inputIndex + 1).join('')

    const fromStateIds = new Set(this.activeStateIds)
    const nextStateIds = new Set<string>()
    const usedTransitionIds: string[] = []

    for (const stateId of this.activeStateIds) {
      const transitions = getTransitionsOn(
        this.definition.transitions,
        stateId,
        symbol
      )
      for (const t of transitions) {
        nextStateIds.add(t.to)
        usedTransitionIds.push(t.id)
      }
    }

    this.activeStateIds = nextStateIds
    this.inputIndex++

    let newStatus: SimulationStatus
    if (nextStateIds.size === 0) {
      newStatus = 'rejected'
    } else if (this.inputIndex >= this.inputChars.length) {
      newStatus = hasAcceptState(nextStateIds, this.definition.states)
        ? 'accepted'
        : 'rejected'
    } else {
      newStatus = 'running'
    }

    this.status = newStatus

    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: [...fromStateIds],
      toStateIds: [...nextStateIds],
      symbol,
      transitionIds: usedTransitionIds,
      status: newStatus,
    }
    this.history.push(entry)

    return {
      status: newStatus,
      activeStateIds: [...nextStateIds],
      consumedInput: consumed + symbol,
      remainingInput: remaining,
      symbol,
      transitionIds: usedTransitionIds,
      historyEntry: entry,
      configurations: this._configsFor([...nextStateIds], newStatus),
      stack: [],
    }
  }

  reset(): void {
    this.activeStateIds = new Set()
    this.inputChars = []
    this.inputIndex = 0
    this.status = 'idle'
    this.history = []
  }

  getCurrentConfigurations(): Configuration[] {
    return this._configsFor([...this.activeStateIds], this.status)
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

  protected _configsFor(stateIds: string[], status: SimulationStatus): Configuration[] {
    return stateIds.map((stateId) =>
      buildConfig({ stateId, inputChars: this.inputChars, inputIndex: this.inputIndex, status })
    )
  }

  protected _makeResult(
    status: SimulationStatus,
    stateIds: Set<string>,
    consumed: string,
    remaining: string
  ): StepResult {
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: [...stateIds],
      toStateIds: [...stateIds],
      symbol: '',
      transitionIds: [],
      status,
    }
    return {
      status,
      activeStateIds: [...stateIds],
      consumedInput: consumed,
      remainingInput: remaining,
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this._configsFor([...stateIds], status),
      stack: [],
    }
  }
}
