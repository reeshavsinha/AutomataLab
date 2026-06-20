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
    
    // If we hit the root with no hash, redirect to the standalone landing page
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.href = '/page/'
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route === '#/app') {
    return <AppLayout />
  }

  // Fallback while redirecting
  return null
}
