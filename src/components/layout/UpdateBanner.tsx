import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { check, Update } from '@tauri-apps/plugin-updater'

type BannerState = 'hidden' | 'available' | 'downloading' | 'installed' | 'error'

export default function UpdateBanner() {
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const [update, setUpdate] = useState<Update | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let mounted = true
    async function checkForUpdates() {
      try {
        const result = await check()
        if (result?.available && mounted) {
          setUpdate(result)
          setBannerState('available')
        }
      } catch (err) {
        console.error('Failed to check for updates:', err)
      }
    }
    
    // Only check for updates if we are running in Tauri
    if ('__TAURI_INTERNALS__' in window) {
      checkForUpdates()
    }

    return () => { mounted = false }
  }, [])

  const handleUpdate = async () => {
    if (!update) return
    setBannerState('downloading')
    try {
      await update.downloadAndInstall()
      setBannerState('installed')
    } catch (err: any) {
      console.error('Update failed:', err)
      setErrorMsg(err.message || String(err))
      setBannerState('error')
    }
  }

  const handleDismiss = () => {
    setBannerState('hidden')
  }

  if (bannerState === 'hidden') return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--bg-elevated, #2a2a2e)',
          color: 'var(--text-primary, #ffffff)',
          border: '1px solid var(--border-color, #444)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          minWidth: '320px',
          maxWidth: '90vw'
        }}
      >
        {/* Icon & Content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {bannerState === 'available' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #61dafb)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          )}
          {bannerState === 'downloading' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #61dafb)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
          )}
          {bannerState === 'installed' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success, #4caf50)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          )}
          {bannerState === 'error' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger, #f44336)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>
              {bannerState === 'available' && `Update Available: v${update?.version}`}
              {bannerState === 'downloading' && 'Downloading & Installing...'}
              {bannerState === 'installed' && 'Update Installed'}
              {bannerState === 'error' && 'Update Failed'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #aaa)', marginTop: '2px' }}>
              {bannerState === 'available' && 'A new version of AutomataLab is ready to install.'}
              {bannerState === 'downloading' && 'Please wait while the update is applied.'}
              {bannerState === 'installed' && 'Please restart the application to apply changes.'}
              {bannerState === 'error' && errorMsg}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {bannerState === 'available' && (
            <button
              onClick={handleUpdate}
              style={{
                background: 'var(--accent, #61dafb)',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Update Now
            </button>
          )}
          
          {(bannerState === 'available' || bannerState === 'installed' || bannerState === 'error') && (
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                color: 'var(--text-primary, #fff)',
                border: '1px solid var(--border-color, #444)',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
