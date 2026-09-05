/** Deterministic safety budgets for parser construction/simulation. */
export const MAX_LR_STATES = 1_000
export const MAX_LR_STATE_ITEMS = 100_000
export const MAX_GRAMMAR_PRODUCTIONS = 2_000

export function assertLRCollectionBudget(stateCount: number, itemCount: number): void {
  if (stateCount > MAX_LR_STATES || itemCount > MAX_LR_STATE_ITEMS) {
    throw new Error(
      `Parser automaton is too large (maximum ${MAX_LR_STATES} states and ${MAX_LR_STATE_ITEMS.toLocaleString()} items).`
    )
  }
}

export function assertParserGrammarBudget(productionCount: number): void {
  if (productionCount > MAX_GRAMMAR_PRODUCTIONS) {
    throw new Error(
      `Grammar is too large for parser generation (maximum ${MAX_GRAMMAR_PRODUCTIONS.toLocaleString()} productions).`
    )
  }
}
