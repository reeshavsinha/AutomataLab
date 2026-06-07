// ============================================================
// Machine Store — Zustand
// Holds the machine definition: states, transitions, type, name.
// ============================================================

import { create } from 'zustand'
import { generateId } from '@/engines/core/utils'
import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/core/types'

interface MachineStore {
  // Tabs
  tabs: MachineDefinition[]
  activeTabIndex: number

  // State (Active Tab)
  machine: MachineDefinition

  // Actions — Tabs
  addTab: () => void
  switchTab: (index: number) => void
  closeTab: (index: number) => void

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
  loadMachine: (def: MachineDefinition) => void
  resetMachine: () => void
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

// Helper to update both the active machine and the corresponding tab
const sync = (s: MachineStore, patch: Partial<MachineDefinition>) => {
  const updatedMachine = { ...s.machine, ...patch }
  const newTabs = [...s.tabs]
  newTabs[s.activeTabIndex] = updatedMachine
  return { machine: updatedMachine, tabs: newTabs }
}

export const useMachineStore = create<MachineStore>((set, get) => {
  const initialMachine = createDefaultMachine()
  
  return {
    tabs: [initialMachine],
    activeTabIndex: 0,
    machine: initialMachine,

    addTab: () => {
      const newMachine = createDefaultMachine()
      set((s) => ({
        tabs: [...s.tabs, newMachine],
        activeTabIndex: s.tabs.length,
        machine: newMachine,
      }))
    },

    switchTab: (index) => {
      set((s) => {
        if (index < 0 || index >= s.tabs.length) return {}
        return {
          activeTabIndex: index,
          machine: s.tabs[index],
        }
      })
    },

    closeTab: (index) => {
      set((s) => {
        const newTabs = [...s.tabs]
        newTabs.splice(index, 1)
        
        // If it's the last tab being closed, create a fresh one
        if (newTabs.length === 0) {
          const freshMachine = createDefaultMachine()
          return {
            tabs: [freshMachine],
            activeTabIndex: 0,
            machine: freshMachine
          }
        }

        // Adjust active index if necessary
        const newActiveIndex = index >= newTabs.length ? newTabs.length - 1 : index
        return {
          tabs: newTabs,
          activeTabIndex: newActiveIndex,
          machine: newTabs[newActiveIndex]
        }
      })
    },

    setMachineName: (name) => set((s) => sync(s, { name })),

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
      })),

    deleteTransition: (id) =>
      set((s) => sync(s, {
        transitions: s.machine.transitions.filter((t) => t.id !== id)
      })),

    setAlphabet: (alphabet) =>
      set((s) => sync(s, { alphabet })),

    loadMachine: (def) => set((s) => {
      // Overwrite current tab
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = def
      return { machine: def, tabs: newTabs }
    }),

    resetMachine: () => set((s) => {
      const freshMachine = createDefaultMachine()
      const newTabs = [...s.tabs]
      newTabs[s.activeTabIndex] = freshMachine
      return { machine: freshMachine, tabs: newTabs }
    }),
  }
})
