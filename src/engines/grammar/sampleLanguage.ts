import { isNonterminal } from './parser'
import type { GeneralGrammar } from './types'
import { EPSILON } from './types'

function matchesAt(form: string[], pattern: string[], position: number): boolean {
  return pattern.every((symbol, offset) => form[position + offset] === symbol)
}

/**
 * Bounded leftmost-style sampling for general grammars (Types 0–3).
 * Explores sentential forms until terminals-only strings up to maxLength are found.
 */
export function sampleStringsFromGeneralGrammar(
  grammar: GeneralGrammar,
  options: { maxLength: number; maxSteps: number; maxSamples: number },
): string[] {
  const generated = new Set<string>()
  const queue: { form: string[]; steps: number }[] = [{ form: [grammar.startSymbol], steps: 0 }]
  let qIndex = 0
  let iterations = 0

  while (qIndex < queue.length && iterations < options.maxSteps && generated.size < options.maxSamples) {
    iterations++
    if (queue.length - qIndex > 50_000) break

    const current = queue[qIndex++]

    if (current.form.every((sym) => !isNonterminal(sym))) {
      const terminals = current.form.filter((s) => s !== EPSILON)
      if (terminals.length <= options.maxLength) {
        const str = terminals.join('')
        generated.add(str === '' ? EPSILON : str)
      }
      continue
    }

    // Leftmost: first nonterminal position, then try productions that match at some position
    // For general grammars, try all production applications (same as derivation BFS pruning)
    let expanded = false
    for (let productionIndex = 0; productionIndex < grammar.productions.length; productionIndex++) {
      const production = grammar.productions[productionIndex]
      for (let position = 0; position <= current.form.length - production.lhs.length; position++) {
        if (!matchesAt(current.form, production.lhs, position)) continue
        const nextForm = [
          ...current.form.slice(0, position),
          ...(production.rhs.length > 0 ? production.rhs : [EPSILON]),
          ...current.form.slice(position + production.lhs.length),
        ]
        const terminalCount = nextForm.filter((sym) => !isNonterminal(sym) && sym !== EPSILON).length
        if (terminalCount <= options.maxLength && current.steps < 100) {
          queue.push({ form: nextForm, steps: current.steps + 1 })
          expanded = true
        }
      }
    }
    if (!expanded && current.steps === 0) break
  }

  return Array.from(generated).sort((a, b) => a.length - b.length || a.localeCompare(b))
}
