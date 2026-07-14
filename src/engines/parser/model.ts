import { CFG } from '../grammar/types';
import { GrammarAnalysisResult } from '../grammar/types';
import { LL1Table } from './ll1';
import { LR0Table } from './lr0';

export interface ParserModel {
  cfg: CFG;
  analysis: GrammarAnalysisResult | null;
  error?: string;
  
  parsers: {
    ll1: { table: LL1Table | null; hasConflict: boolean };
    lr0: { table: LR0Table | null; hasConflict: boolean };
    slr: { table: LR0Table | null; hasConflict: boolean };
    clr: { table: LR0Table | null; hasConflict: boolean };
    lalr: { table: LR0Table | null; hasConflict: boolean };
  }
}

export type ParserStatus = 'idle' | 'running' | 'accepted' | 'rejected' | 'error';


export enum TreeMode {
  NONE = 'NONE',
  INCREMENTAL = 'INCREMENTAL',
  FINAL = 'FINAL'
}

export enum AmbiguityMode {
  NONE = 'NONE',
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE'
}

export enum TimelineStyle {
  NONE = 'NONE',
  LL = 'LL',
  LR = 'LR',
  RD = 'RD',
  CYK = 'CYK',
  EARLEY = 'EARLEY'
}

export interface ParserMetadata {
  parserType: string;
  deterministic: boolean;
  requiresCNF: boolean;
  supportsAmbiguity: boolean;
  complexity: string;
  educationalDescription: string;
}

export interface ParserPresentation {
  treeMode: TreeMode;
  timelineStyle: TimelineStyle;
  ambiguityMode: AmbiguityMode;
  stackVisible: boolean;
  automatonVisible: boolean;
  closureVisible: boolean;
  gotoVisible: boolean;
  derivationVisible: boolean;
}

export interface ParserHistoryEntry {
  step: number;
  actionTitle: string;
  explanation: string[];
  snapshot: ParserEngine; // The full cloned engine instance
}

export interface ParserEngine {
  metadata: ParserMetadata;
  presentation: ParserPresentation;

  status: ParserStatus;
  input: string[];
  inputIndex: number;
  stack: any[];
  tree: SyntaxTreeNode | null;
  errorMsg: string | null;
  derivationSteps: string[][]; // Note: this might be deprecated later in favor of unified derivations, but kept for compatibility during refactor.
  history: ParserHistoryEntry[];

  // Ambiguity support
  isAmbiguous?: boolean;
  currentParseIndex?: number;
  totalParses?: number;
  recomputeTree?: (parseIndex: number) => void;

  initialize(inputTokens: string[]): void;
  step(): boolean;
}

export interface SyntaxTreeNode {
  id: string;
  symbol: string;
  children: SyntaxTreeNode[];
  isMatched?: boolean;
}
export interface ParserBuildResult {
  model?: ParserModel;
  diagnostics?: string;
}

export function cloneSyntaxTree(node: SyntaxTreeNode | null): SyntaxTreeNode | null {
  if (!node) return null;
  return {
    ...node,
    children: node.children.map(cloneSyntaxTree) as SyntaxTreeNode[]
  };
}

