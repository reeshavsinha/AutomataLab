import { describe, expect, it } from 'vitest'
import { TransducerEngine } from './TransducerEngine'
import type { MachineDefinition } from '../core/types'

const mealy: MachineDefinition = {
  id: 'mealy',
  name: 'Mealy test',
  type: 'MEALY',
  language: '',
  alphabet: ['a', 'b'],
  outputAlphabet: ['0', '1'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
    { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: ['a'], output: '1' },
    { id: 't1', from: 'q1', to: 'q0', symbols: ['a'], output: '0' },
  ],
}

const moore: MachineDefinition = {
  ...mealy,
  id: 'moore',
  name: 'Moore test',
  type: 'MOORE',
  states: mealy.states.map((state) => ({ ...state, output: state.id === 'q0' ? '0' : '1' })),
  transitions: mealy.transitions.map(({ output: _output, ...transition }) => transition),
}

describe('TransducerEngine', () => {
  it('emits Mealy output on each consumed transition', () => {
    const engine = new TransducerEngine(mealy)
    engine.initialize('aa')

    expect(engine.getOutputTrace()).toEqual([])
    expect(engine.step()).toMatchObject({ output: '1', outputTrace: ['1'] })
    expect(engine.step()).toMatchObject({ output: '0', outputTrace: ['1', '0'], status: 'completed' })
    expect(engine.isAccepted()).toBeNull()
  })

  it('completes in a non-final state without a language verdict', () => {
    const engine = new TransducerEngine(mealy)
    engine.initialize('a')

    expect(engine.step()).toMatchObject({
      status: 'completed',
      activeStateIds: ['q1'],
      outputTrace: ['1'],
    })
    expect(engine.isAccepted()).toBeNull()
  })

  it('emits Moore initial output before transition outputs', () => {
    const engine = new TransducerEngine(moore)
    engine.initialize('aa')

    expect(engine.getOutputTrace()).toEqual(['0'])
    expect(engine.step()).toMatchObject({ output: '1', outputTrace: ['0', '1'] })
    expect(engine.step()).toMatchObject({ output: '0', outputTrace: ['0', '1', '0'], status: 'completed' })
  })

  it('treats Mealy epsilon/lambda outputs as no emission', () => {
    const engine = new TransducerEngine({
      ...mealy,
      transitions: mealy.transitions.map((transition) => ({ ...transition, output: 'lambda' })),
    })
    engine.initialize('aa')

    expect(engine.step()).toMatchObject({ output: '', outputTrace: [] })
    expect(engine.step()).toMatchObject({ output: '', outputTrace: [], status: 'completed' })
  })

  it('treats Moore epsilon/lambda state outputs as no emission', () => {
    const engine = new TransducerEngine({
      ...moore,
      states: moore.states.map((state) => ({ ...state, output: 'λ' })),
    })
    engine.initialize('aa')

    expect(engine.getOutputTrace()).toEqual([])
    expect(engine.step()).toMatchObject({ output: '', outputTrace: [] })
    expect(engine.step()).toMatchObject({ output: '', outputTrace: [], status: 'completed' })
  })

  it('keeps output traces deterministic across reset and replay', () => {
    const run = () => {
      const engine = new TransducerEngine(mealy)
      engine.initialize('aa')
      while (engine.getStatus() === 'running') engine.step()
      return engine.getOutputTrace()
    }

    expect(run()).toEqual(run())
  })
})
