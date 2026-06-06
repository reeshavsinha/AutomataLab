// ============================================================
// UI Store — Zustand
// Tracks UI state: selected elements, panel visibility, theme, clipboard.
// ============================================================

import { create } from 'zustand'

export type Theme = 'dark' | 'light'
export type ActivePanel = 'history' | 'validation' | 'info'

export interface ClipboardData {
  states: {
    label: string
    x: number
    y: number
    isAccept: boolean
    isStart: boolean
    isText?: boolean
    oldId: string
  }[]
  transitions: {
    oldFrom: string
    oldTo: string
    symbols: string[]
  }[]
}

interface UIStore {
  // State
  theme: Theme
  selectedStateIds: string[]
  selectedTransitionIds: string[]
  activePanel: ActivePanel
  isEditingTransition: string | null // transition id being edited
  renamingStateId: string | null
  clipboard: ClipboardData | null

  // Actions
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setSelectedStateIds: (ids: string[]) => void
  setSelectedTransitionIds: (ids: string[]) => void
  selectState: (id: string | null) => void
  selectTransition: (id: string | null) => void
  setActivePanel: (panel: ActivePanel) => void
  setEditingTransition: (id: string | null) => void
  startRenaming: (id: string) => void
  stopRenaming: () => void
  clearSelection: () => void
  setClipboard: (data: ClipboardData | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'dark',
  selectedStateIds: [],
  selectedTransitionIds: [],
  activePanel: 'history',
  isEditingTransition: null,
  renamingStateId: null,
  clipboard: null,

  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  setTheme: (theme) => set({ theme }),

  setSelectedStateIds: (ids) => set({ selectedStateIds: ids }),
  setSelectedTransitionIds: (ids) => set({ selectedTransitionIds: ids }),

  selectState: (selectedStateId) =>
    set({
      selectedStateIds: selectedStateId ? [selectedStateId] : [],
      selectedTransitionIds: [],
    }),

  selectTransition: (selectedTransitionId) =>
    set({
      selectedTransitionIds: selectedTransitionId ? [selectedTransitionId] : [],
      selectedStateIds: [],
    }),

  setActivePanel: (activePanel) => set({ activePanel }),

  setEditingTransition: (isEditingTransition) => set({ isEditingTransition }),

  startRenaming: (id) => set({ renamingStateId: id }),

  stopRenaming: () => set({ renamingStateId: null }),

  clearSelection: () =>
    set({ selectedStateIds: [], selectedTransitionIds: [] }),

  setClipboard: (clipboard) => set({ clipboard }),
}))
