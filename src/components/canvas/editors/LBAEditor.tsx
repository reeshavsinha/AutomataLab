import { useState, useCallback } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { BLANK } from '@/engines/core/utils'
import type { Transition } from '@/engines/core/types'

interface LBAEditorProps {
  stateId: string
  onClose: () => void
}

export default function LBAEditor({ stateId, onClose }: LBAEditorProps) {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()

  const state = machine.states.find((s) => s.id === stateId)
  const outgoingTransitions = machine.transitions.filter((t) => t.from === stateId)
  const otherStates = machine.states.filter((s) => s.id !== stateId)
  const blank = machine.blankSymbol || BLANK

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [newRead, setNewRead] = useState('')
  const [newWrite, setNewWrite] = useState('')
  const [newDir, setNewDir] = useState<'L' | 'R' | 'S'>('R')

  const handleAddTransition = useCallback(() => {
    if (!newTo) return
    const tr = addTransition(stateId, newTo, [])
    updateTransition(tr.id, {
      read: newRead.trim(),
      write: newWrite.trim(),
      direction: newDir,
      reads: undefined,
      writes: undefined,
      directions: undefined
    })
    setNewRead('')
    setNewWrite('')
    setNewDir('R')
  }, [stateId, newTo, newRead, newWrite, newDir, addTransition, updateTransition])

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
              <LBATransitionRow
                key={t.id}
                fromLabel={state.label}
                toLabel={toLabel}
                transition={t}
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

            <div style={tapeGroupStyle}>
              <input
                type="text"
                value={newRead}
                onChange={(e) => setNewRead(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder={blank}
                title={`Symbol read (blank "${blank}" = the blank symbol)`}
                style={pdaInputStyle}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
              <input
                type="text"
                value={newWrite}
                onChange={(e) => setNewWrite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder={blank}
                title={`Symbol written (blank "${blank}" = the blank symbol)`}
                style={pdaInputStyle}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
              <select
                value={newDir}
                onChange={(e) => setNewDir(e.target.value as 'L' | 'R' | 'S')}
                title="Head move direction"
                style={selectStyle}
              >
                <option value="L">L</option>
                <option value="R">R</option>
                <option value="S">S</option>
              </select>
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
            Read the symbol under the head, write a symbol, then move the head L/R/S. Blank read/write = the blank symbol.
          </div>
        </div>
      )}
    </>
  )
}

function LBATransitionRow({
  fromLabel,
  toLabel,
  transition,
  blank,
  onChange,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  transition: Transition
  blank: string
  onChange: (patch: Partial<Transition>) => void
  onDelete: () => void
}) {
  const [read, setRead] = useState(transition.read ?? '')
  const [write, setWrite] = useState(transition.write ?? '')
  const dir = transition.direction ?? 'R'

  const persist = (r: string, w: string, d: 'L' | 'R' | 'S') => {
    onChange({ read: r.trim(), write: w.trim(), direction: d, reads: undefined, writes: undefined, directions: undefined })
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

      <div style={tapeGroupStyle}>
        <input
          type="text"
          value={read}
          onChange={(e) => setRead(e.target.value)}
          onBlur={() => persist(read, write, dir)}
          placeholder={blank}
          title={`Symbol read (blank "${blank}" = the blank symbol)`}
          style={pdaInputStyle}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
        <input
          type="text"
          value={write}
          onChange={(e) => setWrite(e.target.value)}
          onBlur={() => persist(read, write, dir)}
          placeholder={blank}
          title={`Symbol written (blank "${blank}" = the blank symbol)`}
          style={pdaInputStyle}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
        <select
          value={dir}
          onChange={(e) => persist(read, write, e.target.value as 'L' | 'R' | 'S')}
          title="Head move direction"
          style={selectStyle}
        >
          <option value="L">L</option>
          <option value="R">R</option>
          <option value="S">S</option>
        </select>
      </div>

      <div style={{ flex: 1 }} />

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
