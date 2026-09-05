import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SimulationControls from './SimulationControls'
import type { MachineDefinition } from '@/engines/machine/core/types'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'

const simulation = vi.hoisted(() => ({
  step: vi.fn(),
  stepBack: vi.fn(),
  seekTo: vi.fn(),
  play: vi.fn(() => false),
  pause: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('@/hooks/useSimulation', () => ({
  useSimulation: () => simulation,
}))

const machine: MachineDefinition = {
  id: 'seek-machine',
  version: 1,
  name: 'Seek test',
  type: 'DFA',
  language: '',
  alphabet: ['a'],
  states: [],
  transitions: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  useMachineStore.setState({
    tabs: [machine],
    activeTabIndex: 0,
    machine,
    dirtyTabs: {},
    tabPaths: {},
    tabRoutes: {},
  })
  useSimulationStore.getState().resetSimulation()
})

afterEach(cleanup)

describe('SimulationControls history navigation', () => {
  it('returns to the latest visited step instead of an arbitrary replay target', () => {
    useSimulationStore.setState({ status: 'accepted', stepCount: 7 })
    const view = render(<SimulationControls />)

    useSimulationStore.setState({ status: 'running', stepCount: 3 })
    view.rerender(<SimulationControls />)
    fireEvent.click(screen.getByTitle('Go to latest visited step'))

    expect(simulation.seekTo).toHaveBeenCalledWith(7)
  })
})
