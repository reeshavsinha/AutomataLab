import { describe, expect, it } from 'vitest'
import { HierarchicalTMEngine } from './HierarchicalTMEngine'
import type { AutomataState, MachineDefinition, Transition } from '../core/types'

const state = (id: string, options: Partial<AutomataState> = {}): AutomataState => ({
  id,
  label: id,
  x: 0,
  y: 0,
  isStart: false,
  isAccept: false,
  ...options,
})

const move = (
  id: string,
  from: string,
  to: string,
  read = '_',
  write = '_',
  direction: 'L' | 'R' | 'S' = 'S',
): Transition => ({ id, from, to, symbols: [], read, write, direction })

const call = (
  id: string,
  from: string,
  to: string,
  submachineId: string,
): Transition => ({ ...move(id, from, to), submachineId })

const machine = (name: string, states: AutomataState[], transitions: Transition[]): MachineDefinition => ({
  id: name,
  name,
  type: 'TM',
  language: '',
  alphabet: [],
  states,
  transitions,
})

describe('HierarchicalTMEngine', () => {
  it('returns through nested children with explicit CALL and RETURN events', () => {
    const childB = machine('B', [
      state('b0', { isStart: true }),
      state('bAcc', { isAccept: true }),
    ], [move('b-move', 'b0', 'bAcc')])
    const childA = {
      ...machine('A', [
        state('a0', { isStart: true }),
        state('aAcc', { isAccept: true }),
      ], [call('a-call-b', 'a0', 'aAcc', 'b')]),
      submachines: { b: childB },
    }
    const root = {
      ...machine('root', [
        state('r0', { isStart: true }),
        state('rAcc', { isAccept: true }),
      ], [call('r-call-a', 'r0', 'rAcc', 'a')]),
      submachines: { a: childA },
    }
    const engine = new HierarchicalTMEngine(root)
    engine.initialize('')

    engine.step() // CALL a
    engine.step() // CALL b
    engine.step() // b ordinary move
    engine.step() // RETURN b
    engine.step() // RETURN a

    expect(engine.getStatus()).toBe('accepted')
    expect(engine.getExecutionHistory().map((entry) => entry.symbol)).toEqual([
      'CALL a: _ → _, S · call a',
      'CALL b: _ → _, S · call b',
      '_ → _, S',
      'RETURN b',
      'RETURN a',
    ])
    expect(engine.getExecutionHistory()[3].activeSubmachinePath).toEqual(['a'])
    expect(engine.getExecutionHistory()[4].callStack).toEqual([])
  })

  it('shares tape mutations and head positions across a return', () => {
    const child = machine('writer', [
      state('c0', { isStart: true }),
      state('cAcc', { isAccept: true }),
    ], [move('write-x', 'c0', 'cAcc', 'a', 'X')])
    const root = {
      ...machine('root', [
        state('r0', { isStart: true }),
        state('r1'),
        state('rAcc', { isAccept: true }),
      ], [
        { ...call('call-writer', 'r0', 'r1', 'writer'), read: 'a', write: 'a' },
        move('see-x', 'r1', 'rAcc', 'X', 'X'),
      ]),
      submachines: { writer: child },
    }
    const engine = new HierarchicalTMEngine(root)
    engine.initialize('a')

    engine.step() // CALL, retains a
    engine.step() // child writes X
    engine.step() // RETURN
    engine.step() // parent sees X

    expect(engine.isAccepted()).toBe(true)
    expect(engine.getCurrentConfigurations()[0].tapes![0].cells).toContain('X')
  })

  it('propagates child reject and child-local stuck status to the root', () => {
    const rejectingChild = machine('rejecting', [
      state('c0', { isStart: true }),
      state('cReject', { isReject: true }),
    ], [move('reject', 'c0', 'cReject')])
    const rejectingRoot = {
      ...machine('root', [state('r0', { isStart: true }), state('r1')], [call('call', 'r0', 'r1', 'child')]),
      submachines: { child: rejectingChild },
    }
    const rejected = new HierarchicalTMEngine(rejectingRoot)
    rejected.initialize('')
    rejected.step()
    rejected.step()
    expect(rejected.getStatus()).toBe('rejected')

    const loopingChild = {
      ...machine('looping', [state('c0', { isStart: true })], [move('right', 'c0', 'c0', '_', '_', 'R')]),
      stepLimit: 1,
    }
    const stuckRoot = {
      ...machine('root', [state('r0', { isStart: true }), state('r1')], [call('call', 'r0', 'r1', 'child')]),
      submachines: { child: loopingChild },
    }
    const stuck = new HierarchicalTMEngine(stuckRoot)
    stuck.initialize('')
    stuck.step()
    stuck.step()
    stuck.step()
    expect(stuck.getStatus()).toBe('stuck')
  })

  it('reports missing children and depth-limit violations as errors', () => {
    const missing = machine('root', [state('r0', { isStart: true }), state('r1')], [call('missing', 'r0', 'r1', 'none')])
    const missingEngine = new HierarchicalTMEngine(missing)
    missingEngine.initialize('')
    missingEngine.step()
    expect(missingEngine.getStatus()).toBe('error')

    const grandchild = machine('grandchild', [state('g0', { isStart: true })], [])
    const child = {
      ...machine('child', [state('c0', { isStart: true }), state('c1')], [call('nested', 'c0', 'c1', 'grandchild')]),
      submachines: { grandchild },
    }
    const depthLimitedRoot = {
      ...machine('root', [state('r0', { isStart: true }), state('r1')], [call('first', 'r0', 'r1', 'child')]),
      submachines: { child },
      submachineDepthLimit: 1,
    }
    const depthLimited = new HierarchicalTMEngine(depthLimitedRoot)
    depthLimited.initialize('')
    depthLimited.step()
    depthLimited.step()
    expect(depthLimited.getStatus()).toBe('error')
  })

  it('does not treat equal tape/state values in different call stacks as loops', () => {
    const recursive: MachineDefinition = machine('recursive', [state('c0', { isStart: true }), state('after')], [])
    recursive.transitions.push(call('again', 'c0', 'after', 'self'))
    recursive.submachines = { self: recursive }
    const root = {
      ...machine('root', [state('r0', { isStart: true }), state('r1')], [call('enter', 'r0', 'r1', 'child')]),
      submachines: { child: recursive },
      submachineDepthLimit: 3,
    }
    const engine = new HierarchicalTMEngine(root)
    engine.initialize('')

    engine.step() // root → child
    engine.step() // child → self
    engine.step() // same child state/tape, but a deeper stack

    const configuration = engine.getCurrentConfigurations()[0]
    expect(engine.getStatus()).toBe('running')
    expect(configuration.stateId).toBe('c0')
    expect(configuration.callStack).toHaveLength(3)
  })

  it('retains ordinary TM acceptance and multi-tape move semantics', () => {
    const root = {
      ...machine('root', [
        state('r0', { isStart: true }),
        state('rAcc', { isAccept: true }),
      ], [{
        id: 'two-tape-move',
        from: 'r0',
        to: 'rAcc',
        symbols: [],
        reads: ['a', '_'],
        writes: ['X', 'Y'],
        directions: ['R', 'S'],
      }]),
      tapeCount: 2,
    }
    const engine = new HierarchicalTMEngine(root)
    engine.initialize('a')
    engine.step()

    expect(engine.isAccepted()).toBe(true)
    const [first, second] = engine.getCurrentConfigurations()[0].tapes!
    expect(first.cells).toContain('X')
    expect(second.cells).toContain('Y')
  })
})
