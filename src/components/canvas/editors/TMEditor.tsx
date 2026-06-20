import { useState, useCallback, useEffect } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { tmTapeOps, BLANK } from '@/engines/core/utils'
import type { Transition } from '@/engines/core/types'

interface TMEditorProps {
  stateId: string
  onClose: () => void
}

export default function TMEditor({ stateId, onClose }: TMEditorProps) {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()

  const state = machine.states.find((s) => s.id === stateId)
  const outgoingTransitions = machine.transitions.filter((t) => t.from === stateId)
  const otherStates = machine.states.filter((s) => s.id !== stateId)
  const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
  const blank = machine.blankSymbol || BLANK

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [tmReads, setTmReads] = useState<string[]>(() => Array(tapeCount).fill(''))
  const [tmWrites, setTmWrites] = useState<string[]>(() => Array(tapeCount).fill(''))
  const [tmDirs, setTmDirs] = useState<('L' | 'R' | 'S')[]>(() => Array(tapeCount).fill('R'))

  useEffect(() => {
    const fit = <T,>(arr: T[], fill: T): T[] =>
      arr.length === tapeCount ? arr : Array.from({ length: tapeCount }, (_, i) => arr[i] ?? fill)
    setTmReads((p) => fit(p, ''))
    setTmWrites((p) => fit(p, ''))
    setTmDirs((p) => fit(p, 'R' as const))
  }, [tapeCount])

  const handleAddTransition = useCallback(() => {
    if (!newTo) return
    const tr = addTransition(stateId, newTo, [])
    if (tapeCount === 1) {
      updateTransition(tr.id, { read: tmReads[0].trim(), write: tmWrites[0].trim(), direction: tmDirs[0] })
    } else {
      updateTransition(tr.id, {
        reads: tmReads.map((r) => r.trim()),
        writes: tmWrites.map((w) => w.trim()),
        directions: [...tmDirs],
      })
    }
    setTmReads(Array(tapeCount).fill(''))
    setTmWrites(Array(tapeCount).fill(''))
    setTmDirs(Array(tapeCount).fill('R'))
  }, [stateId, newTo, tmReads, tmWrites, tmDirs, tapeCount, addTransition, updateTransition])

  if (!state) return null
  const canAdd = !!newTo

  return (
    <>
      {/* Existing transitions */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {outgoingTransitions.length === 0 ? (
          <div style={emptyStyle}>
            No outgoing transitions yet. Add one below.
          </div>
        ) : (
          outgoingTransitions.map((t) => {
            const toState = machine.states.find((s) => s.id === t.to)
            const toLabel = toState?.label ?? t.to
            return (
              <TMTransitionRow
                key={t.id}
                fromLabel={state.label}
                toLabel={toLabel}
                transition={t}
                tapeCount={tapeCount}
                blank={blank}
                onChange={(patch) => updateTransition(t.id, patch)}
                onDelete={() => deleteTransition(t.id)}
              />
            )
          })
        )}
      </div>

      {/* Add new transition */}
      {machine.states.length > 0 && (
        <div style={addSectionStyle}>
          <div style={addSectionTitleStyle}>ADD TRANSITION</div>
          <div style={addFormRowStyle}>
            <span style={badgeStyle}>{state.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>

            <select
              value={newTo}
              onChange={(e) => setNewTo(e.target.value)}
              style={selectStyle}
            >
              {machine.states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flex: 1, minWidth: '220px' }}>
              {tmReads.map((_, i) => (
                <div key={i} style={tapeGroupStyle}>
                  {tapeCount > 1 && <span style={tapeBadgeStyle}>T{i + 1}</span>}
                  <input
                    type="text"
                    value={tmReads[i]}
                    onChange={(e) => setTmReads((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                    placeholder={blank}
                    title={`Tape ${i + 1} symbol read (blank "${blank}" = the blank symbol)`}
                    style={pdaInputStyle}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
                  <input
                    type="text"
                    value={tmWrites[i]}
                    onChange={(e) => setTmWrites((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                    placeholder={blank}
                    title={`Tape ${i + 1} symbol written (blank "${blank}" = the blank symbol)`}
                    style={pdaInputStyle}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
                  <select
                    value={tmDirs[i]}
                    onChange={(e) => setTmDirs((p) => p.map((x, j) => (j === i ? (e.target.value as 'L' | 'R' | 'S') : x)))}
                    title={`Tape ${i + 1} head move direction`}
                    style={selectStyle}
                  >
                    <option value="L">L</option>
                    <option value="R">R</option>
                    <option value="S">S</option>
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddTransition}
              disabled={!canAdd}
              style={{
                ...actionBtnStyle,
                cursor: !canAdd ? 'not-allowed' : 'pointer',
                opacity: !canAdd ? 0.4 : 1,
              }}
            >
              Add
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {tapeCount > 1
              ? 'Each move reads/writes one symbol per tape and moves each head L/R/S. It fires only when every tape’s read matches.'
              : 'Read the symbol under the head, write a symbol, then move the head L/R/S. Blank read/write = the blank symbol.'}
          </div>
        </div>
      )}
    </>
  )
}

function TMTransitionRow({
  fromLabel,
  toLabel,
  transition,
  tapeCount,
  blank,
  onChange,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  transition: Transition
  tapeCount: number
  blank: string
  onChange: (patch: Partial<Transition>) => void
  onDelete: () => void
}) {
  const ops = tmTapeOps(transition, tapeCount)
  const [reads, setReads] = useState<string[]>(ops.reads)
  const [writes, setWrites] = useState<string[]>(ops.writes)
  const dirs = ops.directions

  const persist = (r: string[], w: string[], d: ('L' | 'R' | 'S')[]) => {
    if (tapeCount === 1) {
      onChange({ read: r[0].trim(), write: w[0].trim(), direction: d[0], reads: undefined, writes: undefined, directions: undefined })
    } else {
      onChange({ reads: r.map((x) => x.trim()), writes: w.map((x) => x.trim()), directions: d })
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        minWidth: '90px',
        flexShrink: 0,
      }}>
        {fromLabel} → {toLabel}
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
        {reads.map((_, i) => (
          <div key={i} style={tapeGroupStyle}>
            {tapeCount > 1 && <span style={tapeBadgeStyle}>T{i + 1}</span>}
            <input
              type="text"
              value={reads[i]}
              onChange={(e) => setReads((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={() => persist(reads, writes, dirs)}
              placeholder={blank}
              title={`Tape ${i + 1} symbol read (blank "${blank}" = the blank symbol)`}
              style={pdaInputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
            <input
              type="text"
              value={writes[i]}
              onChange={(e) => setWrites((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
              onBlur={() => persist(reads, writes, dirs)}
              placeholder={blank}
              title={`Tape ${i + 1} symbol written (blank "${blank}" = the blank symbol)`}
              style={pdaInputStyle}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
            <select
              value={dirs[i]}
              onChange={(e) => persist(reads, writes, dirs.map((x, j) => (j === i ? (e.target.value as 'L' | 'R' | 'S') : x)))}
              title={`Tape ${i + 1} head move direction`}
              style={selectStyle}
            >
              <option value="L">L</option>
              <option value="R">R</option>
              <option value="S">S</option>
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        title="Delete transition"
        style={deleteButtonStyle}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
        }}
      >
        ✕
      </button>
    </div>
  )
}

// Styles
const emptyStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: 'var(--text-muted)',
  fontSize: '13px',
}

const addSectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid var(--border-default)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const addSectionTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.05em',
}

const addFormRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
}

const badgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  color: 'var(--text-secondary)',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  padding: '5px 10px',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  padding: '5px 8px',
  outline: 'none',
  cursor: 'pointer',
}

const pdaInputStyle: React.CSSProperties = {
  width: '56px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-mono)',
  padding: '5px 8px',
  outline: 'none',
  minWidth: 0,
  textAlign: 'center',
}

const actionBtnStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  padding: '5px 14px',
}

const deleteButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '12px',
  padding: '4px 8px',
  flexShrink: 0,
}

const tapeGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  padding: '3px 5px',
}

const tapeBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.04em',
  marginRight: '1px',
}
