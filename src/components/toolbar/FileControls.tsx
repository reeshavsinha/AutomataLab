// ============================================================
// FileControls — Compact, icon-only New / Open / Save buttons.
// Replaces the old "FILE ▼" dropdown with explicit actions like a
// conventional desktop editor. Labels are shown as hover tooltips
// (name + shortcut) to keep the toolbar compact:
//   • New   (Ctrl/Cmd+N)        — opens a fresh tab
//   • Open  (Ctrl/Cmd+O)        — opens a file; ▾ lists recent files
//   • Save  (Ctrl/Cmd+S)        — writes in place once a path is known;
//                                 ▾ → "Save As…" (Ctrl/Cmd+Shift+S)
// Opening never clobbers unsaved work — it reuses a pristine tab or
// opens a new one (see machineStore.openMachine).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { saveMachine, saveMachineToPath, loadMachine as loadFromFile, loadMachineFromPath } from '@/utils/fileManager'
import { getRecentFiles, removeRecentFile, clearRecentFiles, type RecentFile } from '@/utils/recentFiles'
import { isTauri } from '@tauri-apps/api/core'
import { toast } from '@/store/toastStore'

type OpenMenu = 'open' | 'save' | null

export default function FileControls() {
  const { machine, activeTabIndex, dirtyTabs, tabPaths, addTab, openMachine, markTabSaved } = useMachineStore()
  const requestFitView = useUIStore((s) => s.requestFitView)

  const [menu, setMenu] = useState<OpenMenu>(null)
  // Bump to force the recent-files list to re-read localStorage after a save/open.
  const [recentNonce, setRecentNonce] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const isDirty = !!dirtyTabs[machine.id]
  const recentFiles = isTauri() ? getRecentFiles() : []
  void recentNonce // recentFiles is recomputed each render; nonce just triggers it

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Actions ────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    addTab()
    setMenu(null)
    requestFitView()
  }, [addTab, requestFitView])

  const handleOpen = useCallback(async () => {
    setMenu(null)
    try {
      const { def, path } = await loadFromFile()
      openMachine(def, path)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
      setRecentNonce((n) => n + 1)
    } catch (err) {
      if (err instanceof Error && err.message !== 'No file selected') toast.error(err.message)
    }
  }, [openMachine, requestFitView])

  const handleOpenRecent = useCallback(async (file: RecentFile) => {
    setMenu(null)
    try {
      const def = await loadMachineFromPath(file.path)
      openMachine(def, file.path)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
      setRecentNonce((n) => n + 1)
    } catch {
      removeRecentFile(file.path)
      setRecentNonce((n) => n + 1)
      toast.error(`Could not open "${file.name}". It may have been moved or deleted.`)
    }
  }, [openMachine, requestFitView])

  const handleClearRecent = useCallback(() => {
    clearRecentFiles()
    setMenu(null)
    setRecentNonce((n) => n + 1)
    toast.info('Recent files cleared.')
  }, [])

  // Save in place if we already know the file's path; otherwise behave like Save As.
  const handleSave = useCallback(async () => {
    setMenu(null)
    const knownPath = tabPaths[machine.id]
    try {
      if (isTauri() && knownPath) {
        await saveMachineToPath(machine, knownPath)
        markTabSaved(activeTabIndex, knownPath)
        toast.success(`Saved "${machine.name}".`)
      } else {
        const saved = await saveMachine(machine)
        if (saved) {
          markTabSaved(activeTabIndex, isTauri() ? saved : null)
          toast.success(`Saved "${machine.name}".`)
          setRecentNonce((n) => n + 1)
        }
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    }
  }, [machine, activeTabIndex, tabPaths, markTabSaved])

  const handleSaveAs = useCallback(async () => {
    setMenu(null)
    try {
      const saved = await saveMachine(machine)
      if (saved) {
        markTabSaved(activeTabIndex, isTauri() ? saved : null)
        toast.success(`Saved "${machine.name}".`)
        setRecentNonce((n) => n + 1)
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    }
  }, [machine, activeTabIndex, markTabSaved])

  // ── Global file shortcuts (work even while typing in a field) ─
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      const k = e.key.toLowerCase()
      if (k === 'n') { e.preventDefault(); handleNew() }
      else if (k === 'o') { e.preventDefault(); handleOpen() }
      else if (k === 's' && e.shiftKey) { e.preventDefault(); handleSaveAs() }
      else if (k === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNew, handleOpen, handleSave, handleSaveAs])

  // ── Styling ────────────────────────────────────────────────
  const iconBtn = (opts?: { active?: boolean; emphasis?: boolean }): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '28px',
    padding: 0,
    background: opts?.emphasis ? 'var(--text-primary)' : opts?.active ? 'var(--bg-secondary)' : 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    color: opts?.emphasis ? 'var(--bg-primary)' : 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  })

  const caretBtn = (active: boolean, emphasis?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '28px',
    background: emphasis ? 'var(--text-primary)' : active ? 'var(--bg-secondary)' : 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderLeft: 'none',
    color: emphasis ? 'var(--bg-primary)' : 'var(--text-secondary)',
    fontSize: '8px',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
    boxSizing: 'border-box',
  })

  const menuItem: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: '8px 12px',
    textAlign: 'left',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    outline: 'none',
    borderBottom: '1px solid var(--border-default)',
    whiteSpace: 'nowrap',
  }

  const dropdown: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '6px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '220px',
    zIndex: 100,
    overflow: 'hidden',
  }

  const hoverOn = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'var(--bg-secondary)' }
  const hoverOff = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.background = 'transparent' }

  // Left rounding for split-button main parts, right rounding for plain/caret parts.
  const roundLeft = { borderTopLeftRadius: 'var(--radius-sm)', borderBottomLeftRadius: 'var(--radius-sm)' } as const
  const roundRight = { borderTopRightRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)' } as const
  const roundAll = { borderRadius: 'var(--radius-sm)' } as const

  return (
    <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* New */}
      <WithTip label="New" shortcut="Ctrl+N">
        <button onClick={handleNew} aria-label="New machine (Ctrl+N)" style={{ ...iconBtn(), ...roundAll }}>
          <NewIcon />
        </button>
      </WithTip>

      {/* Open (split: open + recent) */}
      <div style={{ position: 'relative', display: 'flex' }}>
        <WithTip label="Open" shortcut="Ctrl+O">
          <button
            onClick={handleOpen}
            aria-label="Open a machine file (Ctrl+O)"
            style={{ ...iconBtn(), ...(recentFiles.length > 0 ? roundLeft : roundAll) }}
          >
            <OpenIcon />
          </button>
        </WithTip>
        {recentFiles.length > 0 && (
          <WithTip label="Recent files">
            <button
              onClick={() => setMenu(menu === 'open' ? null : 'open')}
              aria-label="Recent files"
              style={{ ...caretBtn(menu === 'open'), ...roundRight }}
            >
              ▼
            </button>
          </WithTip>
        )}
        {menu === 'open' && recentFiles.length > 0 && (
          <div style={dropdown}>
            <div style={{
              padding: '6px 12px', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              Recent
            </div>
            {recentFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => handleOpenRecent(file)}
                title={file.path}
                style={{ ...menuItem, fontSize: '11px' }}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
              </button>
            ))}
            <button
              onClick={handleClearRecent}
              style={{ ...menuItem, borderBottom: 'none', color: 'var(--text-muted)' }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              Clear recent
            </button>
          </div>
        )}
      </div>

      {/* Save (split: save + save as). Filled while there are unsaved changes. */}
      <div style={{ position: 'relative', display: 'flex' }}>
        <WithTip label={isDirty ? 'Save (unsaved changes)' : 'Save'} shortcut="Ctrl+S" align="right">
          <button
            onClick={handleSave}
            aria-label="Save (Ctrl+S)"
            style={{ ...iconBtn({ emphasis: isDirty }), ...roundLeft }}
          >
            <SaveIcon />
          </button>
        </WithTip>
        <WithTip label="Save As…" shortcut="Ctrl+Shift+S" align="right">
          <button
            onClick={() => setMenu(menu === 'save' ? null : 'save')}
            aria-label="More save options"
            style={{ ...caretBtn(menu === 'save', isDirty), ...roundRight }}
          >
            ▼
          </button>
        </WithTip>
        {menu === 'save' && (
          <div style={dropdown}>
            <button onClick={handleSave} style={menuItem} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Save <span style={{ color: 'var(--text-muted)', float: 'right' }}>Ctrl+S</span>
            </button>
            <button onClick={handleSaveAs} style={{ ...menuItem, borderBottom: 'none' }} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              Save As…<span style={{ color: 'var(--text-muted)', float: 'right' }}>Ctrl+Shift+S</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hover tooltip (name + shortcut), shown below the button ───
function WithTip({
  label, shortcut, align = 'center', children,
}: {
  label: string
  shortcut?: string
  align?: 'center' | 'right'
  children: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  const pos: React.CSSProperties =
    align === 'right'
      ? { right: 0 }
      : { left: '50%', transform: 'translateX(-50%)' }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...pos,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            whiteSpace: 'nowrap',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          <span style={{ fontWeight: 600 }}>{label}</span>
          {shortcut && <span style={{ color: 'var(--text-muted)' }}>{shortcut}</span>}
        </span>
      )}
    </span>
  )
}

// ── Inline monochrome icons (inherit currentColor) ───────────
function NewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}
