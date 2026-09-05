/// <reference lib="webworker" />

import { findDerivation } from './derivationSearch'
import type { DerivationSearchLimits, GeneralGrammar } from './types'

interface SearchRequest {
  grammar: Omit<GeneralGrammar, 'nonterminals' | 'terminals'> & {
    nonterminals: string[]
    terminals: string[]
  }
  target: string[]
  limits?: Partial<DerivationSearchLimits>
}

self.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { grammar: raw, target, limits } = event.data
  const grammar: GeneralGrammar = {
    ...raw,
    nonterminals: new Set(raw.nonterminals),
    terminals: new Set(raw.terminals),
  }
  self.postMessage(findDerivation(grammar, target, limits))
}
