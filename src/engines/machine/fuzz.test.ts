// @vitest-environment node
// ============================================================
// AutomataLab — Fuzz / property suite.
// Property-based testing over RANDOM machines to flush out crashes, hangs and
// correctness drift that fixed-example tests miss. Three families of checks:
//
//   1. Robustness   — arbitrary (often malformed) machines of every type must
//                     never throw, must always halt, and must report a status
//                     consistent with isAccepted().
//   2. Equivalence  — conversions must preserve the language: a random NFA/ε-NFA
//                     and its subset-DFA (and a DFA and its minimisation, and an
//                     ε-NFA and its ε-eliminated NFA) must agree on every string.
//   3. Construction — regexToNfa must agree with the JS RegExp engine; the
//                     resulting ε-NFA is exercised end-to-end.
//
// Everything is driven by a seeded PRNG so a failure is reproducible.
// ============================================================

import { describe, it, expect } from 'vitest'
import type { AutomataState, Automaton, MachineDefinition, Transition } from './core/types'
import { createEngine, runToCompletion } from './core/engineFactory'
import { DPDAEngine } from './dpda/DPDAEngine'
import { NPDAEngine } from './npda/NPDAEngine'
import { buildComputationTree, supportsTree } from './core/computationTree'
import { validateMachine } from '@/utils/validator'
import { nfaToDfa } from './conversions/subsetConstruction'
import { minimizeDfa } from './conversions/minimizeDfa'
import { enfaToNfa } from './conversions/epsilonElimination'
import { regexToNfa } from './conversions/regexToNfa'

// ─── seeded PRNG ────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const ri = (rng: () => number, n: number) => Math.floor(rng() * n)
const pick = <T,>(rng: () => number, arr: readonly T[]): T => arr[ri(rng, arr.length)]

// ─── generic helpers ────────────────────────────────────────────
function allStrings(alphabet: string[], maxLen: number): string[] {
  const out: string[] = ['']
  let frontier: string[] = ['']
  for (let len = 1; len <= maxLen; len++) {
    const next: string[] = []
    for (const s of frontier) for (const a of alphabet) next.push(s + a)
    out.push(...next)
    frontier = next
  }
  return out
}
const accepts = (m: MachineDefinition, input: string): boolean =>
  runToCompletion(m, input).accepted === true

function mkStates(rng: () => number, n: number): AutomataState[] {
  const states: AutomataState[] = []
  for (let i = 0; i < n; i++) {
    states.push({
      id: `q${i}`,
      label: `q${i}`,
      x: i * 80,
      y: 0,
      isStart: i === 0,
      isAccept: rng() < 0.4,
    })
  }
  return states
}

// ─── random finite automata ─────────────────────────────────────
function randomDFA(rng: () => number, alphabet: string[]): MachineDefinition {
  const n = 1 + ri(rng, 5)
  const states = mkStates(rng, n)
  const transitions: Transition[] = []
  let t = 0
  for (const s of states) {
    for (const a of alphabet) {
      // Deterministic: at most one move per (state, symbol).
      if (rng() < 0.8) {
        transitions.push({ id: `t${t++}`, from: s.id, to: states[ri(rng, n)].id, symbols: [a] })
      }
    }
  }
  return { id: 'dfa', name: 'fuzz', type: 'DFA', language: '', states, transitions, alphabet }
}

function randomNFA(rng: () => number, alphabet: string[], epsilon: boolean): MachineDefinition {
  const n = 1 + ri(rng, 5)
  const states = mkStates(rng, n)
  const transitions: Transition[] = []
  let t = 0
  for (const s of states) {
    for (const a of alphabet) {
      const k = ri(rng, 3) // 0..2 nondeterministic edges
      for (let i = 0; i < k; i++) {
        transitions.push({ id: `t${t++}`, from: s.id, to: states[ri(rng, n)].id, symbols: [a] })
      }
    }
    if (epsilon && rng() < 0.5) {
      transitions.push({ id: `t${t++}`, from: s.id, to: states[ri(rng, n)].id, symbols: ['ε'] })
    }
  }
  return {
    id: 'nfa',
    name: 'fuzz',
    type: epsilon ? 'ENFA' : 'NFA',
    language: '',
    states,
    transitions,
    alphabet,
  }
}

// ─── random PDA / TM (robustness only — may be malformed) ───────
function randomPDA(rng: () => number, type: 'DPDA' | 'NPDA'): MachineDefinition {
  const alphabet = ['a', 'b']
  const n = 1 + ri(rng, 4)
  const states = mkStates(rng, n)
  const reads = ['', 'a', 'b']
  const stackSyms = ['', 'A', 'B', 'Z']
  const pushes = ['', 'A', 'B', 'AB', 'AA', 'ABZ']
  const transitions: Transition[] = []
  const edges = ri(rng, 8)
  for (let i = 0; i < edges; i++) {
    transitions.push({
      id: `t${i}`,
      from: states[ri(rng, n)].id,
      to: states[ri(rng, n)].id,
      symbols: [],
      read: pick(rng, reads),
      pop: pick(rng, stackSyms),
      push: pick(rng, pushes),
    })
  }
  return { id: 'pda', name: 'fuzz', type, language: '', states, transitions, alphabet }
}

function randomTM(rng: () => number, type: 'TM' | 'LBA'): MachineDefinition {
  const alphabet = ['a', 'b']
  const n = 1 + ri(rng, 4)
  const states = mkStates(rng, n)
  // Give some states a reject role (TM/LBA halt-reject).
  for (const s of states) if (rng() < 0.2) s.isReject = true
  const syms = ['a', 'b', '_']
  const dirs: ('L' | 'R' | 'S')[] = ['L', 'R', 'S']
  const transitions: Transition[] = []
  const edges = ri(rng, 8)
  for (let i = 0; i < edges; i++) {
    transitions.push({
      id: `t${i}`,
      from: states[ri(rng, n)].id,
      to: states[ri(rng, n)].id,
      symbols: [],
      read: pick(rng, syms),
      write: pick(rng, syms),
      direction: pick(rng, dirs),
    })
  }
  // Keep loops cheap for the fuzzer.
  return { id: 'tm', name: 'fuzz', type, language: '', states, transitions, alphabet, stepLimit: 500 }
}

// ─── invariant: an engine always halts, never throws ────────────
/** Step a pre-built engine to a halt under a guard; assert robustness + consistency. */
function drainEngine(engine: Automaton, input: string, guardMax: number): void {
  expect(() => engine.initialize(input)).not.toThrow()
  let guard = 0
  while (engine.getStatus() === 'running' && guard < guardMax) {
    expect(() => engine.step()).not.toThrow()
    guard++
  }
  expect(engine.getStatus(), `did not halt on "${input || 'ε'}"`).not.toBe('running')

  const status = engine.getStatus()
  const acc = engine.isAccepted()
  if (status === 'accepted') expect(acc).toBe(true)
  else if (status === 'rejected' || status === 'stuck') expect(acc).toBe(false)

  // Computation tree (nondeterministic engines) must build without throwing.
  if (supportsTree(engine)) {
    const nodes = engine.getTreeNodes()
    expect(() => buildComputationTree(nodes, new Set(engine.getLiveBranchIds()))).not.toThrow()
  }
}

/** FA / TM: build via the real factory and cross-check against the headless runner. */
function expectHalts(m: MachineDefinition, input: string) {
  const engine = createEngine(m)
  drainEngine(engine, input, 60_000)
  // The headless runner must agree with manual stepping.
  expect(runToCompletion(m, input).status).toBe(engine.getStatus())
}

/**
 * PDA: arbitrary pushdown machines can legitimately run to the (large) internal
 * step ceiling with a wide frontier, so build the engine with a small step cap
 * to keep the fuzz fast. 60 layers still exercises every guard (step limit,
 * stack depth, and the frontier-width guard, which trips by ~step 13).
 */
function expectPdaHalts(m: MachineDefinition, input: string) {
  const engine =
    m.type === 'DPDA' ? new DPDAEngine(m, 60) : new NPDAEngine(m, 60)
  drainEngine(engine, input, 200)
}

// ════════════════════════════════════════════════════════════════
describe('fuzz: engine robustness (no throw / always halts)', () => {
  it('finite automata on arbitrary inputs', () => {
    const rng = mulberry32(1)
    const alpha = ['a', 'b']
    for (let i = 0; i < 1000; i++) {
      const m =
        rng() < 0.34 ? randomDFA(rng, alpha) : randomNFA(rng, alpha, rng() < 0.5)
      expect(() => validateMachine(m)).not.toThrow()
      for (const input of ['', 'a', 'ab', 'abba', 'babbab', 'x', 'aaaaaa']) {
        expectHalts(m, input)
      }
    }
  })

  it('pushdown automata on arbitrary inputs', () => {
    const rng = mulberry32(2)
    for (let i = 0; i < 500; i++) {
      const m = randomPDA(rng, rng() < 0.5 ? 'DPDA' : 'NPDA')
      expect(() => validateMachine(m)).not.toThrow()
      for (const input of ['', 'a', 'ab', 'aabb', 'abab']) {
        expectPdaHalts(m, input)
      }
    }
  })

  it('Turing machines / LBAs on arbitrary inputs', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 500; i++) {
      const m = randomTM(rng, rng() < 0.5 ? 'TM' : 'LBA')
      expect(() => validateMachine(m)).not.toThrow()
      for (const input of ['', 'a', 'ab', 'aabb', 'baba']) {
        expectHalts(m, input)
      }
    }
  })

  it('NPDA with a branching ε-push loop terminates instead of exploding', () => {
    // Two ε, ε → ‹different› self-loops: each child has a distinct stack, so the
    // per-step dedup can't merge them and the frontier would double every step.
    // The frontier-width guard must turn this into a bounded `stuck`/decision.
    const states: AutomataState[] = [
      { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
      { id: 'q1', label: 'q1', x: 80, y: 0, isStart: false, isAccept: true },
    ]
    const m: MachineDefinition = {
      id: 'boom',
      name: 'boom',
      type: 'NPDA',
      language: '',
      states,
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbols: [], read: '', pop: '', push: 'A' },
        { id: 't1', from: 'q0', to: 'q0', symbols: [], read: '', pop: '', push: 'B' },
      ],
      alphabet: ['a', 'b'],
    }
    const out = runToCompletion(m, 'ab')
    expect(['stuck', 'rejected']).toContain(out.status)
  })
})

// ════════════════════════════════════════════════════════════════
describe('fuzz: conversion language-equivalence', () => {
  it('NFA / ε-NFA ≡ subset-construction DFA', () => {
    const rng = mulberry32(10)
    const alpha = ['a', 'b']
    for (let i = 0; i < 1000; i++) {
      const src = randomNFA(rng, alpha, rng() < 0.5)
      const dfa = nfaToDfa(src).result as MachineDefinition
      for (const s of allStrings(alpha, 4)) {
        expect(accepts(dfa, s), `subset mismatch on "${s || 'ε'}" (seed iter ${i})`).toBe(
          accepts(src, s)
        )
      }
    }
  })

  it('DFA ≡ minimised DFA', () => {
    const rng = mulberry32(20)
    const alpha = ['a', 'b']
    for (let i = 0; i < 1000; i++) {
      const src = randomDFA(rng, alpha)
      const min = minimizeDfa(src).result as MachineDefinition
      expect(min.states.length).toBeLessThanOrEqual(
        src.states.length + 1 // +1 for a possible trap
      )
      for (const s of allStrings(alpha, 4)) {
        expect(accepts(min, s), `minimise mismatch on "${s || 'ε'}" (iter ${i})`).toBe(
          accepts(src, s)
        )
      }
    }
  })

  it('ε-NFA ≡ ε-eliminated NFA', () => {
    const rng = mulberry32(30)
    const alpha = ['a', 'b']
    for (let i = 0; i < 1000; i++) {
      const src = randomNFA(rng, alpha, true)
      const nfa = enfaToNfa(src).result as MachineDefinition
      for (const s of allStrings(alpha, 4)) {
        expect(accepts(nfa, s), `ε-elim mismatch on "${s || 'ε'}" (iter ${i})`).toBe(
          accepts(src, s)
        )
      }
    }
  })
})

// ════════════════════════════════════════════════════════════════
describe('fuzz: regex → ε-NFA matches the reference RegExp engine', () => {
  // Generate only syntax that JS RegExp and our parser interpret identically:
  // literals a/b, grouping, |, and a single trailing quantifier per atom.
  function genRegex(rng: () => number, depth: number): string {
    const expr = (d: number): string => {
      const concats = [concat(d)]
      while (rng() < 0.3) concats.push(concat(d))
      return concats.join('|')
    }
    const concat = (d: number): string => {
      let out = term(d)
      let n = ri(rng, 2)
      while (n-- > 0) out += term(d)
      return out
    }
    const term = (d: number): string => {
      const a = atom(d)
      const q = rng()
      return q < 0.2 ? a + '*' : q < 0.35 ? a + '+' : q < 0.5 ? a + '?' : a
    }
    const atom = (d: number): string => {
      if (d > 0 && rng() < 0.35) return '(' + expr(d - 1) + ')'
      return pick(rng, ['a', 'b'])
    }
    return expr(depth)
  }

  it('membership agrees on all short strings', () => {
    const rng = mulberry32(40)
    const alpha = ['a', 'b']
    const strings = allStrings(alpha, 4)
    for (let i = 0; i < 1000; i++) {
      const re = genRegex(rng, 3)
      let nfa: MachineDefinition
      let ref: RegExp
      try {
        nfa = regexToNfa(re).result as MachineDefinition
        ref = new RegExp('^(?:' + re + ')$')
      } catch (e) {
        throw new Error(`regex "${re}" failed to build: ${(e as Error).message}`)
      }
      for (const s of strings) {
        expect(accepts(nfa, s), `regex "${re}" disagreed on "${s || 'ε'}"`).toBe(ref.test(s))
      }
    }
  })
})
