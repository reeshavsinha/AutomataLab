import { CFG, Production } from '../grammar/types';
import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle, ParserHistoryEntry, cloneSyntaxTree } from './model';

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
  public history: ParserHistoryEntry[] = [];
  
  private extractOperations = 0;
  private maxExtractOperations = 50000;
  
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
        lhs: "START",
        rhs: [startSymbol],
        dot: 0,
        origin: 0
      });
    }

    this.currentSetIndex = 0;
    this.currentItemIndex = 0;
    this.history = [];
    this.history.push({
      step: 0,
      actionTitle: 'Initial State',
      explanation: ['Initialized Earley state set 0 with start item.'],
      snapshot: this.takeSnapshot()
    });
  }

  private takeSnapshot(): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.stack = [...this.stack];
    clone.tree = cloneSyntaxTree(this.tree);
    clone.derivationSteps = this.derivationSteps.map(s => [...s]);
    clone.stateSets = this.stateSets.map(set => set.map(item => ({ ...item })));
    return clone;
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

    const isCompleted = item.dot >= item.rhs.length || item.rhs[0] === 'ε';
    
    const formattedItem = `${item.lhs} → ${item.rhs.slice(0, item.dot).join(' ')} • ${item.rhs.slice(item.dot).join(' ')} (Origin: ${item.origin})`;
    let actionStr = '';
    let expl: string[] = [];

    if (!isCompleted) {
      const nextSymbol = item.rhs[item.dot];
      
      if (this.cfg.nonterminals.has(nextSymbol)) {
        actionStr = `Predict: ${nextSymbol}`;
        expl = [
          `Processing item: ${formattedItem}`,
          `Next symbol '${nextSymbol}' is a non-terminal.`,
          `Predicted productions for '${nextSymbol}' and added them to State Set ${this.currentSetIndex}.`
        ];
        this.predict(nextSymbol, this.currentSetIndex);
        
        // Nullability Fix: if nextSymbol was already completed in this set (originating here)
        const completed = currentSet.filter(i => 
          i.lhs === nextSymbol && 
          i.origin === this.currentSetIndex && 
          (i.dot >= i.rhs.length || i.rhs[0] === 'ε')
        );
        for (const c of completed) {
          this.addItem(this.currentSetIndex, {
            lhs: item.lhs,
            rhs: item.rhs,
            dot: item.dot + 1,
            origin: item.origin
          });
        }
      } else {
        actionStr = `Scan: ${nextSymbol}`;
        expl = [
          `Processing item: ${formattedItem}`,
          `Next symbol '${nextSymbol}' is a terminal.`,
          `If it matches the input token, it will be added to State Set ${this.currentSetIndex + 1}.`
        ];
        this.scan(item, this.currentSetIndex);
      }
    } else {
      actionStr = `Complete: ${item.lhs}`;
      expl = [
        `Processing item: ${formattedItem}`,
        `Item is complete.`,
        `Advanced the dot for all items in State Set ${item.origin} that were waiting for '${item.lhs}'.`,
        `Added them to State Set ${this.currentSetIndex}.`
      ];
      this.complete(item, this.currentSetIndex);
    }
    
    this.history.push({
      step: this.history.length,
      actionTitle: actionStr,
      explanation: expl,
      snapshot: this.takeSnapshot()
    });

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
    const finalItems = finalSet.filter(item => 
      item.lhs === "START" && item.dot === item.rhs.length && item.origin === 0
    );
    
    if (finalItems.length > 0) {
      this.status = 'accepted';
      this.extractTrees();
      this.history.push({
        step: this.history.length,
        actionTitle: 'Accept',
        explanation: ['Final state set contains completed start item.', 'Parsing successful.'],
        snapshot: this.takeSnapshot()
      });
    } else {
      this.status = 'rejected';
      this.history.push({
        step: this.history.length,
        actionTitle: 'Rejected',
        explanation: ['Final state set does not contain completed start item.', 'Parsing failed.'],
        snapshot: this.takeSnapshot()
      });
      this.errorMsg = 'Parse rejected. No valid derivation found.';
    }
  }

  private memoBuild: Map<string, SyntaxTreeNode[] | 'IN_PROGRESS'> = new Map();
  private memoPaths: Map<string, SyntaxTreeNode[][] | 'IN_PROGRESS'> = new Map();

  private extractTrees() {
    this.extractOperations = 0;
    this.memoBuild.clear();
    this.memoPaths.clear();
    // Backwards recursive search to construct parse trees
    const finalSet = this.stateSets[this.input.length];
    const acceptItems = finalSet.filter(item => item.lhs === "START" && item.dot === item.rhs.length && item.origin === 0);
    
    for (const acc of acceptItems) {
      const trees = this.buildTrees(acc, this.input.length);
      this.validTrees.push(...trees);
    }
    
    if (this.validTrees.length > 0) {
      this.tree = this.validTrees[0].children[0]; // Strip START root
      this.totalParses = this.validTrees.length;
      this.isAmbiguous = this.totalParses > 1;
    } else {
      this.status = 'rejected';
      this.errorMsg = 'Parse accepted, but tree extraction aborted due to extreme ambiguity/cycles.';
    }
    console.log("Extract Operations used:", this.extractOperations);
  }

  private buildTrees(item: EarleyItem, endPos: number): SyntaxTreeNode[] {
    this.extractOperations++;
    if (this.extractOperations > this.maxExtractOperations) return [];
    
    const memoKey = `${item.lhs}->${item.rhs.join(',')}:${item.origin}-${endPos}`;
    const cached = this.memoBuild.get(memoKey);
    if (cached === 'IN_PROGRESS') return [];
    if (cached) return cached;
    
    this.memoBuild.set(memoKey, 'IN_PROGRESS');
    
    let results: SyntaxTreeNode[] = [];
    
    if (item.rhs[0] === 'ε') {
      results = [{
        id: Math.random().toString(),
        symbol: item.lhs,
        children: [{ id: Math.random().toString(), symbol: 'ε', children: [], isMatched: true }]
      }];
    } else {
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
    }
    
    this.memoBuild.set(memoKey, results);
    return results;
  }

  private findChildrenPaths(rhs: string[], k: number, startPos: number, endPos: number): SyntaxTreeNode[][] {
    this.extractOperations++;
    if (this.extractOperations > this.maxExtractOperations) return [];

    if (k === 0) {
      if (startPos === endPos) return [[]];
      return [];
    }
    
    const memoKey = `${rhs.join(',')}:${k}:${startPos}-${endPos}`;
    const cached = this.memoPaths.get(memoKey);
    if (cached === 'IN_PROGRESS') return [];
    if (cached) return cached;
    
    this.memoPaths.set(memoKey, 'IN_PROGRESS');

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
        const subItems = set.filter(i => 
          i.lhs === symbol && 
          (i.dot === i.rhs.length || i.rhs[0] === 'ε') && 
          i.origin === mid
        );
        
        for (const subItem of subItems) {
          const prefixPaths = this.findChildrenPaths(rhs, k - 1, startPos, mid);
          if (prefixPaths.length === 0) continue;

          const subTrees = this.buildTrees(subItem, endPos);
          if (subTrees.length === 0) continue;
          
          for (const prefix of prefixPaths) {
            for (const st of subTrees) {
              paths.push([...prefix, st]);
              if (paths.length > 50) break;
            }
            if (paths.length > 50) break;
          }
          if (paths.length > 50) break;
        }
        if (paths.length > 50) break;
      }
    }
    
    this.memoPaths.set(memoKey, paths);
    return paths;
  }
  
  public recomputeTree(index: number) {
    if (index >= 0 && index < this.validTrees.length) {
      this.currentParseIndex = index;
      this.tree = this.validTrees[index].children[0];
    }
  }
}
