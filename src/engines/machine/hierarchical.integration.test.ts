import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from './core/types'
import { parseMachineJson } from '@/utils/fileManager'
import { validateMachine } from '@/utils/validator'
import { createEngine } from './core/engineFactory'
import { HierarchicalTMEngine } from './hierarchical/HierarchicalTMEngine'

const child: MachineDefinition = {
  id: 'child-definition',
  name: 'Accept child',
  type: 'TM',
  language: '',
  alphabet: [],
  states: [{ id: 'c0', label: 'c0', x: 0, y: 0, isStart: true, isAccept: true }],
  transitions: [],
}

const parent: MachineDefinition = {
  id: 'parent',
  version: 2,
  name: 'Parent',
  type: 'TM',
  language: '',
  alphabet: [],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'qa', label: 'qa', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [{
    id: 'call',
    from: 'q0',
    to: 'qa',
    symbols: [],
    read: '_',
    write: '_',
    direction: 'S',
    submachineId: 'accept-child',
  }],
  submachines: { 'accept-child': child },
}

describe('hierarchical TM definition contracts', () => {
  it('routes a TM with a call transition to the hierarchical executor', () => {
    expect(createEngine(parent)).toBeInstanceOf(HierarchicalTMEngine)
  })

  it('round-trips owned child snapshots and call references', () => {
    const loaded = parseMachineJson(JSON.stringify(parent))
    expect(loaded.version).toBe(2)
    expect(loaded.submachines?.['accept-child']?.name).toBe('Accept child')
    expect(loaded.transitions[0].submachineId).toBe('accept-child')
  })

  it('keeps absent child references visible as repairable validation errors', () => {
    const invalid = { ...parent, transitions: [{ ...parent.transitions[0], submachineId: 'gone' }] }
    expect(validateMachine(invalid).some((error) => error.code === 'SUBMACHINE_MISSING')).toBe(true)
  })

  it('requires called children to share the caller tape contract', () => {
    const invalid = {
      ...parent,
      submachines: { 'accept-child': { ...child, tapeCount: 2 } },
    }
    expect(validateMachine(invalid).some((error) => error.code === 'SUBMACHINE_TAPE_CONTRACT')).toBe(true)
  })
})
