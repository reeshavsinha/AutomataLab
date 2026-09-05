import type { MachineDefinition, Transition } from '../core/types'
import type { ConversionResult } from './types'

function copyBase(machine: MachineDefinition, type: MachineDefinition['type']): MachineDefinition {
  return {
    ...machine,
    id: `${machine.id}-${type.toLowerCase()}`,
    name: `${machine.name} (${type})`,
    type,
    states: machine.states.map((state) => ({ ...state })),
    transitions: machine.transitions.map((transition) => ({ ...transition })),
    outputAlphabet: [...(machine.outputAlphabet ?? [])],
  }
}

/** Convert Moore outputs on destination states into Mealy transition outputs. */
export function mooreToMealy(machine: MachineDefinition): ConversionResult {
  if (machine.type !== 'MOORE') throw new Error('Moore-to-Mealy conversion requires a Moore machine.')
  const result = copyBase(machine, 'MEALY')
  result.initialOutput = machine.states.find((state) => state.isStart)?.output
  result.transitions = machine.transitions.map((transition) => ({
    ...transition,
    output: machine.states.find((state) => state.id === transition.to)?.output ?? '',
  }))
  result.states = result.states.map(({ output: _output, ...state }) => state)
  return {
    kind: 'moore-to-mealy',
    result,
    steps: [{
      title: 'Move state outputs to transitions',
      detail: 'Each transition receives the output of its destination state. The original Moore initial output is preserved explicitly.',
      addedStateIds: result.states.map((state) => state.id),
      addedTransitionIds: result.transitions.map((transition) => transition.id),
    }],
    summary: [
      `Converted ${machine.states.length} states and ${machine.transitions.length} transitions.`,
      'Initial output semantics preserved with the Mealy initialOutput field.',
    ],
  }
}

/**
 * Convert Mealy outputs into Moore state outputs by splitting destination
 * states when different incoming transitions emit different symbols.
 */
export function mealyToMoore(machine: MachineDefinition): ConversionResult {
  if (machine.type !== 'MEALY') throw new Error('Mealy-to-Moore conversion requires a Mealy machine.')

  const originalStates = machine.states.filter((state) => !state.isText)
  const stateById = new Map(originalStates.map((state) => [state.id, state]))
  const cloneKey = (stateId: string, output: string) => `${stateId}::${output || 'ε'}`
  const clones = new Map<string, { stateId: string; output: string; id: string }>()

  const ensureClone = (stateId: string, output: string) => {
    const key = cloneKey(stateId, output)
    const existing = clones.get(key)
    if (existing) return existing
    const clone = { stateId, output, id: `moore-${clones.size}` }
    clones.set(key, clone)
    return clone
  }

  const start = stateById.get(machine.states.find((state) => state.isStart)?.id ?? '')
  if (!start) throw new Error('Mealy-to-Moore conversion requires a start state.')
  ensureClone(start.id, machine.initialOutput ?? '')

  for (const transition of machine.transitions) {
    ensureClone(transition.to, transition.output ?? '')
  }

  const states = Array.from(clones.values()).map((clone, index) => {
    const original = stateById.get(clone.stateId)!
    return {
      ...original,
      id: clone.id,
      label: `${original.label}_${clone.output || 'ε'}`,
      x: original.x + (index % 3) * 80,
      y: original.y + Math.floor(index / 3) * 80,
      isStart: original.id === start.id && clone.output === (machine.initialOutput ?? ''),
      output: clone.output,
    }
  })

  const transitions: Transition[] = []
  for (const source of clones.values()) {
    for (const transition of machine.transitions.filter((candidate) => candidate.from === source.stateId)) {
      const target = ensureClone(transition.to, transition.output ?? '')
      transitions.push({
        ...transition,
        id: `moore-t-${transitions.length}`,
        from: source.id,
        to: target.id,
        output: undefined,
      })
    }
  }

  const result = copyBase(machine, 'MOORE')
  result.initialOutput = undefined
  result.states = states
  result.transitions = transitions
  return {
    kind: 'mealy-to-moore',
    result,
    steps: [{
      title: 'Split states by incoming output',
      detail: 'Moore states are duplicated where necessary so every destination state has one unambiguous output.',
      addedStateIds: states.map((state) => state.id),
      addedTransitionIds: transitions.map((transition) => transition.id),
    }],
    summary: [
      `Converted ${machine.states.length} states into ${states.length} Moore states.`,
      'Different Mealy outputs on incoming transitions become separate Moore states.',
    ],
  }
}
