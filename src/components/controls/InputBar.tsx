// ============================================================
// InputBar — Input string entry with tape visualization. Plain B&W.
// ============================================================

import { useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { isTMType } from '@/engines/core/utils'
import BatchRunnerModal from './BatchRunnerModal'

export default function InputBar() {
  const { inputString, setInputString, consumedInput, remainingInput, currentSymbol, status } =
    useSimulationStore()
  const machineType = useMachineStore((s) => s.machine.type)
  const isTM = isTMType(machineType)
  const [showBatch, setShowBatch] = useState(false)

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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-default)',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
        letterSpacing: '0.06em',
      }}>
        INPUT
      </span>

      <input
        type="text"
        value={inputString}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={status === 'running'}
        placeholder={isTM ? 'Enter initial tape contents (e.g. 0011)' : 'Enter input string (e.g. aabb)'}
        style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 10px',
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          outline: 'none',
          opacity: status === 'running' ? 0.5 : 1,
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
      />

      <button
        onClick={() => setShowBatch(true)}
        title="Test many strings at once (batch / test-suite runner)"
        aria-label="Open batch tester"
        style={{
          flexShrink: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          padding: '5px 10px',
          cursor: 'pointer',
        }}
      >
        Batch…
      </button>

      {showBatch && <BatchRunnerModal onClose={() => setShowBatch(false)} />}

      {/* Inline FA tape progress. TM head moves both ways, so the dedicated
          TapePanel is canonical there and this compact view is hidden. */}
      {!isIdle && !isTM && (
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
  )
}
