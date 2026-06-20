import { useState, useCallback } from 'react'
import { useMachineStore } from '@/store/machineStore'
import type { Transition } from '@/engines/core/types'

interface PDAEditorProps {
  stateId: string
  onClose: () => void
}

export default function PDAEditor({ stateId, onClose }: PDAEditorProps) {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()

  const state = machine.states.find((s) => s.id === stateId)
  const outgoingTransitions = machine.transitions.filter((t) => t.from === stateId)
  const otherStates = machine.states.filter((s) => s.id !== stateId)

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [newRead, setNewRead] = useState('')
  const [newPop, setNewPop] = useState('')
  const [newPush, setNewPush] = useState('')

  const handleAddTransition = useCallback(() => {
    if (!newTo) return
    const tr = addTransition(stateId, newTo, [])
    updateTransition(tr.id, {
      read: newRead.trim(),
      pop: newPop.trim(),
      push: newPush.trim(),
    })
    setNewRead('')
    setNewPop('')
    setNewPush('')
  }, [stateId, newTo, newRead, newPop, newPush, addTransition, updateTransition])

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
              <PDATransitionRow
                key={t.id}
                fromLabel={state.label}
                toLabel={toLabel}
                transition={t}
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

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
              <input
                type="text"
                value={newRead}
                onChange={(e) => setNewRead(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder="ε"
                title="Input symbol read (blank = ε)"
                style={pdaInputStyle}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
              <input
                type="text"
                value={newPop}
                onChange={(e) => setNewPop(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder="ε"
                title="Stack symbol popped (blank = ε)"
                style={pdaInputStyle}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
              <input
                type="text"
                value={newPush}
                onChange={(e) => setNewPush(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder="ε"
                title="String pushed; first char ends on top (blank = ε)"
                style={pdaInputStyle}
              />
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
            Leave read/pop/push blank for ε. Push first character ends up on top of the stack.
          </div>
        </div>
      )}
    </>
  )
}

function PDATransitionRow({
  fromLabel,
  toLabel,
  transition,
  onChange,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  transition: Transition
  onChange: (patch: Partial<Transition>) => void
  onDelete: () => void
}) {
  const [read, setRead] = useState(transition.read ?? '')
  const [pop, setPop] = useState(transition.pop ?? '')
  const [push, setPush] = useState(transition.push ?? '')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
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

      <input
        type="text"
        value={read}
        onChange={(e) => setRead(e.target.value)}
        onBlur={() => onChange({ read: read.trim() })}
        placeholder="ε"
        title="Input symbol read (blank = ε)"
        style={pdaInputStyle}
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
      <input
        type="text"
        value={pop}
        onChange={(e) => setPop(e.target.value)}
        onBlur={() => onChange({ pop: pop.trim() })}
        placeholder="ε"
        title="Stack symbol popped (blank = ε)"
        style={pdaInputStyle}
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
      <input
        type="text"
        value={push}
        onChange={(e) => setPush(e.target.value)}
        onBlur={() => onChange({ push: push.trim() })}
        placeholder="ε"
        title="String pushed; first char ends on top (blank = ε)"
        style={pdaInputStyle}
      />

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
