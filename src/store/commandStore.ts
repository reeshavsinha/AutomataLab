// ============================================================
// Command Store — Zustand
// A small command bus so the classic MenuBar / Toolbar can invoke
// canvas-editing and simulation actions that physically live inside
// the AutomataCanvas and SimulationControls components (which own the
// React Flow instance and the single simulation engine, respectively).
//
// Each owner registers its handlers on mount via `setCanvasApi` /
// `setSimApi`; the menu/toolbar read them here and call through. This
// keeps the single-engine invariant (only SimulationControls calls
// useSimulation) while letting the chrome drive it.
// ============================================================

import { create } from 'zustand'

export interface CanvasApi {
  copy: () => void
  cut: () => void
  paste: () => void
  deleteSelection: () => void
  selectAll: () => void
  addState: () => void
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  hasSelection: boolean
  hasClipboard: boolean
}

export interface SimApi {
  /** Toggle play/pause. */
  play: () => void
  step: () => void
  stepBack: () => void
  seekTo: (target: number) => void
  reset: () => void
  isPlaying: boolean
}

interface CommandStore {
  canvas: CanvasApi | null
  sim: SimApi | null
  setCanvasApi: (api: CanvasApi | null) => void
  setSimApi: (api: SimApi | null) => void
}

export const useCommandStore = create<CommandStore>((set) => ({
  canvas: null,
  sim: null,
  setCanvasApi: (canvas) => set({ canvas }),
  setSimApi: (sim) => set({ sim }),
}))
