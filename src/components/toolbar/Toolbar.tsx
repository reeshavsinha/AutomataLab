// ============================================================
// Toolbar — Top navigation bar. Black & white styling.
// Includes logo, machine name, type selector, edit/theme/help
// controls, and the File menu (with recent files).
// ============================================================

import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useState, useEffect, useRef } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import packageJson from '../../../package.json'
import { saveMachine, loadMachine as loadFromFile, loadMachineFromPath } from '@/utils/fileManager'
import { getRecentFiles, removeRecentFile, clearRecentFiles, type RecentFile } from '@/utils/recentFiles'
import { isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-shell'
import { applyAutoLayout } from '@/utils/layout'
import { toast } from '@/store/toastStore'
import { isPDAType } from '@/engines/core/utils'
import type { MachineType } from '@/engines/core/types'
import HelpModal from '@/components/layout/HelpModal'

const TYPE_LABELS: Record<MachineType, string> = {
  DFA: 'DFA',
  NFA: 'NFA',
  ENFA: 'ε-NFA',
  DPDA: 'DPDA',
  NPDA: 'NPDA',
}

export default function Toolbar() {
  const {
    machine, activeTabIndex, setMachineName, setMachineType, setAlphabet,
    addTab, loadMachine, markTabSaved, undo, redo, past, future,
  } = useMachineStore()
  const status = useSimulationStore((s) => s.status)
  const { theme, toggleTheme, clearSelection, requestFitView } = useUIStore()

  const isIdle = status === 'idle'
  const canUndo = past.length > 0 && isIdle
  const canRedo = future.length > 0 && isIdle

  const [alphabetInput, setAlphabetInput] = useState(machine.alphabet?.join(', ') || '')
  const [isFocused, setIsFocused] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNew = () => {
    addTab()
    setIsFileMenuOpen(false)
  }

  const handleLoad = async () => {
    setIsFileMenuOpen(false)
    try {
      const { def } = await loadFromFile()
      loadMachine(def)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
    } catch (err) {
      if (err instanceof Error && err.message !== 'No file selected') {
        toast.error(err.message)
      }
    }
  }

  const handleOpenRecent = async (file: RecentFile) => {
    setIsFileMenuOpen(false)
    try {
      const def = await loadMachineFromPath(file.path)
      loadMachine(def)
      requestFitView()
      toast.success(`Opened "${def.name}".`)
    } catch (err) {
      removeRecentFile(file.path)
      toast.error(`Could not open "${file.name}". It may have been moved or deleted.`)
    }
  }

  const handleClearRecent = () => {
    clearRecentFiles()
    setIsFileMenuOpen(false)
    toast.info('Recent files cleared.')
  }

  const handleSave = async () => {
    setIsFileMenuOpen(false)
    try {
      const saved = await saveMachine(machine)
      if (saved) {
        markTabSaved(activeTabIndex)
        toast.success(`Saved "${machine.name}".`)
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message)
    }
  }

  const handleAutoLayout = () => {
    const layoutedMachine = applyAutoLayout(machine)
    // Rearranging positions is an unsaved modification, keep the tab dirty.
    loadMachine(layoutedMachine, false)
    requestFitView()
  }

  const handleTypeChange = (newType: MachineType) => {
    const oldType = machine.type
    if (newType === oldType) return
    setMachineType(newType)
    clearSelection()

    const formatChanged = isPDAType(oldType) !== isPDAType(newType)
    if (formatChanged && machine.transitions.length > 0) {
      const fmt = isPDAType(newType) ? 'read, pop → push' : 'input symbols'
      toast.warning(
        `Switched to ${TYPE_LABELS[newType]}. Existing transitions now use a different format (${fmt}) — re-check their labels.`
      )
    } else {
      toast.info(`Machine type set to ${TYPE_LABELS[newType]}.`)
    }
  }

  const handleUndo = () => {
    if (!canUndo) return
    clearSelection()
    undo()
  }

  const handleRedo = () => {
    if (!canRedo) return
    clearSelection()
    redo()
  }

  const menuItemStyle: React.CSSProperties = {
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
  }

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    try {
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
      const errMsg = String(error).toLowerCase()
      if (errMsg.includes('404') || errMsg.includes('not found')) {
        toast.info('You are on the latest version (no releases found).')
      } else {
        toast.error('Failed to check for updates. Check your internet connection or the update server.')
      }
      console.error("Update check error:", error)
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  useEffect(() => {
    if (!isFocused) {
      setAlphabetInput(machine.alphabet?.join(', ') || '')
    }
  }, [machine.alphabet, isFocused])

  const iconButtonStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '28px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    color: enabled ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: '14px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.4,
    outline: 'none',
    padding: 0,
  })

  const recentFiles = isTauri() ? getRecentFiles() : []

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      height: '48px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0,
      gap: '16px',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a 
          href="https://github.com/reeshavsinha/AutomataLab"
          onClick={(e) => {
            // Always handle navigation ourselves so the link opens exactly once.
            // (A bare <a target="_blank"> inside the Tauri webview would also be
            // opened natively, resulting in two browser tabs.)
            e.preventDefault()
            const url = 'https://github.com/reeshavsinha/AutomataLab'
            if (isTauri()) {
              void open(url)
            } else {
              window.open(url, '_blank', 'noopener,noreferrer')
            }
          }}
          rel="noopener noreferrer"
          title={`Version ${packageJson.version}`}
          style={{
            fontWeight: 800,
            fontSize: '14px',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            textDecoration: 'none',
            cursor: 'pointer'
          }}>
          AutomataLab
        </a>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />

      {/* Title Input */}
      <input
        type="text"
        value={machine.name}
        onChange={(e) => setMachineName(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          width: '140px',
        }}
      />

      {/* Undo / Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={iconButtonStyle(canUndo)}
        >
          ↶
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={iconButtonStyle(canRedo)}
        >
          ↷
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Alphabet Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}>
          ALPHABET (Σ)
        </span>
        <input
          type="text"
          value={alphabetInput}
          onChange={(e) => setAlphabetInput(e.target.value)}
          placeholder="e.g. a, b, c"
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => {
            setIsFocused(true)
            e.target.style.borderColor = 'var(--border-strong)'
          }}
          onBlur={(e) => {
            setIsFocused(false)
            e.target.style.borderColor = 'var(--border-default)'
            const symbols = alphabetInput.split(',').map(s => s.trim()).filter(Boolean)
            setAlphabet(symbols)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', marginLeft: '12px', marginRight: '12px' }} />

      {/* Machine Type Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}>
          TYPE
        </span>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={machine.type}
            onChange={(e) => handleTypeChange(e.target.value as MachineType)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '4px 28px 4px 8px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23888888' d='M0 0l5 5 5-5z'/></svg>")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '10px 6px',
            }}
          >
            <option value="DFA">DFA</option>
            <option value="NFA">NFA</option>
            <option value="ENFA">ε-NFA</option>
            <option value="DPDA">DPDA</option>
            <option value="NPDA">NPDA</option>
          </select>
        </div>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', marginLeft: '12px', marginRight: '12px' }} />

      {/* Auto Layout Button */}
      <button
        onClick={handleAutoLayout}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          padding: '4px 12px',
          outline: 'none',
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
        title="Automatically arrange diagram"
      >
        AUTO LAYOUT
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={iconButtonStyle(true)}
      >
        {theme === 'dark' ? '☀' : '🌙'}
      </button>

      {/* Help */}
      <button
        onClick={() => setIsHelpOpen(true)}
        title="Help & keyboard shortcuts"
        style={iconButtonStyle(true)}
      >
        ?
      </button>

      {/* Update Check Button */}
      <button
        onClick={handleCheckUpdate}
        disabled={isCheckingUpdate}
        style={{
          background: isCheckingUpdate ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          padding: '4px 12px',
          outline: 'none',
          cursor: isCheckingUpdate ? 'not-allowed' : 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        {isCheckingUpdate ? 'CHECKING...' : 'UPDATES'}
      </button>

      {/* File Menu Dropdown */}
      <div style={{ position: 'relative' }} ref={fileMenuRef}>
        <button
          onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
          style={{
            background: isFileMenuOpen ? 'var(--bg-secondary)' : 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            padding: '4px 12px',
            outline: 'none',
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          FILE ▼
        </button>
        
        {isFileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '220px',
            zIndex: 100,
            overflow: 'hidden'
          }}>
            <button 
              onClick={handleNew} 
              style={menuItemStyle}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              New
            </button>
            <button 
              onClick={handleLoad} 
              style={menuItemStyle}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Load
            </button>
            <button 
              onClick={handleSave} 
              style={recentFiles.length > 0 ? menuItemStyle : { ...menuItemStyle, borderBottom: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Save
            </button>

            {recentFiles.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  Recent
                </div>
                {recentFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleOpenRecent(file)}
                    title={file.path}
                    style={{ ...menuItemStyle, fontSize: '11px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </span>
                  </button>
                ))}
                <button
                  onClick={handleClearRecent}
                  style={{ ...menuItemStyle, borderBottom: 'none', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  Clear recent
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  )
}
