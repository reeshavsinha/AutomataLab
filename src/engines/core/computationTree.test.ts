// ============================================================
// Computation Tree tests
// 1. buildComputationTree() — flat lineage → nested tree + status colouring.
// 2. Engine lineage — NFA / ε-NFA / NPDA expose a coherent tree via
//    getTreeNodes()/getLiveBranchIds() (the PR-4 engine prerequisite).
// ============================================================

import { describe, it, expect } from 'vitest'
import { buildComputationTree, supportsTree } from './computationTree'
import type { Configuration, MachineDefinition } from './types'
import { NFAEngine } from '../nfa/NFAEngine'
import { ENFAEngine } from '../enfa/ENFAEngine'
import { NPDAEngine } from '../npda/NPDAEngine'
import { DFAEngine } from '../dfa/DFAEngine'

// ── Helpers ──────────────────────────────────────────────────
function cfg(partial: Partial<Configuration> & { id: string }): Configuration {
  return {
    parentId: null,
    stateId: partial.id,
    stack: [],
    inputIndex: 0,
    status: 'running',
    consumedInput: '',
    remainingInput: '',
    ...partial,
  }
}

describe('buildComputationTree', () => {
  it('returns an empty tree for no nodes', () => {
    const tree = buildComputationTree([])
    expect(tree.roots).toEqual([])
    expect(tree.totalNodes).toBe(0)
    expect(tree.maxDepth).toBe(0)
    expect(tree.acceptingCount).toBe(0)
  })

  it('nests children under parents and computes depth', () => {
    const nodes = [
      cfg({ id: 'a', parentId: null }),
      cfg({ id: 'b', parentId: 'a' }),
      cfg({ id: 'c', parentId: 'a' }),
      cfg({ id: 'd', parentId: 'b' }),
    ]
    const tree = buildComputationTree(nodes)
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0].config.id).toBe('a')
    expect(tree.roots[0].children.map((n) => n.config.id)).toEqual(['b', 'c'])
    expect(tree.totalNodes).toBe(4)
    expect(tree.maxDepth).toBe(2) // a → b → d
  })

  it('preserves child creation order', () => {
    const nodes = [
      cfg({ id: 'root', parentId: null }),
      cfg({ id: 'x', parentId: 'root' }),
      cfg({ id: 'y', parentId: 'root' }),
      cfg({ id: 'z', parentId: 'root' }),
    ]
    const tree = buildComputationTree(nodes)
    expect(tree.roots[0].children.map((n) => n.config.id)).toEqual(['x', 'y', 'z'])
  })

  it('classifies status: accepted / internal / running / rejected', () => {
    const nodes = [
      cfg({ id: 'root', parentId: null }), // has children → internal
      cfg({ id: 'acc', parentId: 'root', status: 'accepted' }), // → accepted
      cfg({ id: 'live', parentId: 'root' }), // leaf in liveIds → running
      cfg({ id: 'dead', parentId: 'root' }), // leaf, not live → rejected
    ]
    const tree = buildComputationTree(nodes, new Set(['live']))
    const byId = new Map(tree.roots[0].children.map((n) => [n.config.id, n]))
    expect(tree.roots[0].status).toBe('internal')
    expect(byId.get('acc')!.status).toBe('accepted')
    expect(byId.get('live')!.status).toBe('running')
    expect(byId.get('dead')!.status).toBe('rejected')
    expect(tree.acceptingCount).toBe(1)
    expect(tree.liveCount).toBe(1)
  })

  it('treats a node with a missing parent as a root (orphan-safe)', () => {
    const nodes = [cfg({ id: 'child', parentId: 'ghost' })]
    const tree = buildComputationTree(nodes)
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0].config.id).toBe('child')
  })
})

// ── Engine lineage ───────────────────────────────────────────

// NFA accepting strings containing 'ab'
const nfaDef: MachineDefinition = {
  id: 'nfa', name: 'nfa', type: 'NFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['a'] },
    { id: 't2', from: 'q0', to: 'q0', symbols: ['b'] },
    { id: 't3', from: 'q1', to: 'q2', symbols: ['b'] },
    { id: 't4', from: 'q2', to: 'q2', symbols: ['a'] },
    { id: 't5', from: 'q2', to: 'q2', symbols: ['b'] },
  ],
}

describe('NFA computation-tree lineage', () => {
  it('is a TreeProvider; DFA is not', () => {
    expect(supportsTree(new NFAEngine(nfaDef))).toBe(true)
    expect(supportsTree(new DFAEngine(nfaDef))).toBe(false)
  })

  it('builds a tree with depth = input length and one accepting branch for "ab"', () => {
    const engine = new NFAEngine(nfaDef)
    engine.initialize('ab')
    engine.step()
    engine.step()
    const tree = buildComputationTree(engine.getTreeNodes(), new Set(engine.getLiveBranchIds()))
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0].config.stateId).toBe('q0')
    expect(tree.maxDepth).toBe(2)
    expect(tree.acceptingCount).toBe(1)
  })

  it('reports live frontier branches mid-run, none once finished', () => {
    const engine = new NFAEngine(nfaDef)
    engine.initialize('ab')
    engine.step() // read 'a' → frontier {q0, q1}
    expect(engine.getStatus()).toBe('running')
    expect(engine.getLiveBranchIds().length).toBeGreaterThan(0)
    engine.step() // read 'b' → accepted
    expect(engine.getLiveBranchIds()).toEqual([])
  })

  it('clears the tree on reset', () => {
    const engine = new NFAEngine(nfaDef)
    engine.initialize('ab')
    engine.step()
    engine.reset()
    expect(engine.getTreeNodes()).toEqual([])
  })
})

// ε-NFA: q0 -ε-> q1, q0 -ε-> q2, q1 -a-> q3(acc), q2 -b-> q4(acc)
const enfaDef: MachineDefinition = {
  id: 'enfa', name: 'enfa', type: 'ENFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q2', label: 'q2', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q3', label: 'q3', x: 0, y: 0, isStart: false, isAccept: true },
    { id: 'q4', label: 'q4', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q1', symbols: ['ε'] },
    { id: 't1', from: 'q0', to: 'q2', symbols: ['ε'] },
    { id: 't2', from: 'q1', to: 'q3', symbols: ['a'] },
    { id: 't3', from: 'q2', to: 'q4', symbols: ['b'] },
  ],
}

describe('ε-NFA computation-tree lineage', () => {
  it('gives ε-closure members real parent lineage from the start node', () => {
    const engine = new ENFAEngine(enfaDef)
    engine.initialize('a')
    const tree = buildComputationTree(engine.getTreeNodes(), new Set(engine.getLiveBranchIds()))
    expect(tree.roots).toHaveLength(1)
    expect(tree.roots[0].config.stateId).toBe('q0')
    // q1 and q2 are ε-children of q0
    const childStates = tree.roots[0].children.map((n) => n.config.stateId)
    expect(childStates).toContain('q1')
    expect(childStates).toContain('q2')
  })

  it('marks the accepting branch after consuming "a"', () => {
    const engine = new ENFAEngine(enfaDef)
    engine.initialize('a')
    engine.step()
    const tree = buildComputationTree(engine.getTreeNodes(), new Set(engine.getLiveBranchIds()))
    expect(tree.acceptingCount).toBe(1)
  })
})

// NPDA for even-length palindromes { w wᴿ } (needs true nondeterminism)
const palindrome: MachineDefinition = {
  id: 'npda', name: 'pal', type: 'NPDA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'qi', label: 'qi', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: false },
    { id: 'qf', label: 'qf', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 'ti', from: 'qi', to: 'q0', symbols: [], read: '', pop: '', push: 'Z' },
    { id: 'pa', from: 'q0', to: 'q0', symbols: [], read: 'a', pop: '', push: 'a' },
    { id: 'pb', from: 'q0', to: 'q0', symbols: [], read: 'b', pop: '', push: 'b' },
    { id: 'guess', from: 'q0', to: 'q1', symbols: [], read: '', pop: '', push: '' },
    { id: 'ma', from: 'q1', to: 'q1', symbols: [], read: 'a', pop: 'a', push: '' },
    { id: 'mb', from: 'q1', to: 'q1', symbols: [], read: 'b', pop: 'b', push: '' },
    { id: 'acc', from: 'q1', to: 'qf', symbols: [], read: '', pop: 'Z', push: '' },
  ],
}

describe('NPDA computation-tree lineage', () => {
  it('accumulates a branching tree with an accepting branch for "aa"', () => {
    const engine = new NPDAEngine(palindrome)
    engine.initialize('aa')
    let guard = 0
    while (engine.getStatus() === 'running' && guard < 5000) {
      engine.step()
      guard++
    }
    expect(engine.isAccepted()).toBe(true)
    const tree = buildComputationTree(engine.getTreeNodes(), new Set(engine.getLiveBranchIds()))
    expect(tree.totalNodes).toBeGreaterThan(1)
    expect(tree.acceptingCount).toBeGreaterThanOrEqual(1)
    // Nondeterminism ⇒ at least one node has more than one child.
    const fanout = engine.getTreeNodes().filter(
      (n) => n.parentId !== null
    )
    expect(fanout.length).toBeGreaterThan(1)
    // Run finished ⇒ no live branches.
    expect(engine.getLiveBranchIds()).toEqual([])
  })

  it('carries per-branch stacks into the tree (top shown first)', () => {
    const engine = new NPDAEngine(palindrome)
    engine.initialize('aa')
    engine.step()
    const withStack = engine.getTreeNodes().find((n) => n.stack.length > 0)
    expect(withStack?.stack).toEqual(['Z'])
  })
})
