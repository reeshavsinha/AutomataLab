// ============================================================
// AppLayout — Main application shell layout
// ============================================================

import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import MenuBar from '@/components/layout/MenuBar'
import Toolbar from '@/components/toolbar/Toolbar'
import InputBar from '@/components/controls/InputBar'
import SimulationControls from '@/components/controls/SimulationControls'
import AutomataCanvas from '@/components/canvas/AutomataCanvas'
import SidePanel from '@/components/panels/SidePanel'
import TabBar from '@/components/layout/TabBar'
import ToastContainer from '@/components/layout/ToastContainer'
import UpdateBanner from '@/components/layout/UpdateBanner'
import UnsavedChangesGuard from '@/components/layout/UnsavedChangesGuard'
import HelpModal from '@/components/layout/HelpModal'
import ExportModal from '@/components/layout/ExportModal'
import ConversionsModal from '@/components/conversions/ConversionsModal'
import BatchRunnerModal from '@/components/controls/BatchRunnerModal'
import AnalysisModal from '@/components/analysis/AnalysisModal'

export default function AppLayout() {
  const isDemoMode = import.meta.env.VITE_SIMULATOR_MODE === 'true' || window.location.href.includes('demo=true')
  const theme = useUIStore((s) => s.theme)
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)

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
      {/* Classic menu bar + icon toolbar */}
      {!isDemoMode && <MenuBar />}
      <Toolbar />

      {/* Tab Bar — top placement, just below the toolbar (conventional). */}
      {!isDemoMode && <TabBar />}

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

      {/* Top sliding update notification banner */}
      <UpdateBanner />

      {/* Guards against quitting with unsaved work */}
      <UnsavedChangesGuard />

      {/* Top-level modal dialogs (opened from the menu bar / toolbar) */}
      {activeModal === 'help' && <HelpModal onClose={closeModal} />}
      {activeModal === 'export' && <ExportModal onClose={closeModal} />}
      {activeModal === 'convert' && <ConversionsModal onClose={closeModal} />}
      {activeModal === 'batch' && <BatchRunnerModal onClose={closeModal} />}
      {activeModal === 'analysis' && <AnalysisModal onClose={closeModal} />}
    </div>
  )
}
