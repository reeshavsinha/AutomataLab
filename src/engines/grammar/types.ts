// src/engines/grammar/types.ts

export const EPSILON = 'ε';
export const EOF_SYMBOL = '$';

export type SymbolType = 'terminal' | 'nonterminal';
export type GrammarSymbol = string;

export interface GrammarSymbolInfo {
  name: string;
  type: SymbolType;
}

export interface Production {
  lhs: GrammarSymbol; // Must be a nonterminal
  rhs: GrammarSymbol[]; // Array of symbol names (terminal or nonterminal)
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
