// ============================================================
// SimulationControls — Play / Pause / Step / Reset + Speed + Status
// No animations, plain black & white.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useSimulation } from '@/hooks/useSimulation'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { isTMType } from '@/engines/core/utils'
import { toast } from '@/store/toastStore'

const DEFAULT_STEP_LIMIT = 10_000

const STATUS_LABELS: Record<string, string> = {
  idle:     'Idle',
  running:  'Running',
  accepted: 'Accepted',
  rejected: 'Rejected',
  stuck:    'Stuck',
  error:    'Error',
}

// Halt semantics differ — "stuck" (no applicable move / step limit) is not the
// same outcome as an explicit "reject", so each gets its own tooltip (UX #10).
const STATUS_TITLES: Record<string, string> = {
  idle:     'Not started.',
  running:  'Running…',
  accepted: 'Accepted: halted in an accept state with the input consumed.',
  rejected: 'Rejected: input consumed but not in an accept state.',
  stuck:    'Stuck: halted with no applicable transition (or the step limit was hit) — not the same as an explicit reject.',
  error:    'Error: the run could not proceed.',
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
      aria-label={label}
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
  const { step, stepBack, play, pause, reset } = useSimulation()
  const { status, speed, setSpeed, stepCount } = useSimulationStore()
  const machineType = useMachineStore((s) => s.machine.type)
  const stepLimit = useMachineStore((s) => s.machine.stepLimit)
  const [isPlaying, setIsPlaying] = useState(false)

  const isDone = status === 'accepted' || status === 'rejected' || status === 'stuck' || status === 'error'
  const isIdle = status === 'idle'

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    } else {
      // Only show the "playing" state if a run actually started — play() returns
      // false on validation failure or a single-step machine that finished at once.
      setIsPlaying(play())
    }
  }, [isPlaying, play, pause])

  const handleStep = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    }
    step()
  }, [isPlaying, pause, step])

  const handleStepBack = useCallback(() => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    }
    stepBack()
  }, [isPlaying, pause, stepBack])

  const handleReset = useCallback(() => {
    pause()
    setIsPlaying(false)
    reset()
  }, [pause, reset])

  // Clear the local play flag when the run ends *or* is reset out from under us
  // (e.g. switching tabs resets the simulation to idle via useSimulation).
  useEffect(() => {
    if (isDone || isIdle) setIsPlaying(false)
  }, [isDone, isIdle])

  // Infinite-loop guard feedback (NFR-8): when a TM/LBA halts as `stuck` it hit
  // the step limit. Surface it as a toast so the cause isn't mistaken for a
  // reject, and point the user at the adjustable limit.
  useEffect(() => {
    if (status === 'stuck' && isTMType(machineType)) {
      const limit = stepLimit ?? DEFAULT_STEP_LIMIT
      toast.warning(`Step limit reached (${limit.toLocaleString()} steps). The run was halted as "stuck" — raise the LIMIT in the toolbar if it needs more steps.`)
    }
  }, [status, machineType, stepLimit])

  // ── Keyboard Shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (isInput) return
      // Let Ctrl/Cmd combos (e.g. Ctrl+S = Save) through to their own handlers —
      // the single-letter sim shortcuts below are bare-key only.
      if (e.ctrlKey || e.metaKey) return

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
      } else if (e.key === 'ArrowLeft') {
        if (stepCount > 0) {
          e.preventDefault()
          handleStepBack()
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
  }, [handlePlay, handleStep, handleStepBack, handleReset, isDone, isIdle, isPlaying, stepCount])

  const statusLabel = STATUS_LABELS[status] ?? 'Idle'

  // Colour-coded result badge so the outcome is unmistakable. "Stuck" gets its
  // own amber treatment so a no-move halt / step-limit isn't read as an explicit
  // reject (UX audit #10).
  const badge = (() => {
    if (status === 'accepted') return { bg: 'var(--status-accept)', fg: '#ffffff', border: 'var(--status-accept)' }
    if (status === 'rejected' || status === 'error')
      return { bg: 'var(--status-reject)', fg: '#ffffff', border: 'var(--status-reject)' }
    if (status === 'stuck') return { bg: 'transparent', fg: 'var(--status-running)', border: 'var(--status-running)' }
    if (status === 'running') return { bg: 'transparent', fg: 'var(--status-running)', border: 'var(--status-running)' }
    return { bg: 'transparent', fg: 'var(--text-primary)', border: 'var(--border-default)' }
  })()

  const clampSpeed = (v: number) => Math.min(8, Math.max(0.25, v))

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

      {/* Step Back */}
      <ControlButton
        icon="⏮"
        label="Step Back (Left Arrow)"
        onClick={handleStepBack}
        disabled={stepCount === 0}
      />

      {/* Step Forward */}
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

      {/* Speed — slider for fine control + presets for common values. The value
          is shown read-only so the control isn't presented three ways (S4). */}
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
          aria-label={`Simulation speed: ${speed}×`}
          onChange={(e) => setSpeed(clampSpeed(parseFloat(e.target.value)))}
          style={{
            width: '90px',
            accentColor: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: '34px' }}>
          {speed}×
        </span>

        {/* Speed presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {[0.5, 1, 2, 4].map((p) => (
            <button
              key={p}
              onClick={() => setSpeed(p)}
              title={`${p}× speed`}
              aria-label={`Set speed ${p}×`}
              style={{
                background: speed === p ? 'var(--bg-elevated)' : 'transparent',
                border: `1px solid ${speed === p ? 'var(--text-primary)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-sm)',
                color: speed === p ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 5px',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {p}×
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Step counter */}
      {!isIdle && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          step {stepCount}
        </span>
      )}

      {/* Status */}
      <div
        role="status"
        title={STATUS_TITLES[status] ?? ''}
        style={{
          padding: '3px 12px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${badge.border}`,
          background: badge.bg,
          color: badge.fg,
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          cursor: 'help',
        }}
      >
        {statusLabel}
      </div>
    </div>
  )
}
