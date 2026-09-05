// ============================================================
// Simulation Store — Zustand
// Tracks the live simulation state: status, active states,
// input tape progress, and execution history.
// ============================================================

import { create } from 'zustand'
import type { Configuration, HistoryEntry, SimulationStatus, TapeSnapshot } from '@/engines/machine/core/types'

/**
 * Cap on retained history entries. The log appends one entry per step; on a long
 * run (a TM can take up to its step limit, ~10k) an unbounded array means an
 * O(n²) copy on every step plus an ever-growing DOM in the History panel. We
 * keep only the most recent window — older steps scroll out of view anyway, and
 * `stepCount` (not the array length) remains the source of truth for "how far".
 */
const MAX_HISTORY = 1000

/** Deduped union of id lists — used to accumulate the trace path. */
const unionIds = (...lists: string[][]): string[] => Array.from(new Set(lists.flat()))

interface SimulationStore {
  // State
  inputString: string
  activeStateIds: string[]
  activeTransitionIds: string[]
  consumedInput: string
  remainingInput: string
  currentSymbol: string
  outputTrace: string[]
  status: SimulationStatus
  history: HistoryEntry[]
  stepCount: number
  speed: number // 0.25 to 8

  // Per-branch configurations after the most recent step (computation tree / PDA).
  configurations: Configuration[]
  // Stack of the primary active configuration (drives the PDA stack panel). Empty for finite automata.
  activeStack: string[]
  // Tapes of the active configuration (drives the TM/LBA tape panel). Empty for non-TM machines.
  activeTapes: TapeSnapshot[]

  // Accumulated computation-tree branch nodes (NFA/ε-NFA/NPDA), with lineage.
  treeNodes: Configuration[]
  // Ids of the currently-live frontier branches (empty once the run ends).
  liveBranchIds: string[]

  // Trace overlay: the union of states/transitions the run has traversed. The
  // canvas highlights these once a run halts so the computation path is visible
  // — the exact path for deterministic machines, the explored sub-graph for
  // nondeterministic ones (UX audit THY-1).
  pathStateIds: string[]
  pathTransitionIds: string[]

  // Actions
  setInputString: (input: string) => void
  setSpeed: (speed: number) => void
  applyStepResult: (result: {
    activeStateIds: string[]
    activeTransitionIds: string[]
    consumedInput: string
    remainingInput: string
    currentSymbol: string
    outputTrace?: string[]
    status: SimulationStatus
    historyEntry: HistoryEntry
    configurations: Configuration[]
    activeStack: string[]
    activeTapes: TapeSnapshot[]
    treeNodes: Configuration[]
    liveBranchIds: string[]
  }) => void
  /**
   * Replace the whole sim state in one shot. Used by "step back", which rebuilds
   * a fresh engine and replays N−1 steps: applying each step individually would
   * fire N store updates (and N tree rebuilds) — O(n²) and a guaranteed freeze
   * from a high step count. The hook replays silently, then calls this once.
   */
  applyReplay: (full: {
    activeStateIds: string[]
    activeTransitionIds: string[]
    consumedInput: string
    remainingInput: string
    currentSymbol: string
    outputTrace: string[]
    status: SimulationStatus
    history: HistoryEntry[]
    stepCount: number
    configurations: Configuration[]
    activeStack: string[]
    activeTapes: TapeSnapshot[]
    treeNodes: Configuration[]
    liveBranchIds: string[]
  }) => void
  resetSimulation: () => void
  setStatus: (status: SimulationStatus) => void
  /** Publish an initialized engine configuration without recording a step. */
  setPreStepConfigurations: (configurations: Configuration[]) => void
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  inputString: '',
  activeStateIds: [],
  activeTransitionIds: [],
  consumedInput: '',
  remainingInput: '',
  currentSymbol: '',
  outputTrace: [],
  status: 'idle',
  history: [],
  stepCount: 0,
  speed: 1,
  configurations: [],
  activeStack: [],
  activeTapes: [],
  treeNodes: [],
  liveBranchIds: [],
  pathStateIds: [],
  pathTransitionIds: [],

  setInputString: (inputString) => set({ inputString }),

  setSpeed: (speed) => set({ speed }),

  applyStepResult: (result) =>
    set((s) => ({
      activeStateIds: result.activeStateIds,
      activeTransitionIds: result.activeTransitionIds,
      consumedInput: result.consumedInput,
      remainingInput: result.remainingInput,
      currentSymbol: result.currentSymbol,
      outputTrace: result.outputTrace ?? s.outputTrace,
      status: result.status,
      // Bounded ring: keep only the most recent MAX_HISTORY entries so the array
      // copy (and the History panel's DOM) stay constant-cost on long runs.
      history:
        s.history.length >= MAX_HISTORY
          ? [...s.history.slice(s.history.length - MAX_HISTORY + 1), result.historyEntry]
          : [...s.history, result.historyEntry],
      stepCount: s.stepCount + 1,
      configurations: result.configurations,
      activeStack: result.activeStack,
      activeTapes: result.activeTapes,
      treeNodes: result.treeNodes,
      liveBranchIds: result.liveBranchIds,
      pathStateIds: unionIds(s.pathStateIds, result.historyEntry.fromStateIds, result.historyEntry.toStateIds),
      pathTransitionIds: unionIds(s.pathTransitionIds, result.historyEntry.transitionIds),
    })),

  applyReplay: (full) =>
    set({
      activeStateIds: full.activeStateIds,
      activeTransitionIds: full.activeTransitionIds,
      consumedInput: full.consumedInput,
      remainingInput: full.remainingInput,
      currentSymbol: full.currentSymbol,
      outputTrace: full.outputTrace,
      status: full.status,
      history: full.history.length > MAX_HISTORY ? full.history.slice(-MAX_HISTORY) : full.history,
      stepCount: full.stepCount,
      configurations: full.configurations,
      activeStack: full.activeStack,
      activeTapes: full.activeTapes,
      treeNodes: full.treeNodes,
      liveBranchIds: full.liveBranchIds,
      pathStateIds: unionIds(...full.history.map((h) => [...h.fromStateIds, ...h.toStateIds])),
      pathTransitionIds: unionIds(...full.history.map((h) => h.transitionIds)),
    }),

  resetSimulation: () =>
    set({
      activeStateIds: [],
      activeTransitionIds: [],
      consumedInput: '',
      remainingInput: '',
      currentSymbol: '',
      outputTrace: [],
      status: 'idle',
      history: [],
      stepCount: 0,
      configurations: [],
      activeStack: [],
      activeTapes: [],
      treeNodes: [],
      liveBranchIds: [],
      pathStateIds: [],
      pathTransitionIds: [],
    }),

  setStatus: (status) => set({ status }),
  setPreStepConfigurations: (configurations) => {
    const primary = configurations[0]
    const tapes = primary?.tapes ?? []
    set({
      activeStateIds: Array.from(new Set(configurations.map((configuration) => configuration.stateId))),
      activeTransitionIds: [],
      consumedInput: primary?.consumedInput ?? '',
      remainingInput: primary?.remainingInput ?? '',
      currentSymbol: tapes[0] ? tapes[0].cells[tapes[0].head] ?? '' : '',
      configurations,
      activeStack: primary?.stack ?? [],
      activeTapes: tapes,
      treeNodes: [],
      liveBranchIds: configurations.filter((configuration) => configuration.status === 'running').map((configuration) => configuration.id),
      status: 'running',
    })
  },
}))
