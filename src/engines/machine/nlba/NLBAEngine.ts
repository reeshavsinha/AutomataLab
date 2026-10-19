// ============================================================
// AutomataLab — Nondeterministic Linear-Bounded Automaton Engine
// Explores every applicable bounded-TM transition one BFS layer at a time.
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
import { MAX_TREE_NODES, type TreeProvider } from '../core/computationTree'
import { BLANK, formatTmTransition, getStartState, isBlank, tmTapeOps, type TapeDir } from '../core/utils'

const DEFAULT_MAX_STEPS = 10_000
const DEFAULT_MAX_BRANCHES = 5_000
const WINDOW_PAD = 3
const WINDOW_MAX_HALF = 150

export interface NLBAEngineOptions {
  /** Overrides `MachineDefinition.stepLimit` when supplied. */
  maxSteps?: number
  /** Maximum number of branch outcomes produced in one BFS layer. */
  maxBranches?: number
}

interface Branch {
  id: string
  parentId: string | null
  stateId: string
  tapes: Map<number, string>[]
  heads: number[]
  usedMin: number[]
  usedMax: number[]
  lastDirections: TapeDir[]
  status: SimulationStatus
}

/**
 * A pure, breadth-first nondeterministic LBA. Each branch owns its sparse tape
 * maps, so writes in one transition cannot leak into competing branches.
 */
export class NLBAEngine implements Automaton, TreeProvider {
  private readonly blank: string
  private readonly tapeCount: number
  private readonly maxSteps: number
  private readonly maxBranches: number
  private definition: MachineDefinition
  private frontier: Branch[] = []
  private displayBranches: Branch[] = []
  private history: HistoryEntry[] = []
  private status: SimulationStatus = 'idle'
  private leftBound = 0
  private rightBound = 0
  private stepGuard = 0
  private branchSeq = 0
  /** Immutable branch snapshots accumulated for the computation-tree panel. */
  private treeNodes: Branch[] = []

  constructor(definition: MachineDefinition, options: NLBAEngineOptions = {}) {
    this.definition = definition
    this.blank = definition.blankSymbol || BLANK
    this.tapeCount = Math.max(1, Math.floor(definition.tapeCount ?? 1) || 1)
    this.maxSteps = this._validLimit(options.maxSteps ?? definition.stepLimit, DEFAULT_MAX_STEPS)
    this.maxBranches = this._validLimit(options.maxBranches, DEFAULT_MAX_BRANCHES)
  }

  initialize(input: string): void {
    const start = getStartState(this.definition)
    if (!start) {
      this.reset()
      this.status = 'error'
      return
    }

    const chars = Array.from(input)
    this.leftBound = 0
    this.rightBound = Math.max(chars.length, 0)
    this.branchSeq = 0
    this.stepGuard = 0
    this.history = []

    const tapes = Array.from({ length: this.tapeCount }, () => new Map<number, string>())
    for (let index = 0; index < chars.length; index++) {
      if (!isBlank(chars[index], this.blank)) tapes[0].set(index, chars[index])
    }
    const root: Branch = {
      id: this._nextId(),
      parentId: null,
      stateId: start.id,
      tapes,
      heads: Array(this.tapeCount).fill(0),
      usedMin: Array(this.tapeCount).fill(0),
      usedMax: Array.from({ length: this.tapeCount }, (_, index) => index === 0 ? Math.max(0, chars.length - 1) : 0),
      lastDirections: [],
      status: 'running',
    }
    this.frontier = [root]
    this.displayBranches = [root]
    this.treeNodes = [root]
    this.status = 'running'
  }

  step(): StepResult {
    if (this.status !== 'running') return this._terminalResult(this.status === 'idle' ? 'stuck' : this.status)

    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this._terminalResult('stuck')
    }

    const acceptingNow = this.frontier.find((branch) => this._isAccept(branch.stateId))
    if (acceptingNow) {
      this.status = 'accepted'
      this.displayBranches = this.frontier.map((branch) => ({ ...branch, status: this._isAccept(branch.stateId) ? 'accepted' : 'running' }))
      return this._terminalResult('accepted')
    }

    const previous = this.frontier
    const outcomes: Branch[] = []
    const transitionIds: string[] = []
    let overflow = false

    outer: for (const branch of previous) {
      if (this._isReject(branch.stateId)) {
        outcomes.push({ ...branch, status: 'rejected' })
        continue
      }

      const applicable = this._applicable(branch)
      if (applicable.length === 0) {
        outcomes.push({ ...branch, status: 'rejected' })
        continue
      }

      for (const transition of applicable) {
        const child = this._apply(branch, transition)
        if (!child) {
          // A transition that attempts to leave [0, input.length] is a rejected
          // branch and, like the deterministic LBA, never fires or writes.
          outcomes.push({ ...branch, status: 'rejected' })
        } else {
          child.status = this._isAccept(child.stateId)
            ? 'accepted'
            : this._isReject(child.stateId)
              ? 'rejected'
              : 'running'
          outcomes.push(child)
          if (this.treeNodes.length < MAX_TREE_NODES) this.treeNodes.push(child)
          transitionIds.push(transition.id)
        }
        if (outcomes.length >= this.maxBranches) {
          overflow = true
          break outer
        }
      }
    }

    const accepting = outcomes.find((branch) => branch.status === 'accepted')
    if (overflow && !accepting) {
      this.status = 'stuck'
      this.frontier = outcomes.filter((branch) => branch.status === 'running')
      this.displayBranches = outcomes
      return this._result('stuck', previous, outcomes, transitionIds)
    }

    if (accepting) {
      this.status = 'accepted'
      this.frontier = outcomes.filter((branch) => branch.status === 'running')
      this.displayBranches = outcomes
      return this._result('accepted', previous, outcomes, transitionIds)
    }

    const live = outcomes.filter((branch) => branch.status === 'running')
    if (live.length === 0) {
      this.status = 'rejected'
      this.frontier = []
      this.displayBranches = outcomes
      return this._result('rejected', previous, outcomes, transitionIds)
    }

    this.status = 'running'
    this.frontier = live
    this.displayBranches = live
    return this._result('running', previous, live, transitionIds)
  }

  reset(): void {
    this.frontier = []
    this.displayBranches = []
    this.history = []
    this.status = 'idle'
    this.leftBound = 0
    this.rightBound = 0
    this.stepGuard = 0
    this.branchSeq = 0
    this.treeNodes = []
  }

  getCurrentConfigurations(): Configuration[] {
    return this.displayBranches.map((branch) => this._configuration(branch))
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

  /** Every branch created so far, with lineage suitable for the tree viewer. */
  getTreeNodes(): Configuration[] {
    return this.treeNodes.map((branch) => ({
      ...this._configuration(branch),
      status: this._isAccept(branch.stateId) ? 'accepted' : branch.status,
    }))
  }

  /** Current nondeterministic frontier; terminal runs have no live branches. */
  getLiveBranchIds(): string[] {
    return this.status === 'running' ? this.frontier.map((branch) => branch.id) : []
  }

  private _applicable(branch: Branch): Transition[] {
    const symbols = branch.heads.map((head, tape) => branch.tapes[tape].get(head) ?? this.blank)
    return this.definition.transitions.filter((transition) => {
      if (transition.from !== branch.stateId) return false
      const { reads } = tmTapeOps(transition, this.tapeCount)
      return reads.every((read, index) => (isBlank(read, this.blank) ? this.blank : read) === symbols[index])
    })
  }

  /** Returns null when the move would leave this LBA's linear tape region. */
  private _apply(branch: Branch, transition: Transition): Branch | null {
    const { writes, directions } = tmTapeOps(transition, this.tapeCount)
    const heads = branch.heads.map((head, index) => {
      const direction = directions[index]
      return direction === 'L' ? head - 1 : direction === 'R' ? head + 1 : head
    })
    if (heads.some((head) => head < this.leftBound || head > this.rightBound)) return null

    const tapes = branch.tapes.map((tape) => new Map(tape))
    const usedMin = [...branch.usedMin]
    const usedMax = [...branch.usedMax]
    for (let index = 0; index < this.tapeCount; index++) {
      const write = isBlank(writes[index], this.blank) ? this.blank : writes[index]
      const previous = tapes[index].get(branch.heads[index]) ?? this.blank
      if (isBlank(write, this.blank)) tapes[index].delete(branch.heads[index])
      else tapes[index].set(branch.heads[index], write)
      if (!isBlank(previous, this.blank) || !isBlank(write, this.blank)) {
        usedMin[index] = Math.min(usedMin[index], branch.heads[index])
        usedMax[index] = Math.max(usedMax[index], branch.heads[index])
      }
      usedMin[index] = Math.min(usedMin[index], heads[index])
      usedMax[index] = Math.max(usedMax[index], heads[index])
    }
    return {
      id: this._nextId(),
      parentId: branch.id,
      stateId: transition.to,
      tapes,
      heads,
      usedMin,
      usedMax,
      lastDirections: directions,
      status: 'running',
    }
  }

  private _result(
    status: SimulationStatus,
    previous: Branch[],
    displayed: Branch[],
    transitionIds: string[],
  ): StepResult {
    const primary = displayed.find((branch) => branch.status === 'accepted') ?? displayed[0] ?? previous[0]
    const configurations = displayed.map((branch) => this._configuration(branch))
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: this._stateIds(previous),
      toStateIds: this._stateIds(displayed),
      symbol: transitionIds.length > 0
        ? [...new Set(transitionIds.map((id) => this.definition.transitions.find((t) => t.id === id)).filter((t): t is Transition => t !== undefined).map((t) => formatTmTransition(t, this.tapeCount, this.blank)))].join(' | ')
        : '',
      transitionIds,
      status,
      inputIndex: primary?.heads[0] ?? 0,
      consumedInput: '',
      remainingInput: '',
      stack: [],
      tapes: primary ? this._snapshots(primary) : undefined,
    }
    this.history.push(entry)
    return {
      status,
      activeStateIds: this._stateIds(displayed),
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds,
      historyEntry: entry,
      configurations,
      stack: [],
      tapes: primary ? this._snapshots(primary) : undefined,
    }
  }

  private _terminalResult(status: SimulationStatus): StepResult {
    const configurations = this.getCurrentConfigurations()
    const primary = this.displayBranches.find((branch) => branch.status === 'accepted') ?? this.displayBranches[0]
    const activeStateIds = this._stateIds(this.displayBranches)
    return {
      status,
      activeStateIds,
      consumedInput: '',
      remainingInput: '',
      symbol: '',
      transitionIds: [],
      historyEntry: {
        step: this.history.length,
        fromStateIds: activeStateIds,
        toStateIds: activeStateIds,
        symbol: '',
        transitionIds: [],
        status,
      },
      configurations,
      stack: [],
      tapes: primary ? this._snapshots(primary) : undefined,
    }
  }

  private _configuration(branch: Branch): Configuration {
    return {
      id: branch.id,
      parentId: branch.parentId,
      stateId: branch.stateId,
      stack: [],
      inputIndex: branch.heads[0] ?? 0,
      status: branch.status,
      consumedInput: '',
      remainingInput: '',
      tapes: this._snapshots(branch),
    }
  }

  private _snapshots(branch: Branch): TapeSnapshot[] {
    return branch.tapes.map((_, index) => this._snapshotTape(branch, index))
  }

  private _snapshotTape(branch: Branch, tapeIndex: number): TapeSnapshot {
    const head = branch.heads[tapeIndex]
    const usedFrom = Math.min(branch.usedMin[tapeIndex], head) - WINDOW_PAD
    const usedTo = Math.max(branch.usedMax[tapeIndex], head) + WINDOW_PAD
    const from = Math.max(usedFrom, head - WINDOW_MAX_HALF)
    const to = Math.min(usedTo, head + WINDOW_MAX_HALF)
    const cells: string[] = []
    for (let index = from; index <= to; index++) cells.push(branch.tapes[tapeIndex].get(index) ?? this.blank)
    const snapshot: TapeSnapshot = {
      cells,
      head: head - from,
      left: from,
      leftBound: this.leftBound,
      rightBound: this.rightBound,
    }
    if (branch.lastDirections[tapeIndex]) snapshot.lastMove = branch.lastDirections[tapeIndex]
    return snapshot
  }

  private _stateIds(branches: Branch[]): string[] {
    return [...new Set(branches.map((branch) => branch.stateId))]
  }

  private _isAccept(stateId: string): boolean {
    return this.definition.states.find((state) => state.id === stateId)?.isAccept ?? false
  }

  private _isReject(stateId: string): boolean {
    return this.definition.states.find((state) => state.id === stateId)?.isReject ?? false
  }

  private _nextId(): string {
    return `b${this.branchSeq++}`
  }

  private _validLimit(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) && value! > 0 ? Math.floor(value!) : fallback
  }
}
