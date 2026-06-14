// ============================================================
// Exporter tests — δ-table (CSV/LaTeX), trace (CSV/JSON), tree (JSON).
// Pure string builders; no DOM/Tauri here (downloadText is not exercised).
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  deltaTableToCSV,
  deltaTableToLatex,
  traceToCSV,
  traceToJSON,
  treeToJSON,
} from './exporters'
import type { Configuration, HistoryEntry, MachineDefinition } from '@/engines/core/types'

const dfa: MachineDefinition = {
  id: 'd', name: 'Ends In B', type: 'DFA', language: '', alphabet: ['a', 'b'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: false },
    { id: 'q1', label: 'q1', x: 0, y: 0, isStart: false, isAccept: true },
  ],
  transitions: [
    { id: 't0', from: 'q0', to: 'q0', symbols: ['a'] },
    { id: 't1', from: 'q0', to: 'q1', symbols: ['b'] },
    { id: 't2', from: 'q1', to: 'q0', symbols: ['a'] },
    { id: 't3', from: 'q1', to: 'q1', symbols: ['b'] },
  ],
}

const dpda: MachineDefinition = {
  id: 'p', name: 'pda', type: 'DPDA', language: '', alphabet: ['a'],
  states: [{ id: 's', label: 's', x: 0, y: 0, isStart: true, isAccept: true }],
  transitions: [{ id: 'x', from: 's', to: 's', symbols: [], read: 'a', pop: 'Z', push: 'aZ' }],
}

describe('deltaTableToCSV', () => {
  it('emits an FA matrix with start/accept decoration', () => {
    const csv = deltaTableToCSV(dfa)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('δ,a,b')
    // Start floats to the top; cells hold the target labels.
    expect(lines[1]).toBe('→ q0,q0,q1')
    expect(lines[2]).toBe('* q1,q0,q1')
  })

  it('emits PDA moves in long format', () => {
    const csv = deltaTableToCSV(dpda)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('From,Read,Pop,Push,To')
    expect(lines[1]).toBe('→ * s,a,Z,aZ,s')
  })
})

describe('deltaTableToLatex', () => {
  it('wraps the table in a tabular and escapes the header', () => {
    const tex = deltaTableToLatex(dfa)
    expect(tex).toContain('\\begin{tabular}{|c|c|c|}')
    expect(tex).toContain('\\end{tabular}')
    expect(tex).toContain('q0')
  })
})

describe('traceToCSV / traceToJSON', () => {
  const history: HistoryEntry[] = [
    { step: 0, fromStateIds: ['q0'], toStateIds: ['q1'], symbol: 'b', transitionIds: ['t1'], status: 'accepted' },
  ]

  it('renders the per-step trace with resolved labels', () => {
    const csv = traceToCSV(dfa, history)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Step,Read,From,To,Status')
    expect(lines[1]).toBe('0,b,q0,q1,accepted')
  })

  it('embeds machine + input in the JSON trace', () => {
    const obj = JSON.parse(traceToJSON(dfa, history, 'b'))
    expect(obj.input).toBe('b')
    expect(obj.machine.type).toBe('DFA')
    expect(obj.steps[0]).toMatchObject({ read: 'b', from: ['q0'], to: ['q1'], status: 'accepted' })
  })
})

describe('treeToJSON', () => {
  it('serialises branch nodes with resolved state labels', () => {
    const nodes: Configuration[] = [
      { id: 'n0', parentId: null, stateId: 'q0', stack: [], inputIndex: 0, status: 'running', consumedInput: '', remainingInput: 'b' },
      { id: 'n1', parentId: 'n0', stateId: 'q1', stack: [], inputIndex: 1, status: 'accepted', consumedInput: 'b', remainingInput: '', mergedParents: 1 },
    ]
    const obj = JSON.parse(treeToJSON(dfa, nodes))
    expect(obj.nodes).toHaveLength(2)
    expect(obj.nodes[0]).toMatchObject({ id: 'n0', state: 'q0', parentId: null })
    expect(obj.nodes[1]).toMatchObject({ id: 'n1', state: 'q1', mergedParents: 1 })
  })
})
