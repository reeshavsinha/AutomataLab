// ============================================================
// UI Store — Zustand
// Tracks UI state: selected elements, panel visibility, theme, clipboard.
// ============================================================

import { create } from 'zustand'

export type Theme = 'dark' | 'light'
export type ActivePanel = 'history' | 'validation' | 'info' | 'stack' | 'tree' | 'tape' | 'delta'
/** Top-level modal dialogs that can be opened from both the menu bar and toolbar. */
export type ModalKind = 'help' | 'export' | 'convert' | 'batch' | 'analysis'

const THEME_KEY = 'automatalab-theme'
const PANEL_KEY = 'automatalab-active-panel'
const COLLAPSE_KEY = 'automatalab-panel-collapsed'
const ALL_PANELS: ActivePanel[] = ['history', 'validation', 'info', 'stack', 'tree', 'tape', 'delta']

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

/** Last-used panel persists across sessions; defaults to δ (the machine
    definition) rather than the empty History tab (UX audit NAV-1). */
function getInitialPanel(): ActivePanel {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(PANEL_KEY)
    if (saved && (ALL_PANELS as string[]).includes(saved)) return saved as ActivePanel
  }
  return 'delta'
}

function getInitialCollapsed(): boolean {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(COLLAPSE_KEY) === '1'
  return false
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
  /** Whether the right side panel is collapsed to a thin reopen strip. */
  panelCollapsed: boolean
  isEditingTransition: string | null // transition id being edited
  // State id whose outgoing-transitions modal is open (used for PDA editing), or null.
  transitionEditorStateId: string | null
  renamingStateId: string | null
  clipboard: ClipboardData | null
  /** Which top-level modal dialog is open (help / export / convert), or null. */
  activeModal: ModalKind | null
  /** Bumped to ask the canvas to fit/frame all nodes (e.g. after auto-layout). */
  fitViewNonce: number
  /** Set to ask the canvas to pan to + highlight a specific element (e.g. when a
      validation row or δ-table row is clicked). The `nonce` makes repeat clicks
      on the same element re-trigger the pan. */
  focusRequest: { kind: 'state' | 'transition'; id: string; nonce: number } | null
  /** Transient visual states for Reachability Analysis (unreachable, dead, sink) */
  analysisHighlights: Record<string, 'unreachable' | 'dead' | 'sink'>

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
  togglePanel: () => void
  setPanelCollapsed: (collapsed: boolean) => void
  setEditingTransition: (id: string | null) => void
  openTransitionEditor: (stateId: string) => void
  closeTransitionEditor: () => void
  startRenaming: (id: string) => void
  stopRenaming: () => void
  clearSelection: () => void
  setClipboard: (data: ClipboardData | null) => void
  openModal: (kind: ModalKind) => void
  closeModal: () => void
  setAnalysisHighlights: (highlights: Record<string, 'unreachable' | 'dead' | 'sink'>) => void
  clearAnalysisHighlights: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: getInitialTheme(),
  selectedStateIds: [],
  selectedTransitionIds: [],
  activePanel: getInitialPanel(),
  panelCollapsed: getInitialCollapsed(),
  isEditingTransition: null,
  transitionEditorStateId: null,
  renamingStateId: null,
  clipboard: null,
  activeModal: null,
  fitViewNonce: 0,
  focusRequest: null,
  analysisHighlights: {},

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

  setActivePanel: (activePanel) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PANEL_KEY, activePanel)
    set({ activePanel })
  },

  togglePanel: () =>
    set((s) => {
      const panelCollapsed = !s.panelCollapsed
      if (typeof localStorage !== 'undefined') localStorage.setItem(COLLAPSE_KEY, panelCollapsed ? '1' : '0')
      return { panelCollapsed }
    }),

  setPanelCollapsed: (panelCollapsed) =>
    set((s) => {
      if (s.panelCollapsed === panelCollapsed) return s;
      if (typeof localStorage !== 'undefined') localStorage.setItem(COLLAPSE_KEY, panelCollapsed ? '1' : '0')
      return { panelCollapsed }
    }),

  setEditingTransition: (isEditingTransition) => set({ isEditingTransition }),

  openTransitionEditor: (transitionEditorStateId) => set({ transitionEditorStateId }),
  closeTransitionEditor: () => set({ transitionEditorStateId: null }),

  startRenaming: (id) => set({ renamingStateId: id }),

  stopRenaming: () => set({ renamingStateId: null }),

  clearSelection: () =>
    set({ 
      selectedStateIds: [], 
      selectedTransitionIds: [],
      isEditingTransition: null,
      transitionEditorStateId: null,
      renamingStateId: null
    }),

  setClipboard: (clipboard) => set({ clipboard }),

  openModal: (kind) => set({ activeModal: kind }),
  closeModal: () => set({ activeModal: null, analysisHighlights: {} }),

  setAnalysisHighlights: (analysisHighlights) => set({ analysisHighlights }),
  clearAnalysisHighlights: () => set({ analysisHighlights: {} }),
}))
