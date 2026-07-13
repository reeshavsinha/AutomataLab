// ============================================================
// Toolbar — classic icon toolbar (sits under the MenuBar).
// Grouped, separator-divided icon buttons for the high-frequency
// actions (file / edit / view / run / convert) plus a right-aligned
// compact machine-config cluster (name, type, Σ, and PDA/TM extras).
// Lower-frequency actions live in the MenuBar.
// ============================================================

import { useState, useEffect } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useCommandStore } from '@/store/commandStore'
import { useFileActions } from '@/hooks/useFileActions'
import { applyAutoLayout } from '@/utils/layout'
import { toast } from '@/store/toastStore'
import { isPDAType, isTMType } from '@/engines/machine/core/utils'
import { useHistoryStore } from '@/store/historyStore'
import type { MachineType } from '@/engines/machine/core/types'
import {
  NewIcon, OpenIcon, SaveIcon, ExportIcon,
  UndoIcon, RedoIcon, CutIcon, CopyIcon, PasteIcon, DeleteIcon,
  ZoomInIcon, ZoomOutIcon, FitIcon, LayoutIcon,
  PlayIcon, PauseIcon, StepIcon, StepBackIcon, ResetIcon,
  AnalyzeIcon, ConvertIcon, ThemeIcon, HelpIcon,
} from '@/components/toolbar/icons'

function transitionFormat(type: MachineType): 'fa' | 'pda' | 'tm' {
  if (isPDAType(type)) return 'pda'
  if (isTMType(type)) return 'tm'
  return 'fa'
}

function TbBtn({
  title, onClick, disabled, on, children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  on?: boolean
  children: React.ReactNode
}) {
  return (
    <button className={`tb-btn ${on ? 'on' : ''}`} title={title} aria-label={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

function Sep() {
  return <div className="tb-sep" />
}

export default function Toolbar() {
  const isDemoMode = import.meta.env.VITE_SIMULATOR_MODE === 'true' || window.location.href.includes('demo=true')
  const {
    machine, setMachineName, setMachineType, setAlphabet,
    setStackAlphabet, setTapeAlphabet,
    setBlankSymbol, setStepLimit, setTapeCount,
    loadMachine, undo, redo,
  } = useMachineStore()
  
  const historyStack = useHistoryStore(s => machine ? s.stacks[`machine:${machine.id}`] : null)
  const status = useSimulationStore((s) => s.status)
  const stepCount = useSimulationStore((s) => s.stepCount)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const requestFitView = useUIStore((s) => s.requestFitView)
  const openModal = useUIStore((s) => s.openModal)
  const canvas = useCommandStore((s) => s.canvas)
  const sim = useCommandStore((s) => s.sim)
  const file = useFileActions()

  if (!machine) return null;

  const canEdit = status !== 'running'
  const canUndo = (historyStack?.past.length ?? 0) > 0 && canEdit
  const canRedo = (historyStack?.future.length ?? 0) > 0 && canEdit
  const isDone = status === 'accepted' || status === 'rejected' || status === 'stuck' || status === 'error'
  const isIdle = status === 'idle'
  const isPlaying = !!sim?.isPlaying

  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const isPlainTM = machine.type === 'TM'
  const isGraph = !['CFG', 'CSG', 'CFG_PARSER'].includes(machine.type)

  const [alphabetInput, setAlphabetInput] = useState(machine.alphabet?.join(', ') || '')
  const [alphaFocused, setAlphaFocused] = useState(false)
  const [blankInput, setBlankInput] = useState(machine.blankSymbol ?? '')
  const [limitInput, setLimitInput] = useState(machine.stepLimit != null ? String(machine.stepLimit) : '')
  const [tapesInput, setTapesInput] = useState(machine.tapeCount != null ? String(machine.tapeCount) : '')
  const [gammaInput, setGammaInput] = useState((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
  const [gammaFocused, setGammaFocused] = useState(false)

  useEffect(() => {
    if (!alphaFocused) setAlphabetInput(machine.alphabet?.join(', ') || '')
  }, [machine.alphabet, alphaFocused])

  useEffect(() => {
    setBlankInput(machine.blankSymbol ?? '')
    setLimitInput(machine.stepLimit != null ? String(machine.stepLimit) : '')
    setTapesInput(machine.tapeCount != null ? String(machine.tapeCount) : '')
  }, [machine.id, machine.blankSymbol, machine.stepLimit, machine.tapeCount])

  useEffect(() => {
    if (!gammaFocused) setGammaInput((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
  }, [machine.id, machine.stackAlphabet, machine.tapeAlphabet, gammaFocused])

  const commitGamma = () => {
    const syms = gammaInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (isPDA) setStackAlphabet(syms)
    else if (isTM) setTapeAlphabet(syms)
  }

  const handleTypeChange = (newType: MachineType) => {
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

  return (
    <div className="toolbar-classic">
      {!isDemoMode && (
        <>
          {/* File */}
          <TbBtn title="New (Ctrl+N)" onClick={file.handleNew}><NewIcon /></TbBtn>
          <TbBtn title="Open (Ctrl+O)" onClick={file.handleOpen}><OpenIcon /></TbBtn>
          <TbBtn title={file.isDirty ? 'Save — unsaved changes (Ctrl+S)' : 'Save (Ctrl+S)'} onClick={file.handleSave} on={file.isDirty}><SaveIcon /></TbBtn>
          <Sep />
        </>
      )}

      {/* Edit */}
      <TbBtn title="Undo (Ctrl+Z)" onClick={() => { clearSelection(); undo() }} disabled={!canUndo}><UndoIcon /></TbBtn>
      <TbBtn title="Redo (Ctrl+Y)" onClick={() => { clearSelection(); redo() }} disabled={!canRedo}><RedoIcon /></TbBtn>
      {isGraph && (
        <>
          <TbBtn title="Cut (Ctrl+X)" onClick={() => canvas?.cut()} disabled={!canvas?.hasSelection || !canEdit}><CutIcon /></TbBtn>
          <TbBtn title="Copy (Ctrl+C)" onClick={() => canvas?.copy()} disabled={!canvas?.hasSelection}><CopyIcon /></TbBtn>
          <TbBtn title="Paste (Ctrl+V)" onClick={() => canvas?.paste()} disabled={!canvas?.hasClipboard || !canEdit}><PasteIcon /></TbBtn>
          <TbBtn title="Delete (Del)" onClick={() => canvas?.deleteSelection()} disabled={!canvas?.hasSelection || !canEdit}><DeleteIcon /></TbBtn>
          <Sep />

          {/* View */}
          <TbBtn title="Zoom In" onClick={() => canvas?.zoomIn()}><ZoomInIcon /></TbBtn>
          <TbBtn title="Zoom Out" onClick={() => canvas?.zoomOut()}><ZoomOutIcon /></TbBtn>
          <TbBtn title="Fit to View" onClick={() => canvas?.fit()}><FitIcon /></TbBtn>
          <TbBtn title="Auto Layout" onClick={handleAutoLayout}><LayoutIcon /></TbBtn>
          <Sep />

          {/* Run */}
          <TbBtn title={isPlaying ? 'Pause (Space)' : 'Run (Space)'} onClick={() => sim?.play()} on={isPlaying} disabled={!sim || (isDone && !isPlaying)}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </TbBtn>
          <TbBtn title="Step Back (←)" onClick={() => sim?.stepBack()} disabled={!sim || stepCount === 0}><StepBackIcon /></TbBtn>
          <TbBtn title="Step Forward (→)" onClick={() => sim?.step()} disabled={!sim || isDone}><StepIcon /></TbBtn>
          <TbBtn title="Reset (R)" onClick={() => sim?.reset()} disabled={!sim || isIdle}><ResetIcon /></TbBtn>
          <Sep />
        </>
      )}

      {!isDemoMode && (
        <>
          {/* Analyze / Convert */}
          {isGraph && (
            <>
              <TbBtn title="Analyze (Reachability, Emptiness, Equivalence)" onClick={() => openModal('analysis')}><AnalyzeIcon /></TbBtn>
              <TbBtn title="Convert / transform (NFA→DFA, minimize, Regex→NFA, CFG→PDA…)" onClick={() => openModal('convert')}><ConvertIcon /></TbBtn>
            </>
          )}
          {/* Export available for Graph and Grammar/Parser */}
          <TbBtn title="Export (diagram, δ-table, trace, tree, zipped)" onClick={() => openModal('export')}><ExportIcon /></TbBtn>
        </>
      )}

      <div style={{ flex: 1, minWidth: 8 }} />

      {/* Machine config (compact, right-aligned) */}
      <input
        className="tb-field"
        type="text"
        value={machine.name}
        onChange={(e) => setMachineName(e.target.value)}
        placeholder="Machine name"
        title="Rename this machine"
        spellCheck={false}
        style={{ width: 140, fontWeight: 600 }}
      />

      {isGraph && (
        <>
          <span className="tb-label">TYPE</span>
          <select
            className="tb-select"
            value={machine.type}
            onChange={(e) => handleTypeChange(e.target.value as MachineType)}
            title="Machine type"
          >
            <option value="DFA">DFA</option>
            <option value="NFA">NFA</option>
            <option value="ENFA">ε-NFA</option>
            <option value="DPDA">DPDA</option>
            <option value="NPDA">NPDA</option>
            <option value="TM">TM</option>
            <option value="LBA">LBA</option>
          </select>

          <span className="tb-label">Σ</span>
          <input
            className="tb-field"
            type="text"
            value={alphabetInput}
            onChange={(e) => setAlphabetInput(e.target.value)}
            placeholder="a, b, c"
            title="Input alphabet Σ (comma-separated)"
            style={{ width: 96 }}
            onFocus={() => setAlphaFocused(true)}
            onBlur={() => {
              setAlphaFocused(false)
              setAlphabet(alphabetInput.split(',').map((s) => s.trim()).filter(Boolean))
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />

          {(isPDA || isTM) && (
            <>
              <span className="tb-label" title={isPDA ? 'Stack alphabet Γ (optional)' : 'Tape alphabet Γ (optional)'}>Γ</span>
              <input
                className="tb-field"
                type="text"
                value={gammaInput}
                onChange={(e) => setGammaInput(e.target.value)}
                onFocus={() => setGammaFocused(true)}
                onBlur={() => { setGammaFocused(false); commitGamma() }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder={isPDA ? 'Z, A, B' : '0, 1, _'}
                title="Comma-separated symbols. Leave blank to skip the Γ check."
                style={{ width: 86 }}
              />
            </>
          )}
        </>
      )}

      {isTM && (
        <>
          <span className="tb-label" title="Blank tape symbol (default '_')">BLANK</span>
          <input
            className="tb-field"
            type="text"
            value={blankInput}
            maxLength={1}
            onChange={(e) => setBlankInput(e.target.value)}
            onBlur={() => setBlankSymbol(blankInput)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            placeholder="_"
            style={{ width: 30, textAlign: 'center' }}
          />
          <span className="tb-label" title="Step limit before halting as 'stuck'">LIMIT</span>
          <input
            className="tb-field"
            type="number"
            min={1}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            onBlur={() => setStepLimit(limitInput.trim() === '' ? undefined : Number(limitInput))}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            placeholder="10000"
            style={{ width: 60 }}
          />
          {isPlainTM && (
            <>
              <span className="tb-label" title="Number of tapes">TAPES</span>
              <input
                className="tb-field"
                type="number"
                min={1}
                max={9}
                value={tapesInput}
                onChange={(e) => setTapesInput(e.target.value)}
                onBlur={() => setTapeCount(tapesInput.trim() === '' ? 1 : Number(tapesInput))}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder="1"
                style={{ width: 38 }}
              />
            </>
          )}
        </>
      )}

    </div>
  )
}
