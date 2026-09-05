import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from '@/engines/machine/core/types'
import type { CFG } from '@/engines/grammar/types'
import { ParserBuilder } from '@/engines/parser/builder'
import {
  generateDeterministicRandomCases,
  countSuiteExpectations,
  parseSuiteCSV,
  parseSuiteText,
  parseTestSuite,
  runMachineSuite,
  runMachineSuiteAsync,
  runParserSuite,
  suiteResultsToMarkdown,
} from './testSuite'

const machine: MachineDefinition = {
  id: 'suite-machine',
  name: 'Suite machine',
  type: 'DFA',
  language: '',
  alphabet: ['a'],
  states: [
    { id: 'q0', label: 'q0', x: 0, y: 0, isStart: true, isAccept: true },
    { id: 'q1', label: 'q1', x: 100, y: 0, isStart: false, isAccept: false },
  ],
  transitions: [{ id: 't0', from: 'q0', to: 'q1', symbols: ['a'] }],
}

describe('unified test suites', () => {
  it('keeps the line-oriented format and supports output expectations', () => {
    const suite = parseSuiteText('accept: ε\nhidden|reject: a\noutput: aa => 0 1')
    expect(suite.cases).toMatchObject([
      { input: '', expected: 'accept', category: 'visible' },
      { input: 'a', expected: 'reject', category: 'hidden', hidden: true },
      { input: 'aa', expectedOutput: ['0', '1'] },
    ])
  })

  it('validates CSV and JSON suite documents', () => {
    expect(parseSuiteCSV('input,expected,category\nε,accept,boundary').cases[0].category).toBe('boundary')
    expect(parseTestSuite('{"name":"x","cases":[{"input":"a","expected":"reject"}]}').cases).toHaveLength(1)
    expect(parseTestSuite('\uFEFFinput,expected\nε,accept').cases[0].input).toBe('')
    expect(parseTestSuite('\uFEFF{"version":1,"cases":[{"input":"ε"}]}').cases[0].input).toBe('')
    expect(() => parseTestSuite('{"version":2,"cases":[]}')).toThrow('Unsupported test suite version')
    expect(() => parseSuiteCSV('word,expected\na,accept')).toThrow('input column')
  })

  it('classifies verdict mismatches and produces deterministic reports', () => {
    const results = runMachineSuite(machine, parseSuiteText('accept: ε\naccept: a'))
    expect(results.map((result) => result.classification)).toEqual(['pass', 'fail'])
    expect(suiteResultsToMarkdown(results)).toContain('First failing case')
  })

  it('generates reproducible random categories', () => {
    const first = generateDeterministicRandomCases(['a', 'b'], 5, 4, 42)
    const second = generateDeterministicRandomCases(['a', 'b'], 5, 4, 42)
    expect(first).toEqual(second)
    expect(first.every((testCase) => testCase.category === 'random')).toBe(true)
  })

  it('counts trace-only oracles and yields progress for UI-sized suites', async () => {
    const suite = parseTestSuite('input,expectedTrace\na,"{""minSteps"":0}"')
    const results = runMachineSuite(machine, suite)
    expect(results[0].pass).toBe(true)
    expect(countSuiteExpectations(results)).toBe(1)

    const progress: number[] = []
    await expect(runMachineSuiteAsync(machine, parseSuiteText('ε\na\na'), {
      chunkSize: 1,
      onProgress: (completed) => progress.push(completed),
    })).resolves.toHaveLength(3)
    expect(progress).toEqual([1, 2, 3])
  })

  it('runs parser cases without mutating a Parser Studio store', () => {
    const cfg: CFG = {
      terminals: new Set(['a']),
      nonterminals: new Set(['S']),
      productions: [{ lhs: 'S', rhs: ['a'] }],
      startSymbol: 'S',
    }
    const model = ParserBuilder.build(cfg).model
    if (!model) throw new Error('Expected parser model')
    const results = runParserSuite(model, 'LL1', parseSuiteText('accept: a\nreject: b'))
    expect(results.map((result) => result.classification)).toEqual(['pass', 'pass'])
  })
})
