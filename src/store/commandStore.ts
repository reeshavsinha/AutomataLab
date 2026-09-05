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
  startTransition: () => void
  completeTransition: () => void
  transitionModeActive: boolean
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

export type CommandContext = 'global' | 'canvas' | 'simulation'

export interface CommandDefinition {
  id: string
  label: string
  shortcut: string
  /** Canonical individual keys used for conflict resolution; shortcut is display text. */
  shortcuts?: string[]
  contexts: CommandContext[]
  /** Higher priority wins when multiple context handlers are active. */
  priority: number
}

/** The discoverable shortcut contract shared by keyboard handlers and help text. */
export const COMMAND_REGISTRY: readonly CommandDefinition[] = [
  { id: 'file.new', label: 'New document', shortcut: 'Ctrl/Cmd+N', contexts: ['global'], priority: 100 },
  { id: 'file.open', label: 'Open document', shortcut: 'Ctrl/Cmd+O', contexts: ['global'], priority: 100 },
  { id: 'file.save', label: 'Save document', shortcut: 'Ctrl/Cmd+S', contexts: ['global'], priority: 100 },
  { id: 'canvas.add-state', label: 'Create state at canvas cursor', shortcut: 'N', contexts: ['canvas'], priority: 30 },
  { id: 'canvas.transition-start', label: 'Start transition from selected state', shortcut: 'T', contexts: ['canvas'], priority: 40 },
  { id: 'canvas.transition-complete', label: 'Complete transition to selected state', shortcut: 'S / Enter', shortcuts: ['S', 'Enter'], contexts: ['canvas'], priority: 50 },
  { id: 'canvas.delete', label: 'Delete selection', shortcut: 'Delete', contexts: ['canvas'], priority: 30 },
  { id: 'simulation.play', label: 'Play or pause simulation', shortcut: 'Space / P', shortcuts: ['Space', 'P'], contexts: ['simulation'], priority: 30 },
  { id: 'simulation.step', label: 'Advance simulation', shortcut: 'ArrowRight / S', shortcuts: ['ArrowRight', 'S'], contexts: ['simulation'], priority: 30 },
  { id: 'simulation.step-back', label: 'Step simulation back', shortcut: 'ArrowLeft', contexts: ['simulation'], priority: 30 },
  { id: 'simulation.reset', label: 'Reset simulation', shortcut: 'R', contexts: ['simulation'], priority: 30 },
  { id: 'global.cancel', label: 'Cancel current mode or dialog', shortcut: 'Escape', contexts: ['global', 'canvas', 'simulation'], priority: 100 },
]

export function findShortcutConflicts(commands: readonly CommandDefinition[] = COMMAND_REGISTRY): CommandDefinition[][] {
  const groups = new Map<string, CommandDefinition[]>()
  for (const command of commands) {
    for (const shortcut of command.shortcuts ?? [command.shortcut]) {
      const key = shortcut.toLowerCase()
      const group = groups.get(key) ?? []
      group.push(command)
      groups.set(key, group)
    }
  }
  return [...groups.values()].filter((group) => group.length > 1 && group.some((a) => group.some((b) => a !== b && a.contexts.some((context) => b.contexts.includes(context)))))
}

export function resolveCommand(shortcut: string, context: CommandContext, commands: readonly CommandDefinition[] = COMMAND_REGISTRY): CommandDefinition | null {
  return commands
    .filter((command) => (command.shortcuts ?? [command.shortcut]).some((key) => key.toLowerCase() === shortcut.toLowerCase()) && command.contexts.includes(context))
    .sort((a, b) => b.priority - a.priority)[0] ?? null
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
