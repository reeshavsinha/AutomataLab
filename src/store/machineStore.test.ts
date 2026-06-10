// ============================================================
// machineStore tests — focuses on the file-UX additions:
//   • isPristineTab predicate
//   • openMachine (reuse a pristine tab vs open a new one)
//   • per-tab file-path bookkeeping (markTabSaved / loadMachine / closeTab)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { useMachineStore, isPristineTab } from './machineStore'
import type { MachineDefinition } from '@/engines/core/types'

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
  useMachineStore.setState({
    tabs: [fresh],
    activeTabIndex: 0,
    dirtyTabs: {},
    tabPaths: {},
    machine: fresh,
    past: [],
    future: [],
    _lastCoalesceKey: null,
    _lastEditAt: 0,
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
