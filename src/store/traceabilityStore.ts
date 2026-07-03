// ============================================================
// Traceability Store — Zustand
// Implements Cross-Panel Synchronization (Phase 6).
// Allows the IDE to trace selections bidirectionally between 
// Grammar text, Visual Graphs, Item Sets, and Parse Tables.
// ============================================================

import { create } from 'zustand';

interface TraceabilityState {
  // Grammar-level selections
  focusedProductionIndex: number | null;
  focusedSymbol: string | null;

  // Parser-level selections
  focusedItemSetId: string | null;
  focusedParseAction: { state: number; symbol: string } | null;

  // Actions
  setFocusedProduction: (index: number | null) => void;
  setFocusedSymbol: (symbol: string | null) => void;
  setFocusedItemSet: (id: string | null) => void;
  setFocusedParseAction: (action: { state: number; symbol: string } | null) => void;
  clearTrace: () => void;
}

export const useTraceabilityStore = create<TraceabilityState>((set) => ({
  focusedProductionIndex: null,
  focusedSymbol: null,
  focusedItemSetId: null,
  focusedParseAction: null,

  setFocusedProduction: (index) => set({ focusedProductionIndex: index }),
  setFocusedSymbol: (symbol) => set({ focusedSymbol: symbol }),
  setFocusedItemSet: (id) => set({ focusedItemSetId: id }),
  setFocusedParseAction: (action) => set({ focusedParseAction: action }),
  clearTrace: () => set({
    focusedProductionIndex: null,
    focusedSymbol: null,
    focusedItemSetId: null,
    focusedParseAction: null,
  }),
}));
