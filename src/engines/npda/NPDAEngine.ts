// ============================================================
// AutomataLab — NPDA Engine
// Nondeterministic Pushdown Automaton simulation engine.
//
// Unlike the DPDA (single configuration), an NPDA explores ALL
// computation branches in lockstep, breadth-first: every step()
// advances each live branch by one transition, freely mixing
// ε-input moves and input-reading moves. Branches diverge whenever
// more than one transition applies — this is the nondeterminism.
//
// Acceptance: by FINAL STATE — the string is accepted as soon as ANY
// branch reaches an accept state with the input fully consumed.
// Transition format: (state, read, pop) → (state', push).
// Stack convention: the TOP of the stack is the LAST array element;
// the FIRST char of `push` ends up on top.
//
// Termination is guaranteed by three guards: per-step deduplication
// of identical configurations, a no-progress fixpoint check, and a
// hard step/stack ceiling for pathological ε-loops.
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
import type { TreeProvider } from '../core/computationTree'
import { buildConfig, getStartState, isEpsilon } from '../core/utils'

/** Max BFS layers before bailing out (guards non-terminating ε-loops). */
const DEFAULT_MAX_STEPS = 10_000
/** Drop any branch whose stack grows past this (guards ε-push loops). */
const MAX_STACK_DEPTH = 10_000

export class NPDAEngine implements Automaton, TreeProvider {
  private definition: MachineDefinition
  /** Live computation branches, explored in lockstep (one BFS layer per step). */
  private frontier: Configuration[] = []
  private inputChars: string[] = []
  private status: SimulationStatus = 'idle'
  private history: HistoryEntry[] = []
  private stepGuard: number = 0
  private branchSeq: number = 0
  /** Signature of the previous frontier — detects no-progress fixpoints. */
  private prevSig: string = ''
  /** Every branch ever created, in creation order — powers the computation tree. */
  private treeNodes: Configuration[] = []
  private readonly maxSteps: number

  constructor(definition: MachineDefinition, maxSteps: number = DEFAULT_MAX_STEPS) {
    this.definition = definition
    this.maxSteps = maxSteps
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }
    this.inputChars = input === '' ? [] : input.split('')
    this.branchSeq = 0
    const root = buildConfig({
      stateId: startState.id,
      inputChars: this.inputChars,
      inputIndex: 0,
      status: 'running',
      stack: [],
      parentId: null,
      id: this._nextId(),
    })
    this.frontier = [root]
    this.treeNodes = [root]
    this.status = 'running'
    this.history = []
    this.stepGuard = 0
    this.prevSig = this._sig(this.frontier)
  }

  step(): StepResult {
    if (this.status !== 'running') {
      return this._terminalResult(this.status === 'idle' ? 'stuck' : this.status)
    }

    this.stepGuard++
    if (this.stepGuard > this.maxSteps) {
      this.status = 'stuck'
      return this._terminalResult('stuck')
    }

    const prevFrontier = this.frontier

    // Accept the moment any live branch sits in an accept state with no input
    // left. (Only fires here for an immediately-accepting start config; later
    // acceptances are caught the step a branch is created — see below.)
    const acceptingNow = this._pickAccepting(prevFrontier)
    if (acceptingNow) {
      this.status = 'accepted'
      return this._result('accepted', prevFrontier, prevFrontier, acceptingNow, '', '', [])
    }

    // Expand every live branch by one transition (a single BFS layer).
    const children: Configuration[] = []
    const childReads: string[] = []
    const usedTransitionIds: string[] = []
    const seen = new Set<string>()
    for (const config of prevFrontier) {
      for (const t of this._applicable(config)) {
        const { child, readSym } = this._apply(config, t)
        if (child.stack.length > MAX_STACK_DEPTH) continue
        const key = this._key(child)
        if (seen.has(key)) continue // collapse identical branches reached this step
        seen.add(key)
        children.push(child)
        this.treeNodes.push(child) // record only branches that actually survive dedup
        childReads.push(readSym)
        usedTransitionIds.push(t.id)
      }
    }

    // Every branch is a dead end — no move applies anywhere.
    if (children.length === 0) {
      this.status = 'rejected'
      return this._result('rejected', prevFrontier, prevFrontier, this._pickPrimary(prevFrontier, null), '', '', [])
    }

    // No-progress fixpoint (e.g. a pure ε self-loop): reject rather than spin.
    const sig = this._sig(children)
    const acceptingChild = this._pickAccepting(children)
    if (sig === this.prevSig && !acceptingChild) {
      this.status = 'rejected'
      this.frontier = children
      this.prevSig = sig
      return this._result('rejected', prevFrontier, children, this._pickPrimary(children, null), '', '', usedTransitionIds)
    }

    this.prevSig = sig
    this.frontier = children

    const newStatus: SimulationStatus = acceptingChild ? 'accepted' : 'running'
    this.status = newStatus

    const primary = this._pickPrimary(children, acceptingChild)
    const primaryRead = childReads[children.indexOf(primary)] ?? ''

    return this._result(
      newStatus,
      prevFrontier,
      children,
      primary,
      primaryRead,
      this._historySymbol(childReads),
      usedTransitionIds,
    )
  }

  reset(): void {
    this.frontier = []
    this.inputChars = []
    this.status = 'idle'
    this.history = []
    this.stepGuard = 0
    this.branchSeq = 0
    this.prevSig = ''
    this.treeNodes = []
  }

  getCurrentConfigurations(): Configuration[] {
    if (this.frontier.length === 0) return []
    return this._orderForDisplay(this.frontier)
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
    return this.status === 'running' ? this.frontier.map((c) => c.id) : []
  }

  // ── Internals ──────────────────────────────────────────────

  private _isAccept(stateId: string): boolean {
    return this.definition.states.find((s) => s.id === stateId)?.isAccept ?? false
  }

  /** A configuration is accepting when it sits in an accept state with all input consumed. */
  private _isAcceptConfig(c: Configuration): boolean {
    return this._isAccept(c.stateId) && c.inputIndex >= this.inputChars.length
  }

  /** A transition applies when its read matches (or is ε) and its pop matches the stack top (or is ε). */
  private _applicable(config: Configuration): Transition[] {
    const top = config.stack.length > 0 ? config.stack[config.stack.length - 1] : null
    return this.definition.transitions.filter((t) => {
      if (t.from !== config.stateId) return false
      const read = t.read ?? ''
      const pop = t.pop ?? ''
      const readOk =
        isEpsilon(read) ||
        (config.inputIndex < this.inputChars.length && this.inputChars[config.inputIndex] === read)
      const popOk = isEpsilon(pop) || (top !== null && top === pop)
      return readOk && popOk
    })
  }

  /** Apply a transition to a branch, producing the child branch and the symbol it read (ε ⇒ ''). */
  private _apply(config: Configuration, t: Transition): { child: Configuration; readSym: string } {
    const read = t.read ?? ''
    const pop = t.pop ?? ''
    const push = t.push ?? ''
    const stack = [...config.stack]
    if (!isEpsilon(pop)) {
      stack.pop() // _applicable guarantees the top equals `pop`
    }
    if (!isEpsilon(push)) {
      // Push so the FIRST char of `push` ends up on top of the stack.
      for (let i = push.length - 1; i >= 0; i--) {
        stack.push(push[i])
      }
    }
    const consumes = !isEpsilon(read)
    const inputIndex = consumes ? config.inputIndex + 1 : config.inputIndex
    const child = buildConfig({
      stateId: t.to,
      inputChars: this.inputChars,
      inputIndex,
      status: 'running',
      stack,
      parentId: config.id,
      id: this._nextId(),
    })
    return { child, readSym: consumes ? read : '' }
  }

  /** The first branch sitting in an accept state with the whole input consumed, if any. */
  private _pickAccepting(configs: Configuration[]): Configuration | null {
    return (
      configs.find((c) => this._isAccept(c.stateId) && c.inputIndex >= this.inputChars.length) ?? null
    )
  }

  /** Representative branch for the single-tape / stack panels: accepting one, else the furthest along. */
  private _pickPrimary(configs: Configuration[], accepting: Configuration | null): Configuration {
    if (accepting) return accepting
    return configs.reduce((best, c) => (c.inputIndex > best.inputIndex ? c : best), configs[0])
  }

  /** Tag each branch's status for display and float the primary branch to index 0. */
  private _orderForDisplay(configs: Configuration[]): Configuration[] {
    if (configs.length === 0) return []
    const accepting = this._pickAccepting(configs)
    const primary = this._pickPrimary(configs, accepting)
    const decorated = configs.map((c) => ({
      ...c,
      status: (this._isAccept(c.stateId) && c.inputIndex >= this.inputChars.length
        ? 'accepted'
        : 'running') as SimulationStatus,
    }))
    return decorated.sort((a, b) => (a.id === primary.id ? -1 : b.id === primary.id ? 1 : 0))
  }

  /** Distinct input symbols consumed across the branches this step (ε if all were stack-only moves). */
  private _historySymbol(reads: string[]): string {
    const distinct = [...new Set(reads.filter((r) => r !== ''))]
    return distinct.length === 0 ? 'ε' : distinct.join(',')
  }

  private _key(c: Configuration): string {
    return `${c.stateId}\u0001${c.stack.join('\u0002')}\u0001${c.inputIndex}`
  }

  private _sig(configs: Configuration[]): string {
    return configs
      .map((c) => this._key(c))
      .sort()
      .join('\u0003')
  }

  private _nextId(): string {
    return `b${this.branchSeq++}`
  }

  /** Build and record a StepResult for a real step (one that advanced the frontier). */
  private _result(
    status: SimulationStatus,
    prevFrontier: Configuration[],
    newFrontier: Configuration[],
    primary: Configuration,
    primaryRead: string,
    historySymbol: string,
    transitionIds: string[],
  ): StepResult {
    const activeStateIds = [...new Set(newFrontier.map((c) => c.stateId))]
    const fromStateIds = [...new Set(prevFrontier.map((c) => c.stateId))]
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds,
      toStateIds: activeStateIds,
      symbol: transitionIds.length === 0 ? '' : historySymbol,
      transitionIds,
      status,
    }
    this.history.push(entry)
    return {
      status,
      activeStateIds,
      consumedInput: primary.consumedInput,
      remainingInput: primary.remainingInput,
      symbol: primaryRead,
      transitionIds,
      historyEntry: entry,
      configurations: this._orderForDisplay(newFrontier),
      stack: [...primary.stack],
    }
  }

  /** Build a no-op StepResult for a terminal engine (does NOT grow history). */
  private _terminalResult(status: SimulationStatus): StepResult {
    const primary = this.frontier.length > 0 ? this._pickPrimary(this.frontier, this._pickAccepting(this.frontier)) : null
    const activeStateIds = [...new Set(this.frontier.map((c) => c.stateId))]
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
      consumedInput: primary?.consumedInput ?? '',
      remainingInput: primary?.remainingInput ?? '',
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this._orderForDisplay(this.frontier),
      stack: primary ? [...primary.stack] : [],
    }
  }
}
