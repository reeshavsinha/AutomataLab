const fs = require('fs');

const code = `import { CFG, Production } from '../grammar/types';
import { convertToCNF } from '../grammar/cnf';
import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle } from './model';

export interface CYKBackpointer {
  production: Production;
  left?: { i: number; j: number; sym: string };
  right?: { i: number; j: number; sym: string };
}

export class CYKSimulation implements ParserEngine {
  public metadata: ParserMetadata = {
    parserType: "CYK Dynamic Programming",
    deterministic: false,
    requiresCNF: true,
    supportsAmbiguity: true,
    complexity: "O(n³)",
    educationalDescription: "A dynamic programming parser utilizing Chomsky Normal Form to build parses from the bottom up."
  };
  public presentation: ParserPresentation = {
    treeMode: TreeMode.FINAL,
    timelineStyle: TimelineStyle.CYK,
    ambiguityMode: AmbiguityMode.MULTIPLE,
    stackVisible: false,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  };

  public cfg: CFG;
  public cnfCfg: CFG;
  public input: string[] = [];
  public status: ParserStatus = 'idle';
  public errorMsg: string | null = null;
  
  public currentLength = 1;
  public currentStart = 0;
  
  public table: Map<string, CYKBackpointer[]>[][] = [];
  
  public stack: any[] = [];
  public tree: SyntaxTreeNode | null = null;
  public inputIndex: number = 0;
  public derivationSteps: any[][] = [];
  
  public isAmbiguous = false;
  public currentParseIndex = 0;
  public totalParses = 0;
  private validTrees: SyntaxTreeNode[] = [];
  
  constructor(cfg: CFG) {
    this.cfg = cfg;
    this.cnfCfg = convertToCNF(cfg);
  }

  public initialize(inputTokens: string[]) {
    this.input = inputTokens;
    this.status = 'running';
    this.errorMsg = null;
    this.currentLength = 1;
    this.currentStart = 0;
    this.isAmbiguous = false;
    this.validTrees = [];
    this.currentParseIndex = 0;
    this.totalParses = 0;
    this.tree = null;
    
    const n = this.input.length;
    if (n === 0) {
      const startNullable = this.cfg.productions.some(p => p.lhs === this.cfg.startSymbol && (p.rhs.length === 0 || p.rhs[0] === 'ε' || p.rhs[0] === 'I'));
      this.status = startNullable ? 'accepted' : 'rejected';
      if (startNullable) {
        this.tree = { id: Math.random().toString(), symbol: this.cfg.startSymbol, children: [{ id: Math.random().toString(), symbol: 'ε', children: [] }] };
      }
      return;
    }

    this.table = Array.from({ length: n }, () => Array.from({ length: n }, () => new Map<string, CYKBackpointer[]>()));
  }

  public step(): boolean {
    if (this.status !== 'running') return false;
    
    const n = this.input.length;
    
    if (this.currentLength === 1) {
      const token = this.input[this.currentStart];
      for (const p of this.cnfCfg.productions) {
        if (p.rhs.length === 1 && p.rhs[0] === token) {
          const map = this.table[this.currentStart][this.currentStart];
          if (!map.has(p.lhs)) map.set(p.lhs, []);
          map.get(p.lhs)!.push({ production: p });
        }
      }
      
      this.currentStart++;
      if (this.currentStart >= n) {
        this.currentLength = 2;
        this.currentStart = 0;
      }
      return true;
    }
    
    if (this.currentLength <= n) {
      const i = this.currentStart;
      const j = i + this.currentLength - 1;
      
      for (let k = i; k < j; k++) {
        const leftMap = this.table[i][k];
        const rightMap = this.table[k + 1][j];
        
        for (const p of this.cnfCfg.productions) {
          if (p.rhs.length === 2) {
            if (leftMap.has(p.rhs[0]) && rightMap.has(p.rhs[1])) {
              const map = this.table[i][j];
              if (!map.has(p.lhs)) map.set(p.lhs, []);
              map.get(p.lhs)!.push({
                production: p,
                left: { i, j: k, sym: p.rhs[0] },
                right: { i: k + 1, j, sym: p.rhs[1] }
              });
            }
          }
        }
      }
      
      this.currentStart++;
      if (this.currentStart > n - this.currentLength) {
        this.currentLength++;
        this.currentStart = 0;
      }
      
      if (this.currentLength > n) {
        const startMap = this.table[0][n - 1];
        if (startMap.has(this.cnfCfg.startSymbol)) {
          this.status = 'accepted';
          this.extractTrees();
        } else {
          this.status = 'rejected';
        }
      }
      return true;
    }
    
    return false;
  }
  
  private extractTrees() {
    const n = this.input.length;
    this.validTrees = this.buildTreesRecursive(0, n - 1, this.cnfCfg.startSymbol);
    
    if (this.validTrees.length > 0) {
      this.tree = this.validTrees[0];
      this.totalParses = this.validTrees.length;
      this.isAmbiguous = this.totalParses > 1;
    }
  }
  
  private buildTreesRecursive(i: number, j: number, sym: string): SyntaxTreeNode[] {
    const map = this.table[i][j];
    const backpointers = map.get(sym);
    if (!backpointers) return [];
    
    const trees: SyntaxTreeNode[] = [];
    
    for (const bp of backpointers) {
      if (i === j && !bp.left) {
        // terminal
        trees.push({
          id: Math.random().toString(),
          symbol: sym,
          children: [
            { id: Math.random().toString(), symbol: bp.production.rhs[0], children: [], isMatched: true }
          ]
        });
      } else if (bp.left && bp.right) {
        const leftTrees = this.buildTreesRecursive(bp.left.i, bp.left.j, bp.left.sym);
        const rightTrees = this.buildTreesRecursive(bp.right.i, bp.right.j, bp.right.sym);
        
        for (const lt of leftTrees) {
          for (const rt of rightTrees) {
            trees.push({
              id: Math.random().toString(),
              symbol: sym,
              children: [lt, rt]
            });
            // Cap to avoid memory explosion on heavily ambiguous grammars
            if (trees.length > 100) return trees;
          }
        }
      }
    }
    
    return trees;
  }
  
  public recomputeTree(index: number) {
    if (index >= 0 && index < this.validTrees.length) {
      this.currentParseIndex = index;
      this.tree = this.validTrees[index];
    }
  }
}
`;

fs.writeFileSync('src/engines/parser/cyk.ts', code);
