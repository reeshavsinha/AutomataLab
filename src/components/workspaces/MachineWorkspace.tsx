// src/components/workspaces/MachineWorkspace.tsx
import React, { useEffect } from "react";
import Toolbar from '@/components/toolbar/Toolbar';
import InputBar from '@/components/controls/InputBar';
import SimulationControls from '@/components/controls/SimulationControls';
import AutomataCanvas from '@/components/canvas/AutomataCanvas';
import SidePanel from '@/components/panels/SidePanel';
import TabBar from '@/components/layout/TabBar';
import { WorkspaceShell } from '@/components/layout/WorkspaceShell';
import { useSimulationStore } from '@/store/simulationStore';
import { useUIStore } from '@/store/uiStore';

export function MachineWorkspace({ isDemoMode }: { isDemoMode?: boolean }) {
  const resetSimulation = useSimulationStore((s) => s.resetSimulation);
  const panelCollapsed = useUIStore((s) => s.panelCollapsed);

  // Simulation state persistence across non-machine tabs is now handled by TabSyncListener in App.tsx.

  return (
    <WorkspaceShell
      autoSaveId="machine-workspace-main"
      header={!isDemoMode ? <TabBar /> : null}
      toolbar={
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Toolbar />
          <InputBar />
        </div>
      }
      content={
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AutomataCanvas />
        </div>
      }
      sidebarRight={<SidePanel />}
      sidebarRightCollapsed={panelCollapsed}
      onSidebarRightCollapseChange={(collapsed) => useUIStore.getState().setPanelCollapsed(collapsed)}
      statusBar={<SimulationControls />}
    />
  );
}
