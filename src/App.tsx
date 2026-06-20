// ============================================================
// App.tsx — Root component. Renders the application shell.
// ============================================================

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'

const isSimulatorDeployment = import.meta.env.VITE_SIMULATOR_MODE === 'true';

export default function App() {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    
    const isTauri = '__TAURI_INTERNALS__' in window;
    
    // On the web, if we hit the root with no hash, redirect to the standalone landing page
    // BUT only if this is NOT a dedicated simulator deployment
    if (!isTauri && !isSimulatorDeployment && (!window.location.hash || window.location.hash === '#/')) {
      window.location.href = '/page/'
    } else if (isTauri && (!window.location.hash || window.location.hash === '#/')) {
      // In Tauri, enforce #/app if empty to ensure the app renders
      window.location.hash = '#/app'
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const isTauri = '__TAURI_INTERNALS__' in window;
  
  // Render the simulator directly in Tauri mode, Simulator Mode, or if manually navigated to #/app
  if (isTauri || isSimulatorDeployment || route === '#/app') {
    return <AppLayout />
  }

  // Fallback while redirecting
  return null
}
