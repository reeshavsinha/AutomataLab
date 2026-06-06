// ============================================================
// TransitionEditor — Modal for editing outgoing transitions from a state
// Shows all existing transitions from this state and allows editing symbols.
// Plain black & white, no animations.
// ============================================================

import { useState, useCallback, useRef } from 'react'
import { useMachineStore } from '@/store/machineStore'

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

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [newSymbols, setNewSymbols] = useState('')
  const [newSymbolsDropdownOpen, setNewSymbolsDropdownOpen] = useState(false)
  const newSymbolsInputRef = useRef<HTMLInputElement>(null)

  const handleAddTransition = useCallback(() => {
    const trimmed = newSymbols.trim()
    if (!trimmed || !newTo) return
    const symbols = trimmed
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    addTransition(stateId, newTo, symbols)
    setNewSymbols('')
  }, [stateId, newTo, newSymbols, addTransition])

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
          minWidth: '400px',
          maxWidth: '520px',
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
              Edit symbols for each transition leaving this state
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
              return (
                <TransitionRow
                  key={t.id}
                  fromLabel={state.label}
                  toLabel={toState?.label ?? t.to}
                  symbols={t.symbols}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  padding: '5px 8px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {machine.states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <span style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 2px' }}>on</span>

              {/* Symbols input */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                <input
                  ref={newSymbolsInputRef}
                  type="text"
                  value={newSymbols}
                  onChange={(e) => setNewSymbols(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                  placeholder="a, b, ε"
                  style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    padding: '5px 10px',
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                {isENFA && (
                  <>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setNewSymbolsDropdownOpen(!newSymbolsDropdownOpen)
                      }}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        height: '31px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                      }}
                    >
                      ε/λ
                    </button>
                    {newSymbolsDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '4px',
                        minWidth: '90px',
                      }}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const input = newSymbolsInputRef.current
                            if (input) {
                              const start = input.selectionStart ?? 0
                              const end = input.selectionEnd ?? 0
                              const val = input.value
                              const newVal = val.substring(0, start) + 'ε' + val.substring(end)
                              setNewSymbols(newVal)
                              setNewSymbolsDropdownOpen(false)
                              setTimeout(() => {
                                input.focus()
                                const pos = start + 1
                                input.setSelectionRange(pos, pos)
                              }, 0)
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          ε (epsilon)
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const input = newSymbolsInputRef.current
                            if (input) {
                              const start = input.selectionStart ?? 0
                              const end = input.selectionEnd ?? 0
                              const val = input.value
                              const newVal = val.substring(0, start) + 'λ' + val.substring(end)
                              setNewSymbols(newVal)
                              setNewSymbolsDropdownOpen(false)
                              setTimeout(() => {
                                input.focus()
                                const pos = start + 1
                                input.setSelectionRange(pos, pos)
                              }, 0)
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px 10px',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          λ (lambda)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={handleAddTransition}
                disabled={!newSymbols.trim() || !newTo}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '5px 14px',
                  cursor: !newSymbols.trim() || !newTo ? 'not-allowed' : 'pointer',
                  opacity: !newSymbols.trim() || !newTo ? 0.4 : 1,
                }}
              >
                Add
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Separate multiple symbols with commas. Use ε for epsilon transitions (ε-NFA only).
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

// ─── Single transition row ─────────────────────────────────────

function TransitionRow({
  fromLabel,
  toLabel,
  symbols,
  onChangeSymbols,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  symbols: string[]
  onChangeSymbols: (raw: string) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(symbols.join(', '))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isENFA = useMachineStore((s) => s.machine.type === 'ENFA')

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
          <>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setDropdownOpen(!dropdownOpen)
              }}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                padding: '2px 6px',
                cursor: 'pointer',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
            >
              ε/λ
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                marginTop: '4px',
                minWidth: '90px',
              }}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const input = inputRef.current
                    if (input) {
                      const start = input.selectionStart ?? 0
                      const end = input.selectionEnd ?? 0
                      const val = input.value
                      const newVal = val.substring(0, start) + 'ε' + val.substring(end)
                      setDraft(newVal)
                      setDropdownOpen(false)
                      setTimeout(() => {
                        input.focus()
                        const pos = start + 1
                        input.setSelectionRange(pos, pos)
                      }, 0)
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ε (epsilon)
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const input = inputRef.current
                    if (input) {
                      const start = input.selectionStart ?? 0
                      const end = input.selectionEnd ?? 0
                      const val = input.value
                      const newVal = val.substring(0, start) + 'λ' + val.substring(end)
                      setDraft(newVal)
                      setDropdownOpen(false)
                      setTimeout(() => {
                        input.focus()
                        const pos = start + 1
                        input.setSelectionRange(pos, pos)
                      }, 0)
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  λ (lambda)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Delete transition"
        style={{
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '4px 8px',
          flexShrink: 0,
        }}
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
