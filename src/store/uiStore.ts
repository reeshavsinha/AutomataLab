// ============================================================
// UI Store — Zustand
// Tracks UI state: selected elements, panel visibility, theme, clipboard.
// ============================================================

import { create } from 'zustand'

export type Theme = 'dark' | 'light'
export type ActivePanel = 'history' | 'validation' | 'info' | 'stack' | 'tree' | 'tape' | 'delta'

const THEME_KEY = 'automatalab-theme'

/** Read the persisted theme, defaulting to light (the app's original look). */
function getInitialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'light'
}

function persistTheme(theme: Theme) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_KEY, theme)
  }
}

export interface ClipboardData {
  states: {
    label: string
    x: number
    y: number
    isAccept: boolean
    isStart: boolean
    isText?: boolean
    /** TM/LBA — preserved so copy/paste keeps reject states. */
    isReject?: boolean
    oldId: string
  }[]
  transitions: {
    oldFrom: string
    oldTo: string
    symbols: string[]
    /** PDA fields — preserved so copy/paste keeps stack operations. */
    read?: string
    pop?: string
    push?: string
    /** TM/LBA fields — preserved so copy/paste keeps the tape move. */
    write?: string
    direction?: 'L' | 'R' | 'S'
    /** Multi-tape TM fields — per-tape read/write/direction. */
    reads?: string[]
    writes?: string[]
    directions?: ('L' | 'R' | 'S')[]
  }[]
}

interface UIStore {
  // State
  theme: Theme
  selectedStateIds: string[]
  selectedTransitionIds: string[]
  activePanel: ActivePanel
  isEditingTransition: string | null // transition id being edited
  // State id whose outgoing-transitions modal is open (used for PDA editing), or null.
  transitionEditorStateId: string | null
  renamingStateId: string | null
  clipboard: ClipboardData | null
  /** Bumped to ask the canvas to fit/frame all nodes (e.g. after auto-layout). */
  fitViewNonce: number
  /** Set to ask the canvas to pan to + highlight a specific element (e.g. when a
      validation row or δ-table row is clicked). The `nonce` makes repeat clicks
      on the same element re-trigger the pan. */
  focusRequest: { kind: 'state' | 'transition'; id: string; nonce: number } | null

  // Actions
  toggleTheme: () => void
  requestFitView: () => void
  requestFocus: (kind: 'state' | 'transition', id: string) => void
  setTheme: (theme: Theme) => void
  setSelectedStateIds: (ids: string[]) => void
  setSelectedTransitionIds: (ids: string[]) => void
  selectState: (id: string | null) => void
  selectTransition: (id: string | null) => void
  setActivePanel: (panel: ActivePanel) => void
  setEditingTransition: (id: string | null) => void
  openTransitionEditor: (stateId: string) => void
  closeTransitionEditor: () => void
  startRenaming: (id: string) => void
  stopRenaming: () => void
  clearSelection: () => void
  setClipboard: (data: ClipboardData | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: getInitialTheme(),
  selectedStateIds: [],
  selectedTransitionIds: [],
  activePanel: 'history',
  isEditingTransition: null,
  transitionEditorStateId: null,
  renamingStateId: null,
  clipboard: null,
  fitViewNonce: 0,
  focusRequest: null,

  requestFitView: () => set((s) => ({ fitViewNonce: s.fitViewNonce + 1 })),

  requestFocus: (kind, id) =>
    set((s) => ({ focusRequest: { kind, id, nonce: (s.focusRequest?.nonce ?? 0) + 1 } })),

  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark'
      persistTheme(theme)
      return { theme }
    }),

  setTheme: (theme) => {
    persistTheme(theme)
    set({ theme })
  },

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

  openTransitionEditor: (transitionEditorStateId) => set({ transitionEditorStateId }),
  closeTransitionEditor: () => set({ transitionEditorStateId: null }),

  startRenaming: (id) => set({ renamingStateId: id }),

  stopRenaming: () => set({ renamingStateId: null }),

  clearSelection: () =>
    set({ selectedStateIds: [], selectedTransitionIds: [] }),

  setClipboard: (clipboard) => set({ clipboard }),
}))
