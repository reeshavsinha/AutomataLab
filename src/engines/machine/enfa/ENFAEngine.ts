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
import {
  consumedWindow,
  epsilonClosure,
  getStartState,
  hasAcceptState,
  remainingWindow,
} from '../core/utils'

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
    this.inputChars = input === '' ? [] : Array.from(input)
    // Apply ε-closure to the start state set
    this.activeStateIds = epsilonClosure(
      new Set([startState.id]),
      this.definition.transitions
    )
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
    // Lineage: root start node, then ε-closure members as ε-children.
    this._seedLineage(startState.id)
    this._epsilonExpandLineage(this.levelMap, 0)
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
        consumedWindow(this.inputChars, this.inputIndex),
        ''
      )
    }

    const symbol = this.inputChars[this.inputIndex]
    const consumed = consumedWindow(this.inputChars, this.inputIndex)
    const remaining = remainingWindow(this.inputChars, this.inputIndex + 1)

    const fromStateIds = new Set(this.activeStateIds)
    const usedTransitionIds: string[] = []
    const nextLevel = new Map<string, string>()
    const childInputIndex = this.inputIndex + 1

    // Step 1: Move on the current symbol
    const movedStates = new Set<string>()
    for (const stateId of this.activeStateIds) {
      const parentNodeId = this.levelMap.get(stateId) ?? null
      for (const t of this.definition.transitions) {
        if (t.from === stateId && t.symbols.includes(symbol)) {
          movedStates.add(t.to)
          usedTransitionIds.push(t.id)
          this._recordBranch(nextLevel, t.to, parentNodeId, childInputIndex)
        }
      }
    }

    // Step 2: Apply ε-closure to reached states (with lineage for the viewer)
    const nextStateIds = epsilonClosure(movedStates, this.definition.transitions)
    this._epsilonExpandLineage(nextLevel, childInputIndex)

    this.activeStateIds = nextStateIds
    this.levelMap = nextLevel
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
}
