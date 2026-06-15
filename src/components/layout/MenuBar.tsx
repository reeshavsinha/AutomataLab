// ============================================================
// MenuBar — classic native-style application menu bar.
// File / Edit / View / Machine / Simulate / Convert / Help, each a
// click-to-open dropdown (and hover-to-switch while one is open), wired
// to the stores + the command bus (canvas/sim) + shared file actions.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import packageJson from '../../../package.json'
import { isTauri } from '@tauri-apps/api/core'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useCommandStore } from '@/store/commandStore'
import { useFileActions } from '@/hooks/useFileActions'
import { applyAutoLayout } from '@/utils/layout'
import { toast } from '@/store/toastStore'
import { isPDAType, isTMType } from '@/engines/core/utils'
import type { MachineType } from '@/engines/core/types'
import logoUrl from '@/assets/logo.png'

type Item =
  | { kind: 'sep' }
  | { kind: 'header'; label: string }
  | { kind: 'action'; label: string; accel?: string; onClick: () => void; disabled?: boolean; checked?: boolean }
  | { kind: 'submenu'; label: string; items: Item[]; disabled?: boolean }

const TYPES: { value: MachineType; label: string }[] = [
  { value: 'DFA', label: 'DFA' },
  { value: 'NFA', label: 'NFA' },
  { value: 'ENFA', label: 'ε-NFA' },
  { value: 'DPDA', label: 'DPDA' },
  { value: 'NPDA', label: 'NPDA' },
  { value: 'TM', label: 'TM' },
  { value: 'LBA', label: 'LBA' },
]

function transitionFormat(type: MachineType): 'fa' | 'pda' | 'tm' {
  if (isPDAType(type)) return 'pda'
  if (isTMType(type)) return 'tm'
  return 'fa'
}

function MenuPopup({ items, onClose, nested }: { items: Item[]; onClose: () => void; nested?: boolean }) {
  const [openSub, setOpenSub] = useState<number | null>(null)
  return (
    <div className="menupop" role="menu" style={nested ? { top: -5, left: '100%' } : undefined}>
      {items.map((it, i) => {
        if (it.kind === 'sep') return <div key={i} className="menupop-sep" />
        if (it.kind === 'header') return <div key={i} className="menupop-head">{it.label}</div>
        if (it.kind === 'submenu') {
          return (
            <div
              key={i}
              style={{ position: 'relative' }}
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}
            >
              <button className={`menupop-item ${openSub === i ? 'sub-open' : ''}`} role="menuitem" disabled={it.disabled}>
                {it.label}
                <span className="mi-caret">▶</span>
              </button>
              {openSub === i && !it.disabled && <MenuPopup items={it.items} onClose={onClose} nested />}
            </div>
          )
        }
        return (
          <button
            key={i}
            className="menupop-item"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => { if (!it.disabled) { it.onClick(); onClose() } }}
          >
            {it.checked && <span className="mi-check">✓</span>}
            {it.label}
            {it.accel && <span className="mi-acc">{it.accel}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default function MenuBar() {
  const [open, setOpen] = useState<string | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const { machine, setMachineType, undo, redo, past, future, loadMachine } = useMachineStore()
  const status = useSimulationStore((s) => s.status)
  const stepCount = useSimulationStore((s) => s.stepCount)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const requestFitView = useUIStore((s) => s.requestFitView)
  const openModal = useUIStore((s) => s.openModal)
  const panelCollapsed = useUIStore((s) => s.panelCollapsed)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const canvas = useCommandStore((s) => s.canvas)
  const sim = useCommandStore((s) => s.sim)
  const file = useFileActions({ bindKeys: true })

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const canEdit = status !== 'running'
  const isDone = status === 'accepted' || status === 'rejected' || status === 'stuck' || status === 'error'
  const isIdle = status === 'idle'

  const handleType = (newType: MachineType) => {
    const oldType = machine.type
    if (newType === oldType) return
    setMachineType(newType)
    clearSelection()
    const formatChanged = transitionFormat(oldType) !== transitionFormat(newType)
    if (formatChanged && machine.transitions.length > 0) {
      const fmt = transitionFormat(newType) === 'pda' ? 'read, pop → push'
        : transitionFormat(newType) === 'tm' ? 'read → write, dir' : 'input symbols'
      toast.warning(`Switched to ${newType}. Existing transitions now use a different format (${fmt}) — re-check their labels.`)
    } else {
      toast.info(`Machine type set to ${newType}.`)
    }
  }

  const handleAutoLayout = async () => {
    try {
      const laid = await applyAutoLayout(machine)
      loadMachine(laid, false)
      requestFitView()
    } catch (err) {
      toast.error('Auto layout failed.')
      console.error('Auto layout error:', err)
    }
  }

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update) {
        const yes = window.confirm(`Update to ${update.version} is available!\nRelease notes: ${update.body}\n\nDownload and install?`)
        if (yes) {
          await update.downloadAndInstall()
          toast.success('Update installed. Please restart the application.', 8000)
        }
      } else {
        toast.info('You are on the latest version.')
      }
    } catch (error) {
      const msg = String(error).toLowerCase()
      if (msg.includes('404') || msg.includes('not found')) toast.info('You are on the latest version (no releases found).')
      else toast.error('Failed to check for updates. Check your internet connection or the update server.')
      console.error('Update check error:', error)
    } finally {
      setCheckingUpdate(false)
    }
  }

  const openGitHub = () => {
    const url = 'https://github.com/reeshavsinha/AutomataLab'
    if (isTauri()) import('@tauri-apps/plugin-shell').then(({ open }) => open(url))
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleExit = () => {
    if (isTauri()) import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().close())
  }

  const recentItems: Item[] = file.recentFiles.length > 0
    ? [
        ...file.recentFiles.map((f) => ({ kind: 'action' as const, label: f.name, onClick: () => file.handleOpenRecent(f) })),
        { kind: 'sep' as const },
        { kind: 'action' as const, label: 'Clear recent', onClick: file.handleClearRecent },
      ]
    : [{ kind: 'action' as const, label: '(no recent files)', onClick: () => {}, disabled: true }]

  const menus: { id: string; label: string; items: Item[] }[] = [
    {
      id: 'file', label: 'File', items: [
        { kind: 'action', label: 'New', accel: 'Ctrl+N', onClick: file.handleNew },
        { kind: 'action', label: 'Open…', accel: 'Ctrl+O', onClick: file.handleOpen },
        { kind: 'submenu', label: 'Open Recent', items: recentItems },
        { kind: 'sep' },
        { kind: 'action', label: 'Save', accel: 'Ctrl+S', onClick: file.handleSave },
        { kind: 'action', label: 'Save As…', accel: 'Ctrl+Shift+S', onClick: file.handleSaveAs },
        { kind: 'sep' },
        { kind: 'action', label: 'Export…', onClick: () => openModal('export') },
        ...(isTauri() ? [{ kind: 'sep' as const }, { kind: 'action' as const, label: 'Exit', onClick: handleExit }] : []),
      ],
    },
    {
      id: 'edit', label: 'Edit', items: [
        { kind: 'action', label: 'Undo', accel: 'Ctrl+Z', onClick: () => { clearSelection(); undo() }, disabled: !(past.length > 0 && canEdit) },
        { kind: 'action', label: 'Redo', accel: 'Ctrl+Y', onClick: () => { clearSelection(); redo() }, disabled: !(future.length > 0 && canEdit) },
        { kind: 'sep' },
        { kind: 'action', label: 'Cut', accel: 'Ctrl+X', onClick: () => canvas?.cut(), disabled: !canvas?.hasSelection || !canEdit },
        { kind: 'action', label: 'Copy', accel: 'Ctrl+C', onClick: () => canvas?.copy(), disabled: !canvas?.hasSelection },
        { kind: 'action', label: 'Paste', accel: 'Ctrl+V', onClick: () => canvas?.paste(), disabled: !canvas?.hasClipboard || !canEdit },
        { kind: 'action', label: 'Delete', accel: 'Del', onClick: () => canvas?.deleteSelection(), disabled: !canvas?.hasSelection || !canEdit },
        { kind: 'sep' },
        { kind: 'action', label: 'Select All', accel: 'Ctrl+A', onClick: () => canvas?.selectAll() },
        { kind: 'action', label: 'Add State', accel: 'N', onClick: () => canvas?.addState(), disabled: !canEdit },
      ],
    },
    {
      id: 'view', label: 'View', items: [
        { kind: 'action', label: 'Zoom In', onClick: () => canvas?.zoomIn() },
        { kind: 'action', label: 'Zoom Out', onClick: () => canvas?.zoomOut() },
        { kind: 'action', label: 'Fit to View', onClick: () => canvas?.fit() },
        { kind: 'sep' },
        { kind: 'action', label: 'Auto Layout', onClick: handleAutoLayout },
        { kind: 'action', label: panelCollapsed ? 'Show Side Panel' : 'Hide Side Panel', onClick: togglePanel },
        { kind: 'sep' },
        { kind: 'action', label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', onClick: toggleTheme },
      ],
    },
    {
      id: 'machine', label: 'Machine', items: [
        { kind: 'header', label: 'Machine type' },
        ...TYPES.map((t) => ({ kind: 'action' as const, label: t.label, checked: machine.type === t.value, onClick: () => handleType(t.value), disabled: !canEdit })),
      ],
    },
    {
      id: 'simulate', label: 'Simulate', items: [
        { kind: 'action', label: sim?.isPlaying ? 'Pause' : 'Run', accel: 'Space', onClick: () => sim?.play(), disabled: !sim || (isDone && !sim.isPlaying) },
        { kind: 'action', label: 'Step Forward', accel: '→', onClick: () => sim?.step(), disabled: !sim || isDone },
        { kind: 'action', label: 'Step Back', accel: '←', onClick: () => sim?.stepBack(), disabled: !sim || stepCount === 0 },
        { kind: 'action', label: 'Reset', accel: 'R', onClick: () => sim?.reset(), disabled: !sim || isIdle },
        { kind: 'sep' },
        { kind: 'action', label: 'Batch test…', onClick: () => openModal('batch') },
      ],
    },
    {
      id: 'convert', label: 'Convert', items: [
        { kind: 'action', label: 'Conversions / Transform…', onClick: () => openModal('convert') },
        { kind: 'sep' },
        { kind: 'header', label: 'Available' },
        { kind: 'action', label: 'NFA → DFA, ε-NFA → NFA', onClick: () => openModal('convert') },
        { kind: 'action', label: 'Minimize DFA', onClick: () => openModal('convert') },
        { kind: 'action', label: 'Regex → NFA, CFG → PDA', onClick: () => openModal('convert') },
      ],
    },
    {
      id: 'help', label: 'Help', items: [
        { kind: 'action', label: 'Help & Keyboard Shortcuts', accel: 'F1', onClick: () => openModal('help') },
        { kind: 'sep' },
        { kind: 'action', label: checkingUpdate ? 'Checking for updates…' : 'Check for Updates…', onClick: handleCheckUpdate, disabled: checkingUpdate },
        { kind: 'action', label: 'View on GitHub', onClick: openGitHub },
        { kind: 'sep' },
        { kind: 'action', label: `AutomataLab v${packageJson.version}`, onClick: () => {}, disabled: true },
      ],
    },
  ]

  // F1 → Help (a classic shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F1') { e.preventDefault(); openModal('help') } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openModal])

  const handleMinimize = async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  }

  const handleToggleMaximize = async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const isMax = await win.isMaximized()
    if (isMax) {
      await win.unmaximize()
    } else {
      await win.maximize()
    }
  }

  const handleClose = async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  }

  const handleDrag = async (e: React.PointerEvent) => {
    if (e.button !== 0 || !isTauri()) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error('Failed to start drag', err);
    }
  };

  return (
    <div className="menubar" ref={barRef} data-tauri-drag-region onPointerDown={handleDrag}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-tauri-drag-region>
        <a
          className="menubar-brand"
          href="https://github.com/reeshavsinha/AutomataLab"
          onClick={(e) => { e.preventDefault(); openGitHub() }}
          title={`AutomataLab v${packageJson.version}`}
          rel="noopener noreferrer"
        >
          <img
            src={logoUrl}
            alt="AutomataLab Logo"
            style={{
              width: '14px',
              height: '14px',
              objectFit: 'contain'
            }}
          />
          AutomataLab
        </a>
        {menus.map((m, index) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
            {index > 0 && <div style={{ width: '1px', height: '16px', backgroundColor: 'currentColor', opacity: 0.4, margin: '0 6px' }} />}
            <div
              style={{ position: 'relative', display: 'flex' }}
              onMouseEnter={() => { if (open && open !== m.id) setOpen(m.id) }}
            >
              <button
                className={`menubar-item ${open === m.id ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={open === m.id}
                onClick={() => setOpen(open === m.id ? null : m.id)}
              >
                {m.label}
              </button>
              {open === m.id && <MenuPopup items={m.items} onClose={() => setOpen(null)} />}
            </div>
          </div>
        ))}
      </div>

      {isTauri() && (
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button
            onClick={handleMinimize}
            className="win-btn"
            title="Minimize"
            aria-label="Minimize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1.5" y1="5" x2="8.5" y2="5" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={handleToggleMaximize}
            className="win-btn"
            title="Maximize"
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button
            onClick={handleClose}
            className="win-btn close-btn"
            title="Close"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
