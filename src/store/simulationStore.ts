// ============================================================
// Simulation Store — Zustand
// Tracks the live simulation state: status, active states,
// input tape progress, and execution history.
// ============================================================

import { create } from 'zustand'
import type { HistoryEntry, SimulationStatus } from '@/engines/core/types'

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
      history: [...s.history, result.historyEntry],
      stepCount: s.stepCount + 1,
    })),

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
    }),

  setStatus: (status) => set({ status }),
}))
