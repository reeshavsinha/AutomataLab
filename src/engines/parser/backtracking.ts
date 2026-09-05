import { CFG, Production } from '../grammar/types';
import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle, ParserHistoryEntry, cloneSyntaxTree } from './model';

export class BacktrackingSimulation implements ParserEngine {
  public metadata: ParserMetadata = {
    parserType: "Recursive Descent (Backtracking)",
    deterministic: false,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: "O(kⁿ)",
    educationalDescription: "A naive top-down parser that tries all paths recursively. Not suitable for left-recursive grammars."
  };
  public presentation: ParserPresentation = {
    treeMode: TreeMode.INCREMENTAL,
    timelineStyle: TimelineStyle.RD,
    ambiguityMode: AmbiguityMode.SINGLE,
    stackVisible: true,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  };

  public cfg: CFG;
  public input: string[] = [];
  public status: ParserStatus = 'idle';
  public errorMsg: string | null = null;
  public tree: SyntaxTreeNode | null = null;
  
  public stack: any[] = [];
  public inputIndex: number = 0;
  public derivationSteps: any[][] = [];
  
  private maxDepth = 25;
  private maxOperations = 100000;
  private currentOperations = 0;
  public history: ParserHistoryEntry[] = [];
  
  private iterator: IterableIterator<any> | null = null;
  
  constructor(cfg: CFG) {
    this.cfg = cfg;
  }

  public initialize(inputTokens: string[]) {
    this.input = inputTokens;
    this.status = 'running';
    this.errorMsg = null;
    this.currentOperations = 0;
    this.stack = [];
    this.derivationSteps = [];
    this.tree = null;
    
    if (this.cfg.startSymbol) {
      this.iterator = this.parseExecution();
    }

    this.history = [];
    this.history.push({
      step: 0,
      actionTitle: 'Initial State',
      explanation: ['Initialized Backtracking Parser.'],
      snapshot: this.takeSnapshot()
    });
  }

  private takeSnapshot(): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.stack = [...this.stack];
    clone.tree = cloneSyntaxTree(this.tree);
    // Timeline entries already carry the action/explanation. Copying the entire
    // growing derivation log into every snapshot made history O(n²) and could
    // exhaust several gigabytes before the operation guard fired.
    clone.derivationSteps = this.derivationSteps.length > 0
      ? [[...this.derivationSteps[this.derivationSteps.length - 1]]]
      : [];
    return clone;
  }

  public step(): boolean {
    if (this.status !== 'running' || !this.iterator) return false;
    
    if (!this.cfg.startSymbol) {
      this.status = 'rejected';
      this.errorMsg = 'No start symbol defined.';
      return true;
    }

    const { value, done } = this.iterator.next();
    
    if (done) {
      if (value && value.index === this.input.length) {
        this.status = 'accepted';
        this.tree = value.node;
        this.derivationSteps.push([
          { type: 'timeline', action: 'accept', details: 'Input fully parsed.' }
        ]);
        this.history.push({
          step: this.history.length,
          actionTitle: 'Accept',
          explanation: ['Recursive descent matched entire input.', 'Parsing successful.'],
          snapshot: this.takeSnapshot()
        });
      } else {
        this.status = 'rejected';
        if (this.currentOperations > this.maxOperations) {
          this.errorMsg = 'Parse aborted: Combinatorial explosion detected.';
        } else {
          this.errorMsg = 'Could not parse the entire input.';
        }
        this.derivationSteps.push([
          { type: 'timeline', action: 'reject', details: 'Backtracking failed to match.' }
        ]);
        this.history.push({
          step: this.history.length,
          actionTitle: 'Rejected',
          explanation: ['Recursive descent failed to match entire input.', 'Parsing failed.'],
          snapshot: this.takeSnapshot()
        });
      }
      return true; // We finished
    }
    
    this.history.push({
      step: this.history.length,
      actionTitle: `Step`,
      explanation: [
        `Executed one backtracking step.`
      ],
      snapshot: this.takeSnapshot()
    });

    return true; // step executed successfully
  }
  
  private *parseExecution(): IterableIterator<any> {
    const rootNode: SyntaxTreeNode = { id: Math.random().toString(), symbol: this.cfg.startSymbol, children: [] };
    this.tree = rootNode;
    
    const result = yield* this.parseGen(this.cfg.startSymbol, 0, 0, rootNode);
    return result;
  }

  private *parseGen(symbol: string, index: number, depth: number, node: SyntaxTreeNode): IterableIterator<any> {
    if (depth > this.maxDepth) return null;
    
    this.currentOperations++;
    if (this.currentOperations > this.maxOperations) return null;
    
    // Terminal Match
    if (this.cfg.terminals.has(symbol)) {
      this.stack.push(`Match Terminal: ${symbol}`);
      this.inputIndex = index;
      
      this.derivationSteps.push([
        { type: 'timeline', action: 'match', details: `Attempting to match '${symbol}' at index ${index}` }
      ]);
      yield true; // Pause for visualization
      
      this.stack.pop();
      if (index < this.input.length && this.input[index] === symbol) {
        node.isMatched = true;
        return { index: index + 1, node };
      }
      return null;
    }
    
    // Epsilon Match
    if (symbol === 'ε' || symbol === 'I') { // handling both due to encoding potential
      node.isMatched = true;
      this.derivationSteps.push([
        { type: 'timeline', action: 'match', details: `Matched ε` }
      ]);
      yield true;
      return { index, node };
    }
    
    // Non-Terminal Expansion
    if (this.cfg.nonterminals.has(symbol)) {
      const prods = this.cfg.productions.filter(p => p.lhs === symbol);
      
      for (let i = 0; i < prods.length; i++) {
        const p = prods[i];
        this.stack.push(`Expand: ${symbol} -> ${p.rhs.join(' ')}`);
        
        this.derivationSteps.push([
          { type: 'timeline', action: 'expand', details: `Try ${symbol} -> ${p.rhs.join(' ') || 'ε'}` }
        ]);
        
        const rhs = p.rhs.length > 0 ? p.rhs : ['ε'];
        const originalChildren = [...node.children];
        node.children = [];
        
        let currentIndex = index;
        let success = true;
        
        yield true; // Pause before matching RHS
        
        for (const sym of rhs) {
          const childNode: SyntaxTreeNode = { id: Math.random().toString(), symbol: sym, children: [] };
          node.children.push(childNode);
          
          const res = yield* this.parseGen(sym, currentIndex, depth + 1, childNode);
          if (res) {
            currentIndex = res.index;
          } else {
            success = false;
            break;
          }
        }
        
        this.stack.pop();
        
        if (success) {
          node.isMatched = true;
          return { index: currentIndex, node };
        } else {
          // Backtrack
          this.derivationSteps.push([
            { type: 'timeline', action: 'backtrack', details: `Failed ${symbol} -> ${p.rhs.join(' ')}. Backtracking...` }
          ]);
          node.children = originalChildren; // restore tree state
          yield true;
        }
      }
    }
    
    return null;
  }
}
