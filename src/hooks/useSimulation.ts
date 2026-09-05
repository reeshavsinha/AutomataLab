// ============================================================
// useSimulation — Custom hook
// Manages the simulation engine lifecycle: play, pause, step, reset.
// The engine instance is held in a ref so it doesn't trigger re-renders.
// ============================================================

import { useRef, useCallback, useEffect, useMemo } from 'react'
import type { Automaton, HistoryEntry, StepResult, ValidationError } from '@/engines/machine/core/types'
import { supportsTree } from '@/engines/machine/core/computationTree'
import { createEngine } from '@/engines/machine/core/engineFactory'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'
import { useTMDebugStore } from '@/store/tmDebugStore'
import { validateMachine, hasBlockingErrors } from '@/utils/validator'
import { toast } from '@/store/toastStore'
import { isTMType } from '@/engines/machine/core/utils'
import { findWatcherHit } from '@/engines/machine/tm/watchers'

function enrichHistoryEntry(result: StepResult): HistoryEntry {
  const primary = result.configurations[0]
  return {
    ...result.historyEntry,
    ...(primary ? { inputIndex: primary.inputIndex } : {}),
    consumedInput: result.consumedInput,
    remainingInput: result.remainingInput,
    ...(result.stack.length > 0 ? { stack: [...result.stack] } : {}),
    ...(result.tapes ? {
      tapes: result.tapes.map((tape) => ({
        ...tape,
        cells: [...tape.cells],
        ...(tape.tracks ? { tracks: tape.tracks.map((track) => [...track]) } : {}),
      })),
    } : {}),
    ...(result.output !== undefined ? { output: result.output } : {}),
    ...(result.outputTrace ? { outputTrace: [...result.outputTrace] } : {}),
    ...(primary?.activeSubmachinePath ? { activeSubmachinePath: [...primary.activeSubmachinePath] } : {}),
    ...(primary?.callStack ? { callStack: primary.callStack.map((frame) => ({ ...frame })) } : {}),
  }
}

export function useSimulation() {
  const machine = useMachineStore((s) => s.machine)
  const { inputString, speed, applyStepResult, resetSimulation, setStatus, status } =
    useSimulationStore()

  const engineRef = useRef<Automaton | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPlayingRef = useRef(false)

  // ── Compute interval delay from speed multiplier ──────────
  const getDelay = useCallback(() => {
    // speed 1 = 600ms, speed 2 = 300ms, speed 0.5 = 1200ms.
    // The speed field accepts free-typed values, so guard against a
    // non-positive / non-finite speed (which would make 600/speed yield 0 or ∞
    // and spin the interval) and clamp the delay to a sane [40ms, 6000ms] range.
    const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1
    return Math.min(6000, Math.max(40, Math.round(600 / safeSpeed)))
  }, [speed])

  // ── Stop any running interval ──────────────────────────────
  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isPlayingRef.current = false
  }, [])

  /** Watchers are UI-only pause gates: engines and headless/batch execution
   * remain unaware of them. For an NLBA, the first matching frontier branch
   * pauses the run in the stable watcher/branch order. */
  const pauseForMatchingWatcher = useCallback((engine: Automaton): boolean => {
    if (!isTMType(machine.type)) return false
    const configurations = engine.getCurrentConfigurations()
    const session = useTMDebugStore.getState().getSession(machine.id)
    const hit = findWatcherHit(session.watchers, configurations, useSimulationStore.getState().stepCount)
    if (!hit) return false
    stopInterval()
    useSimulationStore.getState().setPreStepConfigurations(configurations)
    useTMDebugStore.getState().setLastHit(machine.id, hit)
    return true
  }, [machine.id, machine.type, stopInterval])

  // ── Push an engine StepResult into the simulation store ─────
  const applyEngineResult = useCallback(
    (engine: Automaton, result: StepResult) => {
      applyStepResult({
        activeStateIds: result.activeStateIds,
        activeTransitionIds: result.transitionIds,
        consumedInput: result.consumedInput,
        remainingInput: result.remainingInput,
        currentSymbol: result.symbol,
        outputTrace: result.outputTrace,
        status: result.status,
        historyEntry: enrichHistoryEntry(result),
        configurations: result.configurations,
        activeStack: result.stack,
        activeTapes: result.tapes ?? [],
        treeNodes: supportsTree(engine) ? engine.getTreeNodes() : [],
        liveBranchIds: supportsTree(engine) ? engine.getLiveBranchIds() : [],
      })
    },
    [applyStepResult]
  )

  // ── Execute a single step ──────────────────────────────────
  const executeStep = useCallback((respectWatchers = false) => {
    const engine = engineRef.current
    if (!engine) return false
    if (respectWatchers && pauseForMatchingWatcher(engine)) return false
    useTMDebugStore.getState().setLastHit(machine.id, null)

    const result = engine.step()
    applyEngineResult(engine, result)

    // Stop if simulation is finished
    if (result.status !== 'running') {
      stopInterval()
      return false
    }
    return true
  }, [applyEngineResult, machine.id, pauseForMatchingWatcher, stopInterval])

  // ── Surface a blocked run (UX audit FLO-1) ────────────────
  // A run that can't start used to flip the status badge to "Error" silently.
  // Now we also toast the error count and open the Validate tab so the cause —
  // and the click-to-locate fixes — are right in front of the user.
  const surfaceBlocking = useCallback((errors: ValidationError[]) => {
    const n = errors.filter((e) => e.severity === 'error').length
    setStatus('error')
    toast.error(`Can't run — ${n} validation ${n === 1 ? 'error' : 'errors'}. See the Validate tab.`)
    useUIStore.getState().setActivePanel('validation')
  }, [setStatus])

  // ── Initialize (called on Play or Step from idle) ─────────
  const initEngine = useCallback(() => {
    const errors = validateMachine(machine)
    if (hasBlockingErrors(errors)) {
      surfaceBlocking(errors)
      return false
    }
    const engine = createEngine(machine)
    engine.initialize(inputString)
    engineRef.current = engine
    useTMDebugStore.getState().setLastHit(machine.id, null)
    return true
  }, [machine, inputString, surfaceBlocking])

  // ── Step forward once ─────────────────────────────────────
  const step = useCallback(() => {
    if (status === 'idle') {
      if (!initEngine()) return
    }
    if (engineRef.current) {
      executeStep(false)
    }
  }, [status, initEngine, executeStep])

  // ── Play continuous execution ─────────────────────────────
  // Returns true if a run is now in progress (lets the UI sync its play/pause
  // state honestly instead of assuming play always starts).
  const play = useCallback((): boolean => {
    if (isPlayingRef.current) return true

    if (status === 'idle') {
      if (!initEngine()) return false
      isPlayingRef.current = true
      // Advance one step synchronously so the store leaves 'idle' immediately
      // (which locks the input tape). Otherwise the input stays editable for one
      // interval delay and the user could change the string mid-run.
      if (!executeStep(true)) return false // finished/paused/failed in a single step
    } else if (status === 'running') {
      isPlayingRef.current = true
    } else {
      return false
    }

    intervalRef.current = setInterval(() => {
      const cont = executeStep(true)
      if (!cont) stopInterval()
    }, getDelay())
    return true
  }, [status, initEngine, executeStep, getDelay, stopInterval])

  // ── Pause ──────────────────────────────────────────────────
  const pause = useCallback(() => {
    stopInterval()
  }, [stopInterval])

  // ── Reset ──────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopInterval()
    engineRef.current = null
    useTMDebugStore.getState().setLastHit(machine.id, null)
    resetSimulation()
  }, [machine.id, stopInterval, resetSimulation])

  // ── Seek to a specific step ─────────────────────────────────────────
  // Engines are stateful and not serialisable, so we "seek" by rebuilding a
  // fresh engine and running silently to the target step.
  const seekTo = useCallback((target: number) => {
    const { status: simStatus } = useSimulationStore.getState()
    if (simStatus === 'idle' || target < 0) return
    stopInterval()

    if (target === 0) {
      // Back to the very start → idle, before the first step.
      engineRef.current = null
      useTMDebugStore.getState().setLastHit(machine.id, null)
      resetSimulation()
      return
    }

    const errors = validateMachine(machine)
    if (hasBlockingErrors(errors)) {
      surfaceBlocking(errors)
      return
    }
    const engine = createEngine(machine)
    engine.initialize(inputString)
    engineRef.current = engine
    useTMDebugStore.getState().setLastHit(machine.id, null)

    // Replay silently, collecting history, then push the whole resulting state in
    // ONE store update. Applying each step individually would fire `target` store
    // updates (and `target` computation-tree rebuilds) — O(n²) work that freezes
    // the UI when stepping back from a high step count.
    const entries: HistoryEntry[] = []
    let last: StepResult | null = null
    for (let i = 0; i < target; i++) {
      const result = engine.step()
      entries.push(enrichHistoryEntry(result))
      last = result
      if (result.status !== 'running') break // safety (shouldn't trip before target)
    }

    if (!last) {
      resetSimulation()
      return
    }

    const tree = supportsTree(engine)
    useSimulationStore.getState().applyReplay({
      activeStateIds: last.activeStateIds,
      activeTransitionIds: last.transitionIds,
      consumedInput: last.consumedInput,
      remainingInput: last.remainingInput,
      currentSymbol: last.symbol,
      outputTrace: last.outputTrace ?? [],
      status: last.status,
      history: entries,
      stepCount: entries.length,
      configurations: last.configurations,
      activeStack: last.stack,
      activeTapes: last.tapes ?? [],
      treeNodes: tree ? engine.getTreeNodes() : [],
      liveBranchIds: tree ? engine.getLiveBranchIds() : [],
    })
  }, [machine, inputString, stopInterval, resetSimulation, surfaceBlocking])

  // ── Step back — retrace one step ───────────────────────────
  const stepBack = useCallback(() => {
    const { stepCount } = useSimulationStore.getState()
    seekTo(stepCount - 1)
  }, [seekTo])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => stopInterval()
  }, [stopInterval])

  // ── Update interval delay when speed changes mid-play ─────
  useEffect(() => {
    if (isPlayingRef.current && intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
      const cont = executeStep(true)
        if (!cont) stopInterval()
      }, getDelay())
    }
  }, [speed, executeStep, getDelay, stopInterval])

  // ── Reset when the active machine changes identity ─────────
  // Switching tabs / opening a file / new-or-reset swaps in a different machine
  // (a new `id`). Without this, any interval still running would keep stepping
  // the *previous* tab's engine, and that tab's (possibly huge) tape/tree/history
  // would keep rendering against the new machine. Edits keep the same id, so this
  // never fires mid-editing.
  const machineIdRef = useRef(machine.id)
  useEffect(() => {
    if (machineIdRef.current !== machine.id) {
      machineIdRef.current = machine.id
      reset()
    }
  }, [machine.id, reset])

  // ── Reset a stale run when the machine is *structurally* edited ─────────
  // A finished run leaves `status` at a terminal value (completed for
  // transducers, accepted/rejected/stuck/error for recognizers), which the
  // canvas, toolbar, and input bar all use to lock
  // editing. Without an automatic way back to `idle`, the user gets "stuck":
  // after a run, the Delete key / Add-state button / input field appear dead
  // and the displayed result is stale w.r.t. any edit. So whenever the
  // machine's *computational* structure changes (states, transitions, type,
  // blank, tape count — NOT node x/y positions or cosmetic text notes, which
  // shouldn't invalidate a result), drop the simulation back to idle. This
  // also stops a still-running interval and discards the old engine, so even
  // an edit made via an unguarded path (e.g. the right-click menu) is safe.
  const structuralSig = useMemo(() => {
    const states = machine.states
      .filter((s) => !s.isText)
      .map((s) => `${s.id},${s.label},${s.isStart ? 1 : 0}${s.isAccept ? 1 : 0}${s.isReject ? 1 : 0},${s.output ?? ''}`)
      .join(';')
    const trans = machine.transitions
      .map(
        (t) =>
          `${t.id},${t.from}>${t.to},${(t.symbols ?? []).join('|')},` +
          `${t.read ?? ''}/${t.pop ?? ''}/${t.push ?? ''},${t.write ?? ''}/${t.direction ?? ''},` +
          `${(t.reads ?? []).join('|')}/${(t.writes ?? []).join('|')}/${(t.directions ?? []).join('|')},${t.output ?? ''},${t.submachineId ?? ''}`
      )
      .join(';')
    return `${machine.type}|${machine.blankSymbol ?? ''}|${machine.tapeCount ?? 1}|${states}|${trans}|${JSON.stringify(machine.submachines ?? {})}`
  }, [machine])

  const structuralSigRef = useRef(structuralSig)
  useEffect(() => {
    if (structuralSigRef.current === structuralSig) return
    structuralSigRef.current = structuralSig
    if (useSimulationStore.getState().status !== 'idle') {
      reset()
    }
  }, [structuralSig, reset])

  return {
    step,
    stepBack,
    seekTo,
    play,
    pause,
    reset,
    isPlaying: isPlayingRef.current,
  }
}
