import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import TapePanel from './TapePanel'
import type { MachineDefinition } from '@/engines/machine/core/types'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'

const machine: MachineDefinition = {
  id: 'tape-panel-machine',
  version: 1,
  name: 'Tape panel test',
  type: 'TM',
  language: '',
  alphabet: ['a'],
  tapeAlphabet: ['a', '_'],
  blankSymbol: '_',
  states: [{ id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false }],
  transitions: [],
}

const scrollIntoView = vi.fn()

beforeEach(() => {
  scrollIntoView.mockClear()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
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

describe('TapePanel alignment', () => {
  it('centres the head without scrolling outer page ancestors', () => {
    render(<TapePanel />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
