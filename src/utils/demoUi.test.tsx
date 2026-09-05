import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Toolbar from '@/components/toolbar/Toolbar'
import SidePanel from '@/components/panels/SidePanel'
import type { MachineDefinition } from '@/engines/machine/core/types'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

const machine: MachineDefinition = {
  id: 'demo-machine',
  version: 1,
  name: 'Demo machine',
  type: 'TM',
  language: '',
  alphabet: ['a'],
  states: [],
  transitions: [],
}

beforeEach(() => {
  window.history.replaceState({}, '', '/simulator?demo=true')
  localStorage.clear()
  useMachineStore.setState({
    tabs: [machine],
    activeTabIndex: 0,
    machine,
    dirtyTabs: {},
    tabPaths: {},
    tabRoutes: {},
  })
  useSimulationStore.getState().resetSimulation()
  useUIStore.setState({
    activePanel: 'delta',
    panelCollapsed: false,
  })
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('hosted demo UI boundary', () => {
  it('shows only the original machine types and examples', () => {
    render(<Toolbar />)

    const typeSelect = screen.getByTitle('Machine type')
    expect(Array.from(typeSelect.querySelectorAll('option')).map((option) => option.value)).toEqual([
      'DFA', 'NFA', 'ENFA', 'DPDA', 'NPDA', 'TM', 'LBA',
    ])
    expect(screen.queryByTitle('Rename this machine')).not.toBeInTheDocument()
    expect(screen.queryByText('BLANK')).not.toBeInTheDocument()
    expect(screen.queryByText('LIMIT')).not.toBeInTheDocument()
    expect(screen.queryByText('TAPES')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Load Example (4)' }))
    expect(screen.getByText('DFA: Even number of 0s')).toBeInTheDocument()
    expect(screen.getByText('NFA: Ends in 11')).toBeInTheDocument()
    expect(screen.getByText('NPDA: Balanced parentheses')).toBeInTheDocument()
    expect(screen.getByText('TM: aⁿbⁿcⁿ')).toBeInTheDocument()
    expect(screen.queryByText('DFA: Odd number of 1s')).not.toBeInTheDocument()
  })

  it('does not expose full-workspace TM debugging panels', () => {
    render(<SidePanel isDemoMode />)

    expect(screen.queryByRole('tab', { name: 'Watch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Calls' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tape' })).toBeInTheDocument()
  })
})
