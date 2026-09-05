import type { GrammarFormat } from '@/engines/machine/core/types'
import { isNonterminal } from './parser'
import type {
  GeneralGrammar,
  GrammarClassification,
  GrammarClassificationResult,
} from './types'

function isContextFree(grammar: GeneralGrammar): boolean {
  return grammar.productions.every((production) =>
    production.lhs.length === 1 && isNonterminal(production.lhs[0]),
  )
}

function allowsStartEpsilon(grammar: GeneralGrammar, lhs: string[], rhs: string[]): boolean {
  return lhs.length === 1
    && lhs[0] === grammar.startSymbol
    && rhs.length === 0
    && !grammar.productions.some((production) => production.rhs.includes(grammar.startSymbol))
}

/** Context-sensitive grammar check: non-contracting, except an isolated S → ε. */
function isContextSensitive(grammar: GeneralGrammar): boolean {
  return grammar.productions.every((production) =>
    production.rhs.length >= production.lhs.length
      || allowsStartEpsilon(grammar, production.lhs, production.rhs),
  )
}

/**
 * A conservative regular-grammar check. It accepts a consistently left- or
 * right-linear Type 3 grammar, plus terminal-only productions. Mixing the two
 * directions is intentionally rejected because it need not remain regular.
 */
function regularDirection(grammar: GeneralGrammar): 'left' | 'right' | null {
  if (!isContextFree(grammar)) return null
  let direction: 'left' | 'right' | null = null

  for (const production of grammar.productions) {
    const { lhs, rhs } = production
    if (rhs.length === 0) {
      continue
    }
    if (rhs.length === 1 && !isNonterminal(rhs[0])) continue
    if (rhs.length !== 2) return null

    const [first, second] = rhs
    const current = !isNonterminal(first) && isNonterminal(second)
      ? 'right'
      : isNonterminal(first) && !isNonterminal(second)
        ? 'left'
        : null
    if (!current || (direction && direction !== current)) return null
    direction = current
  }
  return direction ?? 'right'
}

export function classifyGrammar(grammar: GeneralGrammar): GrammarClassification {
  if (regularDirection(grammar)) return 'TYPE_3'
  if (isContextFree(grammar)) return 'TYPE_2'
  if (isContextSensitive(grammar)) return 'TYPE_1'
  return 'TYPE_0'
}

export function validateGrammarFormat(
  grammar: GeneralGrammar,
  selectedFormat: Exclude<GrammarFormat, 'REGEX'> = grammar.format,
): GrammarClassificationResult {
  const inferredType = classifyGrammar(grammar)
  const violations: string[] = []

  if (selectedFormat === 'TYPE_3' && !regularDirection(grammar)) {
    violations.push('Type 3 grammars must be consistently left- or right-linear.')
  }
  if (selectedFormat === 'TYPE_2' && !isContextFree(grammar)) {
    violations.push('Type 2 grammars require exactly one nonterminal on every left-hand side.')
  }
  if (selectedFormat === 'TYPE_1' && !isContextSensitive(grammar)) {
    violations.push('Type 1 grammars must be non-contracting, except an isolated start rule S → ε.')
  }

  return {
    selectedFormat,
    inferredType,
    isValidForSelectedFormat: violations.length === 0,
    violations,
  }
}

export function isCfgGrammar(grammar: GeneralGrammar): boolean {
  return isContextFree(grammar)
}
