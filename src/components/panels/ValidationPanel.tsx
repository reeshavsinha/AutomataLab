// ============================================================
// ValidationPanel — Machine validation. Plain B&W.
// ============================================================

import { useMemo } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { validateMachine } from '@/utils/validator'
import type { ValidationError } from '@/engines/machine/core/types'

function ValidationItem({ error }: { error: ValidationError }) {
  const requestFocus = useUIStore((s) => s.requestFocus)
  const isError = error.severity === 'error'
  // A row that names an offending element is click-to-locate: it pans the canvas
  // to the element and selects it, closing the analyse→fix loop (UX audit #5).
  const locatable = !!error.stateId || !!error.transitionId
  const locate = () => {
    if (error.stateId) requestFocus('state', error.stateId)
    else if (error.transitionId) requestFocus('transition', error.transitionId)
  }
  return (
    <div
      onClick={locatable ? locate : undefined}
      role={locatable ? 'button' : undefined}
      tabIndex={locatable ? 0 : undefined}
      onKeyDown={locatable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); locate() } } : undefined}
      title={locatable ? 'Click to locate on the canvas' : undefined}
      style={{
        padding: '7px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        cursor: locatable ? 'pointer' : 'default',
      }}
      onMouseEnter={locatable ? (e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)' } : undefined}
      onMouseLeave={locatable ? (e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' } : undefined}
    >
      <span style={{ flexShrink: 0, color: isError ? 'var(--status-reject)' : 'var(--status-running)', marginTop: '1px' }}>
        {isError ? '✕' : '!'}
      </span>
      <div>
        <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{error.message}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span>{error.code}</span>
          {locatable && <span style={{ color: 'var(--focus-ring)' }}>· locate ↗</span>}
        </div>
      </div>
    </div>
  )
}

export default function ValidationPanel() {
  const { machine, completeDFA } = useMachineStore()
  const errors = useMemo(() => validateMachine(machine), [machine])

  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warnCount  = errors.filter((e) => e.severity === 'warning').length
  const canCompleteDFA =
    machine.type === 'DFA' && errors.some((e) => e.code === 'DFA_MISSING_TRANSITION')

  if (errors.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '4px',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
      }}>
        <div>✓ Machine is valid</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>
          {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
          {errorCount > 0 && warnCount > 0 && ' · '}
          {warnCount > 0 && `${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
        </span>
        {canCompleteDFA && (
          <button
            onClick={completeDFA}
            title="Add a trap/dead state and route every missing move to it"
            style={{
              marginLeft: 'auto',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            Complete DFA
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {errors.map((e, i) => <ValidationItem key={i} error={e} />)}
      </div>
    </div>
  )
}
