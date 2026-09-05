import { isNonterminal } from './parser'
import type {
  DerivationSearchLimits,
  DerivationSearchResult,
  DerivationStep,
  GeneralGrammar,
  GrammarSymbol,
  RewriteProvenance,
} from './types'

export const DEFAULT_DERIVATION_LIMITS: DerivationSearchLimits = {
  maxDepth: 20,
  maxFormLength: 80,
  maxNodes: 20_000,
  maxTimeMs: 1_500,
}

interface SearchNode {
  form: GrammarSymbol[]
  depth: number
  parent: SearchNode | null
  rewrite?: RewriteProvenance
}

function key(form: GrammarSymbol[]): string {
  return form.join('\u0001')
}

function matchesAt(form: GrammarSymbol[], pattern: GrammarSymbol[], position: number): boolean {
  return pattern.every((symbol, offset) => form[position + offset] === symbol)
}

function buildSteps(node: SearchNode): DerivationStep[] {
  const steps: DerivationStep[] = []
  for (let current: SearchNode | null = node; current; current = current.parent) {
    steps.push({ form: current.form, rewrite: current.rewrite })
  }
  return steps.reverse()
}

/**
 * Bounded breadth-first search for a derivation of `target`. It is deliberately
 * a semi-decision procedure: exhausted resource limits never claim
 * non-membership, and duplicate sentential forms are explored only once.
 */
export function findDerivation(
  grammar: GeneralGrammar,
  target: GrammarSymbol[],
  limits: Partial<DerivationSearchLimits> = {},
  isCancelled: () => boolean = () => false,
): DerivationSearchResult {
  const effective = { ...DEFAULT_DERIVATION_LIMITS, ...limits }
  const startedAt = Date.now()
  const root: SearchNode = { form: [grammar.startSymbol], depth: 0, parent: null }
  const queue: SearchNode[] = [root]
  const seen = new Set([key(root.form)])
  let exploredNodes = 0
  let prunedForLength = false
  let prunedForDepth = false

  while (queue.length > 0) {
    if (isCancelled()) {
      return { status: 'CANCELLED', steps: [], exploredNodes, reason: 'Search cancelled.' }
    }
    if (Date.now() - startedAt >= effective.maxTimeMs) {
      return { status: 'RESOURCE_LIMIT', steps: [], exploredNodes, reason: `Time limit (${effective.maxTimeMs} ms) reached.` }
    }
    if (exploredNodes >= effective.maxNodes) {
      return { status: 'RESOURCE_LIMIT', steps: [], exploredNodes, reason: `Node limit (${effective.maxNodes.toLocaleString()}) reached.` }
    }

    const current = queue.shift()!
    exploredNodes++
    const complete = current.form.every((symbol) => !isNonterminal(symbol))
    if (complete && key(current.form) === key(target)) {
      return { status: 'FOUND', steps: buildSteps(current), exploredNodes }
    }
    if (current.depth >= effective.maxDepth) {
      prunedForDepth = true
      continue
    }

    for (let productionIndex = 0; productionIndex < grammar.productions.length; productionIndex++) {
      const production = grammar.productions[productionIndex]
      for (let position = 0; position <= current.form.length - production.lhs.length; position++) {
        if (!matchesAt(current.form, production.lhs, position)) continue
        const nextForm = [
          ...current.form.slice(0, position),
          ...production.rhs,
          ...current.form.slice(position + production.lhs.length),
        ]
        if (nextForm.length > effective.maxFormLength) {
          prunedForLength = true
          continue
        }
        const nextKey = key(nextForm)
        if (seen.has(nextKey)) continue
        seen.add(nextKey)
        queue.push({
          form: nextForm,
          depth: current.depth + 1,
          parent: current,
          rewrite: {
            productionIndex,
            position,
            before: [...production.lhs],
            after: [...production.rhs],
          },
        })
      }
    }
  }

  if (prunedForDepth || prunedForLength) {
    const reason = prunedForDepth
      ? `Depth limit (${effective.maxDepth}) reached before a derivation was found.`
      : `Sentential-form length limit (${effective.maxFormLength}) reached.`
    return { status: 'RESOURCE_LIMIT', steps: [], exploredNodes, reason }
  }
  return {
    status: 'NOT_FOUND_WITHIN_LIMIT',
    steps: [],
    exploredNodes,
    reason: 'All reachable sentential forms within the configured limits were explored.',
  }
}
