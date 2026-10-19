import type { MachineDefinition, TapeSnapshot } from '@/engines/machine/core/types'
import { runToCompletion, type RunOutcome } from '@/engines/machine/core/engineFactory'
import { runParserCase, type ParserAlgorithm, type ParserRunOutcome } from '@/engines/parser/runner'

export type SuiteVerdict = 'accept' | 'reject' | null
export type TestCategory = 'visible' | 'hidden' | 'random' | 'boundary'
export type ResultClassification = 'pass' | 'fail' | 'error' | 'limit' | 'mismatch'
export type MismatchField = 'verdict' | 'output' | 'tape' | 'trace'
export const MAX_SUITE_CASES = 500
export const MAX_SUITE_STEPS = 100_000

export interface SuiteCase {
  id: string
  input: string
  expected: SuiteVerdict
  expectedOutput?: string[]
  expectedTape?: string | string[]
  expectedTrace?: {
    minSteps?: number
    maxSteps?: number
    contains?: string[]
  }
  category: TestCategory
  hidden?: boolean
  raw?: string
}

export interface TestSuite {
  version: number
  name: string
  cases: SuiteCase[]
  maxSteps?: number
}

export function validateTestSuite(suite: TestSuite): TestSuite {
  if (suite.version !== 1) throw new Error('Unsupported test suite version.')
  if (suite.cases.length > MAX_SUITE_CASES) {
    throw new Error(`Test suite is limited to ${MAX_SUITE_CASES} cases.`)
  }
  if (suite.maxSteps !== undefined && (!Number.isFinite(suite.maxSteps) || suite.maxSteps < 1 || suite.maxSteps > MAX_SUITE_STEPS)) {
    throw new Error(`Suite maxSteps must be between 1 and ${MAX_SUITE_STEPS.toLocaleString()}.`)
  }
  for (const [index, testCase] of suite.cases.entries()) {
    if (!testCase.id || typeof testCase.input !== 'string') throw new Error(`Invalid test case at index ${index}.`)
    if (!['visible', 'hidden', 'random', 'boundary'].includes(testCase.category)) throw new Error(`Invalid test category at index ${index}.`)
  }
  return suite
}

export interface SuiteResult {
  id: string
  input: string
  expected: SuiteVerdict
  expectedOutput?: string[]
  expectedTape?: string | string[]
  expectedTrace?: SuiteCase['expectedTrace']
  category: TestCategory
  hidden: boolean
  actualStatus: string
  accepted: boolean | null
  steps: number
  outputTrace?: string[]
  tapes?: TapeSnapshot[]
  trace?: string[]
  classification: ResultClassification
  mismatchFields?: MismatchField[]
  pass: boolean | null
  error?: string
}

const EMPTY_TOKENS = new Set(['ε', 'λ', 'eps', 'epsilon', '""', "''"])

function normalizeInput(value: string): string {
  return EMPTY_TOKENS.has(value.trim().toLowerCase()) ? '' : value
}

function normalizeOutput(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '∅') return []
  return trimmed.split(/[\s,]+/).filter(Boolean)
}

function parseExpectedLine(line: string, index: number, category: TestCategory): SuiteCase | null {
  const tagged = /^(?:(visible|hidden|random|boundary)\s*\|\s*)?(accept|reject|output)\s*:\s*(.*)$/i.exec(line.trim())
  if (!tagged) {
    const raw = line.trim()
    const separator = raw.indexOf('=>')
    const input = normalizeInput(separator >= 0 ? raw.slice(0, separator).trim() : raw)
    return input === '' && line.trim() === '' ? null : {
      id: `case-${index + 1}`,
      input,
      expected: null,
      ...(separator >= 0 ? { expectedOutput: normalizeOutput(raw.slice(separator + 2)) } : {}),
      category,
      hidden: category === 'hidden',
      raw: line,
    }
  }

  const lineCategory = (tagged[1]?.toLowerCase() as TestCategory | undefined) ?? category
  const tag = tagged[2].toLowerCase()
  const body = tagged[3]
  const separator = body.indexOf('=>')
  const inputPart = separator >= 0 ? body.slice(0, separator).trim() : body
  const outputPart = separator >= 0 ? body.slice(separator + 2).trim() : ''
  return {
    id: `case-${index + 1}`,
    input: normalizeInput(inputPart),
    expected: tag === 'accept' ? 'accept' : tag === 'reject' ? 'reject' : null,
    ...(separator >= 0 ? { expectedOutput: normalizeOutput(outputPart) } : {}),
    category: lineCategory,
    hidden: lineCategory === 'hidden',
    raw: line,
  }
}

/** Parse the existing line-oriented format, with optional `=> out1 out2`. */
export function parseSuiteText(text: string, category: TestCategory = 'visible'): TestSuite {
  const cases = text
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== '' && !line.trim().startsWith('#'))
    .map(({ line, index }) => parseExpectedLine(line, index, category))
    .filter((value): value is SuiteCase => value !== null)
  return validateTestSuite({ version: 1, name: 'Untitled suite', cases })
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) {
      cell += '"'
      i++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  return cells
}

/** Parse CSV columns: input, expected, expectedOutput, category, expectedTape. */
export function parseSuiteCSV(text: string): TestSuite {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return validateTestSuite({ version: 1, name: 'CSV suite', cases: [] })
  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase().replace(/[\s_-]+/g, ''))
  if (!header.includes('input')) throw new Error('Suite CSV must contain an input column.')
  const column = (name: string, fallback: number) => {
    const index = header.indexOf(name.toLowerCase())
    return index >= 0 ? index : fallback
  }
  const outputColumn = header.indexOf('expectedoutput')
  const tapeColumn = header.indexOf('expectedtape')
  const traceColumn = header.indexOf('expectedtrace')
  const cases = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line)
    const expected = cells[column('expected', 1)]?.trim().toLowerCase()
    const category = (cells[column('category', 3)]?.trim().toLowerCase() || 'visible') as TestCategory
    return {
      id: cells[column('id', -1)]?.trim() || `case-${rowIndex + 1}`,
      input: normalizeInput(cells[column('input', 0)] ?? ''),
      expected: expected === 'accept' || expected === 'reject' ? expected as 'accept' | 'reject' : null,
      ...(outputColumn >= 0 && cells[outputColumn]?.trim() ? { expectedOutput: normalizeOutput(cells[outputColumn]) } : {}),
      ...(tapeColumn >= 0 && cells[tapeColumn]?.trim() ? { expectedTape: cells[tapeColumn].trim() } : {}),
      ...(traceColumn >= 0 && cells[traceColumn]?.trim() ? { expectedTrace: parseTraceCell(cells[traceColumn]) } : {}),
      category: ['visible', 'hidden', 'random', 'boundary'].includes(category) ? category : 'visible',
      hidden: category === 'hidden',
    }
  })
  return validateTestSuite({ version: 1, name: 'CSV suite', cases })
}

export function parseSuiteJSON(text: string): TestSuite {
  const raw = JSON.parse(text) as Partial<TestSuite> | SuiteCase[]
  if (raw === null || typeof raw !== 'object') throw new Error('Suite JSON must be an object or cases array.')
  const list = Array.isArray(raw) ? raw : raw.cases ?? []
  if (!Array.isArray(list)) throw new Error('Suite JSON must contain a cases array.')
  return validateTestSuite({
    // Arrays are the compact legacy representation. Object documents must
    // preserve their version so unsupported schemas cannot be misread as v1.
    version: Array.isArray(raw) ? 1 : raw.version ?? 1,
    name: Array.isArray(raw) ? 'JSON suite' : raw.name ?? 'JSON suite',
    maxSteps: Array.isArray(raw) ? undefined : raw.maxSteps,
    cases: list.map((value, index) => {
      if (!value || typeof value !== 'object' || typeof value.input !== 'string') {
        throw new Error(`Invalid suite case at index ${index}.`)
      }
      const category = value.category ?? 'visible'
      return {
        id: value.id || `case-${index + 1}`,
        input: normalizeInput(value.input),
        expected: value.expected === 'accept' || value.expected === 'reject' ? value.expected : null,
        expectedOutput: Array.isArray(value.expectedOutput) ? value.expectedOutput.map(String) : undefined,
        expectedTape: typeof value.expectedTape === 'string' || Array.isArray(value.expectedTape) ? value.expectedTape : undefined,
        expectedTrace: value.expectedTrace && typeof value.expectedTrace === 'object' ? {
          minSteps: typeof value.expectedTrace.minSteps === 'number' ? value.expectedTrace.minSteps : undefined,
          maxSteps: typeof value.expectedTrace.maxSteps === 'number' ? value.expectedTrace.maxSteps : undefined,
          contains: Array.isArray(value.expectedTrace.contains) ? value.expectedTrace.contains.map(String) : undefined,
        } : undefined,
        category: ['visible', 'hidden', 'random', 'boundary'].includes(category) ? category : 'visible',
        hidden: Boolean(value.hidden) || category === 'hidden',
      }
    }),
  })
}

export function parseTestSuite(text: string): TestSuite {
  const withoutBom = text.replace(/^\uFEFF/, '')
  const trimmed = withoutBom.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return parseSuiteJSON(trimmed)
  const firstRow = trimmed.split(/\r?\n/, 1)[0] ?? ''
  if (splitCsvLine(firstRow).some((cell) => cell.trim().toLowerCase() === 'input')) return parseSuiteCSV(trimmed)
  return parseSuiteText(withoutBom)
}

export function suiteToJSON(suite: TestSuite): string {
  return JSON.stringify(suite, null, 2)
}

export function suiteToCSV(suite: TestSuite): string {
  const header = ['ID', 'Input', 'Expected', 'Expected Output', 'Category', 'Expected Tape', 'Expected Trace']
  const rows = suite.cases.map((testCase) => [
    testCase.id,
    testCase.input,
    testCase.expected ?? '',
    testCase.expectedOutput?.join(' ') ?? '',
    testCase.category,
    Array.isArray(testCase.expectedTape) ? testCase.expectedTape.join(' | ') : testCase.expectedTape ?? '',
    testCase.expectedTrace ? JSON.stringify(testCase.expectedTrace) : '',
  ])
  return '\uFEFF' + [header, ...rows].map((row) => row.map((value) => {
    const cell = String(value)
    return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  }).join(',')).join('\r\n')
}

function parseTraceCell(value: string): SuiteCase['expectedTrace'] {
  const trimmed = value.trim()
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as SuiteCase['expectedTrace']
    if (!parsed || typeof parsed !== 'object') throw new Error('Expected Trace must be a JSON object.')
    return parsed
  }
  return { contains: trimmed.split(';').map((fragment) => fragment.trim()).filter(Boolean) }
}

export const serializeTestSuiteJSON = suiteToJSON
export const serializeTestSuiteCSV = suiteToCSV

/** Generate reproducible random cases for instructor or regression suites. */
export function generateDeterministicRandomCases(
  alphabet: string[],
  count: number,
  maxLength = 8,
  seed = 1,
): SuiteCase[] {
  if (alphabet.length === 0) throw new Error('Cannot generate random cases without an alphabet.')
  let state = seed >>> 0
  const next = () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const length = Math.floor(next() * (Math.max(0, maxLength) + 1))
    let input = ''
    for (let symbol = 0; symbol < length; symbol++) input += alphabet[Math.floor(next() * alphabet.length)]
    return {
      id: `random-${index + 1}`,
      input,
      expected: null,
      category: 'random',
      raw: input,
    }
  })
}

function tapeText(tapes?: TapeSnapshot[]): string {
  return (tapes ?? []).map((tape) => tape.cells.map((cell, index) => index === tape.head ? `[${cell}]` : cell).join('')).join(' | ')
}

function compareResult(
  testCase: SuiteCase,
  actual: { status: string; accepted: boolean | null; steps: number; limited?: boolean; error?: string; outputTrace?: string[]; tapes?: TapeSnapshot[]; trace?: string[] }
): SuiteResult {
  if (actual.limited || actual.status === 'stuck') {
    return { ...testCase, hidden: testCase.hidden ?? testCase.category === 'hidden', actualStatus: actual.status, accepted: actual.accepted, steps: actual.steps, outputTrace: actual.outputTrace, tapes: actual.tapes, trace: actual.trace, classification: 'limit', pass: null, error: actual.error }
  }
  if (actual.status === 'error' && actual.accepted === null) {
    return { ...testCase, hidden: testCase.hidden ?? testCase.category === 'hidden', actualStatus: actual.status, accepted: actual.accepted, steps: actual.steps, outputTrace: actual.outputTrace, tapes: actual.tapes, trace: actual.trace, classification: 'error', pass: null, error: actual.error }
  }

  const verdictMatches = testCase.expected === null
    || (testCase.expected === 'accept' ? actual.accepted === true : actual.accepted === false)
  const outputMatches = testCase.expectedOutput === undefined
    || JSON.stringify(testCase.expectedOutput) === JSON.stringify(actual.outputTrace ?? [])
  const actualTape = tapeText(actual.tapes)
  const expectedTape = Array.isArray(testCase.expectedTape) ? testCase.expectedTape.join(' | ') : testCase.expectedTape
  const tapeMatches = expectedTape === undefined || expectedTape === actualTape
  const trace = actual.trace ?? []
  const traceMatches = testCase.expectedTrace === undefined
    || (testCase.expectedTrace.minSteps === undefined || actual.steps >= testCase.expectedTrace.minSteps)
      && (testCase.expectedTrace.maxSteps === undefined || actual.steps <= testCase.expectedTrace.maxSteps)
      && (testCase.expectedTrace.contains ?? []).every((fragment) => trace.some((entry) => entry.includes(fragment)))
  const hasExpectation = testCase.expected !== null || testCase.expectedOutput !== undefined || testCase.expectedTape !== undefined || testCase.expectedTrace !== undefined
  const pass = hasExpectation ? verdictMatches && outputMatches && tapeMatches && traceMatches : null
  const mismatchFields: MismatchField[] = [
    ...(testCase.expected !== null && !verdictMatches ? ['verdict' as const] : []),
    ...(testCase.expectedOutput !== undefined && !outputMatches ? ['output' as const] : []),
    ...(testCase.expectedTape !== undefined && !tapeMatches ? ['tape' as const] : []),
    ...(testCase.expectedTrace !== undefined && !traceMatches ? ['trace' as const] : []),
  ]
  const classification: ResultClassification = !hasExpectation || pass
    ? 'pass'
    : !verdictMatches
      ? 'fail'
      : 'mismatch'
  return { ...testCase, hidden: testCase.hidden ?? testCase.category === 'hidden', actualStatus: actual.status, accepted: actual.accepted, steps: actual.steps, outputTrace: actual.outputTrace, tapes: actual.tapes, trace: actual.trace, classification, ...(mismatchFields.length > 0 ? { mismatchFields } : {}), pass }
}

export function runMachineSuite(machine: MachineDefinition, suite: TestSuite): SuiteResult[] {
  const checkedSuite = validateTestSuite(suite)
  const maxSteps = checkedSuite.maxSteps ?? MAX_SUITE_STEPS
  return checkedSuite.cases.map((testCase) => {
    try {
      const outcome: RunOutcome = runToCompletion(machine, testCase.input, maxSteps, {
        captureTrace: testCase.expectedTrace !== undefined,
        captureTapes: testCase.expectedTape !== undefined,
      })
      return compareResult(testCase, outcome)
    } catch (error) {
      return compareResult(testCase, {
        status: 'error',
        accepted: null,
        steps: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}

export function runParserSuite(model: Parameters<typeof runParserCase>[0], algorithm: ParserAlgorithm, suite: TestSuite): SuiteResult[] {
  const checkedSuite = validateTestSuite(suite)
  const maxSteps = checkedSuite.maxSteps ?? 10_000
  return checkedSuite.cases.map((testCase) => {
    const outcome: ParserRunOutcome = runParserCase(model, algorithm, testCase.input, maxSteps)
    return compareResult(testCase, outcome)
  })
}

export interface SuiteRunOptions {
  /** Number of cases to process before yielding to the renderer. */
  chunkSize?: number
  onProgress?: (completed: number, total: number) => void
  signal?: AbortSignal
}

async function runSuiteInChunks(
  suite: TestSuite,
  runCase: (testCase: SuiteCase) => SuiteResult,
  { chunkSize = 10, onProgress, signal }: SuiteRunOptions = {},
): Promise<SuiteResult[]> {
  const checkedSuite = validateTestSuite(suite)
  const results: SuiteResult[] = []
  const size = Math.max(1, Math.floor(chunkSize) || 1)
  for (let index = 0; index < checkedSuite.cases.length; index++) {
    if (signal?.aborted) throw new Error('Suite execution cancelled.')
    results.push(runCase(checkedSuite.cases[index]))
    if ((index + 1) % size === 0 && index + 1 < checkedSuite.cases.length) {
      onProgress?.(index + 1, checkedSuite.cases.length)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }
  onProgress?.(results.length, checkedSuite.cases.length)
  return results
}

/** UI-safe counterpart to `runMachineSuite`; yields between bounded case chunks. */
export function runMachineSuiteAsync(machine: MachineDefinition, suite: TestSuite, options?: SuiteRunOptions): Promise<SuiteResult[]> {
  return runSuiteInChunks(suite, (testCase) => runMachineSuite(machine, { ...suite, cases: [testCase] })[0], options)
}

/** UI-safe counterpart to `runParserSuite`; yields between bounded case chunks. */
export function runParserSuiteAsync(
  model: Parameters<typeof runParserCase>[0],
  algorithm: ParserAlgorithm,
  suite: TestSuite,
  options?: SuiteRunOptions,
): Promise<SuiteResult[]> {
  return runSuiteInChunks(suite, (testCase) => runParserSuite(model, algorithm, { ...suite, cases: [testCase] })[0], options)
}

export function hasSuiteExpectation(result: Pick<SuiteResult, 'expected' | 'expectedOutput' | 'expectedTape' | 'expectedTrace'>): boolean {
  return result.expected !== null
    || result.expectedOutput !== undefined
    || result.expectedTape !== undefined
    || result.expectedTrace !== undefined
}

export function countSuiteExpectations(results: SuiteResult[]): number {
  return results.filter(hasSuiteExpectation).length
}

export function firstFailingCase(results: SuiteResult[]): SuiteResult | null {
  return results.find((result) => result.classification !== 'pass') ?? null
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function suiteResultsToCSV(results: SuiteResult[]): string {
  const header = ['ID', 'Input', 'Category', 'Expected', 'Actual', 'Expected Output', 'Actual Output', 'Expected Trace', 'Steps', 'Classification', 'Mismatch', 'Error']
  const rows = results.map((result) => [
    result.id,
    result.input,
    result.category,
    result.expected ?? '',
    result.actualStatus,
    result.expectedOutput?.join(' ') ?? '',
    result.outputTrace?.join(' ') ?? '',
    result.expectedTrace ? JSON.stringify(result.expectedTrace) : '',
    String(result.steps),
    result.classification,
    result.mismatchFields?.join(' ') ?? '',
    result.error ?? '',
  ])
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function suiteResultsToJSON(results: SuiteResult[]): string {
  return JSON.stringify({
    version: 1,
    total: results.length,
    passed: results.filter((result) => result.classification === 'pass').length,
    firstFailingCase: firstFailingCase(results),
    results,
  }, null, 2)
}

export function suiteResultsToMarkdown(results: SuiteResult[]): string {
  const lines = [
    '# AutomataLab Test Suite Report',
    '',
    '| ID | Input | Category | Expected | Actual | Output | Steps | Classification | Mismatch |',
    '|---|---|---|---|---|---|---:|---|---|',
  ]
  for (const result of results) {
    lines.push(`| ${result.id} | ${result.input || 'ε'} | ${result.category} | ${result.expected ?? '—'} | ${result.actualStatus} | ${(result.outputTrace ?? []).join(' ') || '—'} | ${result.steps} | ${result.classification} | ${(result.mismatchFields ?? []).join(', ') || '—'} |`)
  }
  const failure = firstFailingCase(results)
  if (failure) lines.push('', `First failing case: **${failure.input || 'ε'}** (${failure.classification}).`)
  return lines.join('\n')
}

function latexEscape(value: string): string {
  return value.replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}')
}

export function suiteResultsToLatex(results: SuiteResult[]): string {
  const lines = ['% AutomataLab Test Suite Report', '\\begin{tabular}{|l|l|l|l|l|r|l|}', '\\hline', 'ID & Input & Category & Expected & Actual & Steps & Classification \\\\', '\\hline']
  for (const result of results) {
    lines.push([result.id, result.input || 'ε', result.category, result.expected ?? '—', result.actualStatus, String(result.steps), result.classification].map(latexEscape).join(' & ') + ' \\\\')
  }
  lines.push('\\hline', '\\end{tabular}')
  return lines.join('\n')
}
