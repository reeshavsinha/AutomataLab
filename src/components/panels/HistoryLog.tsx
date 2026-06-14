// ============================================================
// HistoryLog — Execution step history. Plain B&W.
// ============================================================

import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'

/** Cap on rendered rows — keeps the DOM small during long runs. */
const MAX_VISIBLE = 500

export default function HistoryLog() {
  const { history } = useSimulationStore()
  const { machine } = useMachineStore()

  const endRef = useRef<HTMLDivElement>(null)

  // Keep the latest step visible during continuous playback.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [history.length])

  const getLabel = (id: string) =>
    machine.states.find((s) => s.id === id)?.label ?? id

  // Render a nondeterministic step honestly: a set of active states is shown as
  // {q0, q1} rather than flattened to a comma list (UX audit THY-3).
  const fmtStates = (ids: string[]) => {
    const labels = ids.map(getLabel)
    return labels.length > 1 ? `{${labels.join(', ')}}` : labels.join(', ')
  }

  if (history.length === 0) {
    return (
      <div style={{
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
      }}>
        <div>No history yet.</div>
        <div style={{ fontSize: '11px' }}>Press ▶ or ⏭ to simulate.</div>
      </div>
    )
  }

  const hiddenCount = history.length > MAX_VISIBLE ? history.length - MAX_VISIBLE : 0
  const visible = hiddenCount > 0 ? history.slice(history.length - MAX_VISIBLE) : history

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {hiddenCount > 0 && (
        <div style={{
          padding: '6px 12px',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {hiddenCount.toLocaleString()} earlier step{hiddenCount === 1 ? '' : 's'} hidden
        </div>
      )}
      {visible.map((entry, i) => {
        const isLast = i === visible.length - 1
        const from = fmtStates(entry.fromStateIds)
        const to = fmtStates(entry.toStateIds)
        const isAccepted = entry.status === 'accepted'
        const isRejected = entry.status === 'rejected' || entry.status === 'stuck'

        return (
          <div
            key={i}
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              background: isLast ? 'var(--bg-elevated)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {/* Step */}
            <span style={{ minWidth: '22px', fontSize: '10px', color: 'var(--text-muted)' }}>
              {entry.step + 1}
            </span>

            {/* Transition description */}
            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{from || '—'}</span>
              {entry.symbol && (
                <>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>─</span>
                  <span style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: '3px',
                    padding: '0 4px',
                    color: 'var(--text-primary)',
                  }}>
                    {entry.symbol}
                  </span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                  <span style={{ color: 'var(--text-primary)' }}>{to || '∅'}</span>
                </>
              )}
            </span>

            {/* Status on last step */}
            {isLast && (
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                color: isAccepted ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border-default)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
              }}>
                {entry.status.toUpperCase()}
              </span>
            )}
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
