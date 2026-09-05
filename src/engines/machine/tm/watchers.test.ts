import { describe, expect, it } from 'vitest'
import { findWatcherHit, matchesWatcherCondition, summarizeWatcherCondition, validateWatcherCondition } from './watchers'
import type { Configuration, MachineDefinition } from '../core/types'

const machine: Pick<MachineDefinition, 'states' | 'tapeCount'> = {
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
  ],
  tapeCount: 2,
}

const configuration: Configuration = {
  id: 'c1',
  parentId: null,
  stateId: 'q1',
  stack: [],
  inputIndex: 4,
  status: 'running',
  consumedInput: '',
  remainingInput: '',
  tapes: [
    { cells: ['a', 'b', '_'], head: 1, left: 3 },
    { cells: ['X', '_'], head: 0, left: -1 },
  ],
}

describe('TM watchers', () => {
  it('matches nested AND/OR predicates against multi-tape configurations', () => {
    const predicate = {
      kind: 'group' as const,
      operator: 'AND' as const,
      children: [
        { kind: 'state' as const, stateId: 'q1' },
        {
          kind: 'group' as const,
          operator: 'OR' as const,
          children: [
            { kind: 'headSymbol' as const, tapeIndex: 1, symbol: 'X' },
            { kind: 'step' as const, comparator: 'gte' as const, step: 9 },
          ],
        },
        { kind: 'headPosition' as const, tapeIndex: 0, comparator: 'eq' as const, position: 4 },
        { kind: 'tapeWindow' as const, tapeIndex: 0, start: 3, pattern: ['a', 'b'] },
      ],
    }

    expect(matchesWatcherCondition(predicate, { configuration, stepCount: 2 })).toBe(true)
    expect(summarizeWatcherCondition(predicate)).toContain('AND')
  })

  it('returns the first enabled watcher and matching branch deterministically', () => {
    const hit = findWatcherHit([
      { id: 'disabled', label: 'Disabled', enabled: false, predicate: { kind: 'state', stateId: 'q1' } },
      { id: 'first', label: 'At q1', enabled: true, predicate: { kind: 'state', stateId: 'q1' } },
      { id: 'second', label: 'Step two', enabled: true, predicate: { kind: 'step', comparator: 'eq', step: 2 } },
    ], [configuration], 2)

    expect(hit).toMatchObject({ watcherId: 'first', configurationId: 'c1', stepCount: 2 })
  })

  it('validates stale states, bad tape references, and incomplete groups', () => {
    expect(validateWatcherCondition({ kind: 'state', stateId: 'missing' }, machine)).toHaveLength(1)
    expect(validateWatcherCondition({ kind: 'headSymbol', tapeIndex: 2, symbol: '' }, machine)).toHaveLength(2)
    expect(validateWatcherCondition({ kind: 'group', operator: 'AND', children: [] }, machine)).toHaveLength(1)
  })
})
