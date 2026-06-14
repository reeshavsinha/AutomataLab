// @vitest-environment node
// ============================================================
// Stress / robustness harness.
//
// Exercises the pure simulation core (engines + sim store) under
// adversarial sizes — huge tape inputs, long non-halting runs, very
// long input strings, and wide nondeterministic frontiers — and asserts
// the bounds that keep the UI responsive:
//   • TM tape snapshots stay a bounded moving window (never the whole tape)
//   • the execution-history buffer is capped (no unbounded O(n²) growth)
//   • the computation-tree node buffer is capped on wide/long runs
//   • a plain DFA stays linear on a very long input
//
// Timings are logged (not asserted, to stay machine-independent) so the
// numbers are visible when the suite runs.
// ============================================================

import { describe, it, expect } from 'vitest'
import { TMEngine } from '@/engines/tm/TMEngine'
import { DFAEngine } from '@/engines/dfa/DFAEngine'
import { NFAEngine } from '@/engines/nfa/NFAEngine'
import { useSimulationStore } from '@/store/simulationStore'
import type {
  AutomataState,
  HistoryEntry,
  MachineDefinition,
  Transition,
} from '@/engines/core/types'

// ── builders ────────────────────────────────────────────────
const st = (s: Partial<AutomataState> & { id: string }): AutomataState => ({
  label: s.id, x: 0, y: 0, isStart: false, isAccept: false, ...s,
})

/** A TM that writes and steps right forever — head travels until the step limit. */
function tmRightMover(stepLimit: number): MachineDefinition {
  return {
    id: 'tm-rm', name: 'right-mover', type: 'TM', language: '', alphabet: ['0', '1'],
    blankSymbol: '_', stepLimit,
    states: [st({ id: 'q0', isStart: true }), st({ id: 'acc', isAccept: true })],
    transitions: [{ id: 't0', from: 'q0', to: 'q0', symbols: [], read: '_', write: 'x', direction: 'R' }],
  }
}

/** 2-state DFA that just consumes a/b and stays live (linear-time baseline). */
function dfaToggle(): MachineDefinition {
  return {
    id: 'dfa-t', name: 'toggle', type: 'DFA', language: '', alphabet: ['a', 'b'],
    states: [st({ id: 'q0', isStart: true, isAccept: true }), st({ id: 'q1', isAccept: false })],
    transitions: [
      { id: 't0', from: 'q0', to: 'q1', symbols: ['a', 'b'] },
      { id: 't1', from: 'q1', to: 'q0', symbols: ['a', 'b'] },
    ],
  }
}

/** Complete NFA on a single symbol: the frontier is the whole state set every step. */
function nfaComplete(nStates: number): MachineDefinition {
  const states = Array.from({ length: nStates }, (_, i) =>
    st({ id: `q${i}`, isStart: i === 0, isAccept: i === nStates - 1 }))
  const transitions: Transition[] = []
  let tid = 0
  for (let i = 0; i < nStates; i++)
    for (let j = 0; j < nStates; j++)
      transitions.push({ id: `t${tid++}`, from: `q${i}`, to: `q${j}`, symbols: ['a'] })
  return { id: 'nfa-c', name: 'complete', type: 'NFA', language: '', alphabet: ['a'], states, transitions }
}

const ms = (n: number) => `${n.toFixed(0)}ms`

describe('stress — TM tape window stays bounded', () => {
  it('long right-moving run does not grow the snapshot with the head', () => {
    const N = 12_000
    const eng = new TMEngine(tmRightMover(N))
    eng.initialize('')
    let maxCells = 0
    let r = eng.step()
    const t0 = performance.now()
    while (r.status === 'running') {
      const w = r.tapes?.[0]?.cells.length ?? 0
      if (w > maxCells) maxCells = w
      r = eng.step()
    }
    const dt = performance.now() - t0
    console.log(`[TM long run]  steps≈${N}  time=${ms(dt)}  maxWindowCells=${maxCells}`)
    expect(maxCells).toBeLessThanOrEqual(400)
  })

  it('a huge seeded input renders only a window, not the whole tape', () => {
    const len = 50_000
    const eng = new TMEngine(tmRightMover(10))
    eng.initialize('0'.repeat(len))
    const cells = eng.getCurrentConfigurations()[0].tapes?.[0]?.cells.length ?? 0
    console.log(`[TM seed ${len}]  windowCells=${cells}`)
    expect(cells).toBeLessThanOrEqual(400)
  })
})

describe('stress — DFA stays linear on a very long input', () => {
  it('runs a very long input to completion without quadratic blow-up', () => {
    const N = 100_000
    const eng = new DFAEngine(dfaToggle())
    eng.initialize('a'.repeat(N))
    const t0 = performance.now()
    let r = eng.step()
    let steps = 1
    while (r.status === 'running') { r = eng.step(); steps++ }
    const dt = performance.now() - t0
    console.log(`[DFA ${N}]  steps=${steps}  time=${ms(dt)}  status=${r.status}`)
    // It must actually finish with a verdict (not hang / get stuck mid-way)…
    expect(r.status === 'accepted' || r.status === 'rejected').toBe(true)
    expect(steps).toBe(N)
    // …and stay far from the old quadratic behaviour, which took *minutes*. The
    // bound is deliberately loose so it never flakes under parallel test load;
    // real playback is throttled to ≥40ms/step anyway.
    expect(dt).toBeLessThan(20_000)
  }, 30_000)
})

describe('stress — computation-tree buffer is capped', () => {
  it('a wide NFA frontier over a long input does not grow unbounded', () => {
    const eng = new NFAEngine(nfaComplete(30))
    eng.initialize('a'.repeat(2_000))
    let r = eng.step()
    while (r.status === 'running') r = eng.step()
    const t0 = performance.now()
    const nodes = eng.getTreeNodes().length
    const dt = performance.now() - t0
    console.log(`[NFA tree]  treeNodes=${nodes}  getTreeNodes=${ms(dt)}`)
    expect(nodes).toBeLessThanOrEqual(20_500)
  })
})

describe('stress — sim history buffer is capped', () => {
  it('does not retain unbounded history across many steps', () => {
    const store = useSimulationStore
    store.getState().resetSimulation()
    const base: HistoryEntry = {
      step: 0, fromStateIds: ['a'], toStateIds: ['b'], symbol: 'x', transitionIds: ['t'], status: 'running',
    }
    const pushes = 50_000
    const t0 = performance.now()
    for (let i = 0; i < pushes; i++) {
      store.getState().applyStepResult({
        activeStateIds: ['a'], activeTransitionIds: ['t'],
        consumedInput: '', remainingInput: '', currentSymbol: 'x',
        status: 'running', historyEntry: { ...base, step: i },
        configurations: [], activeStack: [], activeTapes: [],
        treeNodes: [], liveBranchIds: [],
      })
    }
    const dt = performance.now() - t0
    const len = store.getState().history.length
    console.log(`[history]  pushes=${pushes}  finalLen=${len}  time=${ms(dt)}`)
    store.getState().resetSimulation()
    expect(len).toBeLessThanOrEqual(2_000)
  })
})
