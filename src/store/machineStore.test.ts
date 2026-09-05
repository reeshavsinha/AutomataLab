// ============================================================
// machineStore tests — focuses on the file-UX additions:
//   • isPristineTab predicate
//   • openMachine (reuse a pristine tab vs open a new one)
//   • per-tab file-path bookkeeping (markTabSaved / loadMachine / closeTab)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useMachineStore, isPristineTab } from './machineStore'
import { useHistoryStore } from './historyStore'
import type { MachineDefinition } from '@/engines/machine/core/types'

let counter = 0
function makeDef(over: Partial<MachineDefinition> = {}): MachineDefinition {
  return {
    id: `m_${counter++}`,
    name: 'Loaded',
    type: 'DFA',
    language: '',
    states: [{ id: 's0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false }],
    transitions: [],
    alphabet: [],
    ...over,
  }
}

function resetStore() {
  const fresh = makeDef({ id: 'm_init', name: 'Untitled Machine', states: [], transitions: [] })
  useHistoryStore.getState().clear('machine', fresh.id)
  useMachineStore.setState({
    tabs: [fresh],
    activeTabIndex: 0,
    dirtyTabs: {},
    tabPaths: {},
    tabRoutes: {},
    machine: fresh,
  })
}

beforeEach(resetStore)

describe('isPristineTab', () => {
  it('is true only when there is no diagram content', () => {
    expect(isPristineTab(makeDef({ states: [], transitions: [] }))).toBe(true)
    expect(isPristineTab(makeDef())).toBe(false) // has a state
    expect(
      isPristineTab(makeDef({ states: [], transitions: [{ id: 't', from: 'a', to: 'b', symbols: ['x'] }] }))
    ).toBe(false)
  })
})

describe('tab and history integrity', () => {
  it('keeps the active document when a background tab is closed', () => {
    const a = makeDef({ name: 'A' })
    const b = makeDef({ name: 'B' })
    const c = makeDef({ name: 'C' })
    useMachineStore.setState({
      tabs: [a, b, c],
      activeTabIndex: 0,
      machine: a,
      tabRoutes: { [a.id]: '#/machine', [b.id]: '#/machine', [c.id]: '#/machine' },
    })

    useMachineStore.getState().closeTab(1)
    const state = useMachineStore.getState()

    expect(state.machine.id).toBe(a.id)
    expect(state.activeTabIndex).toBe(0)
    expect(state.tabRoutes[b.id]).toBeUndefined()
  })

  it('does not crash when undo or redo is requested with no tabs', () => {
    useMachineStore.getState().closeTab(0)
    expect(() => useMachineStore.getState().undo()).not.toThrow()
    expect(() => useMachineStore.getState().redo()).not.toThrow()
  })

  it('undoes start-state deletion without mutating the saved snapshot', () => {
    const machine = makeDef({
      id: 'start-history',
      states: [
        { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
        { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
      ],
    })
    useHistoryStore.getState().clear('machine', machine.id)
    useMachineStore.setState({ tabs: [machine], activeTabIndex: 0, machine })

    useMachineStore.getState().deleteState('q0')
    useMachineStore.getState().undo()

    const states = useMachineStore.getState().machine.states
    expect(states.filter((state) => state.isStart).map((state) => state.id)).toEqual(['q0'])
  })
})

describe('openMachine', () => {
  it('reuses the current tab when it is pristine and clean', () => {
    const def = makeDef({ name: 'Opened' })
    const idx = useMachineStore.getState().openMachine(def, '/path/opened.autolab.json')

    const s = useMachineStore.getState()
    expect(s.tabs).toHaveLength(1) // reused, no new tab
    expect(idx).toBe(0)
    expect(s.machine.id).toBe(def.id)
    expect(s.machine.name).toBe('Opened')
    expect(s.dirtyTabs[def.id]).toBe(false) // freshly opened = clean
    expect(s.tabPaths[def.id]).toBe('/path/opened.autolab.json')
  })

  it('opens in a NEW tab when the current tab already has content', () => {
    useMachineStore.getState().addState(10, 10) // current tab now has work
    const def = makeDef({ name: 'Second' })
    const idx = useMachineStore.getState().openMachine(def, '/p/second.json')

    const s = useMachineStore.getState()
    expect(s.tabs).toHaveLength(2)
    expect(idx).toBe(1)
    expect(s.activeTabIndex).toBe(1)
    expect(s.machine.id).toBe(def.id)
    expect(s.tabPaths[def.id]).toBe('/p/second.json')
  })

  it('opens in a NEW tab when the current (empty) tab is dirty', () => {
    useMachineStore.getState().setMachineName('Renamed but empty') // marks dirty
    const def = makeDef({ name: 'Third' })
    useMachineStore.getState().openMachine(def)

    expect(useMachineStore.getState().tabs).toHaveLength(2)
  })
})

describe('per-tab file paths', () => {
  it('markTabSaved clears dirty and records the path', () => {
    useMachineStore.getState().setMachineName('Work') // dirty
    const { machine, activeTabIndex } = useMachineStore.getState()
    expect(useMachineStore.getState().dirtyTabs[machine.id]).toBe(true)

    useMachineStore.getState().markTabSaved(activeTabIndex, '/saved/here.json')

    const s = useMachineStore.getState()
    expect(s.dirtyTabs[machine.id]).toBe(false)
    expect(s.tabPaths[machine.id]).toBe('/saved/here.json')
  })

  it('keeps the path on an in-place reload (same id), e.g. auto-layout', () => {
    const def = makeDef({ name: 'Doc' })
    useMachineStore.getState().openMachine(def, '/p/doc.json')

    // Auto-layout reloads the SAME machine id, marking it dirty, no path passed.
    useMachineStore.getState().loadMachine({ ...def, name: 'Doc (laid out)' }, false)

    const s = useMachineStore.getState()
    expect(s.tabPaths[def.id]).toBe('/p/doc.json') // path preserved
    expect(s.dirtyTabs[def.id]).toBe(true)
  })

  it('drops the old path when a different machine replaces the tab', () => {
    const a = makeDef({ name: 'A' })
    useMachineStore.getState().openMachine(a, '/p/a.json')

    const b = makeDef({ name: 'B' })
    useMachineStore.getState().loadMachine(b, true, '/p/b.json')

    const s = useMachineStore.getState()
    expect(s.tabPaths[a.id]).toBeUndefined()
    expect(s.tabPaths[b.id]).toBe('/p/b.json')
  })

  it('clears path bookkeeping when a tab is closed', () => {
    useMachineStore.getState().addState(0, 0)
    const a = makeDef({ name: 'A' })
    useMachineStore.getState().openMachine(a, '/p/a.json') // opens as tab index 1
    expect(useMachineStore.getState().tabPaths[a.id]).toBe('/p/a.json')

    useMachineStore.getState().closeTab(1)
    expect(useMachineStore.getState().tabPaths[a.id]).toBeUndefined()
  })
})

describe('TM/LBA settings', () => {
  it('setTapeCount stores counts ≥ 2 and clears back to undefined at 1', () => {
    useMachineStore.getState().setTapeCount(3)
    expect(useMachineStore.getState().machine.tapeCount).toBe(3)

    useMachineStore.getState().setTapeCount(1)
    expect(useMachineStore.getState().machine.tapeCount).toBeUndefined()
  })

  it('setTapeCount floors fractional input and ignores invalid values', () => {
    useMachineStore.getState().setTapeCount(2.9)
    expect(useMachineStore.getState().machine.tapeCount).toBe(2)

    useMachineStore.getState().setTapeCount(Number.NaN)
    expect(useMachineStore.getState().machine.tapeCount).toBeUndefined()
  })

  it('toggleRejectState is mutually exclusive with accept', () => {
    const s = useMachineStore.getState()
    const st = s.addState(0, 0)
    s.toggleAcceptState(st.id)
    expect(useMachineStore.getState().machine.states.find((x) => x.id === st.id)?.isAccept).toBe(true)

    s.toggleRejectState(st.id)
    const after = useMachineStore.getState().machine.states.find((x) => x.id === st.id)
    expect(after?.isReject).toBe(true)
    expect(after?.isAccept).toBe(false)
  })
})
