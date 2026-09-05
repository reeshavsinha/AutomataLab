import { describe, expect, it } from 'vitest'
import { MultiTrackTMEngine } from './MultiTrackTMEngine'
import type { AutomataState, MachineDefinition, TapeSnapshot, Transition } from '../core/types'

type MultiTrackDefinition = MachineDefinition & {
  trackCount?: number
  trackBlanks?: string[]
}

type MultiTrackTransition = Transition & {
  trackReads?: string[]
  trackWrites?: string[]
}

type MultiTrackSnapshot = TapeSnapshot & { tracks: string[][] }

const state = (id: string, partial: Partial<AutomataState> = {}): AutomataState => ({
  id,
  label: id,
  x: 0,
  y: 0,
  isStart: false,
  isAccept: false,
  ...partial,
})

const transition = (
  id: string,
  from: string,
  to: string,
  trackReads: string[],
  trackWrites: string[],
  direction: 'L' | 'R' | 'S',
): MultiTrackTransition => ({
  id,
  from,
  to,
  symbols: [],
  trackReads,
  trackWrites,
  direction,
})

function snapshot(engine: MultiTrackTMEngine): MultiTrackSnapshot {
  return engine.getCurrentConfigurations()[0]!.tapes![0] as MultiTrackSnapshot
}

describe('MultiTrackTMEngine', () => {
  it('exposes one snapshot and one shared head for two tracks', () => {
    const definition: MultiTrackDefinition = {
      id: 'two-track',
      name: 'two-track',
      type: 'MTM',
      language: '',
      alphabet: ['a'],
      trackCount: 2,
      states: [state('start', { isStart: true }), state('halt', { isAccept: true })],
      transitions: [transition('copy', 'start', 'halt', ['a', '_'], ['a', 'X'], 'R')],
    }
    const engine = new MultiTrackTMEngine(definition)
    engine.initialize('a')
    engine.step()

    const config = engine.getCurrentConfigurations()[0]!
    const tape = snapshot(engine)
    expect(config.tapes).toHaveLength(1)
    expect(tape.tracks).toHaveLength(2)
    expect(tape.tracks[0]).toHaveLength(tape.cells.length)
    expect(tape.tracks[1]).toHaveLength(tape.cells.length)
    expect(tape.head).toBe(4) // one snapshot has one head, at absolute position 1
    expect(tape.left).toBe(-3)
  })

  it('matches and writes complete track vectors atomically', () => {
    const definition: MultiTrackDefinition = {
      id: 'atomic-vectors',
      name: 'atomic-vectors',
      type: 'MTM',
      language: '',
      alphabet: ['a'],
      trackCount: 2,
      states: [
        state('start', { isStart: true }),
        state('verify'),
        state('accept', { isAccept: true }),
      ],
      transitions: [
        transition('write-both', 'start', 'verify', ['a', '_'], ['x', 'Y'], 'S'),
        transition('match-both', 'verify', 'accept', ['x', 'Y'], ['x', 'Y'], 'S'),
      ],
    }
    const engine = new MultiTrackTMEngine(definition)
    engine.initialize('a')

    const first = engine.step()
    expect(first.status).toBe('running')
    expect(snapshot(engine).tracks.map((track) => track[3])).toEqual(['x', 'Y'])
    expect(first.historyEntry.symbol).toBe('[a, _] → [x, Y], S')

    expect(engine.step().status).toBe('accepted')

    const mismatch = new MultiTrackTMEngine({
      ...definition,
      transitions: [
        definition.transitions[0],
        transition('wrong-track', 'verify', 'accept', ['x', 'Z'], ['x', 'Z'], 'S'),
      ],
    })
    mismatch.initialize('a')
    expect(mismatch.step().status).toBe('rejected')
    expect(snapshot(mismatch).tracks.map((track) => track[3])).toEqual(['x', 'Y'])
  })

  it('does not give tracks independent head positions', () => {
    const definition: MultiTrackDefinition = {
      id: 'shared-head',
      name: 'shared-head',
      type: 'MTM',
      language: '',
      alphabet: ['a', 'b'],
      trackCount: 2,
      states: [
        state('start', { isStart: true }),
        state('next'),
        state('accept', { isAccept: true }),
      ],
      transitions: [
        transition('mark-and-advance', 'start', 'next', ['a', '_'], ['a', 'Y'], 'R'),
        transition('would-match-on-independent-tapes', 'next', 'accept', ['b', 'Y'], ['b', 'Y'], 'S'),
      ],
    }
    const engine = new MultiTrackTMEngine(definition)
    engine.initialize('ab')

    // An independent two-tape TM could leave tape 2's head on its Y at index 0.
    // A multi-track TM has moved its sole head to index 1, where the vector is [b, _].
    expect(engine.step().status).toBe('rejected')
    expect(snapshot(engine).tracks.map((track) => track[4])).toEqual(['b', '_'])
  })

  it('returns the same history entry it records when a stay loop is detected', () => {
    const definition: MultiTrackDefinition = {
      id: 'track-loop',
      name: 'track-loop',
      type: 'MTM',
      language: '∅',
      alphabet: [],
      trackCount: 2,
      states: [state('start', { isStart: true })],
      transitions: [transition('loop', 'start', 'start', ['_', '_'], ['_', '_'], 'S')],
    }
    const engine = new MultiTrackTMEngine(definition)
    engine.initialize('')

    expect(engine.step().status).toBe('running')
    const stopped = engine.step()

    expect(stopped.status).toBe('stuck')
    const history = engine.getExecutionHistory()
    expect(stopped.historyEntry.step).toBe(history[history.length - 1]?.step)
  })
})
