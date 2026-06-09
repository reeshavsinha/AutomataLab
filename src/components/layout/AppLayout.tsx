// ============================================================
// AppLayout — Main application shell layout
// ============================================================

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import Toolbar from '@/components/toolbar/Toolbar'
import InputBar from '@/components/controls/InputBar'
import SimulationControls from '@/components/controls/SimulationControls'
import AutomataCanvas from '@/components/canvas/AutomataCanvas'
import SidePanel from '@/components/panels/SidePanel'
import TabBar from '@/components/layout/TabBar'
import ToastContainer from '@/components/layout/ToastContainer'

export default function AppLayout() {
  const theme = useUIStore((s) => s.theme)

  // Reflect the active theme onto <html> so the CSS token overrides apply.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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

      {/* Tab Bar — top placement, just below the toolbar (conventional). */}
      <TabBar />

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

      {/* Bottom simulation controls */}
      <SimulationControls />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}
