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
import type { TreeProvider } from '../core/computationTree'
import {
  buildConfig,
  getStartState,
  getTransitionsOn,
  hasAcceptState,
  isEpsilon,
} from '../core/utils'

export class NFAEngine implements Automaton, TreeProvider {
  protected definition: MachineDefinition
  protected activeStateIds: Set<string> = new Set()
  protected inputChars: string[] = []
  protected inputIndex: number = 0
  protected status: SimulationStatus = 'idle'
  protected history: HistoryEntry[] = []

  // ── Computation-tree lineage (runs alongside the powerset above) ──
  /** Every branch ever created, in creation order — powers the computation tree. */
  protected treeNodes: Configuration[] = []
  /** Current frontier: active stateId → its branch-node id (one node per active state). */
  protected levelMap: Map<string, string> = new Map()
  protected branchSeq: number = 0

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
    this._seedLineage(startState.id)
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
    const nextLevel = new Map<string, string>()
    const childInputIndex = this.inputIndex + 1

    for (const stateId of this.activeStateIds) {
      const parentNodeId = this.levelMap.get(stateId) ?? null
      const transitions = getTransitionsOn(
        this.definition.transitions,
        stateId,
        symbol
      )
      for (const t of transitions) {
        nextStateIds.add(t.to)
        usedTransitionIds.push(t.id)
        // First parent to reach a target owns the branch edge (per-level dedup).
        this._recordBranch(nextLevel, t.to, parentNodeId, childInputIndex)
      }
    }

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

  reset(): void {
    this.activeStateIds = new Set()
    this.inputChars = []
    this.inputIndex = 0
    this.status = 'idle'
    this.history = []
    this.treeNodes = []
    this.levelMap = new Map()
    this.branchSeq = 0
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

  // ── Computation tree (TreeProvider) ────────────────────────

  /** All branches explored so far; accepting branches are tagged `accepted`. */
  getTreeNodes(): Configuration[] {
    return this.treeNodes.map((c) => ({
      ...c,
      status: this._isAcceptConfig(c) ? 'accepted' : 'running',
    }))
  }

  /** Live frontier branch ids — empty unless the run is still in progress. */
  getLiveBranchIds(): string[] {
    return this.status === 'running' ? [...this.levelMap.values()] : []
  }

  protected _isAcceptState(stateId: string): boolean {
    return this.definition.states.find((s) => s.id === stateId)?.isAccept ?? false
  }

  /** A configuration is accepting when it sits in an accept state with all input consumed. */
  protected _isAcceptConfig(c: Configuration): boolean {
    return this._isAcceptState(c.stateId) && c.inputIndex >= this.inputChars.length
  }

  protected _nextId(): string {
    return `n${this.branchSeq++}`
  }

  /** Reset lineage tracking and create the root branch for the start state. */
  protected _seedLineage(startStateId: string): void {
    this.branchSeq = 0
    this.treeNodes = []
    this.levelMap = new Map()
    const root = buildConfig({
      stateId: startStateId,
      inputChars: this.inputChars,
      inputIndex: 0,
      status: 'running',
      id: this._nextId(),
      parentId: null,
    })
    this.treeNodes.push(root)
    this.levelMap.set(startStateId, root.id)
  }

  /**
   * Add a branch node for `stateId` to `level` (the frontier being built) unless
   * one already exists this level. First parent to reach a state owns the edge —
   * this per-level dedup keeps the tree bounded (the powerset, with lineage).
   */
  protected _recordBranch(
    level: Map<string, string>,
    stateId: string,
    parentNodeId: string | null,
    inputIndex: number
  ): void {
    if (level.has(stateId)) return
    const node = buildConfig({
      stateId,
      inputChars: this.inputChars,
      inputIndex,
      status: 'running',
      id: this._nextId(),
      parentId: parentNodeId,
    })
    this.treeNodes.push(node)
    level.set(stateId, node.id)
  }

  /**
   * Expand `level` in place along ε-transitions, recording each newly reached
   * state as a child branch of the node it was reached from. Used by the ε-NFA
   * to give ε-closure members real parent lineage in the tree.
   */
  protected _epsilonExpandLineage(level: Map<string, string>, inputIndex: number): void {
    const queue = [...level.keys()]
    while (queue.length > 0) {
      const stateId = queue.shift()!
      const parentNodeId = level.get(stateId) ?? null
      for (const t of this.definition.transitions) {
        if (t.from === stateId && t.symbols.some(isEpsilon) && !level.has(t.to)) {
          this._recordBranch(level, t.to, parentNodeId, inputIndex)
          queue.push(t.to)
        }
      }
    }
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
