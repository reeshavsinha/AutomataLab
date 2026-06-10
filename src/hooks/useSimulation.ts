// ============================================================
// useSimulation — Custom hook
// Manages the simulation engine lifecycle: play, pause, step, reset.
// The engine instance is held in a ref so it doesn't trigger re-renders.
// ============================================================

import { useRef, useCallback, useEffect } from 'react'
import { DFAEngine } from '@/engines/dfa/DFAEngine'
import { NFAEngine } from '@/engines/nfa/NFAEngine'
import { ENFAEngine } from '@/engines/enfa/ENFAEngine'
import { DPDAEngine } from '@/engines/dpda/DPDAEngine'
import { NPDAEngine } from '@/engines/npda/NPDAEngine'
import type { Automaton, StepResult } from '@/engines/core/types'
import { supportsTree } from '@/engines/core/computationTree'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { validateMachine, hasBlockingErrors } from '@/utils/validator'

function createEngine(type: string, definition: ConstructorParameters<typeof DFAEngine>[0]): Automaton {
  switch (type) {
    case 'NFA':  return new NFAEngine(definition)
    case 'ENFA': return new ENFAEngine(definition)
    case 'DPDA': return new DPDAEngine(definition)
    case 'NPDA': return new NPDAEngine(definition)
    default:     return new DFAEngine(definition)
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

  // ── Push an engine StepResult into the simulation store ─────
  const applyEngineResult = useCallback(
    (engine: Automaton, result: StepResult) => {
      applyStepResult({
        activeStateIds: result.activeStateIds,
        activeTransitionIds: result.transitionIds,
        consumedInput: result.consumedInput,
        remainingInput: result.remainingInput,
        currentSymbol: result.symbol,
        status: result.status,
        historyEntry: result.historyEntry,
        configurations: result.configurations,
        activeStack: result.stack,
        treeNodes: supportsTree(engine) ? engine.getTreeNodes() : [],
        liveBranchIds: supportsTree(engine) ? engine.getLiveBranchIds() : [],
      })
    },
    [applyStepResult]
  )

  // ── Execute a single step ──────────────────────────────────
  const executeStep = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return false

    const result = engine.step()
    applyEngineResult(engine, result)

    // Stop if simulation is finished
    if (result.status !== 'running') {
      stopInterval()
      return false
    }
    return true
  }, [applyEngineResult, stopInterval])

  // ── Initialize (called on Play or Step from idle) ─────────
  const initEngine = useCallback(() => {
    const errors = validateMachine(machine)
    if (hasBlockingErrors(errors)) {
      setStatus('error')
      return false
    }
    const engine = createEngine(machine.type, machine)
    engine.initialize(inputString)
    engineRef.current = engine
    return true
  }, [machine, inputString, setStatus])

  // ── Step forward once ─────────────────────────────────────
  const step = useCallback(() => {
    if (status === 'idle') {
      if (!initEngine()) return
    }
    if (engineRef.current) {
      executeStep()
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
      if (!executeStep()) return false // finished/failed in a single step
    } else if (status === 'running') {
      isPlayingRef.current = true
    } else {
      return false
    }

    intervalRef.current = setInterval(() => {
      const cont = executeStep()
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
    resetSimulation()
  }, [stopInterval, resetSimulation])

  // ── Step back — retrace one step ───────────────────────────
  // Engines are stateful and not serialisable, so the robust way to "undo" a
  // step is to rebuild a fresh engine from the start and re-run (stepCount − 1)
  // steps. The engines are deterministic, so this reproduces the exact prior
  // configuration (active states, stack, computation-tree frontier, history).
  const stepBack = useCallback(() => {
    const { stepCount, status: simStatus } = useSimulationStore.getState()
    if (simStatus === 'idle' || stepCount <= 0) return
    stopInterval()

    const target = stepCount - 1
    if (target === 0) {
      // Back to the very start → idle, before the first step.
      engineRef.current = null
      resetSimulation()
      return
    }

    const errors = validateMachine(machine)
    if (hasBlockingErrors(errors)) {
      setStatus('error')
      return
    }
    const engine = createEngine(machine.type, machine)
    engine.initialize(inputString)
    engineRef.current = engine
    resetSimulation() // clear history; replay rebuilds it up to `target`
    for (let i = 0; i < target; i++) {
      const result = engine.step()
      applyEngineResult(engine, result)
      if (result.status !== 'running') break // safety (shouldn't trip before target)
    }
  }, [machine, inputString, stopInterval, resetSimulation, setStatus, applyEngineResult])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => stopInterval()
  }, [stopInterval])

  // ── Update interval delay when speed changes mid-play ─────
  useEffect(() => {
    if (isPlayingRef.current && intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        const cont = executeStep()
        if (!cont) stopInterval()
      }, getDelay())
    }
  }, [speed, executeStep, getDelay, stopInterval])

  return {
    step,
    stepBack,
    play,
    pause,
    reset,
    isPlaying: isPlayingRef.current,
  }
}
