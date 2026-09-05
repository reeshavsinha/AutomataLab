import { useState, useCallback, useRef } from 'react'
import { useMachineStore } from '@/store/machineStore'
import EpsilonInserter from '@/components/canvas/EpsilonInserter'
import { isTransducerType } from '@/engines/machine/core/utils'

interface FiniteAutomataEditorProps {
  stateId: string
  onClose: () => void
}

export default function FiniteAutomataEditor({ stateId, onClose }: FiniteAutomataEditorProps) {
  const { machine, addTransition, updateTransition, deleteTransition } = useMachineStore()

  const state = machine.states.find((s) => s.id === stateId)
  const outgoingTransitions = machine.transitions.filter((t) => t.from === stateId)
  const otherStates = machine.states.filter((s) => s.id !== stateId)
  const isENFA = machine.type === 'ENFA'
  const isMealy = machine.type === 'MEALY'
  const isTransducer = isTransducerType(machine.type)

  const [newTo, setNewTo] = useState(otherStates[0]?.id ?? '')
  const [newSymbols, setNewSymbols] = useState('')
  const [newOutput, setNewOutput] = useState('')
  const [newSymbolsDropdownOpen, setNewSymbolsDropdownOpen] = useState(false)
  const newSymbolsInputRef = useRef<HTMLInputElement>(null)

  const handleAddTransition = useCallback(() => {
    if (!newTo) return
    const trimmed = newSymbols.trim()
    if (!trimmed) return
    const symbols = trimmed
      .split(/[,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (isMealy && !newOutput.trim()) return
    const added = addTransition(stateId, newTo, symbols)
    if (isMealy) updateTransition(added.id, { output: newOutput.trim() })
    setNewSymbols('')
    setNewOutput('')
  }, [stateId, newTo, newSymbols, newOutput, isMealy, addTransition, updateTransition])

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
  const canAdd = !!newSymbols.trim() && !!newTo && (!isMealy || !!newOutput.trim())

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
              <TransitionRow
                key={t.id}
                fromLabel={state.label}
                toLabel={toLabel}
                symbols={t.symbols}
                isENFA={isENFA}
                isMealy={isMealy}
                output={t.output}
                onChangeSymbols={(raw) => handleUpdateSymbols(t.id, raw)}
                onChangeOutput={(output) => updateTransition(t.id, { output: output.trim() || undefined })}
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
            {/* Source — fixed */}
            <span style={badgeStyle}>{state.label}</span>

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

            <span style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 2px' }}>on</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
              <input
                ref={newSymbolsInputRef}
                type="text"
                value={newSymbols}
                onChange={(e) => setNewSymbols(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                placeholder=""
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

            {isMealy && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/</span>
                <input
                  type="text"
                  value={newOutput}
                  onChange={(e) => setNewOutput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTransition()}
                  placeholder="output"
                  style={{ ...pdaInputStyle, width: '80px' }}
                />
              </>
            )}

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
            Separate multiple symbols with commas. Use ε for epsilon transitions (ε-NFA only).
            {isTransducer && isMealy && ' Mealy labels use input / output.'}
          </div>
        </div>
      )}
    </>
  )
}

function TransitionRow({
  fromLabel,
  toLabel,
  symbols,
  isENFA,
  isMealy,
  output,
  onChangeSymbols,
  onChangeOutput,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  symbols: string[]
  isENFA: boolean
  isMealy: boolean
  output?: string
  onChangeSymbols: (raw: string) => void
  onChangeOutput: (output: string) => void
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
        {isMealy && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/</span>
            <input
              type="text"
              value={output ?? ''}
              onChange={(e) => onChangeOutput(e.target.value)}
              onBlur={(e) => onChangeOutput(e.target.value)}
              placeholder="output"
              style={{ ...pdaInputStyle, width: '72px' }}
            />
          </>
        )}
        {isENFA && (
          <EpsilonInserter
            targetRef={inputRef}
            open={dropdownOpen}
            setOpen={setDropdownOpen}
            onInsert={(val) => setDraft(val)}
          />
        )}
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
