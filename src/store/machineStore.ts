// ============================================================
// Machine Store — Zustand
// Holds the machine definition: states, transitions, type, name.
// Includes a snapshot-based undo/redo history for the active tab.
// ============================================================

import { create } from 'zustand'
import { generateId, EPSILON } from '@/engines/machine/core/utils'
import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/machine/core/types'

/** Max snapshots kept in the undo stack. */
const MAX_HISTORY = 100
/** Edits sharing a coalesce key within this window collapse into one undo step. */
const COALESCE_MS = 500

interface MachineStore {
  tabs: MachineDefinition[]
  activeTabIndex: number
  dirtyTabs: Record<string, boolean>
  tabPaths: Record<string, string>
  tabRoutes: Record<string, string>
  machine: MachineDefinition

  addTab: (type?: MachineType) => void
  switchTab: (index: number) => void
  closeTab: (index: number) => void
  closeMultipleTabs: (indices: number[]) => void
  duplicateTabs: (indices: number[]) => void
  reorderTab: (fromIndex: number, toIndex: number) => void
  markTabSaved: (index: number, path?: string | null) => void
  renameTab: (index: number, name: string) => void

  undo: () => void
  redo: () => void

  setMachineName: (name: string) => void
  setMachineType: (type: MachineType) => void

  addState: (x: number, y: number) => AutomataState
  addTextState: (x: number, y: number) => AutomataState
  updateState: (id: string, patch: Partial<AutomataState>) => void
  deleteState: (id: string) => void
  setStartState: (id: string) => void
  toggleAcceptState: (id: string) => void
  toggleRejectState: (id: string) => void

  // Actions — Transitions
  addTransition: (from: string, to: string, symbols: string[]) => Transition
  updateTransition: (id: string, patch: Partial<Transition>) => void
  deleteTransition: (id: string) => void
  setAlphabet: (alphabet: string[]) => void
  /** PDA only — set the declared stack alphabet Γ (empty clears it). */
  setStackAlphabet: (alphabet: string[]) => void
  /** TM/LBA only — set the declared tape alphabet Γ (empty clears it). */
  setTapeAlphabet: (alphabet: string[]) => void
  /** DFA only: add an explicit trap/dead state and route every missing
      (state, symbol) move to it, making the DFA total (UX audit #10). */
  completeDFA: () => void

  // Actions — TM/LBA settings
  setBlankSymbol: (symbol: string) => void
  setStepLimit: (limit: number | undefined) => void
  setTapeCount: (count: number) => void

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
  if (m.type === 'CFG' || m.type === 'CSG' || m.type === 'REG') {
    return !m.grammarText || m.grammarText.trim().length === 0
  }
  if (m.type === 'CFG_PARSER') {
    return (!m.grammarText || m.grammarText.trim().length === 0) && (!m.parserInput || m.parserInput.trim().length === 0)
  }
  return m.states.length === 0 && m.transitions.length === 0
}

const createDefaultMachine = (type?: MachineType): MachineDefinition => {
  const name = type === 'CFG_PARSER' ? 'Untitled Parser'
    : type === 'REG' ? 'Untitled Regex'
    : (type === 'CFG' || type === 'CSG') ? 'Untitled Grammar'
    : 'Untitled Machine'
  return {
    id: generateId('machine'),
    name,
    type: type ?? 'DFA',
    language: '',
    states: [],
    transitions: [],
    alphabet: [],
  }
}

// Helper to update both the active machine and the corresponding tab.
// Any edit routed through here flags the active tab as dirty AND records an
// undo snapshot via historyStore.
import { useHistoryStore } from './historyStore'
import { useUIStore } from './uiStore'

const sync = (
  s: MachineStore,
  patch: Partial<MachineDefinition>,
  coalesceKey?: string
): Partial<MachineStore> => {
  const prev = s.machine
  const updatedMachine = { ...prev, ...patch }
  const newTabs = [...s.tabs]
  newTabs[s.activeTabIndex] = updatedMachine

  // Push to history store
  useHistoryStore.getState().pushState('machine', updatedMachine.id, prev, coalesceKey)

  return {

    machine: updatedMachine,
    tabs: newTabs,
    dirtyTabs: { ...s.dirtyTabs, [updatedMachine.id]: true }
  }
}

// Clears the undo/redo history (used when the editing context changes or tab closed).
const clearHistory = (id: string) => {
  useHistoryStore.getState().clear('machine', id)
}

export const useMachineStore = create<MachineStore>((set, get) => {
  return {
    tabs: [],
    activeTabIndex: -1,
    dirtyTabs: {},
    tabPaths: {},
    tabRoutes: {},
    machine: null as unknown as MachineDefinition,

    addTab: (type?: MachineType) => {
      useUIStore.getState().clearSelection();
      const newMachine = createDefaultMachine(type)
      set((s) => ({
        tabs: [...s.tabs, newMachine],
        activeTabIndex: s.tabs.length,
        machine: newMachine
      }))
    },

    switchTab: (index) => {
      useUIStore.getState().clearSelection();
      set((s) => {
        if (index < 0 || index >= s.tabs.length) return {}
        return {
          activeTabIndex: index,
          machine: s.tabs[index]
        }
      })
    },

    closeTab: (index) => {
      useUIStore.getState().clearSelection();
      set((s) => {
        const closedId = s.tabs[index]?.id
        const dirtyTabs = { ...s.dirtyTabs }
        const tabPaths = { ...s.tabPaths }
        if (closedId) {
          delete dirtyTabs[closedId]
          delete tabPaths[closedId]
          useHistoryStore.getState().clear('machine', closedId)
        }

        const newTabs = [...s.tabs]
        newTabs.splice(index, 1)

        // If it's the last tab being closed, empty the state
        if (newTabs.length === 0) {
          return {
            tabs: [],
            activeTabIndex: -1,
            machine: null as unknown as MachineDefinition,
            dirtyTabs: {},
            tabPaths: {}
          }
        }

        // Adjust active index if necessary
        const newActiveIndex = index >= newTabs.length ? newTabs.length - 1 : index
        return {
          tabs: newTabs,
          activeTabIndex: newActiveIndex,
          machine: newTabs[newActiveIndex],
          dirtyTabs,
          tabPaths
        }
      })
    },

    closeMultipleTabs: (indices) => {
      useUIStore.getState().clearSelection();
      set((s) => {
        const sortedIndices = [...indices].sort((a, b) => b - a); // descending
        const dirtyTabs = { ...s.dirtyTabs }
        const tabPaths = { ...s.tabPaths }
        const newTabs = [...s.tabs]
        
        let newActive = s.activeTabIndex;
        for (const index of sortedIndices) {
          if (index < 0 || index >= newTabs.length) continue;
          const closedId = newTabs[index].id
          delete dirtyTabs[closedId]
          delete tabPaths[closedId]
          useHistoryStore.getState().clear('machine', closedId)
          newTabs.splice(index, 1)
          
          if (index < newActive) newActive--;
          else if (index === newActive) newActive = -1; // Was closed
        }

        if (newTabs.length === 0) {
          return {
            tabs: [],
            activeTabIndex: -1,
            machine: null as unknown as MachineDefinition,
            dirtyTabs: {},
            tabPaths: {}
          }
        }

        if (newActive === -1) {
          // If active tab was closed, find nearest remaining
          const closedBeforeActive = sortedIndices.filter(i => i < s.activeTabIndex).length;
          newActive = Math.max(0, s.activeTabIndex - closedBeforeActive);
          newActive = Math.min(newTabs.length - 1, newActive);
        }

        return {
          tabs: newTabs,
          activeTabIndex: newActive,
          machine: newTabs[newActive],
          dirtyTabs,
          tabPaths
        }
      })
    },

    duplicateTabs: (indices) => {
      useUIStore.getState().clearSelection();
      set((s) => {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        const newTabs = [...s.tabs];
        const dirtyTabs = { ...s.dirtyTabs };
        let newActiveIndex = s.activeTabIndex;

        for (const index of sortedIndices) {
          if (index < 0 || index >= newTabs.length) continue;
          const original = newTabs[index];
          
          const duplicate = JSON.parse(JSON.stringify(original));
          duplicate.id = generateId('machine');
          duplicate.name = duplicate.name + ' (copy)';
          
          newTabs.splice(index + 1, 0, duplicate);
          dirtyTabs[duplicate.id] = true;
          
          if (index < newActiveIndex) {
            newActiveIndex++; // Shift active index
          }
        }

        return {
          tabs: newTabs,
          activeTabIndex: newActiveIndex,
          machine: newTabs[newActiveIndex],
          dirtyTabs
        }
      })
    },

    reorderTab: (fromIndex, toIndex) => {
      set((s) => {
        if (fromIndex < 0 || fromIndex >= s.tabs.length || toIndex < 0 || toIndex >= s.tabs.length || fromIndex === toIndex) return {}
        
        const newTabs = [...s.tabs];
        const [movedTab] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, movedTab);
        
        let newActiveIndex = s.activeTabIndex;
        if (s.activeTabIndex === fromIndex) {
          newActiveIndex = toIndex;
        } else if (s.activeTabIndex > fromIndex && s.activeTabIndex <= toIndex) {
          newActiveIndex--;
        } else if (s.activeTabIndex < fromIndex && s.activeTabIndex >= toIndex) {
          newActiveIndex++;
        }
        
        return {
          tabs: newTabs,
          activeTabIndex: newActiveIndex,
          machine: newTabs[newActiveIndex]
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

    renameTab: (index, name) => set((s) => {
      if (index < 0 || index >= s.tabs.length) return {}
      if (index === s.activeTabIndex) {
        return sync(s, { name }, 'name')
      }
      const newTabs = [...s.tabs]
      newTabs[index] = { ...newTabs[index], name }
      return {
        tabs: newTabs,
        dirtyTabs: { ...s.dirtyTabs, [newTabs[index].id]: true }
      }
    }),

    undo: () => {
      useUIStore.getState().clearSelection();
      set((s) => {
      const current = s.machine
      const previous = useHistoryStore.getState().undo('machine', current.id, current)
      if (!previous) return {}
      
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = previous
      return {
        machine: previous,
        tabs: newTabs,
        dirtyTabs: { ...s.dirtyTabs, [previous.id]: true }
      }
    })
    },

    redo: () => {
      useUIStore.getState().clearSelection();
      set((s) => {
      const current = s.machine
      const next = useHistoryStore.getState().redo('machine', current.id, current)
      if (!next) return {}
      
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = next
      return {
        machine: next,
        tabs: newTabs,
        dirtyTabs: { ...s.dirtyTabs, [next.id]: true }
      }
    })
    },

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

    deleteState: (id) => {
      useUIStore.getState().clearSelection();
      set((s) => {
        const deletingState = s.machine.states.find(st => st.id === id);
        const wasStart = deletingState?.isStart;
        const newStates = s.machine.states.filter((st) => st.id !== id);
        
        if (wasStart && newStates.length > 0) {
          const firstReal = newStates.find(st => !st.isText);
          if (firstReal) firstReal.isStart = true;
        }

        return sync(s, {
          states: newStates,
          transitions: s.machine.transitions.filter(
            (t) => t.from !== id && t.to !== id
          ),
        });
      })
    },

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
          // Accept and reject (TM/LBA) are mutually exclusive: turning accept on clears reject.
          st.id === id ? { ...st, isAccept: !st.isAccept, isReject: !st.isAccept ? false : st.isReject } : st
        )
      })),

    toggleRejectState: (id) =>
      set((s) => sync(s, {
        states: s.machine.states.map((st) =>
          // Turning reject on clears accept (a state can't be both).
          st.id === id ? { ...st, isReject: !st.isReject, isAccept: !st.isReject ? false : st.isAccept } : st
        )
      })),

    addTransition: (from, to, symbols) => {
      // Phase 2 Validation
      const { machine } = get();
      if (!machine.states.find(s => s.id === from) || !machine.states.find(s => s.id === to)) {
        throw new Error('Invalid runtime state: transition references a nonexistent state');
      }

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

    deleteTransition: (id) => {
      useUIStore.getState().clearSelection();
      set((s) => sync(s, {
        transitions: s.machine.transitions.filter((t) => t.id !== id)
      }))
    },

    setAlphabet: (alphabet) =>
      set((s) => {
        const validSymbols = new Set(alphabet);
        const isNFA = s.machine.type === 'NFA' || s.machine.type === 'ENFA';
        
        const newTransitions = s.machine.transitions.map(t => {
          const newSymbols = t.symbols.filter(sym => validSymbols.has(sym) || (isNFA && sym === EPSILON));
          return { ...t, symbols: newSymbols };
        }).filter(t => t.symbols.length > 0);
        
        return sync(s, { alphabet, transitions: newTransitions });
      }),

    // Declared alphabets are stored as `undefined` when empty so old/cleared
    // machines simply omit the field (and the validator skips the Γ checks).
    setStackAlphabet: (alphabet) =>
      set((s) => sync(s, { stackAlphabet: alphabet.length > 0 ? alphabet : undefined }, 'stackAlphabet')),

    setTapeAlphabet: (alphabet) =>
      set((s) => sync(s, { tapeAlphabet: alphabet.length > 0 ? alphabet : undefined }, 'tapeAlphabet')),

    completeDFA: () => set((s) => {
      const m = s.machine
      const alphabet = m.alphabet ?? []
      if (m.type !== 'DFA' || alphabet.length === 0) return {}

      const realStates = m.states.filter((st) => !st.isText)
      const present = new Map<string, Set<string>>()
      for (const st of realStates) present.set(st.id, new Set())
      for (const t of m.transitions) {
        const set = present.get(t.from)
        if (set) for (const sym of t.symbols) set.add(sym)
      }

      // Missing (state, symbol) pairs, grouped by source state.
      const missingByFrom = new Map<string, string[]>()
      for (const st of realStates) {
        const have = present.get(st.id)!
        for (const sym of alphabet) {
          if (!have.has(sym)) {
            if (!missingByFrom.has(st.id)) missingByFrom.set(st.id, [])
            missingByFrom.get(st.id)!.push(sym)
          }
        }
      }
      if (missingByFrom.size === 0) return {}

      const xs = realStates.map((st) => st.x)
      const ys = realStates.map((st) => st.y)
      const trap: AutomataState = {
        id: generateId('state'),
        label: 'trap',
        x: (xs.length ? Math.max(...xs) : 0) + 140,
        y: (ys.length ? Math.max(...ys) : 0) + 100,
        isStart: false,
        isAccept: false,
      }

      const newTransitions: Transition[] = [...m.transitions]
      for (const [from, syms] of missingByFrom) {
        newTransitions.push({ id: generateId('trans'), from, to: trap.id, symbols: syms })
      }
      // The trap is itself a complete dead state: self-loops on every symbol.
      newTransitions.push({ id: generateId('trans'), from: trap.id, to: trap.id, symbols: [...alphabet] })

      return sync(s, { states: [...m.states, trap], transitions: newTransitions })
    }),

    // TM/LBA blank symbol (single char). Empty input falls back to the default '_'.
    setBlankSymbol: (symbol) =>
      set((s) => sync(s, { blankSymbol: symbol.trim() ? symbol.trim()[0] : undefined }, 'blankSymbol')),

    // TM/LBA infinite-loop guard. `undefined` restores the engine default (10,000).
    setStepLimit: (limit) =>
      set((s) => sync(s, {
        stepLimit: limit != null && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined,
      }, 'stepLimit')),

    // Multi-tape TM tape count. A count of 1 clears the field (single-tape default).
    setTapeCount: (count) =>
      set((s) => sync(s, {
        tapeCount: Number.isFinite(count) && count > 1 ? Math.floor(count) : undefined,
      }, 'tapeCount')),

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
        tabPaths
      }
    }),

    openMachine: (def, path) => {
      get().addTab()
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
        tabPaths
      }
    }),
  }
})
