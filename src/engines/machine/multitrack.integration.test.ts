import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from './core/types'
import { validateMachine } from '@/utils/validator'
import { parseMachineJson } from '@/utils/fileManager'
import { configurationMatrix } from '@/utils/exporters'
import { createEngine } from './core/engineFactory'
import { MultiTrackTMEngine } from './multitrack/MultiTrackTMEngine'

const multiTrackDefinition: MachineDefinition = {
  id: 'mtm',
  version: 1,
  name: 'Vector tape',
  type: 'MTM',
  language: '',
  alphabet: ['a'],
  trackCount: 2,
  trackAlphabets: [['a', '_'], ['X', '_']],
  trackBlanks: ['_', '_'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'qa', label: 'qa', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [{
    id: 't0',
    from: 'q0',
    to: 'qa',
    symbols: [],
    trackReads: ['a', '_'],
    trackWrites: ['a', 'X'],
    direction: 'R',
  }],
}

describe('multi-track TM definition', () => {
  it('routes the dedicated MTM type to its vector-cell engine', () => {
    expect(createEngine(multiTrackDefinition)).toBeInstanceOf(MultiTrackTMEngine)
  })

  it('persists per-track model data and rejects an independent tape count', () => {
    const loaded = parseMachineJson(JSON.stringify(multiTrackDefinition))
    expect(loaded.type).toBe('MTM')
    expect(loaded.trackAlphabets).toEqual([['a', '_'], ['X', '_']])
    expect(() => parseMachineJson(JSON.stringify({ ...multiTrackDefinition, tapeCount: 2 }))).toThrow(/one physical tape/)
  })

  it('requires a complete vector rather than a multi-tape transition array', () => {
    const invalid = {
      ...multiTrackDefinition,
      transitions: [{ ...multiTrackDefinition.transitions[0], trackWrites: ['X'] }],
    }
    expect(validateMachine(invalid).some((error) => error.code === 'MTM_TRACK_COUNT_MISMATCH')).toBe(true)
  })

  it('exports shared-head tracks as tracks, not independent tape columns', () => {
    const matrix = configurationMatrix(multiTrackDefinition, [{
      step: 1,
      symbol: '⟨a,_⟩ → ⟨a,X⟩, R',
      fromStateIds: ['q0'],
      toStateIds: ['qa'],
      transitionIds: ['t0'],
      status: 'accepted',
      tapes: [{ cells: ['⟨a,X⟩'], tracks: [['a'], ['X']], head: 0, left: 1 }],
    }])
    expect(matrix.columns).toEqual(['Step', 'State', 'Head', 'Track 1', 'Track 2', 'Status'])
    expect(matrix.note).toContain('one physical tape')
  })
})
