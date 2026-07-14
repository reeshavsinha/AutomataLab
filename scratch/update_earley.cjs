const fs = require('fs');

const code = `import { CFG, Production } from '../grammar/types';
import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle } from './model';

export interface EarleyItem {
  lhs: string;
  rhs: string[];
  dot: number;
  origin: number;
}

export class EarleySimulation implements ParserEngine {
  public metadata: ParserMetadata = {
    parserType: "Earley Chart Parser",
    deterministic: false,
    requiresCNF: false,
    supportsAmbiguity: true,
    complexity: "O(n³) / O(n²)",
    educationalDescription: "A dynamic programming chart parser utilizing Predict, Scan, and Complete operations."
  };
  public presentation: ParserPresentation = {
    treeMode: TreeMode.FINAL,
    timelineStyle: TimelineStyle.EARLEY,
    ambiguityMode: AmbiguityMode.MULTIPLE,
    stackVisible: false,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  };

  public cfg: CFG;
  public input: string[] = [];
  public stateSets: EarleyItem[][] = [];
  public status: ParserStatus = 'idle';
  public errorMsg: string | null = null;
  
  public currentSetIndex = 0;
  public currentItemIndex = 0;
  
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
  }

  public initialize(inputTokens: string[]) {
    this.input = inputTokens;
    this.status = 'running';
    this.errorMsg = null;
    this.validTrees = [];
    this.tree = null;
    this.isAmbiguous = false;
    this.currentParseIndex = 0;
    this.totalParses = 0;
    
    const startSymbol = this.cfg.startSymbol;
    this.stateSets = Array.from({ length: this.input.length + 1 }, () => []);
    
    if (startSymbol) {
      this.stateSets[0].push({
        lhs: "S'",
        rhs: [startSymbol],
        dot: 0,
        origin: 0
      });
    }

    this.currentSetIndex = 0;
    this.currentItemIndex = 0;
  }
  
  private addItem(setIndex: number, item: EarleyItem): boolean {
    const set = this.stateSets[setIndex];
    const exists = set.some(existing => 
      existing.lhs === item.lhs &&
      existing.dot === item.dot &&
      existing.origin === item.origin &&
      existing.rhs.join(' ') === item.rhs.join(' ')
    );
    
    if (!exists) {
      set.push(item);
      return true;
    }
    return false;
  }

  public step(): boolean {
    if (this.status !== 'running') return false;
    
    if (this.currentSetIndex > this.input.length) {
      this.checkAcceptance();
      return true;
    }

    const currentSet = this.stateSets[this.currentSetIndex];
    
    if (this.currentItemIndex >= currentSet.length) {
      this.currentSetIndex++;
      this.currentItemIndex = 0;
      
      if (this.currentSetIndex > this.input.length) {
        this.checkAcceptance();
      }
      return true;
    }

    const item = currentSet[this.currentItemIndex];
    this.currentItemIndex++;

    const isCompleted = item.dot >= item.rhs.length || item.rhs[0] === 'ε' || item.rhs[0] === 'I';
    
    if (!isCompleted) {
      const nextSymbol = item.rhs[item.dot];
      
      if (this.cfg.nonterminals.has(nextSymbol)) {
        this.predict(nextSymbol, this.currentSetIndex);
      } else {
        this.scan(item, this.currentSetIndex);
      }
    } else {
      this.complete(item, this.currentSetIndex);
    }
    
    return true;
  }

  private predict(symbol: string, origin: number) {
    const prods = this.cfg.productions.filter(p => p.lhs === symbol);
    for (const p of prods) {
      const rhs = p.rhs.length > 0 ? p.rhs : ['ε'];
      this.addItem(origin, {
        lhs: p.lhs,
        rhs: rhs,
        dot: 0,
        origin: origin
      });
    }
  }

  private scan(item: EarleyItem, setIndex: number) {
    if (setIndex >= this.input.length) return;
    
    const nextSymbol = item.rhs[item.dot];
    const currentToken = this.input[setIndex];
    
    if (nextSymbol === currentToken) {
      this.addItem(setIndex + 1, {
        lhs: item.lhs,
        rhs: item.rhs,
        dot: item.dot + 1,
        origin: item.origin
      });
    }
  }

  private complete(item: EarleyItem, setIndex: number) {
    const originSet = this.stateSets[item.origin];
    
    for (const oldItem of originSet) {
      if (oldItem.dot < oldItem.rhs.length && oldItem.rhs[oldItem.dot] === item.lhs) {
        this.addItem(setIndex, {
          lhs: oldItem.lhs,
          rhs: oldItem.rhs,
          dot: oldItem.dot + 1,
          origin: oldItem.origin
        });
      }
    }
  }
  
  private checkAcceptance() {
    const finalSet = this.stateSets[this.input.length];
    const accepted = finalSet.some(item => 
      item.lhs === "S'" && item.dot === item.rhs.length && item.origin === 0
    );
    
    if (accepted) {
      this.status = 'accepted';
      this.extractTrees();
    } else {
      this.status = 'rejected';
      this.errorMsg = 'Parse rejected. No valid derivation found.';
    }
  }

  private extractTrees() {
    // Backwards recursive search to construct parse trees
    const finalSet = this.stateSets[this.input.length];
    const acceptItems = finalSet.filter(item => item.lhs === "S'" && item.dot === item.rhs.length && item.origin === 0);
    
    for (const acc of acceptItems) {
      const trees = this.buildTrees(acc, this.input.length);
      this.validTrees.push(...trees);
    }
    
    if (this.validTrees.length > 0) {
      this.tree = this.validTrees[0].children[0]; // Strip S' root
      this.totalParses = this.validTrees.length;
      this.isAmbiguous = this.totalParses > 1;
    }
  }

  private buildTrees(item: EarleyItem, endPos: number): SyntaxTreeNode[] {
    const results: SyntaxTreeNode[] = [];
    
    if (item.rhs[0] === 'ε' || item.rhs[0] === 'I') {
      return [{
        id: Math.random().toString(),
        symbol: item.lhs,
        children: [{ id: Math.random().toString(), symbol: 'ε', children: [], isMatched: true }]
      }];
    }
    
    // Find paths of children that match item.rhs and span from item.origin to endPos
    const paths = this.findChildrenPaths(item.rhs, item.rhs.length, item.origin, endPos);
    
    for (const children of paths) {
      results.push({
        id: Math.random().toString(),
        symbol: item.lhs,
        children: children
      });
      if (results.length > 50) break; // Limit ambiguity explosion
    }
    
    return results;
  }

  private findChildrenPaths(rhs: string[], k: number, startPos: number, endPos: number): SyntaxTreeNode[][] {
    if (k === 0) {
      if (startPos === endPos) return [[]];
      return [];
    }
    
    const paths: SyntaxTreeNode[][] = [];
    const symbol = rhs[k - 1];
    
    if (this.cfg.terminals.has(symbol)) {
      if (endPos > 0 && this.input[endPos - 1] === symbol) {
        const subPaths = this.findChildrenPaths(rhs, k - 1, startPos, endPos - 1);
        for (const sp of subPaths) {
          paths.push([...sp, { id: Math.random().toString(), symbol: symbol, children: [], isMatched: true }]);
        }
      }
    } else if (this.cfg.nonterminals.has(symbol)) {
      for (let mid = startPos; mid <= endPos; mid++) {
        const set = this.stateSets[endPos];
        const subItems = set.filter(i => i.lhs === symbol && i.dot === i.rhs.length && i.origin === mid);
        
        for (const subItem of subItems) {
          const subTrees = this.buildTrees(subItem, endPos);
          if (subTrees.length === 0) continue;
          
          const prefixPaths = this.findChildrenPaths(rhs, k - 1, startPos, mid);
          for (const prefix of prefixPaths) {
            for (const st of subTrees) {
              paths.push([...prefix, st]);
              if (paths.length > 50) return paths;
            }
          }
        }
      }
    }
    
    return paths;
  }
  
  public recomputeTree(index: number) {
    if (index >= 0 && index < this.validTrees.length) {
      this.currentParseIndex = index;
      this.tree = this.validTrees[index].children[0];
    }
  }
}
`;

fs.writeFileSync('src/engines/parser/earley.ts', code);
