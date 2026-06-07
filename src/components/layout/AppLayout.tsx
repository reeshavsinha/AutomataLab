// ============================================================
// AppLayout — Main application shell layout
// ============================================================

import Toolbar from '@/components/toolbar/Toolbar'
import InputBar from '@/components/controls/InputBar'
import SimulationControls from '@/components/controls/SimulationControls'
import AutomataCanvas from '@/components/canvas/AutomataCanvas'
import SidePanel from '@/components/panels/SidePanel'
import TabBar from '@/components/layout/TabBar'

export default function AppLayout() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* Top bar */}
      <Toolbar />

      {/* Input tape bar */}
      <InputBar />

      {/* Main area: canvas + side panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <AutomataCanvas />
        </main>

        {/* Right side panel */}
        <SidePanel />
      </div>

      {/* Tab Bar */}
      <TabBar />

      {/* Bottom simulation controls */}
      <SimulationControls />
    </div>
  )
}
