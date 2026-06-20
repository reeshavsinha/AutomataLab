// ============================================================
// App.tsx — Root component. Renders the application shell.
// ============================================================

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'

export default function App() {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    
    const isTauri = '__TAURI_INTERNALS__' in window;
    
    // On the web, if we hit the root with no hash, redirect to the standalone landing page
    if (!isTauri && (!window.location.hash || window.location.hash === '#/')) {
      window.location.href = '/page/'
    } else if (isTauri && (!window.location.hash || window.location.hash === '#/')) {
      // In Tauri, enforce #/app if empty to ensure the app renders
      window.location.hash = '#/app'
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const isTauri = '__TAURI_INTERNALS__' in window;
  if (isTauri || route === '#/app') {
    return <AppLayout />
  }

  // Fallback while redirecting
  return null
}
