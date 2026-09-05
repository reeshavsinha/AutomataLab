// src/engines/grammar/types.ts

import type { GrammarFormat } from '@/engines/machine/core/types';

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

/** A production whose left side can contain multiple symbols (Type 0/1). */
export interface GeneralProduction {
  lhs: GrammarSymbol[];
  rhs: GrammarSymbol[];
}

/**
 * Grammar Lab's format-neutral representation. CFG parser algorithms continue
 * to use `CFG`; this representation is intentionally separate so their
 * single-nonterminal invariants remain intact.
 */
export interface GeneralGrammar {
  format: Exclude<GrammarFormat, 'REGEX'>;
  nonterminals: Set<string>;
  terminals: Set<string>;
  productions: GeneralProduction[];
  startSymbol: string;
}

export type GrammarClassification = 'TYPE_0' | 'TYPE_1' | 'TYPE_2' | 'TYPE_3';

export interface GrammarClassificationResult {
  selectedFormat: GrammarFormat;
  inferredType: GrammarClassification;
  isValidForSelectedFormat: boolean;
  violations: string[];
}

export interface RewriteProvenance {
  productionIndex: number;
  position: number;
  before: GrammarSymbol[];
  after: GrammarSymbol[];
}

export type DerivationSearchStatus = 'FOUND' | 'NOT_FOUND_WITHIN_LIMIT' | 'RESOURCE_LIMIT' | 'CANCELLED';

export interface DerivationStep {
  form: GrammarSymbol[];
  rewrite?: RewriteProvenance;
}

export interface DerivationSearchLimits {
  maxDepth: number;
  maxFormLength: number;
  maxNodes: number;
  maxTimeMs: number;
}

export interface DerivationSearchResult {
  status: DerivationSearchStatus;
  steps: DerivationStep[];
  exploredNodes: number;
  reason?: string;
}

export interface GrammarAnalysisResult {
  nullable: Set<string>;
  firstSets: Map<string, Set<string>>;
  followSets: Map<string, Set<string>>;
  isLL1?: boolean; // Can be computed later
}
