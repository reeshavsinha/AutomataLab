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
import { useHistoryStore } from '@/store/historyStore'
import { applyAutoLayout } from '@/utils/layout'
import { toast } from '@/store/toastStore'
import { isPDAType, isTMType, generateId } from '@/engines/machine/core/utils'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import type { MachineType, MachineDefinition } from '@/engines/machine/core/types'
import { EXAMPLES, EXAMPLE_TYPES_BY_WORKSPACE, groupedExamples } from '@/utils/examples'
import { shouldSuppressGlobalShortcut } from '@/utils/keyboardShortcuts'
import logoUrl from '@/assets/logo-transparent.svg'

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
            onMouseDown={(e) => e.preventDefault()}
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

  const { machine, setMachineType, loadMachine, activeTabIndex } = useMachineStore()
  
  // Hash routing for workspace-agnostic features
  const [route, setRoute] = useState(window.location.hash)
  
  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const isHub = route === '#/' || route === ''
  const workspaceType: 'machine' | 'grammar' | 'parser' | 'regex' | 'hub' = 
    isHub ? 'hub' :
    route === '#/grammar' ? 'grammar' :
    route === '#/parser' ? 'parser' : 
    route === '#/regex' ? 'regex' : 'machine'

  const tabId = machine?.id ?? 'global'

  // Grammar and parser edits are stored as snapshots of the active machine tab,
  // using the same history namespace as canvas edits.
  const historyStack = useHistoryStore(s => s.stacks[`machine:${tabId}`])
  const canUndo = (historyStack?.past.length ?? 0) > 0
  const canRedo = (historyStack?.future.length ?? 0) > 0

  const handleGlobalUndo = () => {
    clearSelection();
    if (machine) useMachineStore.getState().undo();
  }

  const handleGlobalRedo = () => {
    clearSelection();
    if (machine) useMachineStore.getState().redo();
  }
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
    const oldType = machine?.type
    if (newType === oldType) return
    setMachineType(newType)
    clearSelection()
    const formatChanged = transitionFormat(oldType) !== transitionFormat(newType)
    if (formatChanged && (machine?.transitions.length ?? 0) > 0) {
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

  const handleGlobalCut = async () => {
    const target = document.activeElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      document.execCommand('cut');
    } else {
      canvas?.cut();
    }
  };

  const handleGlobalCopy = async () => {
    const target = document.activeElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      document.execCommand('copy');
    } else {
      canvas?.copy();
    }
  };

  const handleGlobalPaste = async () => {
    const target = document.activeElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      try {
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
      } catch (err) {
        document.execCommand('paste');
      }
    } else {
      canvas?.paste();
    }
  };

  const handleGlobalSelectAll = () => {
    const target = document.activeElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.select();
    } else {
      canvas?.selectAll();
    }
  };

  const exampleWorkspace: 'machine' | 'grammar' | 'parser' =
    workspaceType === 'grammar' ? 'grammar' :
    workspaceType === 'parser' ? 'parser' :
    'machine'

  const loadExampleItems: Item[] = groupedExamples(EXAMPLE_TYPES_BY_WORKSPACE[exampleWorkspace]).map((g) => ({
    kind: 'submenu',
    label: `${g.type} (${g.items.length})`,
    items: g.items.map(([key, ex]) => ({
      kind: 'action' as const,
      label: ex.name,
      onClick: () => {
        loadMachine({ ...EXAMPLES[key], id: generateId('machine') } as MachineDefinition, true)
        setTimeout(requestFitView, 50)
        toast.success(`Loaded example: ${ex.name}`)
      },
    })),
  }))

  const menus: { id: string; label: string; items: Item[] }[] = [
    {
      id: 'file', label: 'File', items: [
        { kind: 'action', label: 'New', accel: 'Ctrl+N', onClick: file.handleNew, disabled: isHub },
        { kind: 'action', label: 'Open…', accel: 'Ctrl+O', onClick: file.handleOpen, disabled: isHub || workspaceType !== 'machine' },
        { kind: 'submenu', label: 'Open Recent', items: recentItems, disabled: isHub || workspaceType !== 'machine' },
        { kind: 'submenu', label: 'Load Example', items: loadExampleItems, disabled: isHub },
        { kind: 'sep' },
        { kind: 'action', label: 'Save', accel: 'Ctrl+S', onClick: file.handleSave, disabled: isHub || workspaceType !== 'machine' },
        { kind: 'action', label: 'Save As…', accel: 'Ctrl+Shift+S', onClick: file.handleSaveAs, disabled: isHub || workspaceType !== 'machine' },
        { kind: 'sep' },
        { kind: 'action', label: 'Go to Workspace Hub', onClick: () => { window.location.hash = '#/'; }, disabled: isHub },
        ...(isTauri() ? [{ kind: 'sep' as const }, { kind: 'action' as const, label: 'Exit', onClick: handleExit }] : []),
      ],
    },
    {
      id: 'edit', label: 'Edit', items: [
        { kind: 'action', label: 'Undo', accel: 'Ctrl+Z', onClick: handleGlobalUndo, disabled: isHub || !(canUndo && canEdit) },
        { kind: 'action', label: 'Redo', accel: 'Ctrl+Y', onClick: handleGlobalRedo, disabled: isHub || !(canRedo && canEdit) },
        { kind: 'sep' },
        { kind: 'action', label: 'Cut', accel: 'Ctrl+X', onClick: handleGlobalCut, disabled: isHub || !canEdit },
        { kind: 'action', label: 'Copy', accel: 'Ctrl+C', onClick: handleGlobalCopy, disabled: isHub },
        { kind: 'action', label: 'Paste', accel: 'Ctrl+V', onClick: handleGlobalPaste, disabled: isHub || !canEdit },
        { kind: 'action', label: 'Delete', accel: 'Del', onClick: () => canvas?.deleteSelection(), disabled: isHub || !canEdit },
        { kind: 'sep' },
        { kind: 'action', label: 'Select All', accel: 'Ctrl+A', onClick: handleGlobalSelectAll, disabled: isHub },
      ],
    },
    {
      id: 'view', label: 'View', items: [
        { kind: 'action', label: 'Zoom In', onClick: () => canvas?.zoomIn(), disabled: isHub || !canvas },
        { kind: 'action', label: 'Zoom Out', onClick: () => canvas?.zoomOut(), disabled: isHub || !canvas },
        { kind: 'action', label: 'Fit to View', onClick: () => canvas?.fit(), disabled: isHub || !canvas },
        { kind: 'sep' },
        { kind: 'action', label: panelCollapsed ? 'Show Side Panel' : 'Hide Side Panel', onClick: togglePanel, disabled: isHub },
        { kind: 'sep' },
        { kind: 'action', label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', onClick: toggleTheme },
      ],
    },
    {
      id: 'help', label: 'Help', items: [
        { kind: 'action', label: 'User Manual', accel: 'F1', onClick: () => openModal('manual') },
        { kind: 'action', label: 'Theory Handbook', accel: 'F2', onClick: () => openModal('theory') },
        { kind: 'action', label: 'Help & Keyboard Shortcuts', onClick: () => openModal('help') },
        { kind: 'sep' },
        { kind: 'action', label: checkingUpdate ? 'Checking for updates…' : 'Check for Updates…', onClick: handleCheckUpdate, disabled: checkingUpdate },
        { kind: 'action', label: 'View on GitHub', onClick: openGitHub },
        { kind: 'sep' },
        { kind: 'action', label: `AutomataLab v${packageJson.version}`, onClick: () => {}, disabled: true },
      ],
    },
  ]

  // Global Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (shouldSuppressGlobalShortcut(e.target)) return
      if (e.key === 'F1') { e.preventDefault(); openModal('manual') }
      if (e.key === 'F2') { e.preventDefault(); openModal('theory') }
    }
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
          href="#/"
          onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; }}
          title={`AutomataLab v${packageJson.version} (Go to Hub)`}
          rel="noopener noreferrer"
        >
          <img
            src={logoUrl}
            alt="AutomataLab Logo"
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain',
              transform: 'translateY(-1.5px)'
            }}
          />
          AutomataLab
        </a>
        {menus.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center' }} data-tauri-drag-region>
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
