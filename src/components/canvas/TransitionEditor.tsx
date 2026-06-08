// ============================================================
// TransitionEditor — Modal for editing outgoing transitions from a state
// Finite automata: edit comma-separated symbols per transition.
// PDA: edit the (read, pop → push) triple per transition.
// Plain black & white, no animations.
// ============================================================

import { useState, useCallback, useRef } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { isPDAType } from '@/engines/core/utils'
import type { Transition } from '@/engines/core/types'
import EpsilonInserter from './EpsilonInserter'

interface TransitionEditorProps {
  /** stateId whose outgoing transitions we are editing */
  stateId: string
  onClose: () => void
}

export default function TransitionEditor({ stateId, onClose }: TransitionEditorProps) {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()

  const state = machine.states.find((s) => s.id === stateId)
  const outgoingTransitions = machine.transitions.filter((t) => t.from === stateId)
  const otherStates = machine.states.filter((s) => s.id !== stateId)
  const isENFA = machine.type === 'ENFA'
  const isPDA = isPDAType(machine.type)

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [newSymbols, setNewSymbols] = useState('')
  const [newRead, setNewRead] = useState('')
  const [newPop, setNewPop] = useState('')
  const [newPush, setNewPush] = useState('')
  const [newSymbolsDropdownOpen, setNewSymbolsDropdownOpen] = useState(false)
  const newSymbolsInputRef = useRef<HTMLInputElement>(null)

  const handleAddTransition = useCallback(() => {
    if (!newTo) return
    if (isPDA) {
      const tr = addTransition(stateId, newTo, [])
      updateTransition(tr.id, {
        read: newRead.trim(),
        pop: newPop.trim(),
        push: newPush.trim(),
      })
      setNewRead('')
      setNewPop('')
      setNewPush('')
      return
    }
    const trimmed = newSymbols.trim()
    if (!trimmed) return
    const symbols = trimmed
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    addTransition(stateId, newTo, symbols)
    setNewSymbols('')
  }, [stateId, newTo, newSymbols, newRead, newPop, newPush, isPDA, addTransition, updateTransition])

  const handleUpdateSymbols = useCallback(
    (transId: string, raw: string) => {
      const symbols = raw
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (symbols.length > 0) {
        updateTransition(transId, { symbols })
      }
    },
    [updateTransition]
  )

  if (!state) return null

  const canAdd = isPDA ? !!newTo : !!newSymbols.trim() && !!newTo

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '0',
          minWidth: '440px',
          maxWidth: '560px',
          width: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              Outgoing Transitions — {state.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {isPDA
                ? 'Format: read, pop → push. Leave a field blank for ε.'
                : 'Edit symbols for each transition leaving this state'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Existing transitions */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {outgoingTransitions.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}>
              No outgoing transitions yet. Add one below.
            </div>
          ) : (
            outgoingTransitions.map((t) => {
              const toState = machine.states.find((s) => s.id === t.to)
              const toLabel = toState?.label ?? t.to
              return isPDA ? (
                <PDATransitionRow
                  key={t.id}
                  fromLabel={state.label}
                  toLabel={toLabel}
                  transition={t}
                  onChange={(patch) => updateTransition(t.id, patch)}
                  onDelete={() => deleteTransition(t.id)}
                />
              ) : (
                <TransitionRow
                  key={t.id}
                  fromLabel={state.label}
                  toLabel={toLabel}
                  symbols={t.symbols}
                  isENFA={isENFA}
                  onChangeSymbols={(raw) => handleUpdateSymbols(t.id, raw)}
                  onDelete={() => deleteTransition(t.id)}
                />
              )
            })
          )}
        </div>

        {/* Add new transition */}
        {machine.states.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              ADD TRANSITION
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Source — fixed */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '5px 10px',
              }}>
                {state.label}
              </span>

              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>

              {/* Target state selector */}
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

              {isPDA ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    value={newRead}
                    onChange={(e) => setNewRead(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                    placeholder="read"
                    title="Input symbol read (blank = ε)"
                    style={pdaInputStyle}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
                  <input
                    type="text"
                    value={newPop}
                    onChange={(e) => setNewPop(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                    placeholder="pop"
                    title="Stack symbol popped (blank = ε)"
                    style={pdaInputStyle}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
                  <input
                    type="text"
                    value={newPush}
                    onChange={(e) => setNewPush(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                    placeholder="push"
                    title="String pushed; first char ends on top (blank = ε)"
                    style={pdaInputStyle}
                  />
                </div>
              ) : (
                <>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 2px' }}>on</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                    <input
                      ref={newSymbolsInputRef}
                      type="text"
                      value={newSymbols}
                      onChange={(e) => setNewSymbols(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                      placeholder="a, b, ε"
                      style={{ ...pdaInputStyle, flex: 1 }}
                    />
                    {isENFA && (
                      <EpsilonInserter
                        targetRef={newSymbolsInputRef}
                        open={newSymbolsDropdownOpen}
                        setOpen={setNewSymbolsDropdownOpen}
                        onInsert={(val) => setNewSymbols(val)}
                      />
                    )}
                  </div>
                </>
              )}

              <button
                onClick={handleAddTransition}
                disabled={!canAdd}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '5px 14px',
                  cursor: !canAdd ? 'not-allowed' : 'pointer',
                  opacity: !canAdd ? 0.4 : 1,
                }}
              >
                Add
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isPDA
                ? 'Leave read/pop/push blank for ε. Push first character ends up on top of the stack.'
                : 'Separate multiple symbols with commas. Use ε for epsilon transitions (ε-NFA only).'}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              padding: '6px 18px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared styles ─────────────────────────────────────────────

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

// ─── PDA transition row ────────────────────────────────────────

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
        placeholder="read"
        title="Input symbol read (blank = ε)"
        style={pdaInputStyle}
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>,</span>
      <input
        type="text"
        value={pop}
        onChange={(e) => setPop(e.target.value)}
        onBlur={() => onChange({ pop: pop.trim() })}
        placeholder="pop"
        title="Stack symbol popped (blank = ε)"
        style={pdaInputStyle}
      />
      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>→</span>
      <input
        type="text"
        value={push}
        onChange={(e) => setPush(e.target.value)}
        onBlur={() => onChange({ push: push.trim() })}
        placeholder="push"
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

// ─── Finite-automaton transition row ───────────────────────────

function TransitionRow({
  fromLabel,
  toLabel,
  symbols,
  isENFA,
  onChangeSymbols,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  symbols: string[]
  isENFA: boolean
  onChangeSymbols: (raw: string) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(symbols.join(', '))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* From → To */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
        minWidth: '100px',
        flexShrink: 0,
      }}>
        {fromLabel} → {toLabel}
      </span>

      <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>on</span>

      {/* Symbol input */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onChangeSymbols(draft)}
          onKeyDown={(e) => e.key === 'Enter' && onChangeSymbols(draft)}
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '4px 8px',
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
        />
        {isENFA && (
          <EpsilonInserter
            targetRef={inputRef}
            open={dropdownOpen}
            setOpen={setDropdownOpen}
            onInsert={(val) => setDraft(val)}
          />
        )}
      </div>

      {/* Delete */}
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
