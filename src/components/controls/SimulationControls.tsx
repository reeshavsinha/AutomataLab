// ============================================================
// SimulationControls — Play / Pause / Step / Reset + Speed + Status
// No animations, plain black & white.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useSimulation } from '@/hooks/useSimulation'
import { useSimulationStore } from '@/store/simulationStore'

const STATUS_LABELS: Record<string, string> = {
  idle:     'Idle',
  running:  'Running',
  accepted: 'Accepted',
  rejected: 'Rejected',
  stuck:    'Stuck',
  error:    'Error',
}

function ControlButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: string
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border-default)'}`,
        background: active ? 'var(--bg-elevated)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        opacity: disabled ? 0.3 : 1,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {icon}
    </button>
  )
}

export default function SimulationControls() {
  const { step, play, pause, reset } = useSimulation()
  const { status, speed, setSpeed, stepCount } = useSimulationStore()
  const [isPlaying, setIsPlaying] = useState(false)

  const isDone = status === 'accepted' || status === 'rejected' || status === 'stuck' || status === 'error'
  const isIdle = status === 'idle'

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      play()
      setIsPlaying(true)
    }
  }, [isPlaying, play, pause])

  const handleStep = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    }
    step()
  }, [isPlaying, pause, step])

  const handleReset = useCallback(() => {
    pause()
    setIsPlaying(false)
    reset()
  }, [pause, reset])

  useEffect(() => {
    if (isDone) setIsPlaying(false)
  }, [isDone])

  // ── Keyboard Shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return

      const keyLower = e.key.toLowerCase()

      if (e.key === ' ' || keyLower === 'p' || (e.altKey && keyLower === 'p')) {
        if (e.key === ' ') {
          e.preventDefault() // Prevent page scrolling
        }
        if (!isDone || isPlaying) {
          handlePlay()
        }
      } else if (e.key === 'ArrowRight' || keyLower === 's' || (e.altKey && keyLower === 's')) {
        if (!isDone) {
          e.preventDefault()
          handleStep()
        }
      } else if (keyLower === 'r' || (e.altKey && keyLower === 'r')) {
        if (!isIdle) {
          e.preventDefault()
          handleReset()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlay, handleStep, handleReset, isDone, isIdle, isPlaying])

  const statusLabel = STATUS_LABELS[status] ?? 'Idle'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 16px',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-default)',
      flexShrink: 0,
    }}>
      {/* Play / Pause */}
      <ControlButton
        icon={isPlaying ? '⏸' : '▶'}
        label={isPlaying ? 'Pause (Space / P)' : 'Play (Space / P)'}
        onClick={handlePlay}
        active={isPlaying}
        disabled={isDone && !isPlaying}
      />

      {/* Step */}
      <ControlButton
        icon="⏭"
        label="Step Forward (Right Arrow / S)"
        onClick={handleStep}
        disabled={isDone}
      />

      {/* Reset */}
      <ControlButton
        icon="↺"
        label="Reset (R)"
        onClick={handleReset}
        disabled={isIdle}
      />

      <div style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          SPEED
        </span>
        <input
          type="range"
          min={0.25}
          max={8}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{
            width: '80px',
            accentColor: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: '28px' }}>
          {speed}×
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Step counter */}
      {!isIdle && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          step {stepCount}
        </span>
      )}

      {/* Status */}
      <div style={{
        padding: '3px 10px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isDone && status === 'accepted' ? 'var(--text-primary)' : 'var(--border-default)'}`,
        background: isDone && status === 'accepted' ? 'var(--bg-elevated)' : 'transparent',
        color: isDone && status === 'rejected' ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}>
        {statusLabel}
      </div>
    </div>
  )
}
