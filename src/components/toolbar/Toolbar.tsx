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
import { isPDAType, isTMType, isTransducerType, generateId } from '@/engines/machine/core/utils'
import { canOpenInParserStudio, isGraphMachineType, isGrammarType, isParserType } from '@/engines/machine/core/capabilities'
import { useGrammarStore } from '@/store/grammarStore'
import { useHistoryStore } from '@/store/historyStore'
import type { GrammarFormat, MachineType, MachineDefinition } from '@/engines/machine/core/types'
import { EXAMPLE_TYPES_BY_WORKSPACE } from '@/utils/examples'
import { DEMO_EXAMPLE_KEYS, DEMO_MACHINE_TYPES, isHostedDemoActive, navigateAppHash } from '@/utils/demoMode'
import ExamplePicker from '@/components/toolbar/ExamplePicker'
import { MachineTargetPicker } from '@/components/toolbar/MachineTargetPicker'
import { convertGrammarToMachine, regexToRegularGrammar } from '@/engines/machine/conversions'
import {
  NewIcon, OpenIcon, SaveIcon, ExportIcon,
  UndoIcon, RedoIcon, CutIcon, CopyIcon, PasteIcon, DeleteIcon,
  ZoomInIcon, ZoomOutIcon, FitIcon, LayoutIcon,
  PlayIcon, PauseIcon, StepIcon, StepBackIcon, ResetIcon,
  AnalyzeIcon, ConvertIcon, ThemeIcon, HelpIcon,
  GrammarLabIcon, ParserStudioIcon,
} from '@/components/toolbar/icons'

function transitionFormat(type: MachineType): 'fa' | 'pda' | 'tm' {
  if (isPDAType(type)) return 'pda'
  if (isTMType(type)) return 'tm'
  return 'fa'
}

const MACHINE_TYPE_OPTIONS: { value: MachineType; label: string }[] = [
  { value: 'DFA', label: 'DFA' },
  { value: 'NFA', label: 'NFA' },
  { value: 'ENFA', label: 'ε-NFA' },
  { value: 'MEALY', label: 'Mealy' },
  { value: 'MOORE', label: 'Moore' },
  { value: 'DPDA', label: 'DPDA' },
  { value: 'NPDA', label: 'NPDA' },
  { value: 'TM', label: 'TM' },
  { value: 'MTM', label: 'Multi-track TM' },
  { value: 'LBA', label: 'LBA' },
  { value: 'NLBA', label: 'NLBA' },
]

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
  const isDemoMode = import.meta.env.VITE_SIMULATOR_MODE === 'true' || isHostedDemoActive(window.location.search)
  const {
    machine, setMachineName, setMachineType, setAlphabet, setOutputAlphabet,
    setStackAlphabet, setTapeAlphabet,
    setBlankSymbol, setStepLimit, setTapeCount, setTrackCount, setTrackAlphabets, setTrackBlanks,
    loadMachine, undo, redo, insertTab
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
  const isDone = status === 'completed' || status === 'accepted' || status === 'rejected' || status === 'stuck' || status === 'error'
  const isIdle = status === 'idle'
  const isPlaying = !!sim?.isPlaying

  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const isTransducer = isTransducerType(machine.type)
  const isPlainTM = machine.type === 'TM'
  const isMultiTrackTM = machine.type === 'MTM'
  const isGraph = isGraphMachineType(machine.type)

  const isGrammarContext = isGrammarType(machine.type)
  const isParserContext = isParserType(machine.type)
  const isMachineContext = isGraph
  const grammarStoreText = useGrammarStore((s) => s.rawText)
  const grammarStoreFormat = useGrammarStore((s) => s.grammarFormat)
  const resolvedGrammarText = (grammarStoreText || machine.grammarText || '').trim()
  const hasGrammar = resolvedGrammarText.length > 0
  const grammarFormat: GrammarFormat = machine.grammarFormat
    ?? grammarStoreFormat
    ?? (machine.type === 'CSG' ? 'TYPE_1' : machine.type === 'UG' ? 'TYPE_0' : 'TYPE_2')
  const createTabDef = (type: MachineType, suffix: string, grammarText = machine.grammarText, format = grammarFormat): MachineDefinition => {
    let baseName = machine.name;
    baseName = baseName.replace(/\s*\[(?:Grammar|Parser|PDA)\]$/, '');
    return {
      id: generateId('machine'),
      version: 1,
      name: `${baseName} ${suffix}`,
      type,
      language: machine.language || '',
      states: [],
      transitions: [],
      alphabet: [],
      grammarText,
      grammarFormat: format,
    }
  }

  const handleTransferToGrammar = () => {
    if (!hasGrammar) return;
    insertTab(createTabDef(grammarFormat === 'TYPE_0' ? 'UG' : grammarFormat === 'TYPE_1' ? 'CSG' : 'CFG', '[Grammar]'));
  }

  const handleTransferToParser = () => {
    if (!hasGrammar) return;
    if (!canOpenInParserStudio(grammarFormat)) {
      toast.warning('Parser Studio accepts only Regex, Type 3, and Type 2 grammars.')
      return
    }
    try {
      const parserText = grammarFormat === 'REGEX'
        ? regexToRegularGrammar(machine.grammarText || '')
        : machine.grammarText
      insertTab(createTabDef('CFG_PARSER', '[Parser]', parserText, grammarFormat === 'REGEX' ? 'TYPE_3' : grammarFormat));
    } catch (error) {
      toast.error(`Unable to prepare this grammar for Parser Studio: ${(error as Error).message}`)
    }
  }

  const handleTransferToMachine = (target: MachineType) => {
    if (!hasGrammar) {
      toast.warning('Enter a grammar before converting to a machine.')
      return
    }
    try {
      const res = convertGrammarToMachine(resolvedGrammarText, grammarFormat, target)
      const machineDef = res.result as MachineDefinition
      let baseName = machine.name
      baseName = baseName.replace(/\s*\[(?:Grammar|Parser|PDA|NLBA|TM|NPDA|DFA|NFA|ENFA|DPDA|LBA)\]$/, '')
      machineDef.name = `${baseName} [${target}]`
      insertTab(machineDef)
      useMachineStore.setState((s) => ({
        tabRoutes: { ...s.tabRoutes, [machineDef.id]: '#/machine' },
      }))
      navigateAppHash('#/machine')
      toast.success(`Opened ${target} in Machine Studio`)
    } catch (e) {
      toast.error(`Failed to convert grammar to ${target}: ${(e as Error).message}`)
    }
  }

  const [alphabetInput, setAlphabetInput] = useState(machine.alphabet?.join(', ') || '')
  const [alphaFocused, setAlphaFocused] = useState(false)
  const [blankInput, setBlankInput] = useState(machine.blankSymbol ?? '')
  const [limitInput, setLimitInput] = useState(machine.stepLimit != null ? String(machine.stepLimit) : '')
  const [tapesInput, setTapesInput] = useState(machine.tapeCount != null ? String(machine.tapeCount) : '')
  const [tracksInput, setTracksInput] = useState(machine.trackCount != null ? String(machine.trackCount) : '2')
  const [trackAlphabetsInput, setTrackAlphabetsInput] = useState((machine.trackAlphabets ?? []).map((alphabet) => alphabet.join(', ')).join(' ; '))
  const [trackBlanksInput, setTrackBlanksInput] = useState((machine.trackBlanks ?? []).join(', '))
  const [gammaInput, setGammaInput] = useState((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
  const [gammaFocused, setGammaFocused] = useState(false)
  const [outputAlphabetInput, setOutputAlphabetInput] = useState(machine.outputAlphabet?.join(', ') || '')
  const [outputAlphabetFocused, setOutputAlphabetFocused] = useState(false)

  useEffect(() => {
    if (!alphaFocused) setAlphabetInput(machine.alphabet?.join(', ') || '')
  }, [machine.alphabet, alphaFocused])

  useEffect(() => {
    setBlankInput(machine.blankSymbol ?? '')
    setLimitInput(machine.stepLimit != null ? String(machine.stepLimit) : '')
    setTapesInput(machine.tapeCount != null ? String(machine.tapeCount) : '')
    setTracksInput(machine.trackCount != null ? String(machine.trackCount) : '2')
    setTrackAlphabetsInput((machine.trackAlphabets ?? []).map((alphabet) => alphabet.join(', ')).join(' ; '))
    setTrackBlanksInput((machine.trackBlanks ?? []).join(', '))
  }, [machine.id, machine.blankSymbol, machine.stepLimit, machine.tapeCount, machine.trackCount, machine.trackAlphabets, machine.trackBlanks])

  useEffect(() => {
    if (!gammaFocused) setGammaInput((machine.stackAlphabet ?? machine.tapeAlphabet ?? []).join(', '))
  }, [machine.id, machine.stackAlphabet, machine.tapeAlphabet, gammaFocused])

  useEffect(() => {
    if (!outputAlphabetFocused) setOutputAlphabetInput((machine.outputAlphabet ?? []).join(', '))
  }, [machine.id, machine.outputAlphabet, outputAlphabetFocused])

  const commitGamma = () => {
    const syms = gammaInput.split(',').map((s) => s.trim()).filter(Boolean)
    if (isPDA) setStackAlphabet(syms)
    else if (isTM) setTapeAlphabet(syms)
  }

  const commitTrackAlphabets = () =>
    setTrackAlphabets(trackAlphabetsInput.split(';').map((track) => track.split(',').map((symbol) => symbol.trim()).filter(Boolean)))

  const commitTrackBlanks = () =>
    setTrackBlanks(trackBlanksInput.split(',').map((symbol) => symbol.trim()).filter(Boolean))

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

          {/* Transfers */}
          {hasGrammar && (
            <>
              <Sep />
              {!isGrammarContext && <TbBtn title="Open in Grammar Lab" onClick={handleTransferToGrammar}><GrammarLabIcon /></TbBtn>}
              {!isParserContext && canOpenInParserStudio(grammarFormat) && <TbBtn title="Open in Parser Studio" onClick={handleTransferToParser}><ParserStudioIcon /></TbBtn>}
              {!isMachineContext && (
                <MachineTargetPicker
                  grammarFormat={grammarFormat}
                  onSelect={handleTransferToMachine}
                />
              )}
            </>
          )}
        </>
      )}

      <div style={{ flex: 1, minWidth: 8 }} />

      {/* Examples Gallery — custom picker (native <select> cannot show 50 items
          usefully in this 24px toolbar, and is clipped by workspace overflow). */}
      <ExamplePicker
        types={
          isDemoMode
            ? [...DEMO_MACHINE_TYPES]
            : isParserContext
            ? EXAMPLE_TYPES_BY_WORKSPACE.parser
            : isGrammarContext
              ? EXAMPLE_TYPES_BY_WORKSPACE.grammar
              : EXAMPLE_TYPES_BY_WORKSPACE.machine
        }
        exampleKeys={isDemoMode ? DEMO_EXAMPLE_KEYS : undefined}
        onSelect={(_key, ex) => {
          loadMachine({ ...ex, id: generateId('machine') } as MachineDefinition, true)
          setTimeout(requestFitView, 50)
          toast.success(`Loaded example: ${ex.name}`)
        }}
      />

      {/* Machine config (compact, right-aligned) */}
      {!isDemoMode && (
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
      )}

      {isGraph && (
        <>
          <span className="tb-label">TYPE</span>
          <select
            className="tb-select"
            value={machine.type}
            onChange={(e) => handleTypeChange(e.target.value as MachineType)}
            title="Machine type"
          >
            {MACHINE_TYPE_OPTIONS
              .filter((option) => !isDemoMode || DEMO_MACHINE_TYPES.some((type) => type === option.value))
              .map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
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

          {!isDemoMode && isTransducer && (
            <>
              <span className="tb-label" title="Output alphabet Γ">Γ</span>
              <input
                className="tb-field"
                type="text"
                value={outputAlphabetInput}
                onChange={(e) => setOutputAlphabetInput(e.target.value)}
                onFocus={() => setOutputAlphabetFocused(true)}
                onBlur={() => {
                  setOutputAlphabetFocused(false)
                  setOutputAlphabet(outputAlphabetInput.split(',').map((s) => s.trim()).filter(Boolean))
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder="0, 1"
                title="Output alphabet Γ (comma-separated)"
                style={{ width: 86 }}
              />
            </>
          )}

          {!isDemoMode && (isPDA || (isTM && !isMultiTrackTM)) && (
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

      {!isDemoMode && isTM && (
        <>
          {!isMultiTrackTM && (
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
            </>
          )}
          <span className="tb-label" title="Step limit before halting as 'stuck'">LIMIT</span>
          <input
            className="tb-field"
            type="number"
            min={1}
            max={100000}
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
          {isMultiTrackTM && (
            <>
              <span className="tb-label" title="Logical tracks on one physical tape">TRACKS</span>
              <input
                className="tb-field"
                type="number"
                min={2}
                max={9}
                value={tracksInput}
                onChange={(e) => setTracksInput(e.target.value)}
                onBlur={() => setTrackCount(Number(tracksInput))}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                style={{ width: 38 }}
              />
              <span className="tb-label" title="Track alphabets, separated by semicolons; symbols within each track are comma-separated">Γ TRACKS</span>
              <input
                className="tb-field"
                type="text"
                value={trackAlphabetsInput}
                onChange={(e) => setTrackAlphabetsInput(e.target.value)}
                onBlur={commitTrackAlphabets}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder="0, 1, _ ; X, _"
                style={{ width: 140 }}
              />
              <span className="tb-label" title="One blank symbol per track, comma-separated">BLANKS</span>
              <input
                className="tb-field"
                type="text"
                value={trackBlanksInput}
                onChange={(e) => setTrackBlanksInput(e.target.value)}
                onBlur={commitTrackBlanks}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder="_, _"
                style={{ width: 60 }}
              />
            </>
          )}
        </>
      )}

    </div>
  )
}
