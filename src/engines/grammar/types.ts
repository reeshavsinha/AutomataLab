// src/engines/grammar/types.ts

export const EPSILON = 'ε';
export const EOF_SYMBOL = '$';

export type SymbolType = 'terminal' | 'nonterminal';

export interface GrammarSymbol {
  name: string;
  type: SymbolType;
}

export interface Production {
  lhs: string; // Must be a nonterminal
  rhs: string[]; // Array of symbol names (terminal or nonterminal)
}

export interface CFG {
  nonterminals: Set<string>;
  terminals: Set<string>;
  productions: Production[];
  startSymbol: string;
}

export interface GrammarAnalysisResult {
  nullable: Set<string>;
  firstSets: Map<string, Set<string>>;
  followSets: Map<string, Set<string>>;
  isLL1?: boolean; // Can be computed later
}
