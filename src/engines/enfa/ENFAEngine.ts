// ============================================================
// AutomataLab — ε-NFA Engine
// Extends NFAEngine with epsilon-closure computation.
// At each step: move on symbol, then take ε-closure.
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import type {
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
} from '../core/types'
import { NFAEngine } from '../nfa/NFAEngine'
import { epsilonClosure, getStartState, hasAcceptState } from '../core/utils'

export class ENFAEngine extends NFAEngine {
  constructor(definition: MachineDefinition) {
    super(definition)
  }

  /** Override initialize to apply ε-closure to start state */
  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    // Apply ε-closure to the start state set
    this.activeStateIds = epsilonClosure(
      new Set([startState.id]),
      this.definition.transitions
    )
    this.inputChars = input === '' ? [] : input.split('')
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
  }

  /** Override step to apply ε-closure after each symbol consumption */
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
    const usedTransitionIds: string[] = []

    // Step 1: Move on the current symbol
    const movedStates = new Set<string>()
    for (const stateId of this.activeStateIds) {
      for (const t of this.definition.transitions) {
        if (t.from === stateId && t.symbols.includes(symbol)) {
          movedStates.add(t.to)
          usedTransitionIds.push(t.id)
        }
      }
    }

    // Step 2: Apply ε-closure to reached states
    const nextStateIds = epsilonClosure(movedStates, this.definition.transitions)

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
    }
  }
}
