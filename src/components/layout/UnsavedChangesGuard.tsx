// ============================================================
// UnsavedChangesGuard — Prevents silent data loss on quit.
//
// • Desktop (Tauri): intercepts the window close request; if any tab
//   has unsaved changes, it asks the user to Save All / Discard / Cancel
//   instead of quitting straight away.
// • Web: falls back to the browser's native beforeunload prompt.
// • Also mirrors the unsaved state into the OS window title (a "●" dot),
//   matching the convention used by most desktop editors.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { useMachineStore } from '@/store/machineStore'
import { saveMachine, saveMachineToPath } from '@/utils/fileManager'
import { toast } from '@/store/toastStore'

export default function UnsavedChangesGuard() {
  const tabs = useMachineStore((s) => s.tabs)
  const dirtyTabs = useMachineStore((s) => s.dirtyTabs)

  const [showPrompt, setShowPrompt] = useState(false)
  const [busy, setBusy] = useState(false)

  const dirtyCount = tabs.filter((t) => dirtyTabs[t.id]).length

  // ── Mirror unsaved state into the window title (desktop) ─────
  useEffect(() => {
    if (!isTauri()) return
    const anyDirty = tabs.some((t) => dirtyTabs[t.id])
    let cancelled = false
    ;(async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        if (!cancelled) await getCurrentWindow().setTitle(`${anyDirty ? '● ' : ''}AutomataLab`)
      } catch {
        /* title is cosmetic — ignore failures */
      }
    })()
    return () => { cancelled = true }
  }, [tabs, dirtyTabs])

  // ── Desktop: intercept the close request ────────────────────
  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const un = await getCurrentWindow().onCloseRequested((event) => {
          const { tabs: t, dirtyTabs: d } = useMachineStore.getState()
          if (t.some((tab) => d[tab.id])) {
            event.preventDefault()
            setShowPrompt(true)
          }
        })
        if (cancelled) un()
        else unlisten = un
      } catch (err) {
        console.error('Failed to register close guard:', err)
      }
    })()
    return () => { cancelled = true; unlisten?.() }
  }, [])

  // ── Web: native beforeunload prompt ─────────────────────────
  useEffect(() => {
    if (isTauri()) return
    const handler = (e: BeforeUnloadEvent) => {
      const { tabs: t, dirtyTabs: d } = useMachineStore.getState()
      if (t.some((tab) => d[tab.id])) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const forceQuit = useCallback(async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().destroy()
  }, [])

  const handleSaveAllAndQuit = useCallback(async () => {
    setBusy(true)
    try {
      const { tabs: t, dirtyTabs: d, tabPaths } = useMachineStore.getState()
      for (let i = 0; i < t.length; i++) {
        const tab = t[i]
        if (!d[tab.id]) continue
        const knownPath = tabPaths[tab.id]
        let savedPath: string | null
        if (knownPath) {
          await saveMachineToPath(tab, knownPath)
          savedPath = knownPath
        } else {
          savedPath = await saveMachine(tab)
        }
        // User cancelled this file's save dialog — abort the whole quit.
        if (!savedPath) {
          setBusy(false)
          setShowPrompt(false)
          toast.info('Quit cancelled — your unsaved changes are still here.')
          return
        }
        useMachineStore.getState().markTabSaved(i, isTauri() ? savedPath : null)
      }
      await forceQuit()
    } catch (err) {
      setBusy(false)
      toast.error(err instanceof Error ? err.message : 'Could not save before quitting.')
    }
  }, [forceQuit])

  const handleDiscardAndQuit = useCallback(async () => {
    setBusy(true)
    await forceQuit()
  }, [forceQuit])

  const handleCancel = useCallback(() => setShowPrompt(false), [])

  if (!showPrompt) return null

  const plural = dirtyCount === 1 ? 'machine has' : 'machines have'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000,
      }}
      onClick={busy ? undefined : handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '460px',
          maxWidth: '90vw',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
          Quit AutomataLab?
        </div>
        <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: '24px' }}>
          {dirtyCount} {plural} unsaved changes. Save before quitting so you don't lose your work?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={handleCancel}
            disabled={busy}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDiscardAndQuit}
            disabled={busy}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Discard &amp; Quit
          </button>
          <button
            onClick={handleSaveAllAndQuit}
            disabled={busy}
            style={{
              background: 'var(--text-primary)',
              border: '1px solid var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--bg-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '6px 14px',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Saving…' : 'Save All & Quit'}
          </button>
        </div>
      </div>
    </div>
  )
}
