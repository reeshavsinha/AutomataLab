// ============================================================
// History Store — Zustand
// Workspace-agnostic history system (Release 7.1).
// Manages Undo/Redo stacks for all workspaces, separated by Tab ID.
// ============================================================

import { create } from 'zustand';

export type WorkspaceType = 'machine' | 'grammar' | 'parser';

export interface HistoryStack<T = any> {
  past: T[];
  future: T[];
  lastCoalesceKey: string | null;
  lastEditAt: number;
}

const MAX_HISTORY = 100;
const COALESCE_MS = 500;

interface HistoryStore {
  stacks: Record<string, HistoryStack>;

  pushState: <T>(workspace: WorkspaceType, tabId: string, currentState: T, coalesceKey?: string) => void;
  undo: <T>(workspace: WorkspaceType, tabId: string, currentState: T) => T | null;
  redo: <T>(workspace: WorkspaceType, tabId: string, currentState: T) => T | null;
  clear: (workspace: WorkspaceType, tabId: string) => void;
  canUndo: (workspace: WorkspaceType, tabId: string) => boolean;
  canRedo: (workspace: WorkspaceType, tabId: string) => boolean;
}

const getStackKey = (workspace: WorkspaceType, tabId: string) => `${workspace}:${tabId}`;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  stacks: {},

  pushState: <T>(workspace: WorkspaceType, tabId: string, currentState: T, coalesceKey?: string) => {
    set((state) => {
      const key = getStackKey(workspace, tabId);
      const stack = state.stacks[key] || { past: [], future: [], lastCoalesceKey: null, lastEditAt: 0 };
      
      const now = Date.now();
      const coalesce = coalesceKey != null && coalesceKey === stack.lastCoalesceKey && (now - stack.lastEditAt < COALESCE_MS);
      
      const past = coalesce ? stack.past : [...stack.past, currentState].slice(-MAX_HISTORY);

      return {
        stacks: {
          ...state.stacks,
          [key]: {
            past,
            future: [],
            lastCoalesceKey: coalesceKey ?? null,
            lastEditAt: now,
          }
        }
      };
    });
  },

  undo: <T>(workspace: WorkspaceType, tabId: string, currentState: T): T | null => {
    const state = get();
    const key = getStackKey(workspace, tabId);
    const stack = state.stacks[key];
    
    if (!stack || stack.past.length === 0) return null;

    const previous = stack.past[stack.past.length - 1];
    
    set((s) => ({
      stacks: {
        ...s.stacks,
        [key]: {
          ...stack,
          past: stack.past.slice(0, -1),
          future: [currentState, ...stack.future].slice(0, MAX_HISTORY),
          lastCoalesceKey: null,
          lastEditAt: 0,
        }
      }
    }));

    return previous;
  },

  redo: <T>(workspace: WorkspaceType, tabId: string, currentState: T): T | null => {
    const state = get();
    const key = getStackKey(workspace, tabId);
    const stack = state.stacks[key];
    
    if (!stack || stack.future.length === 0) return null;

    const next = stack.future[0];

    set((s) => ({
      stacks: {
        ...s.stacks,
        [key]: {
          ...stack,
          past: [...stack.past, currentState].slice(-MAX_HISTORY),
          future: stack.future.slice(1),
          lastCoalesceKey: null,
          lastEditAt: 0,
        }
      }
    }));

    return next;
  },

  clear: (workspace: WorkspaceType, tabId: string) => {
    set((state) => {
      const key = getStackKey(workspace, tabId);
      const newStacks = { ...state.stacks };
      delete newStacks[key];
      return { stacks: newStacks };
    });
  },

  canUndo: (workspace: WorkspaceType, tabId: string) => {
    const key = getStackKey(workspace, tabId);
    const stack = get().stacks[key];
    return stack ? stack.past.length > 0 : false;
  },

  canRedo: (workspace: WorkspaceType, tabId: string) => {
    const key = getStackKey(workspace, tabId);
    const stack = get().stacks[key];
    return stack ? stack.future.length > 0 : false;
  }
}));
