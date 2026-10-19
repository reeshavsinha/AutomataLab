import { describe, expect, it } from 'vitest'
import { runToCompletion } from '../core/engineFactory'
import { mealyToMoore, mooreToMealy } from './transducers'
import type { MachineDefinition } from '../core/types'

const moore: MachineDefinition = {
  id: 'm',
  name: 'Moore',
  type: 'MOORE',
  language: '',
  alphabet: ['a'],
  outputAlphabet: ['0', '1'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true, output: '0' },
    { id: 'q1', label: 'q1', x: 120, y: 0, isStart: false, isAccept: false, output: '1' },
  ],
  transitions: [
    { id: 'a', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 'b', from: 'q1', to: 'q0', symbols: ['a'] },
  ],
}

describe('Mealy/Moore conversions', () => {
  it('moves Moore destination outputs to Mealy transitions and preserves initial output', () => {
    const converted = mooreToMealy(moore).result as MachineDefinition
    expect(converted.type).toBe('MEALY')
    expect(converted.initialOutput).toBe('0')
    expect(converted.transitions.map((transition) => transition.output)).toEqual(['1', '0'])
  })

  it('splits Mealy destinations when incoming outputs differ', () => {
    const mealy: MachineDefinition = {
      ...moore,
      type: 'MEALY',
      states: moore.states.map(({ output: _output, ...state }) => state),
      transitions: [
        { id: 'a', from: 'q0', to: 'q1', symbols: ['a'], output: '1' },
        { id: 'b', from: 'q1', to: 'q0', symbols: ['a'], output: '0' },
      ],
    }
    const converted = mealyToMoore(mealy).result as MachineDefinition
    expect(converted.type).toBe('MOORE')
    expect(converted.states.map((state) => state.output)).toContain('1')
    expect(converted.states.map((state) => state.output)).toContain('0')
  })

  it('preserves acceptance and output behavior over a bounded suite', () => {
    const mealy = mooreToMealy(moore).result as MachineDefinition
    const mooreRun = runToCompletion(moore, 'aa')
    const mealyRun = runToCompletion(mealy, 'aa')
    expect(mealyRun.accepted).toBe(mooreRun.accepted)
    expect(mealyRun.outputTrace).toEqual(['0', '1', '0'])
  })
})
