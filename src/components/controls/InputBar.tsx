// ============================================================
// InputBar — Input string entry with tape visualization. Plain B&W.
// ============================================================

import { useSimulationStore } from '@/store/simulationStore'

export default function InputBar() {
  const { inputString, setInputString, consumedInput, remainingInput, currentSymbol, status } =
    useSimulationStore()

  const isIdle = status === 'idle'

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
        onChange={(e) => setInputString(e.target.value)}
        disabled={!isIdle}
        placeholder="Enter input string (e.g. aabb)"
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
          opacity: isIdle ? 1 : 0.5,
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
      />

      {/* Tape visualization during simulation */}
      {!isIdle && (
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
