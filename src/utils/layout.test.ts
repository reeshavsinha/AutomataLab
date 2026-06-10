// ============================================================
// Auto-layout tests — the headline guarantee is "no node overlaps",
// plus: start state lands leftmost, layout is deterministic, and text
// annotations are left where the user put them.
// ============================================================

import { describe, it, expect } from 'vitest'
import { applyAutoLayout } from './layout'
import type { MachineDefinition, AutomataState, Transition } from '@/engines/core/types'

const NODE_SIZE = 52

function machine(partial: Partial<MachineDefinition>): MachineDefinition {
  return {
    id: 'm',
    name: 'm',
    type: 'NFA',
    language: '',
    states: [],
    transitions: [],
    alphabet: ['a', 'b'],
    ...partial,
  }
}

// All seed positions are identical (0,0) to mimic the worst-case "messy /
// clustered" starting point the user wants fixed.
function st(id: string, opts: Partial<AutomataState> = {}): AutomataState {
  return { id, label: id, x: 0, y: 0, isStart: false, isAccept: false, ...opts }
}

function tr(id: string, from: string, to: string, symbols: string[] = ['a']): Transition {
  return { id, from, to, symbols }
}

/** Do the two 52×52 node boxes (top-left x/y) intersect at all? */
function overlaps(a: AutomataState, b: AutomataState): boolean {
  return (
    a.x < b.x + NODE_SIZE &&
    a.x + NODE_SIZE > b.x &&
    a.y < b.y + NODE_SIZE &&
    a.y + NODE_SIZE > b.y
  )
}

function expectNoOverlaps(m: MachineDefinition) {
  const nodes = m.states.filter((s) => !s.isText)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      expect(
        overlaps(nodes[i], nodes[j]),
        `"${nodes[i].id}" overlaps "${nodes[j].id}"`
      ).toBe(false)
    }
  }
}

describe('applyAutoLayout — no overlaps', () => {
  it('separates a simple chain', async () => {
    const m = machine({
      states: [
        st('q0', { isStart: true }),
        st('q1'),
        st('q2'),
        st('q3'),
        st('q4', { isAccept: true }),
      ],
      transitions: [
        tr('t0', 'q0', 'q1'),
        tr('t1', 'q1', 'q2'),
        tr('t2', 'q2', 'q3'),
        tr('t3', 'q3', 'q4'),
      ],
    })
    expectNoOverlaps(await applyAutoLayout(m))
  })

  it('separates a dense, cyclic machine with self-loops and back-edges', async () => {
    const m = machine({
      states: [
        st('q0', { isStart: true }),
        st('q1'),
        st('q2'),
        st('q3'),
        st('q4'),
        st('q5', { isAccept: true }),
      ],
      transitions: [
        tr('t0', 'q0', 'q0'), // self-loop
        tr('t1', 'q0', 'q1'),
        tr('t2', 'q0', 'q2'),
        tr('t3', 'q1', 'q3'),
        tr('t4', 'q2', 'q3'),
        tr('t5', 'q3', 'q4'),
        tr('t6', 'q4', 'q1'), // back-edge (cycle)
        tr('t7', 'q4', 'q5'),
        tr('t8', 'q5', 'q0'), // long back-edge
        tr('t9', 'q2', 'q5'),
      ],
    })
    expectNoOverlaps(await applyAutoLayout(m))
  })

  it('separates disconnected components', async () => {
    const m = machine({
      states: [
        st('a0', { isStart: true }),
        st('a1'),
        st('a2'),
        // second, unconnected component
        st('b0'),
        st('b1'),
        // a lone island
        st('c0'),
      ],
      transitions: [
        tr('t0', 'a0', 'a1'),
        tr('t1', 'a1', 'a2'),
        tr('t2', 'b0', 'b1'),
        tr('t3', 'b1', 'b0'),
      ],
    })
    expectNoOverlaps(await applyAutoLayout(m))
  })

  it('separates a dense, cyclic DFA (divisible-by-8 style)', async () => {
    const states = [st('q0', { isStart: true, isAccept: true })]
    for (let i = 1; i < 8; i++) states.push(st('q' + i))
    const transitions = []
    let c = 0
    for (let i = 0; i < 8; i++) {
      for (const b of [0, 1]) {
        transitions.push(tr('t' + c++, 'q' + i, 'q' + ((2 * i + b) % 8), [String(b)]))
      }
    }
    expectNoOverlaps(await applyAutoLayout(machine({ states, transitions })))
  })
})

describe('applyAutoLayout — arrangement quality', () => {
  it('keeps the start state on the left half', async () => {
    const m = machine({
      states: [st('q0', { isStart: true }), st('q1'), st('q2', { isAccept: true })],
      transitions: [tr('t0', 'q0', 'q1'), tr('t1', 'q1', 'q2')],
    })
    const out = await applyAutoLayout(m)
    const xs = out.states.filter((s) => !s.isText).map((s) => s.x)
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2
    const q0 = out.states.find((s) => s.id === 'q0') as AutomataState
    expect(q0.x).toBeLessThanOrEqual(mid)
  })

  it('is deterministic (same input → same positions)', async () => {
    const build = () =>
      machine({
        states: [
          st('q0', { isStart: true }),
          st('q1'),
          st('q2'),
          st('q3', { isAccept: true }),
        ],
        transitions: [
          tr('t0', 'q0', 'q1'),
          tr('t1', 'q1', 'q2'),
          tr('t2', 'q2', 'q3'),
          tr('t3', 'q2', 'q0'),
        ],
      })
    const a = await applyAutoLayout(build())
    const b = await applyAutoLayout(build())
    const posOf = (m: MachineDefinition) =>
      m.states.map((s) => `${s.id}:${s.x},${s.y}`).join('|')
    expect(posOf(a)).toBe(posOf(b))
  })

  it('leaves text-annotation nodes exactly where they were', async () => {
    const m = machine({
      states: [
        st('q0', { isStart: true }),
        st('q1', { isAccept: true }),
        { ...st('note'), isText: true, x: 999, y: -123, width: 190, height: 56 },
      ],
      transitions: [tr('t0', 'q0', 'q1')],
    })
    const out = await applyAutoLayout(m)
    const note = out.states.find((s) => s.id === 'note') as AutomataState
    expect(note.x).toBe(999)
    expect(note.y).toBe(-123)
  })

  it('handles a single state without throwing', async () => {
    const m = machine({ states: [st('q0', { isStart: true, isAccept: true })] })
    const out = await applyAutoLayout(m)
    expect(out.states).toHaveLength(1)
    expect(Number.isFinite(out.states[0].x)).toBe(true)
    expect(Number.isFinite(out.states[0].y)).toBe(true)
  })

  it('returns the machine unchanged when there are no layout states', async () => {
    const m = machine({ states: [] })
    expect(await applyAutoLayout(m)).toEqual(m)
  })
})
