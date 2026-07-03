// ============================================================
// SimulationControls — Play / Pause / Step / Reset + Speed + Status
// No animations, plain black & white.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react'
import { useSimulation } from '@/hooks/useSimulation'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { useCommandStore } from '@/store/commandStore'
import { isTMType } from '@/engines/machine/core/utils'
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

// Halt semantics differ and are easy to confuse, so each status gets a precise
// tooltip (UX audit FBK-1). "Rejected" covers both a trap (no applicable move)
// and input consumed in a non-accepting state; "Stuck" is reserved for hitting
// the step/loop guard — a possible non-halting computation, not a reject.
const STATUS_TITLES: Record<string, string> = {
  idle:     'Not started.',
  running:  'Running…',
  accepted: 'Accepted: halted in an accepting configuration with the input consumed.',
  rejected: 'Rejected: the run halted without accepting — either no transition applied (a trap / dead configuration) or the input was consumed in a non-accepting state.',
  stuck:    'Stuck: the run hit the step limit before it could accept or reject (often a non-halting computation), so it was halted as a guard — not an explicit reject.',
  error:    'Error: the machine is invalid, so the run could not start. See the Validate tab.',
}

const BTN_BASE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: '3px',
  padding: '2px 7px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.72rem',
  fontWeight: 600,
  lineHeight: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px'
};


export default function SimulationControls() {
  const { step, stepBack, seekTo, play, pause, reset } = useSimulation()
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

  const handleSeekTo = useCallback((target: number) => {
    if (isPlaying) {
      pause()
      setIsPlaying(false)
    }
    seekTo(target)
  }, [isPlaying, pause, seekTo])

  const handleSeekToEnd = useCallback(() => {
    handleSeekTo(10000)
  }, [handleSeekTo])

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
    if (status !== 'stuck') return
    if (isTMType(machineType)) {
      const limit = stepLimit ?? DEFAULT_STEP_LIMIT
      toast.warning(`Step limit reached (${limit.toLocaleString()} steps). The run was halted as "stuck" (a possible non-halting computation) — raise the LIMIT in the toolbar if it needs more steps.`)
    } else {
      toast.warning('The run hit its step/loop guard and was halted as "stuck" (a possible non-halting computation) — this is not an explicit reject.')
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

  // Publish the transport controls to the command bus so the classic top
  // toolbar / Simulate menu can drive the same (single) engine instance.
  const setSimApi = useCommandStore((s) => s.setSimApi)
  useEffect(() => {
    setSimApi({ play: handlePlay, step: handleStep, stepBack: handleStepBack, seekTo: handleSeekTo, reset: handleReset, isPlaying })
    return () => setSimApi(null)
  }, [setSimApi, handlePlay, handleStep, handleStepBack, handleSeekTo, handleReset, isPlaying])

  const statusLabel = STATUS_LABELS[status] ?? 'Idle'

  const statusColor =
    status === 'accepted' ? '#4ade80' :
    status === 'error' || status === 'rejected' ? '#f87171' :
    '#fb923c';

  const displayStatusLabel = status === 'idle' ? 'Idle' : statusLabel;

  const clampSpeed = (v: number) => Math.min(8, Math.max(0.25, v))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '4px 12px',
      gap: '6px',
      minHeight: '48px',
      background: 'var(--chrome-bg)',
      borderTop: '1px solid var(--chrome-border)',
      flexShrink: 0,
    }}>
      {/* Transport buttons */}
      <button onClick={() => handleSeekTo(0)} style={BTN_BASE} title="Go to beginning">|&lt;&lt;</button>
      <button onClick={handleStepBack} style={BTN_BASE} title="One step back">&lt;</button>
      <button
        onClick={handlePlay}
        style={{
          ...BTN_BASE,
          background: isPlaying ? '#21262d' : 'transparent',
          color: 'var(--text-primary)',
          minWidth: '28px',
        }}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={handleStep} style={BTN_BASE} title="One step forward">&gt;</button>
      <button onClick={handleSeekToEnd} style={BTN_BASE} title="Go to latest step">&gt;&gt;|</button>
      <button onClick={handleReset} style={BTN_BASE} title="Reset">↺</button>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: '#30363d', margin: '0 4px' }} />

      {/* Speed slider + presets */}
      <span style={{
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        marginRight: '2px'
      }}>
        SPEED
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="range"
          min={0.25}
          max={8}
          step={0.25}
          value={speed}
          title={`${speed}x speed`}
          aria-label={`Simulation speed: ${speed}×`}
          onChange={(e) => setSpeed(clampSpeed(parseFloat(e.target.value)))}
          style={{
            width: '90px',
            accentColor: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: '34px' }}>
          {speed}x
        </span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {[0.5, 1, 2, 4].map(p => (
            <button
              key={p}
              onClick={() => setSpeed(p)}
              style={{
                ...BTN_BASE,
                background: speed === p ? 'var(--bg-secondary)' : 'transparent',
                color: speed === p ? 'var(--text-primary)' : 'var(--text-muted)',
                border: speed === p ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                padding: '1px 5px',
                fontSize: '0.68rem'
              }}
            >
              {p}x
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Step counter */}
        {stepCount > 0 && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            step {stepCount}
          </span>
        )}

        {/* Status */}
        <span
          title={STATUS_TITLES[status] ?? ''}
          style={{
            padding: '1px 8px',
            background: status === 'idle' ? 'var(--bg-elevated)' : `${statusColor}18`,
            color: status === 'idle' ? 'var(--text-primary)' : statusColor,
            border: status === 'idle' ? '1px solid var(--border-subtle)' : `1px solid ${statusColor}`,
            borderRadius: '3px',
            fontSize: '0.68rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            cursor: 'help'
          }}
        >
          {displayStatusLabel}
        </span>
      </div>
    </div>
  )
}
