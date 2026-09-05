import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSimulation } from './useSimulation'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useTMDebugStore } from '@/store/tmDebugStore'
import type { MachineDefinition } from '@/engines/machine/core/types'

const tm: MachineDefinition = {
  id: 'watcher-tm',
  name: 'Watcher TM',
  type: 'TM',
  language: '',
  alphabet: ['a'],
  blankSymbol: '_',
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 60, y: 0, isStart: false, isAccept: false },
    { id: 'qa', label: 'qa', x: 120, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: [], read: 'a', write: 'a', direction: 'R' },
    { id: 't1', from: 'q1', to: 'qa', symbols: [], read: 'a', write: 'a', direction: 'S' },
  ],
}

describe('useSimulation TM watchers', () => {
  beforeEach(() => {
    useMachineStore.setState({
      machine: tm,
      tabs: [tm],
      activeTabIndex: 0,
      dirtyTabs: {},
      tabPaths: {},
      tabRoutes: {},
    })
    useSimulationStore.getState().resetSimulation()
    useSimulationStore.getState().setInputString('aa')
    useTMDebugStore.setState({ sessions: {} })
  })

  afterEach(() => vi.useRealTimers())

  it('pauses continuous execution before a matching initial configuration', () => {
    useTMDebugStore.getState().addWatcher(tm.id, {
      id: 'at-start',
      label: 'At start',
      enabled: true,
      predicate: { kind: 'step', comparator: 'eq', step: 0 },
    })
    const { result } = renderHook(() => useSimulation())

    act(() => { expect(result.current.play()).toBe(false) })

    expect(useSimulationStore.getState()).toMatchObject({ status: 'running', stepCount: 0, activeStateIds: ['q0'] })
    expect(useTMDebugStore.getState().getSession(tm.id).lastHit).toMatchObject({ watcherId: 'at-start', stepCount: 0 })
  })

  it('lets manual step advance past a matching watcher', () => {
    useTMDebugStore.getState().addWatcher(tm.id, {
      id: 'at-start',
      label: 'At start',
      enabled: true,
      predicate: { kind: 'step', comparator: 'eq', step: 0 },
    })
    const { result } = renderHook(() => useSimulation())

    act(() => { result.current.play() })
    act(() => { result.current.step() })

    expect(useSimulationStore.getState()).toMatchObject({ status: 'running', stepCount: 1 })
    expect(useTMDebugStore.getState().getSession(tm.id).lastHit).toBeNull()
  })

  it('replays silently when stepping back and re-hits at the same next run point', () => {
    useTMDebugStore.getState().addWatcher(tm.id, {
      id: 'after-first',
      label: 'After first',
      enabled: true,
      predicate: { kind: 'step', comparator: 'eq', step: 1 },
    })
    const { result } = renderHook(() => useSimulation())

    vi.useFakeTimers()
    act(() => { result.current.step() })
    act(() => {
      expect(result.current.play()).toBe(true)
      vi.advanceTimersByTime(600)
    })
    expect(useTMDebugStore.getState().getSession(tm.id).lastHit).toMatchObject({ watcherId: 'after-first', stepCount: 1 })
    act(() => { result.current.stepBack() })

    expect(useSimulationStore.getState()).toMatchObject({ status: 'idle', stepCount: 0 })
    expect(useTMDebugStore.getState().getSession(tm.id).lastHit).toBeNull()
    act(() => { result.current.step() })
    act(() => {
      expect(result.current.play()).toBe(true)
      vi.advanceTimersByTime(600)
    })
    expect(useTMDebugStore.getState().getSession(tm.id).lastHit).toMatchObject({ watcherId: 'after-first', stepCount: 1 })
  })
})
