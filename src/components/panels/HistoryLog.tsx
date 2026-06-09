// ============================================================
// HistoryLog — Execution step history. Plain B&W.
// ============================================================

import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'

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

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {history.map((entry, i) => {
        const isLast = i === history.length - 1
        const from = entry.fromStateIds.map(getLabel).join(', ')
        const to = entry.toStateIds.map(getLabel).join(', ')
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
