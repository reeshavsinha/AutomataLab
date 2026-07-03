// src/store/workspaceStore.ts
import { create } from 'zustand';

type WorkspaceState = {
  /** Currently selected tool in the active workspace */
  activeTool: 'select' | 'state' | 'edge' | 'text';
  /** Node that the cursor is hovering over (if any) */
  hoverNodeId: string | null;

  /** Mutators */
  setActiveTool: (tool: WorkspaceState['activeTool']) => void;
  setHoverNodeId: (id: string | null) => void;
};

/**
 * Zustand store for **transient UI** state that is specific to each workspace.
 * It is deliberately lightweight – no persistence – because the data is
 * UI‑only (tool selection, hover highlights, etc.).
 */
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTool: 'select',
  hoverNodeId: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setHoverNodeId: (id) => set({ hoverNodeId: id }),
}));
