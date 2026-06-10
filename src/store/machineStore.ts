// ============================================================
// Machine Store — Zustand
// Holds the machine definition: states, transitions, type, name.
// Includes a snapshot-based undo/redo history for the active tab.
// ============================================================

import { create } from 'zustand'
import { generateId } from '@/engines/core/utils'
import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/core/types'

/** Max snapshots kept in the undo stack. */
const MAX_HISTORY = 100
/** Edits sharing a coalesce key within this window collapse into one undo step. */
const COALESCE_MS = 500

interface MachineStore {
  // Tabs
  tabs: MachineDefinition[]
  activeTabIndex: number

  // Unsaved-changes tracking, keyed by tab id
  dirtyTabs: Record<string, boolean>

  // Source file path for each tab (Tauri only), keyed by tab id. Drives
  // "Save" (write in place) vs "Save As" (pick a new path).
  tabPaths: Record<string, string>

  // State (Active Tab)
  machine: MachineDefinition

  // Undo/redo snapshots for the active tab (cleared on tab switch / load).
  past: MachineDefinition[]
  future: MachineDefinition[]
  // Internal coalescing bookkeeping (groups rapid same-kind edits).
  _lastCoalesceKey: string | null
  _lastEditAt: number

  // Actions — Tabs
  addTab: () => void
  switchTab: (index: number) => void
  closeTab: (index: number) => void
  markTabSaved: (index: number, path?: string | null) => void

  // Actions — History
  undo: () => void
  redo: () => void

  // Actions — Machine
  setMachineName: (name: string) => void
  setMachineType: (type: MachineType) => void

  // Actions — States
  addState: (x: number, y: number) => AutomataState
  addTextState: (x: number, y: number) => AutomataState
  updateState: (id: string, patch: Partial<AutomataState>) => void
  deleteState: (id: string) => void
  setStartState: (id: string) => void
  toggleAcceptState: (id: string) => void

  // Actions — Transitions
  addTransition: (from: string, to: string, symbols: string[]) => Transition
  updateTransition: (id: string, patch: Partial<Transition>) => void
  deleteTransition: (id: string) => void
  setAlphabet: (alphabet: string[]) => void

  // Actions — File
  loadMachine: (def: MachineDefinition, markClean?: boolean, path?: string | null) => void
  /**
   * Open a loaded machine the way a desktop editor would: reuse the current tab
   * if it's a pristine, untouched "Untitled" tab, otherwise open it in a new tab
   * so existing work is never clobbered. Returns the resulting tab index.
   */
  openMachine: (def: MachineDefinition, path?: string | null) => number
  resetMachine: () => void
}

/** A tab is "pristine" when it has no diagram content yet (safe to reuse on open). */
export function isPristineTab(m: MachineDefinition): boolean {
  return m.states.length === 0 && m.transitions.length === 0
}

const createDefaultMachine = (): MachineDefinition => ({
  id: generateId('machine'),
  name: 'Untitled Machine',
  type: 'DFA',
  language: '',
  states: [],
  transitions: [],
  alphabet: [],
})

// Helper to update both the active machine and the corresponding tab.
// Any edit routed through here flags the active tab as dirty AND records an
// undo snapshot (with optional coalescing for rapid same-kind edits).
const sync = (
  s: MachineStore,
  patch: Partial<MachineDefinition>,
  coalesceKey?: string
): Partial<MachineStore> => {
  const prev = s.machine
  const updatedMachine = { ...prev, ...patch }
  const newTabs = [...s.tabs]
  newTabs[s.activeTabIndex] = updatedMachine

  const now = Date.now()
  const coalesce =
    coalesceKey != null &&
    coalesceKey === s._lastCoalesceKey &&
    now - s._lastEditAt < COALESCE_MS
  const past = coalesce ? s.past : [...s.past, prev].slice(-MAX_HISTORY)

  return {
    machine: updatedMachine,
    tabs: newTabs,
    dirtyTabs: { ...s.dirtyTabs, [updatedMachine.id]: true },
    past,
    future: [],
    _lastCoalesceKey: coalesceKey ?? null,
    _lastEditAt: now,
  }
}

// Clears the undo/redo history (used when the editing context changes).
const freshHistory = () => ({
  past: [] as MachineDefinition[],
  future: [] as MachineDefinition[],
  _lastCoalesceKey: null,
  _lastEditAt: 0,
})

export const useMachineStore = create<MachineStore>((set, get) => {
  const initialMachine = createDefaultMachine()

  return {
    tabs: [initialMachine],
    activeTabIndex: 0,
    dirtyTabs: {},
    tabPaths: {},
    machine: initialMachine,
    past: [],
    future: [],
    _lastCoalesceKey: null,
    _lastEditAt: 0,

    addTab: () => {
      const newMachine = createDefaultMachine()
      set((s) => ({
        tabs: [...s.tabs, newMachine],
        activeTabIndex: s.tabs.length,
        machine: newMachine,
        ...freshHistory(),
      }))
    },

    switchTab: (index) => {
      set((s) => {
        if (index < 0 || index >= s.tabs.length) return {}
        return {
          activeTabIndex: index,
          machine: s.tabs[index],
          ...freshHistory(),
        }
      })
    },

    closeTab: (index) => {
      set((s) => {
        const closedId = s.tabs[index]?.id
        const dirtyTabs = { ...s.dirtyTabs }
        const tabPaths = { ...s.tabPaths }
        if (closedId) {
          delete dirtyTabs[closedId]
          delete tabPaths[closedId]
        }

        const newTabs = [...s.tabs]
        newTabs.splice(index, 1)

        // If it's the last tab being closed, create a fresh one
        if (newTabs.length === 0) {
          const freshMachine = createDefaultMachine()
          return {
            tabs: [freshMachine],
            activeTabIndex: 0,
            machine: freshMachine,
            dirtyTabs,
            tabPaths,
            ...freshHistory(),
          }
        }

        // Adjust active index if necessary
        const newActiveIndex = index >= newTabs.length ? newTabs.length - 1 : index
        return {
          tabs: newTabs,
          activeTabIndex: newActiveIndex,
          machine: newTabs[newActiveIndex],
          dirtyTabs,
          tabPaths,
          ...freshHistory(),
        }
      })
    },

    markTabSaved: (index, path) => set((s) => {
      const tab = s.tabs[index]
      if (!tab) return {}
      return {
        dirtyTabs: { ...s.dirtyTabs, [tab.id]: false },
        tabPaths: path != null ? { ...s.tabPaths, [tab.id]: path } : s.tabPaths,
      }
    }),

    undo: () => set((s) => {
      if (s.past.length === 0) return {}
      const previous = s.past[s.past.length - 1]
      const current = s.machine
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = previous
      return {
        machine: previous,
        tabs: newTabs,
        past: s.past.slice(0, -1),
        future: [current, ...s.future].slice(0, MAX_HISTORY),
        dirtyTabs: { ...s.dirtyTabs, [previous.id]: true },
        _lastCoalesceKey: null,
        _lastEditAt: 0,
      }
    }),

    redo: () => set((s) => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      const current = s.machine
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = next
      return {
        machine: next,
        tabs: newTabs,
        past: [...s.past, current].slice(-MAX_HISTORY),
        future: s.future.slice(1),
        dirtyTabs: { ...s.dirtyTabs, [next.id]: true },
        _lastCoalesceKey: null,
        _lastEditAt: 0,
      }
    }),

    setMachineName: (name) => set((s) => sync(s, { name }, 'name')),

    setMachineType: (type) => set((s) => sync(s, { type })),

    addState: (x, y) => {
      const stateCount = get().machine.states.length
      const newState: AutomataState = {
        id: generateId('state'),
        label: `q${stateCount}`,
        x,
        y,
        isStart: stateCount === 0,
        isAccept: false,
      }
      set((s) => sync(s, { states: [...s.machine.states, newState] }))
      return newState
    },

    addTextState: (x, y) => {
      const newTextState: AutomataState = {
        id: generateId('text'),
        label: 'Double-click to edit text',
        x,
        y,
        isStart: false,
        isAccept: false,
        isText: true,
        width: 190,
        height: 56,
      }
      set((s) => sync(s, { states: [...s.machine.states, newTextState] }))
      return newTextState
    },

    updateState: (id, patch) =>
      set((s) => sync(s, {
        states: s.machine.states.map((st) =>
          st.id === id ? { ...st, ...patch } : st
        )
      })),

    deleteState: (id) =>
      set((s) => sync(s, {
        states: s.machine.states.filter((st) => st.id !== id),
        transitions: s.machine.transitions.filter(
          (t) => t.from !== id && t.to !== id
        ),
      })),

    setStartState: (id) =>
      set((s) => sync(s, {
        states: s.machine.states.map((st) => ({
          ...st,
          isStart: st.id === id,
        }))
      })),

    toggleAcceptState: (id) =>
      set((s) => sync(s, {
        states: s.machine.states.map((st) =>
          st.id === id ? { ...st, isAccept: !st.isAccept } : st
        )
      })),

    addTransition: (from, to, symbols) => {
      const newTransition: Transition = {
        id: generateId('trans'),
        from,
        to,
        symbols,
      }
      set((s) => sync(s, { transitions: [...s.machine.transitions, newTransition] }))
      return newTransition
    },

    updateTransition: (id, patch) =>
      set((s) => sync(s, {
        transitions: s.machine.transitions.map((t) =>
          t.id === id ? { ...t, ...patch } : t
        )
      }, `transition:${id}`)),

    deleteTransition: (id) =>
      set((s) => sync(s, {
        transitions: s.machine.transitions.filter((t) => t.id !== id)
      })),

    setAlphabet: (alphabet) =>
      set((s) => sync(s, { alphabet })),

    loadMachine: (def, markClean = true, path) => set((s) => {
      // Overwrite current tab
      const prevId = s.tabs[s.activeTabIndex]?.id
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = def

      const dirtyTabs = { ...s.dirtyTabs }
      const tabPaths = { ...s.tabPaths }
      // Drop the replaced machine's bookkeeping when its id actually changes
      // (e.g. opening a file). In-place reloads (auto-layout) keep the same id.
      if (prevId && prevId !== def.id) {
        delete dirtyTabs[prevId]
        delete tabPaths[prevId]
      }
      dirtyTabs[def.id] = !markClean
      // `path === undefined` means "leave the path untouched" (in-place reload);
      // `path === null` explicitly clears it (e.g. a brand-new untitled machine).
      if (path !== undefined) {
        if (path) tabPaths[def.id] = path
        else delete tabPaths[def.id]
      }

      return {
        machine: def,
        tabs: newTabs,
        dirtyTabs,
        tabPaths,
        ...freshHistory(),
      }
    }),

    openMachine: (def, path) => {
      const s = get()
      const current = s.machine
      const reuse = isPristineTab(current) && !s.dirtyTabs[current.id]
      if (!reuse) get().addTab()
      get().loadMachine(def, true, path ?? null)
      return get().activeTabIndex
    },

    resetMachine: () => set((s) => {
      const prevId = s.tabs[s.activeTabIndex]?.id
      const freshMachine = createDefaultMachine()
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = freshMachine
      const tabPaths = { ...s.tabPaths }
      if (prevId) delete tabPaths[prevId]
      return {
        machine: freshMachine,
        tabs: newTabs,
        dirtyTabs: { ...s.dirtyTabs, [freshMachine.id]: false },
        tabPaths,
        ...freshHistory(),
      }
    }),
  }
})
