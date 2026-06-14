// ============================================================
// DeltaTablePanel — Global transition (δ) table.
// Lists every transition grouped by source state, editable in place
// (add / delete / inline edit), with click-to-locate on the canvas. This is the
// canonical, text-first editor instructors teach from; the per-state canvas
// modal (TransitionEditor) remains as a shortcut. (UX audit #5.)
// ============================================================

import { useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import {
  isPDAType,
  isTMType,
  formatTmTransition,
  tmTapeOps,
  BLANK,
} from '@/engines/core/utils'
import type { AutomataState, Transition } from '@/engines/core/types'

function splitSymbols(raw: string): string[] {
  return raw
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const cellInput: React.CSSProperties = {
  width: '46px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  padding: '3px 5px',
  outline: 'none',
  textAlign: 'center',
  minWidth: 0,
}

const selectCell: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  padding: '3px 4px',
  outline: 'none',
  cursor: 'pointer',
  maxWidth: '92px',
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '11px',
  lineHeight: 1,
  padding: '3px 6px',
  flexShrink: 0,
}

/** ▶ start ◎ accept ⊘ reject — mirrors the canvas role glyphs. */
function roleGlyphs(s: AutomataState): string {
  let g = ''
  if (s.isStart) g += '▶'
  if (s.isAccept) g += '◎'
  if (s.isReject) g += '⊘'
  return g
}

export default function DeltaTablePanel() {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()
  const selectTransition = useUIStore((s) => s.selectTransition)
  const selectState = useUIStore((s) => s.selectState)
  const requestFocus = useUIStore((s) => s.requestFocus)
  const openTransitionEditor = useUIStore((s) => s.openTransitionEditor)

  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)
  const tapeCount = isTM ? Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1) : 1
  const multiTape = isTM && tapeCount > 1
  const blank = machine.blankSymbol || BLANK

  const realStates = machine.states.filter((s) => !s.isText)
  // Start state floats to the top; the rest keep creation order (stable sort).
  const orderedStates = [...realStates].sort((a, b) => Number(b.isStart) - Number(a.isStart))

  const byFrom = new Map<string, Transition[]>()
  for (const s of realStates) byFrom.set(s.id, [])
  for (const t of machine.transitions) {
    const list = byFrom.get(t.from)
    if (list) list.push(t)
  }

  const labelOf = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id
  const locateTransition = (id: string) => {
    selectTransition(id)
    requestFocus('transition', id)
  }
  const locateState = (id: string) => {
    selectState(id)
    requestFocus('state', id)
  }

  if (realStates.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '12px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div>No states yet.</div>
        <div style={{ fontSize: '11px' }}>Add states on the canvas to define δ.</div>
      </div>
    )
  }

  const formatHint = isTM
    ? 'read → write, dir'
    : isPDA
    ? 'read, pop → push'
    : 'symbols (comma-separated)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Transition table (δ)</span>
          <span style={{ color: 'var(--text-muted)' }}>{machine.transitions.length} moves</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Grouped by source · format: {formatHint}
        </div>
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {orderedStates.map((state) => {
          const rows = byFrom.get(state.id) ?? []
          const glyphs = roleGlyphs(state)
          return (
            <div key={state.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Group header — click to locate the state on the canvas */}
              <button
                onClick={() => locateState(state.id)}
                title="Show this state on the canvas"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {state.label}
                </span>
                {glyphs && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{glyphs}</span>
                )}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {rows.length === 0 ? 'no moves' : `${rows.length}`}
                </span>
              </button>

              {/* Existing transitions */}
              {rows.map((t) =>
                multiTape ? (
                  <MultiTapeRow
                    key={t.id}
                    transition={t}
                    tapeCount={tapeCount}
                    blank={blank}
                    targetLabel={labelOf(t.to)}
                    onLocate={() => locateTransition(t.id)}
                    onEdit={() => openTransitionEditor(state.id)}
                    onDelete={() => deleteTransition(t.id)}
                  />
                ) : (
                  <DeltaRow
                    key={t.id}
                    transition={t}
                    states={realStates}
                    isPDA={isPDA}
                    isTM={isTM}
                    blank={blank}
                    onLocate={() => locateTransition(t.id)}
                    onChange={(patch) => updateTransition(t.id, patch)}
                    onDelete={() => deleteTransition(t.id)}
                  />
                )
              )}

              {/* Add a transition from this state */}
              {multiTape ? (
                <button
                  onClick={() => openTransitionEditor(state.id)}
                  style={{ ...iconBtn, margin: '6px 12px', border: '1px dashed var(--border-default)' }}
                >
                  + add move (multi-tape editor)
                </button>
              ) : (
                <AddRow
                  fromId={state.id}
                  states={realStates}
                  isPDA={isPDA}
                  isTM={isTM}
                  blank={blank}
                  onAdd={(to, patch) => {
                    const { symbols, ...rest } = patch
                    const tr = addTransition(state.id, to, symbols ?? [])
                    if (Object.keys(rest).length > 0) updateTransition(tr.id, rest)
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Editable row (FA / PDA / single-tape TM) ──────────────────

function DeltaRow({
  transition,
  states,
  isPDA,
  isTM,
  blank,
  onLocate,
  onChange,
  onDelete,
}: {
  transition: Transition
  states: AutomataState[]
  isPDA: boolean
  isTM: boolean
  blank: string
  onLocate: () => void
  onChange: (patch: Partial<Transition>) => void
  onDelete: () => void
}) {
  const [symbols, setSymbols] = useState(transition.symbols.join(', '))
  const [read, setRead] = useState(transition.read ?? '')
  const [pop, setPop] = useState(transition.pop ?? '')
  const [push, setPush] = useState(transition.push ?? '')
  const ops = tmTapeOps(transition, 1)
  const [tmRead, setTmRead] = useState(ops.reads[0])
  const [tmWrite, setTmWrite] = useState(ops.writes[0])

  const isFA = !isPDA && !isTM
  const incomplete = isFA && splitSymbols(symbols).length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        borderLeft: `2px solid ${incomplete ? 'var(--status-reject)' : 'transparent'}`,
      }}
    >
      {/* Line 1: target + locate + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→</span>
        <select
          value={transition.to}
          onChange={(e) => onChange({ to: e.target.value })}
          title="Target state"
          style={{ ...selectCell, flex: 1 }}
        >
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button onClick={onLocate} title="Show on canvas" style={iconBtn}>
          ↗
        </button>
        <button onClick={onDelete} title="Delete transition" style={iconBtn}>
          ✕
        </button>
      </div>

      {/* Line 2: the move fields */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', paddingLeft: '18px' }}>
        {isTM ? (
          <>
            <input
              value={tmRead}
              onChange={(e) => setTmRead(e.target.value)}
              onBlur={() => onChange({ read: tmRead.trim(), reads: undefined })}
              placeholder={blank}
              title={`Symbol read (blank "${blank}")`}
              style={cellInput}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
            <input
              value={tmWrite}
              onChange={(e) => setTmWrite(e.target.value)}
              onBlur={() => onChange({ write: tmWrite.trim(), writes: undefined })}
              placeholder={blank}
              title={`Symbol written (blank "${blank}")`}
              style={cellInput}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
            <select
              value={ops.directions[0]}
              onChange={(e) => onChange({ direction: e.target.value as 'L' | 'R' | 'S', directions: undefined })}
              title="Head move"
              style={selectCell}
            >
              <option value="L">L</option>
              <option value="R">R</option>
              <option value="S">S</option>
            </select>
          </>
        ) : isPDA ? (
          <>
            <input
              value={read}
              onChange={(e) => setRead(e.target.value)}
              onBlur={() => onChange({ read: read.trim() })}
              placeholder="ε"
              title="Input read (blank = ε)"
              style={cellInput}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
            <input
              value={pop}
              onChange={(e) => setPop(e.target.value)}
              onBlur={() => onChange({ pop: pop.trim() })}
              placeholder="ε"
              title="Stack popped (blank = ε)"
              style={cellInput}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
            <input
              value={push}
              onChange={(e) => setPush(e.target.value)}
              onBlur={() => onChange({ push: push.trim() })}
              placeholder="ε"
              title="Pushed; first char on top (blank = ε)"
              style={cellInput}
            />
          </>
        ) : (
          <input
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            onBlur={() => {
              const next = splitSymbols(symbols)
              if (next.length > 0) onChange({ symbols: next })
            }}
            placeholder="a, b, ε"
            title="Symbols (comma-separated); ε for epsilon"
            style={{ ...cellInput, width: 'auto', flex: 1, textAlign: 'left' }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Read-only multi-tape row (edit via the canvas modal) ──────

function MultiTapeRow({
  transition,
  tapeCount,
  blank,
  targetLabel,
  onLocate,
  onEdit,
  onDelete,
}: {
  transition: Transition
  tapeCount: number
  blank: string
  targetLabel: string
  onLocate: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→</span>
      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {targetLabel}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: '11px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={formatTmTransition(transition, tapeCount, blank)}
      >
        {formatTmTransition(transition, tapeCount, blank)}
      </span>
      <button onClick={onLocate} title="Show on canvas" style={iconBtn}>
        ↗
      </button>
      <button onClick={onEdit} title="Edit (multi-tape editor)" style={iconBtn}>
        ✎
      </button>
      <button onClick={onDelete} title="Delete transition" style={iconBtn}>
        ✕
      </button>
    </div>
  )
}

// ─── Add-transition row (per source state) ─────────────────────

function AddRow({
  fromId,
  states,
  isPDA,
  isTM,
  blank,
  onAdd,
}: {
  fromId: string
  states: AutomataState[]
  isPDA: boolean
  isTM: boolean
  blank: string
  onAdd: (to: string, patch: Partial<Transition>) => void
}) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(states[0]?.id ?? fromId)
  const [symbols, setSymbols] = useState('')
  const [read, setRead] = useState('')
  const [pop, setPop] = useState('')
  const [push, setPush] = useState('')
  const [write, setWrite] = useState('')
  const [dir, setDir] = useState<'L' | 'R' | 'S'>('R')

  const reset = () => {
    setSymbols('')
    setRead('')
    setPop('')
    setPush('')
    setWrite('')
    setDir('R')
  }

  const isFA = !isPDA && !isTM
  const canAdd = !!to && (isFA ? splitSymbols(symbols).length > 0 : true)

  const submit = () => {
    if (!canAdd) return
    if (isTM) {
      onAdd(to, { read: read.trim(), write: write.trim(), direction: dir })
    } else if (isPDA) {
      onAdd(to, { read: read.trim(), pop: pop.trim(), push: push.trim() })
    } else {
      onAdd(to, { symbols: splitSymbols(symbols) })
    }
    reset()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ ...iconBtn, margin: '6px 12px', border: '1px dashed var(--border-default)' }}
      >
        + add move
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        padding: '6px 12px 8px',
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} title="Target state" style={{ ...selectCell, flex: 1 }}>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', paddingLeft: '18px' }}>
        {isTM ? (
          <>
            <input value={read} onChange={(e) => setRead(e.target.value)} placeholder={blank} title="Read" style={cellInput} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
            <input value={write} onChange={(e) => setWrite(e.target.value)} placeholder={blank} title="Write" style={cellInput} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
            <select value={dir} onChange={(e) => setDir(e.target.value as 'L' | 'R' | 'S')} title="Move" style={selectCell}>
              <option value="L">L</option>
              <option value="R">R</option>
              <option value="S">S</option>
            </select>
          </>
        ) : isPDA ? (
          <>
            <input value={read} onChange={(e) => setRead(e.target.value)} placeholder="ε" title="Read" style={cellInput} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
            <input value={pop} onChange={(e) => setPop(e.target.value)} placeholder="ε" title="Pop" style={cellInput} />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
            <input value={push} onChange={(e) => setPush(e.target.value)} placeholder="ε" title="Push" style={cellInput} />
          </>
        ) : (
          <input
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="a, b, ε"
            title="Symbols (comma-separated)"
            style={{ ...cellInput, width: 'auto', flex: 1, textAlign: 'left' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => {
            reset()
            setOpen(false)
          }}
          style={iconBtn}
        >
          cancel
        </button>
        <button
          onClick={submit}
          disabled={!canAdd}
          style={{
            ...iconBtn,
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            opacity: canAdd ? 1 : 0.4,
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          add
        </button>
      </div>
    </div>
  )
}
