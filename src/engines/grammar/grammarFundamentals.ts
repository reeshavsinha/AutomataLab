import type { GrammarFormat } from '@/engines/machine/core/types'
import { canOpenInParserStudio, grammarMachineTargets } from '@/engines/machine/core/capabilities'
import { classifyGrammar, regularDirection, validateGrammarFormat } from './classification'
import { isNonterminal } from './parser'
import type { CFG, GeneralGrammar, GrammarAnalysisResult, GrammarClassificationResult } from './types'
import { EPSILON } from './types'

export interface FundamentalRow {
  label: string
  value: string
  detail?: string
  highlight?: boolean
}

export interface FundamentalSection {
  title: string
  rows: FundamentalRow[]
  notes: string[]
}

function allowsStartEpsilon(grammar: GeneralGrammar, lhs: string[], rhs: string[]): boolean {
  return lhs.length === 1
    && lhs[0] === grammar.startSymbol
    && rhs.length === 0
    && !grammar.productions.some((production) => production.rhs.includes(grammar.startSymbol))
}

function productionIsNonContracting(grammar: GeneralGrammar, lhs: string[], rhs: string[]): boolean {
  return rhs.length >= lhs.length || allowsStartEpsilon(grammar, lhs, rhs)
}

function countEpsilonProductions(grammar: GeneralGrammar): number {
  return grammar.productions.filter((p) => p.rhs.length === 0).length
}

function countDirectLeftRecursive(cfg: CFG): number {
  let count = 0
  for (const nt of cfg.nonterminals) {
    if (cfg.productions.some((p) => p.lhs === nt && p.rhs[0] === nt)) count++
  }
  return count
}

function countMultiSymbolLhs(grammar: GeneralGrammar): number {
  return grammar.productions.filter((p) => p.lhs.length > 1).length
}

function countContextFreeProductions(grammar: GeneralGrammar): number {
  return grammar.productions.filter(
    (p) => p.lhs.length === 1 && isNonterminal(p.lhs[0]),
  ).length
}

export function computeGrammarFundamentals(
  format: Exclude<GrammarFormat, 'REGEX'>,
  grammar: GeneralGrammar,
  classification: GrammarClassificationResult,
  cfg: CFG | null,
  analysis: GrammarAnalysisResult | null,
): FundamentalSection[] {
  const inferred = classification.inferredType
  const selected = format
  const valid = classification.isValidForSelectedFormat
  const sections: FundamentalSection[] = []

  const overviewRows: FundamentalRow[] = [
    { label: 'Start symbol', value: grammar.startSymbol, highlight: true, detail: 'Rewriting begins here.' },
    { label: 'Productions', value: String(grammar.productions.length) },
    { label: 'Nonterminals', value: String(grammar.nonterminals.size), detail: 'Symbols you replace during a derivation.' },
    { label: 'Terminals', value: grammar.terminals.size ? [...grammar.terminals].sort().join(', ') : EPSILON, detail: 'Characters that appear in finished strings.' },
    { label: 'ε-productions', value: String(countEpsilonProductions(grammar)), detail: 'Rules whose right-hand side is empty (the empty string ε).' },
  ]

  if (inferred !== selected) {
    overviewRows.push({
      label: 'Inferred class',
      value: inferred.replace('_', ' '),
      detail: `You selected ${selected.replace('_', ' ')}; by shape alone this grammar fits ${inferred.replace('_', ' ')} better. Check rule forms or change the format.`,
      highlight: true,
    })
  }

  overviewRows.push({
    label: 'Format validity',
    value: valid ? 'Valid' : 'Invalid',
    detail: valid ? 'Rules match the selected Chomsky format.' : classification.violations.join(' '),
    highlight: !valid,
  })

  sections.push({
    title: 'Overview',
    rows: overviewRows,
    notes: [
      'Press F2 for the Theory Handbook; open Properties whenever you change format or rules.',
    ],
  })

  const recognizers = grammarMachineTargets(format).join(', ')
  const parser = canOpenInParserStudio(format)
    ? 'Yes — regex, Type 2, and Type 3 can open Parser Studio'
    : 'No — use Machine Studio recognizers for this format'

  if (format === 'TYPE_3') {
    const direction = regularDirection(grammar)
    const typeRows: FundamentalRow[] = [
      {
        label: 'Chomsky class',
        value: 'Type 3 — Regular grammar',
        detail: 'The weakest standard class; same power as regular expressions and finite automata.',
      },
      {
        label: 'Linear form',
        value: direction === 'left' ? 'Left-linear' : direction === 'right' ? 'Right-linear' : 'Not linear',
        detail: direction
          ? 'Every rule is ε, a single terminal, or two symbols with one terminal and one nonterminal in a consistent direction (e.g. A → aB).'
          : 'Mixed directions or illegal shapes — fix rules or switch to Type 2 if you need full CFG power.',
        highlight: !direction,
      },
      { label: 'Language class', value: 'Regular', detail: 'You can recognize it with a DFA/NFA (no stack).' },
      { label: 'Context-free shape', value: 'Yes', detail: 'Each left-hand side is a single nonterminal.' },
    ]
    if (cfg && analysis) {
      typeRows.push({
        label: 'Nullable nonterminals',
        value: analysis.nullable.size ? [...analysis.nullable].sort().join(', ') : 'None',
        detail: 'Can derive ε; matters for FIRST/FOLLOW and ε-productions.',
      })
    }
    sections.push({
      title: 'Type 3 — what this means',
      rows: typeRows,
      notes: [
        'Typical next step: Sampler for short strings, or convert to a DFA/NFA in Machine Studio.',
        `Recognizers available here: ${recognizers}.`,
        `Parser Studio: ${parser}.`,
      ],
    })
  }

  if (format === 'TYPE_2') {
    const cfgOnly = countContextFreeProductions(grammar) === grammar.productions.length
    const typeRows: FundamentalRow[] = [
      {
        label: 'Chomsky class',
        value: 'Type 2 — Context-free',
        detail: 'Models nested structure (parentheses, expressions) with a single nonterminal on each left-hand side.',
      },
      {
        label: 'Single NT on LHS',
        value: cfgOnly ? 'All productions' : 'Violated',
        detail: cfgOnly
          ? 'Every rule looks like A → … with one nonterminal A.'
          : 'At least one rule has zero or multiple nonterminals on the left — not a pure CFG.',
        highlight: !cfgOnly,
      },
      { label: 'Language class', value: 'Context-free', detail: 'Recognizable by a pushdown automaton (stack memory).' },
    ]
    if (cfg && analysis) {
      typeRows.push(
        {
          label: 'Nullable nonterminals',
          value: analysis.nullable.size ? [...analysis.nullable].sort().join(', ') : 'None',
        },
        {
          label: 'Direct left recursion',
          value: String(countDirectLeftRecursive(cfg)),
          detail: 'Rules like A → Aα block simple top-down (LL) parsers; use Transformations to remove.',
          highlight: countDirectLeftRecursive(cfg) > 0,
        },
      )
    }
    sections.push({
      title: 'Type 2 — what this means',
      rows: typeRows,
      notes: [
        'Use Transformations, FIRST/FOLLOW, Ambiguity, and Problems for standard CFG coursework.',
        `Recognizers: ${recognizers}. Parser Studio: ${parser}.`,
      ],
    })
  }

  if (format === 'TYPE_1') {
    const contracting = grammar.productions.filter(
      (p) => !productionIsNonContracting(grammar, p.lhs, p.rhs),
    )
    const typeRows: FundamentalRow[] = [
      {
        label: 'Chomsky class',
        value: 'Type 1 — Context-sensitive',
        detail: 'Rules may depend on surrounding context; length cannot shrink except for one optional S → ε.',
      },
      {
        label: 'Non-contracting',
        value: contracting.length === 0 ? 'Yes' : `${contracting.length} violation(s)`,
        detail: contracting.length
          ? 'Each rule needs |right-hand side| ≥ |left-hand side|, except isolated S → ε when S never appears on a right-hand side.'
          : 'Sentential forms never get shorter (except that one start ε-rule).',
        highlight: contracting.length > 0,
      },
      {
        label: 'CFG-shaped rules',
        value: `${countContextFreeProductions(grammar)} / ${grammar.productions.length}`,
        detail: 'Subset of rules that look like ordinary context-free productions.',
      },
      {
        label: 'Multi-symbol LHS',
        value: String(countMultiSymbolLhs(grammar)),
        detail: 'Context appears on the left (e.g. uAv → uβv).',
      },
      { label: 'Language class', value: 'Context-sensitive', detail: 'Recognizable by a linear-bounded automaton (tape ≈ input length).' },
    ]
    sections.push({
      title: 'Type 1 — what this means',
      rows: typeRows,
      notes: [
        'Derivations search is bounded: a limit means “not found yet”, not “definitely no”.',
        `Simulate via ${recognizers} in Machine Studio. Parser Studio table tools do not apply.`,
      ],
    })
  }

  if (format === 'TYPE_0') {
    const contracting = grammar.productions.filter(
      (p) => p.rhs.length < p.lhs.length && !allowsStartEpsilon(grammar, p.lhs, p.rhs),
    )
    const typeRows: FundamentalRow[] = [
      {
        label: 'Chomsky class',
        value: 'Type 0 — Unrestricted',
        detail: 'No simple shape restriction — maximum generative power in the hierarchy.',
      },
      {
        label: 'Inferred minimum class',
        value: classifyGrammar(grammar).replace('_', ' '),
        detail: 'Best fit among Types 0–3 based only on how productions look.',
      },
      {
        label: 'Strictly contracting rules',
        value: String(contracting.length),
        detail: 'Rules that shorten the sentential form (other than allowed S → ε) prevent classifying as Type 1.',
      },
      {
        label: 'Multi-symbol LHS',
        value: String(countMultiSymbolLhs(grammar)),
      },
      {
        label: 'Membership in the lab',
        value: 'Semi-decision only',
        detail: 'Finding a derivation for a string is possible when one exists within the search bound; the app cannot prove non-membership in general.',
        highlight: true,
      },
    ]
    sections.push({
      title: 'Type 0 — what this means',
      rows: typeRows,
      notes: [
        'Use Derivations with explicit limits, or compile to a recognizer shell in Machine Studio for experiments.',
        `Available recognizer targets: ${recognizers}.`,
      ],
    })
  }

  if (!valid) {
    const last = sections[sections.length - 1]
    last.notes = [...last.notes, ...classification.violations]
  }

  return sections
}

/** Structural checks for Type 0/1 when CFG diagnostics are not run. */
export function generalGrammarProblemMessages(
  format: Exclude<GrammarFormat, 'REGEX'>,
  grammar: GeneralGrammar,
): string[] {
  const validation = validateGrammarFormat(grammar, format)
  const messages = [...validation.violations]
  if (format === 'TYPE_1') {
    for (const [index, production] of grammar.productions.entries()) {
      if (!productionIsNonContracting(grammar, production.lhs, production.rhs)) {
        messages.push(`Rule ${index + 1} is contracting (right-hand side shorter than left-hand side).`)
      }
    }
  }
  return [...new Set(messages)]
}
