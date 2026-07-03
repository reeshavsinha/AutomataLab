// ============================================================
// InputBar — Input string entry with tape visualization. Plain B&W.
// ============================================================

import { useRef, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { isTMType } from '@/engines/machine/core/utils'
import EpsilonInserter from '@/components/canvas/EpsilonInserter'

export default function InputBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [epsOpen, setEpsOpen] = useState(false)
  const { inputString, setInputString, consumedInput, remainingInput, currentSymbol, status } =
    useSimulationStore()
  const machineType = useMachineStore((s) => s.machine.type)
  const openModal = useUIStore((s) => s.openModal)
  const isTM = isTMType(machineType)

  const isIdle = status === 'idle'

  // Editing the test string after a finished run clears the stale result so the
  // new string starts cleanly from idle. The input is disabled during an active
  // run, so this only ever fires from a terminal status (accepted/rejected/…).
  const handleInputChange = (value: string) => {
    if (!isIdle && status !== 'running') {
      useSimulationStore.getState().resetSimulation()
    }
    setInputString(value)
  }

  // Engines fold the just-read symbol into `consumedInput` AND report it again as
  // `currentSymbol`. Render it once — as the highlighted most-recently-read cell —
  // so the tape doesn't show the current symbol twice.
  const headConsumed =
    currentSymbol && consumedInput.endsWith(currentSymbol)
      ? consumedInput.slice(0, consumedInput.length - currentSymbol.length)
      : consumedInput

  const BTN: React.CSSProperties = {
    padding: '1px 8px',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: '3px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  };

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)'
    }}>
      {/* Row 1: INPUT STRING */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px', borderBottom: '1px solid var(--border-subtle)', minHeight: '28px'
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0
        }}>
          INPUT STRING
        </span>

        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputString}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={status === 'running'}
            placeholder={isTM ? 'Enter initial tape contents (e.g. 0011)' : 'Enter input string (e.g. aabb)'}
            style={{
              flex: 1,
              padding: '2px 8px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              outline: 'none',
              minWidth: 0,
              opacity: status === 'running' ? 0.5 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
          />
          {!isTM && (
            <div style={{ position: 'absolute', right: '4px' }}>
              <EpsilonInserter
                targetRef={inputRef}
                open={epsOpen}
                setOpen={setEpsOpen}
                onInsert={handleInputChange}
                size="sm"
              />
            </div>
          )}
        </div>

        {!isTM && isIdle && (
          <span
            title="An empty input tests the empty string ε"
            style={{ flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            empty = ε
          </span>
        )}

        <button
          onClick={() => openModal('batch')}
          title="Test many strings at once (batch / test-suite runner)"
          aria-label="Open batch tester"
          style={BTN}
        >
          Batch…
        </button>
      </div>

      {/* Row 2: INPUT BUFFER */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        padding: '3px 10px', minHeight: '24px', overflowX: 'auto'
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '92px', flexShrink: 0
        }}>
          INPUT BUFFER
        </span>

        {isIdle ? (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.77rem' }}>
            {inputString ? 'Press Play (Space) or Step (Right Arrow) to begin' : ''}
          </span>
        ) : isTM ? (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.77rem' }}>
            (Tape controls are available in the Tape panel)
          </span>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            flexShrink: 0,
          }}>
            <span style={{ color: 'var(--text-muted)', letterSpacing: '2px' }}>
              {headConsumed}
            </span>
            {currentSymbol && (
              <span style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                padding: '0 5px',
                fontWeight: 700,
                margin: '0 2px',
              }}>
                {currentSymbol}
              </span>
            )}
            <span style={{ color: 'var(--text-secondary)', letterSpacing: '2px' }}>
              {remainingInput}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
