// ============================================================
// Simulation Store — Zustand
// Tracks the live simulation state: status, active states,
// input tape progress, and execution history.
// ============================================================

import { create } from 'zustand'
import type { Configuration, HistoryEntry, SimulationStatus, TapeSnapshot } from '@/engines/core/types'

/**
 * Cap on retained history entries. The log appends one entry per step; on a long
 * run (a TM can take up to its step limit, ~10k) an unbounded array means an
 * O(n²) copy on every step plus an ever-growing DOM in the History panel. We
 * keep only the most recent window — older steps scroll out of view anyway, and
 * `stepCount` (not the array length) remains the source of truth for "how far".
 */
const MAX_HISTORY = 1000

interface SimulationStore {
  // State
  inputString: string
  activeStateIds: string[]
  activeTransitionIds: string[]
  consumedInput: string
  remainingInput: string
  currentSymbol: string
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

  // Actions
  setInputString: (input: string) => void
  setSpeed: (speed: number) => void
  applyStepResult: (result: {
    activeStateIds: string[]
    activeTransitionIds: string[]
    consumedInput: string
    remainingInput: string
    currentSymbol: string
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
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  inputString: '',
  activeStateIds: [],
  activeTransitionIds: [],
  consumedInput: '',
  remainingInput: '',
  currentSymbol: '',
  status: 'idle',
  history: [],
  stepCount: 0,
  speed: 1,
  configurations: [],
  activeStack: [],
  activeTapes: [],
  treeNodes: [],
  liveBranchIds: [],

  setInputString: (inputString) => set({ inputString }),

  setSpeed: (speed) => set({ speed }),

  applyStepResult: (result) =>
    set((s) => ({
      activeStateIds: result.activeStateIds,
      activeTransitionIds: result.activeTransitionIds,
      consumedInput: result.consumedInput,
      remainingInput: result.remainingInput,
      currentSymbol: result.currentSymbol,
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
    })),

  applyReplay: (full) =>
    set({
      activeStateIds: full.activeStateIds,
      activeTransitionIds: full.activeTransitionIds,
      consumedInput: full.consumedInput,
      remainingInput: full.remainingInput,
      currentSymbol: full.currentSymbol,
      status: full.status,
      history: full.history.length > MAX_HISTORY ? full.history.slice(-MAX_HISTORY) : full.history,
      stepCount: full.stepCount,
      configurations: full.configurations,
      activeStack: full.activeStack,
      activeTapes: full.activeTapes,
      treeNodes: full.treeNodes,
      liveBranchIds: full.liveBranchIds,
    }),

  resetSimulation: () =>
    set({
      activeStateIds: [],
      activeTransitionIds: [],
      consumedInput: '',
      remainingInput: '',
      currentSymbol: '',
      status: 'idle',
      history: [],
      stepCount: 0,
      configurations: [],
      activeStack: [],
      activeTapes: [],
      treeNodes: [],
      liveBranchIds: [],
    }),

  setStatus: (status) => set({ status }),
}))
