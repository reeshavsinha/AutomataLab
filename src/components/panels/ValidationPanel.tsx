// ============================================================
// ValidationPanel — Machine validation. Plain B&W.
// ============================================================

import { useMemo } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { validateMachine } from '@/utils/validator'
import type { ValidationError } from '@/engines/core/types'

function ValidationItem({ error }: { error: ValidationError }) {
  const isError = error.severity === 'error'
  return (
    <div style={{
      padding: '7px 12px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      fontSize: '12px',
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{ flexShrink: 0, color: isError ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: '1px' }}>
        {isError ? '✕' : '!'}
      </span>
      <div>
        <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{error.message}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>{error.code}</div>
      </div>
    </div>
  )
}

export default function ValidationPanel() {
  const { machine } = useMachineStore()
  const errors = useMemo(() => validateMachine(machine), [machine])

  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warnCount  = errors.filter((e) => e.severity === 'warning').length

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
      }}>
        {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
        {errorCount > 0 && warnCount > 0 && ' · '}
        {warnCount > 0 && `${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {errors.map((e, i) => <ValidationItem key={i} error={e} />)}
      </div>
    </div>
  )
}
