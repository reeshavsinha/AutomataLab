// ============================================================
// Batch / test-suite runner — membership-test many strings at once.
// Accepts a free-text list (optionally tagged `accept:` / `reject:`) and runs
// each headlessly via the shared engine factory, producing a pass/fail table.
// (UX audit #7 / PRD FR-4.7.) Pure TypeScript — no UI imports.
// ============================================================

import type { MachineDefinition, SimulationStatus } from '@/engines/machine/core/types'
import { runToCompletion } from '@/engines/machine/core/engineFactory'

export type Expectation = 'accept' | 'reject' | null

export interface BatchCase {
  /** The input string actually fed to the engine. */
  input: string
  /** Expected outcome, if the line was tagged. */
  expected: Expectation
  /** The original line, for display (empty string shown as ε). */
  raw: string
}

export interface BatchResult extends BatchCase {
  status: SimulationStatus
  /** Recognizer verdict; null for transducer runs, which only produce output. */
  accepted: boolean | null
  steps: number
  /** Did the outcome match the expectation? null when no expectation given. */
  pass: boolean | null
  /** Output trace emitted by a Mealy/Moore run, when applicable. */
  outputTrace?: string[]
}

/** Tokens that denote the empty string (ε) as a whole test case. */
const EMPTY_TOKENS = new Set(['ε', 'λ', 'lambda', 'eps', 'epsilon', '""', "''"])

function normalizeInput(token: string): string {
  return EMPTY_TOKENS.has(token.trim()) ? '' : token
}

/**
 * Parse the batch textarea into cases. One case per line:
 *   - `# …`            → comment, ignored
 *   - blank line       → ignored (use ε to test the empty string)
 *   - `accept: w`      → expect w to be accepted (w may be ε / empty)
 *   - `reject: w`      → expect w to be rejected
 *   - `w`              → no expectation, just report the outcome
 * Inputs are NOT trimmed of inner spaces; only the line ends. Use ε for "".
 */
export function parseBatchCases(text: string): BatchCase[] {
  const cases: BatchCase[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const tagged = /^(accept|reject)\s*:\s*(.*)$/i.exec(trimmed)
    if (tagged) {
      const expected = tagged[1].toLowerCase() === 'accept' ? 'accept' : 'reject'
      const rawWord = tagged[2]
      const input = normalizeInput(rawWord)
      cases.push({ input, expected, raw: input === '' ? 'ε' : rawWord })
      continue
    }

    const input = normalizeInput(trimmed)
    cases.push({ input, expected: null, raw: input === '' ? 'ε' : trimmed })
  }
  return cases
}

/** Run every case against a fresh engine and tag each with a pass/fail verdict. */
export function runBatch(machine: MachineDefinition, cases: BatchCase[]): BatchResult[] {
  return cases.map((c) => {
    const outcome = runToCompletion(machine, c.input)
    let pass: boolean | null = null
    if (c.expected !== null && outcome.accepted !== null) {
      pass = c.expected === 'accept' ? outcome.accepted === true : outcome.accepted === false
    }
    return {
      ...c,
      status: outcome.status,
      accepted: outcome.accepted,
      steps: outcome.steps,
      pass,
      ...(outcome.outputTrace ? { outputTrace: outcome.outputTrace } : {}),
    }
  })
}

/** Aggregate counts for the summary line. */
export function batchSummary(results: BatchResult[]): {
  total: number
  accepted: number
  rejected: number
  expected: number
  passed: number
  failed: number
} {
  let accepted = 0
  let rejected = 0
  let expected = 0
  let passed = 0
  let failed = 0
  for (const r of results) {
    if (r.accepted === true) accepted++
    else if (r.accepted === false) rejected++
    if (r.pass !== null) {
      expected++
      if (r.pass) passed++
      else failed++
    }
  }
  return { total: results.length, accepted, rejected, expected, passed, failed }
}

// New callers should use the unified suite contract. These re-exports keep the
// original batch module as a stable entry point for existing UI integrations.
export {
  parseTestSuite,
  parseSuiteText,
  parseSuiteCSV,
  parseSuiteJSON,
  runMachineSuite,
  runParserSuite,
  suiteToJSON,
  suiteToCSV,
  suiteResultsToCSV,
  suiteResultsToJSON,
  suiteResultsToMarkdown,
  suiteResultsToLatex,
  firstFailingCase,
  generateDeterministicRandomCases,
  validateTestSuite,
} from './testSuite'
export type {
  SuiteCase,
  TestSuite,
  SuiteResult,
  TestCategory,
  ResultClassification,
  MismatchField,
} from './testSuite'
export { MAX_SUITE_CASES, MAX_SUITE_STEPS } from './testSuite'
