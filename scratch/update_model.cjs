const fs = require('fs');
let code = fs.readFileSync('src/engines/parser/model.ts', 'utf8');

const newTypes = `
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

`;

const interfaceReplacement = `export interface ParserEngine {
  metadata: ParserMetadata;
  presentation: ParserPresentation;

  status: ParserStatus;
  input: string[];
  inputIndex: number;
  stack: any[];
  tree: SyntaxTreeNode | null;
  errorMsg: string | null;
  derivationSteps: string[][]; // Note: this might be deprecated later in favor of unified derivations, but kept for compatibility during refactor.

  // Ambiguity support
  isAmbiguous?: boolean;
  currentParseIndex?: number;
  totalParses?: number;
  recomputeTree?: (parseIndex: number) => void;

  initialize(inputTokens: string[]): void;
  step(): boolean;
}`;

// insert new types before ParserEngine
code = code.replace(/export interface ParserEngine \{/, newTypes + 'export interface ParserEngine {');
// replace the entire ParserEngine block
code = code.replace(/export interface ParserEngine \{[\s\S]*?step\(\): boolean;\n\}/, interfaceReplacement);

fs.writeFileSync('src/engines/parser/model.ts', code);
