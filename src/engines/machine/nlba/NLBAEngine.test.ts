import { describe, expect, it } from 'vitest'
import { NLBAEngine } from './NLBAEngine'
import { buildComputationTree, supportsTree } from '../core/computationTree'
import type { AutomataState, MachineDefinition, Transition } from '../core/types'

const state = (id: string, extra: Partial<AutomataState> = {}): AutomataState => ({
  id,
  label: id,
  x: 0,
  y: 0,
  isStart: false,
  isAccept: false,
  ...extra,
})

const transition = (
  id: string,
  from: string,
  to: string,
  read: string,
  write: string,
  direction: 'L' | 'R' | 'S',
): Transition => ({ id, from, to, symbols: [], read, write, direction })

const machine = (states: AutomataState[], transitions: Transition[]): MachineDefinition => ({
  id: 'nlba-test',
  name: 'NLBA test',
  type: 'LBA',
  language: '',
  alphabet: ['a'],
  states,
  transitions,
})

describe('NLBAEngine', () => {
  it('provides computation-tree lineage for competing tape branches', () => {
    const engine = new NLBAEngine(machine(
      [
        state('start', { isStart: true }),
        state('accept', { isAccept: true }),
        state('reject', { isReject: true }),
      ],
      [
        transition('yes', 'start', 'accept', 'a', 'X', 'S'),
        transition('no', 'start', 'reject', 'a', 'Y', 'S'),
      ],
    ))
    engine.initialize('a')
    engine.step()

    expect(supportsTree(engine)).toBe(true)
    const tree = buildComputationTree(engine.getTreeNodes(), new Set(engine.getLiveBranchIds()))
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0].children).toHaveLength(2)
    expect(tree.acceptingCount).toBe(1)
    expect(tree.liveCount).toBe(0)
  })

  it('accepts when one of competing transitions reaches acceptance', () => {
    const engine = new NLBAEngine(machine(
      [
        state('start', { isStart: true }),
        state('accept', { isAccept: true }),
        state('reject', { isReject: true }),
      ],
      [
        transition('accept-write', 'start', 'accept', 'a', 'X', 'S'),
        transition('reject-write', 'start', 'reject', 'a', 'Y', 'S'),
      ],
    ))

    engine.initialize('a')
    const result = engine.step()

    expect(result.status).toBe('accepted')
    expect(result.transitionIds).toEqual(['accept-write', 'reject-write'])
    const configurations = engine.getCurrentConfigurations()
    expect(configurations.map((configuration) => configuration.status)).toEqual(['accepted', 'rejected'])
    // Each competing branch retains its own copy of the tape after writing.
    expect(configurations.map((configuration) => configuration.tapes?.[0].cells.join(''))).toContainEqual(expect.stringContaining('X'))
    expect(configurations.map((configuration) => configuration.tapes?.[0].cells.join(''))).toContainEqual(expect.stringContaining('Y'))
  })

  it('rejects only after every branch halts or reaches reject', () => {
    const engine = new NLBAEngine(machine(
      [
        state('start', { isStart: true }),
        state('reject-a', { isReject: true }),
        state('reject-b', { isReject: true }),
      ],
      [
        transition('reject-x', 'start', 'reject-a', 'a', 'X', 'S'),
        transition('reject-y', 'start', 'reject-b', 'a', 'Y', 'S'),
      ],
    ))

    engine.initialize('a')
    const result = engine.step()

    expect(result.status).toBe('rejected')
    expect(engine.isAccepted()).toBe(false)
    expect(engine.getCurrentConfigurations().map((configuration) => configuration.stateId)).toEqual(['reject-a', 'reject-b'])
    expect(engine.getCurrentConfigurations().every((configuration) => configuration.status === 'rejected')).toBe(true)
  })

  it('rejects an individual branch that attempts to leave LBA bounds', () => {
    const engine = new NLBAEngine(machine(
      [state('start', { isStart: true }), state('scan')],
      [
        transition('advance', 'start', 'scan', 'a', 'a', 'R'),
        transition('past-end', 'scan', 'scan', '_', '_', 'R'),
      ],
    ))

    engine.initialize('a')
    expect(engine.step().status).toBe('running')
    const result = engine.step()

    expect(result.status).toBe('rejected')
    expect(result.transitionIds).toEqual([])
    expect(engine.getCurrentConfigurations()[0]?.tapes?.[0].rightBound).toBe(1)
  })

  it('marks a nondeterministic stay-loop as stuck at its configured step limit', () => {
    const definition = {
      ...machine(
        [state('start', { isStart: true })],
        [transition('stay', 'start', 'start', '_', '_', 'S')],
      ),
      stepLimit: 3,
    }
    const engine = new NLBAEngine(definition)
    engine.initialize('')

    while (engine.getStatus() === 'running') engine.step()

    expect(engine.getStatus()).toBe('stuck')
    expect(engine.isAccepted()).toBe(false)
  })
})
