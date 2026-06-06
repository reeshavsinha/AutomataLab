// ============================================================
// Machine Store — Zustand
// Holds the machine definition: states, transitions, type, name.
// ============================================================

import { create } from 'zustand'
import { generateId } from '@/engines/core/utils'
import type { AutomataState, MachineDefinition, MachineType, Transition } from '@/engines/core/types'

interface MachineStore {
  // State
  machine: MachineDefinition

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

const DEFAULT_MACHINE: MachineDefinition = {
  id: generateId('machine'),
  name: 'Untitled Machine',
  type: 'DFA',
  language: '',
  states: [],
  transitions: [],
  alphabet: [],
}

export const useMachineStore = create<MachineStore>((set, get) => ({
  machine: { ...DEFAULT_MACHINE, id: generateId('machine') },

  setMachineName: (name) =>
    set((s) => ({ machine: { ...s.machine, name } })),

  setMachineType: (type) =>
    set((s) => ({ machine: { ...s.machine, type } })),

  addState: (x, y) => {
    const stateCount = get().machine.states.length
    const newState: AutomataState = {
      id: generateId('state'),
      label: `q${stateCount}`,
      x,
      y,
      isStart: stateCount === 0, // first state is start by default
      isAccept: false,
    }
    set((s) => ({
      machine: {
        ...s.machine,
        states: [...s.machine.states, newState],
      },
    }))
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
    set((s) => ({
      machine: {
        ...s.machine,
        states: [...s.machine.states, newTextState],
      },
    }))
    return newTextState
  },

  updateState: (id, patch) =>
    set((s) => ({
      machine: {
        ...s.machine,
        states: s.machine.states.map((st) =>
          st.id === id ? { ...st, ...patch } : st
        ),
      },
    })),

  deleteState: (id) =>
    set((s) => ({
      machine: {
        ...s.machine,
        states: s.machine.states.filter((st) => st.id !== id),
        transitions: s.machine.transitions.filter(
          (t) => t.from !== id && t.to !== id
        ),
      },
    })),

  setStartState: (id) =>
    set((s) => ({
      machine: {
        ...s.machine,
        states: s.machine.states.map((st) => ({
          ...st,
          isStart: st.id === id,
        })),
      },
    })),

  toggleAcceptState: (id) =>
    set((s) => ({
      machine: {
        ...s.machine,
        states: s.machine.states.map((st) =>
          st.id === id ? { ...st, isAccept: !st.isAccept } : st
        ),
      },
    })),

  addTransition: (from, to, symbols) => {
    const newTransition: Transition = {
      id: generateId('trans'),
      from,
      to,
      symbols,
    }
    set((s) => ({
      machine: {
        ...s.machine,
        transitions: [...s.machine.transitions, newTransition],
      },
    }))
    return newTransition
  },

  updateTransition: (id, patch) =>
    set((s) => ({
      machine: {
        ...s.machine,
        transitions: s.machine.transitions.map((t) =>
          t.id === id ? { ...t, ...patch } : t
        ),
      },
    })),

  deleteTransition: (id) =>
    set((s) => ({
      machine: {
        ...s.machine,
        transitions: s.machine.transitions.filter((t) => t.id !== id),
      },
    })),

  setAlphabet: (alphabet) =>
    set((s) => ({
      machine: { ...s.machine, alphabet },
    })),

  loadMachine: (def) => set({ machine: def }),

  resetMachine: () =>
    set({ machine: { ...DEFAULT_MACHINE, id: generateId('machine') } }),
}))
