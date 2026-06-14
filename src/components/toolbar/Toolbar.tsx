// ============================================================
// Toolbar — Top navigation bar. Black & white styling.
// Includes logo, machine name, type selector, edit/theme/help
// controls, and the File menu (with recent files).
// ============================================================

import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useState, useEffect } from 'react'
import packageJson from '../../../package.json'
import { isTauri } from '@tauri-apps/api/core'
import { applyAutoLayout } from '@/utils/layout'
import { toast } from '@/store/toastStore'
import { isPDAType, isTMType } from '@/engines/core/utils'
import type { MachineType } from '@/engines/core/types'
import HelpModal from '@/components/layout/HelpModal'
import ExportModal from '@/components/layout/ExportModal'
import FileControls from '@/components/toolbar/FileControls'

const TYPE_LABELS: Record<MachineType, string> = {
  DFA: 'DFA',
  NFA: 'NFA',
  ENFA: 'ε-NFA',
  DPDA: 'DPDA',
  NPDA: 'NPDA',
  TM: 'TM',
  LBA: 'LBA',
}

/** The transition-label "shape" for a machine type — drives the type-switch warning. */
function transitionFormat(type: MachineType): 'fa' | 'pda' | 'tm' {
  if (isPDAType(type)) return 'pda'
  if (isTMType(type)) return 'tm'
  return 'fa'
}

const tmSettingLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.06em',
}

const tmSettingInputStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 6px',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
  outline: 'none',
}

export default function Toolbar() {
  const {
    machine, setMachineName, setMachineType, setAlphabet,
    setStackAlphabet, setTapeAlphabet,
    setBlankSymbol, setStepLimit, setTapeCount,
    loadMachine, undo, redo, past, future,
  } = useMachineStore()
  const status = useSimulationStore((s) => s.status)
  const { theme, toggleTheme, clearSelection, requestFitView } = useUIStore()

  // Edits (undo/redo included) are allowed unless a run is actively in progress;
  // a finished run is editable too — any edit auto-resets it (see useSimulation).
  const canEdit = status !== 'running'
  const canUndo = past.length > 0 && canEdit
  const canRedo = future.length > 0 && canEdit
  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  // Multi-tape is a (single-tape-bounded) plain-TM feature; LBA stays single-tape.
  const isPlainTM = machine.type === 'TM'

  const [alphabetInput, setAlphabetInput] = useState(machine.alphabet?.join(', ') || '')
  const [isFocused, setIsFocused] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [blankInput, setBlankInput] = useState(machine.blankSymbol ?? '')
  const [limitInput, setLimitInput] = useState(machine.stepLimit != null ? String(machine.stepLimit) : '')
  const [tapesInput, setTapesInput] = useState(machine.tapeCount != null ? String(machine.tapeCount) : '')
  const [gammaInput, setGammaInput] = useState((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
  const [gammaFocused, setGammaFocused] = useState(false)

  const handleAutoLayout = async () => {
    try {
      const layoutedMachine = await applyAutoLayout(machine)
      // Rearranging positions is an unsaved modification, keep the tab dirty.
      loadMachine(layoutedMachine, false)
      requestFitView()
    } catch (err) {
      toast.error('Auto layout failed.')
      console.error('Auto layout error:', err)
    }
  }

  const handleTypeChange = (newType: MachineType) => {
    const oldType = machine.type
    if (newType === oldType) return
    setMachineType(newType)
    clearSelection()

    const formatChanged = transitionFormat(oldType) !== transitionFormat(newType)
    if (formatChanged && machine.transitions.length > 0) {
      const fmt =
        transitionFormat(newType) === 'pda' ? 'read, pop → push'
        : transitionFormat(newType) === 'tm' ? 'read → write, dir'
        : 'input symbols'
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

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true)
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

  // Keep the TM/LBA settings in sync when the active machine changes (tab switch,
  // file load, undo/redo). Driven off the machine, not local edits.
  useEffect(() => {
    setBlankInput(machine.blankSymbol ?? '')
    setLimitInput(machine.stepLimit != null ? String(machine.stepLimit) : '')
    setTapesInput(machine.tapeCount != null ? String(machine.tapeCount) : '')
  }, [machine.id, machine.blankSymbol, machine.stepLimit, machine.tapeCount])

  // Mirror the declared Γ (stack for PDA, tape for TM). Don't clobber mid-typing.
  useEffect(() => {
    if (!gammaFocused) {
      setGammaInput((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
    }
  }, [machine.id, machine.stackAlphabet, machine.tapeAlphabet, gammaFocused])

  const commitGamma = () => {
    const syms = gammaInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (isPDA) setStackAlphabet(syms)
    else if (isTM) setTapeAlphabet(syms)
  }

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
              import('@tauri-apps/plugin-shell').then(({ open }) => open(url))
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

      {/* Title Input — bordered so it's clearly an editable field */}
      <input
        type="text"
        value={machine.name}
        onChange={(e) => setMachineName(e.target.value)}
        placeholder="Machine name"
        title="Rename this machine"
        spellCheck={false}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          outline: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          width: '160px',
          padding: '4px 8px',
          transition: 'border-color 150ms ease, background 150ms ease',
        }}
        onMouseEnter={(e) => {
          if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border-default)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.background = 'var(--bg-elevated)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.background = 'var(--bg-card)'
        }}
      />

      {/* Undo / Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          style={iconButtonStyle(canUndo)}
        >
          ↶
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
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
            <option value="TM">TM</option>
            <option value="LBA">LBA</option>
          </select>
        </div>
      </div>

      {/* Declared alphabet Γ — stack alphabet for PDA, tape alphabet for TM/LBA.
          Optional/declarative: the validator warns on out-of-Γ symbols (UX #7). */}
      {(isPDA || isTM) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
          <span
            style={tmSettingLabelStyle}
            title={isPDA
              ? 'Stack alphabet Γ (optional). Symbols the PDA may push/pop.'
              : 'Tape alphabet Γ (optional). Symbols the TM may read/write; should include the blank.'}
          >
            {isPDA ? 'STACK (Γ)' : 'TAPE (Γ)'}
          </span>
          <input
            type="text"
            value={gammaInput}
            onChange={(e) => setGammaInput(e.target.value)}
            onFocus={(e) => { setGammaFocused(true); e.target.style.borderColor = 'var(--border-strong)' }}
            onBlur={(e) => { setGammaFocused(false); e.target.style.borderColor = 'var(--border-default)'; commitGamma() }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder={isPDA ? 'e.g. Z, A, B' : 'e.g. 0, 1, X, _'}
            title="Comma-separated symbols. Leave blank to skip the Γ check."
            style={{ ...tmSettingInputStyle, width: '120px' }}
          />
        </div>
      )}

      {/* TM/LBA settings — blank symbol + infinite-loop step limit (NFR-8) */}
      {isTM && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
          <span style={tmSettingLabelStyle} title="The symbol shown on every blank tape cell">BLANK</span>
          <input
            type="text"
            value={blankInput}
            maxLength={1}
            onChange={(e) => setBlankInput(e.target.value)}
            onBlur={() => setBlankSymbol(blankInput)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="_"
            title="Blank tape symbol (default '_')"
            style={{ ...tmSettingInputStyle, width: '34px', textAlign: 'center' }}
          />
          <span style={tmSettingLabelStyle} title="Max steps before halting as 'stuck' (infinite-loop guard)">LIMIT</span>
          <input
            type="number"
            min={1}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            onBlur={() => setStepLimit(limitInput.trim() === '' ? undefined : Number(limitInput))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="10000"
            title="Step limit before the run halts as 'stuck' (default 10,000)"
            style={{ ...tmSettingInputStyle, width: '64px' }}
          />
          {isPlainTM && (
            <>
              <span style={tmSettingLabelStyle} title="Number of tapes the machine reads/writes in parallel">TAPES</span>
              <input
                type="number"
                min={1}
                max={9}
                value={tapesInput}
                onChange={(e) => setTapesInput(e.target.value)}
                onBlur={() => setTapeCount(tapesInput.trim() === '' ? 1 : Number(tapesInput))}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="1"
                title="Number of tapes (1 = single-tape). Each transition reads/writes one symbol per tape."
                style={{ ...tmSettingInputStyle, width: '44px' }}
              />
            </>
          )}
        </div>
      )}

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

      {/* Overflow — low-frequency actions live here so the bar isn't crowded
          with peers of the primary tools (UX audit S4). */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOverflowOpen((o) => !o)}
          title="More — theme, help, updates"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={overflowOpen}
          style={iconButtonStyle(true)}
        >
          ⋯
        </button>
        {overflowOpen && (
          <>
            <div onClick={() => setOverflowOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: '34px',
                right: 0,
                zIndex: 1001,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '210px',
                overflow: 'hidden',
                padding: '4px 0',
              }}
            >
              <OverflowItem
                icon="⤓"
                label="Export data (δ-table, trace, tree)…"
                onClick={() => { setIsExportOpen(true); setOverflowOpen(false) }}
              />
              <OverflowItem
                icon={theme === 'dark' ? '☀' : '🌙'}
                label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => { toggleTheme(); setOverflowOpen(false) }}
              />
              <OverflowItem
                icon="?"
                label="Help & keyboard shortcuts"
                onClick={() => { setIsHelpOpen(true); setOverflowOpen(false) }}
              />
              <OverflowItem
                icon="⭳"
                label={isCheckingUpdate ? 'Checking for updates…' : 'Check for updates'}
                disabled={isCheckingUpdate}
                onClick={() => { setOverflowOpen(false); handleCheckUpdate() }}
              />
            </div>
          </>
        )}
      </div>

      {/* File operations — New / Open / Save */}
      <FileControls />

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
      {isExportOpen && <ExportModal onClose={() => setIsExportOpen(false)} />}
    </div>
  )
}

function OverflowItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        padding: '8px 12px',
        fontSize: '13px',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span style={{ width: '16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{icon}</span>
      {label}
    </button>
  )
}
