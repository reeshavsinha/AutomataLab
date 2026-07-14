// src/engines/parser/lrSimulation.ts

import { CFG, EOF_SYMBOL, EPSILON } from '../grammar/types';
import { LR0Table, ActionEntry } from './lr0';
import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle, ParserHistoryEntry, cloneSyntaxTree } from './model';

export type LRStackItem = number | SyntaxTreeNode;

export class LRSimulation implements ParserEngine {
  public metadata: ParserMetadata = {
    parserType: "LR Bottom-Up",
    deterministic: true,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: "O(n)",
    educationalDescription: "A deterministic bottom-up parser building a right-most derivation in reverse."
};
  public presentation: ParserPresentation = {
    treeMode: TreeMode.INCREMENTAL,
    timelineStyle: TimelineStyle.LR,
    ambiguityMode: AmbiguityMode.NONE,
    stackVisible: true,
    automatonVisible: true,
    closureVisible: true,
    gotoVisible: true,
    derivationVisible: true
};

  private cfg: CFG;
  private table: LR0Table;
  private nextId = 1;
  
  public input: string[];
  public inputIndex: number = 0;
  public stack: LRStackItem[] = [];
  public tree: SyntaxTreeNode | null = null;
  public status: ParserStatus = 'idle';
  public errorMsg: string | null = null;
  public derivationSteps: string[][] = [];
  public history: ParserHistoryEntry[] = [];

  constructor(cfg: CFG, table: LR0Table) {
    this.cfg = cfg;
    this.table = table;
    this.input = [];
  }

  public initialize(inputTokens: string[]) {
    this.input = [...inputTokens, EOF_SYMBOL];
    this.inputIndex = 0;
    this.status = 'running';
    this.errorMsg = null;
    this.nextId = 1;
    this.tree = null;
    
    // Stack starts with state 0
    this.stack = [0];
    this.derivationSteps = [];
    this.history = [];
    this.recordDerivationStep();
    
    this.history.push({
      step: 0,
      actionTitle: 'Initial State',
      explanation: ['Initialized parser with start state 0.'],
      snapshot: this.takeSnapshot()
    });
  }

  private takeSnapshot(): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.stack = this.stack.map(item => {
      if (typeof item === 'number') return item;
      return cloneSyntaxTree(item as SyntaxTreeNode)!;
    });
    clone.tree = cloneSyntaxTree(this.tree);
    clone.derivationSteps = this.derivationSteps.map(step => [...step]);
    return clone;
  }

  private recordDerivationStep() {
    const stackSymbols = this.stack.filter(item => typeof item === 'object').map((n: any) => n.symbol as string).filter(s => s !== EPSILON);
    const remainingInput = this.input.slice(this.inputIndex).filter(s => s !== EOF_SYMBOL);
    const form = [...stackSymbols, ...remainingInput];
    
    if (this.derivationSteps.length === 0) {
      if (form.length > 0) this.derivationSteps.push(form);
    } else {
      const last = this.derivationSteps[this.derivationSteps.length - 1];
      if (last.join(' ') !== form.join(' ')) {
        this.derivationSteps.push(form);
      }
    }
  }

  public step(): boolean {
    if (this.status !== 'running') return false;
    
    const currentState = this.stack[this.stack.length - 1] as number;
    const currentToken = this.input[this.inputIndex];

    const actionCell = this.table.actionTable.get(currentState)?.get(currentToken);
    
    if (!actionCell || actionCell.length === 0) {
      this.status = 'rejected';
      this.errorMsg = `Parse Error: No action defined for State ${currentState} on terminal '${currentToken}'`;
      this.history.push({
        step: this.history.length,
        actionTitle: 'Rejected',
        explanation: [
          `Current parser state: ${currentState}`,
          `Lookahead symbol: ${currentToken}`,
          `ACTION[${currentState}, '${currentToken}'] is empty.`,
          `Parser rejected the input string.`
        ],
        snapshot: this.takeSnapshot()
      });
      return true;
    }
    
    if (actionCell.length > 1) {
      const hasShift = actionCell.some(a => a.type === 'Shift');
      const reduceCount = actionCell.filter(a => a.type === 'Reduce').length;
      let conflictType = 'Conflict';
      if (hasShift && reduceCount > 0) {
        conflictType = 'Shift/Reduce conflict';
      } else if (reduceCount > 1) {
        conflictType = 'Reduce/Reduce conflict';
      }

      this.status = 'error';
      this.errorMsg = `Parse Error: ${conflictType} in State ${currentState} on terminal '${currentToken}'`;
      this.history.push({
        step: this.history.length,
        actionTitle: 'Conflict Error',
        explanation: [
          `Current parser state: ${currentState}`,
          `Lookahead symbol: ${currentToken}`,
          `ACTION[${currentState}, '${currentToken}'] contains multiple conflicting actions: ${actionCell.map(a => a.type === 'Shift' ? 'Shift ' + a.target : 'Reduce by P' + a.target).join(', ')}.`,
          `Parsing halted.`
        ],
        snapshot: this.takeSnapshot()
      });
      return true;
    }

    const action = actionCell[0];

    if (action.type === 'Shift') {
      const targetState = action.target!;
      if (targetState === undefined || targetState < 0 || targetState >= this.table.states.length) {
        this.status = 'error';
        this.errorMsg = `Parse Error: Invalid parser table. Shift target state ${targetState} does not exist.`;
        return true;
      }
      
      const leafNode: SyntaxTreeNode = {
        id: `node_${this.nextId++}`,
        symbol: currentToken,
        children: [],
        isMatched: true
      };
      
      this.stack.push(leafNode);
      this.stack.push(targetState);
      this.inputIndex++;

      this.history.push({
        step: this.history.length,
        actionTitle: `Shift to State ${targetState}`,
        explanation: [
          `Current parser state: ${currentState}`,
          `Lookahead symbol: ${currentToken}`,
          `ACTION[${currentState}, '${currentToken}'] = Shift to state ${targetState}`,
          `Pushed symbol '${currentToken}' and state ${targetState} onto the stack.`,
          `Advanced input pointer.`
        ],
        snapshot: this.takeSnapshot()
      });
      return true;
    }

    if (action.type === 'Reduce') {
      const prodIndex = action.target!;
      const prod = this.table.augmentedCfg.productions[prodIndex];
      if (!prod) {
        this.status = 'error';
        this.errorMsg = `Parse Error: Invalid parser table. Reduce target production ${prodIndex} does not exist.`;
        return true;
      }
      
      const rhsLength = prod.rhs.length === 1 && prod.rhs[0] === EPSILON ? 0 : prod.rhs.length;
      const elementsToPop = 2 * rhsLength;
      
      const children: SyntaxTreeNode[] = [];
      
      // Pop elements (state, symbol) pairs
      for (let i = 0; i < rhsLength; i++) {
        this.stack.pop(); // pop state
        const symbolNode = this.stack.pop() as SyntaxTreeNode; // pop symbol
        children.unshift(symbolNode); // add to front so order is preserved
      }
      
      if (rhsLength === 0) {
        // Epsilon production, add an epsilon node
        children.push({
          id: `node_${this.nextId++}`,
          symbol: EPSILON,
          children: [],
          isMatched: true
        });
      }

      const parentNode: SyntaxTreeNode = {
        id: `node_${this.nextId++}`,
        symbol: prod.lhs,
        children: children
      };

      const topState = this.stack[this.stack.length - 1] as number;
      const gotoTarget = this.table.gotoTable.get(topState)?.get(prod.lhs);

      if (gotoTarget === undefined || gotoTarget === -1) {
        this.status = 'error';
        this.errorMsg = `Parse Error: No GOTO defined for State ${topState} on nonterminal '${prod.lhs}'`;
        return true;
      }

      this.stack.push(parentNode);
      this.stack.push(gotoTarget);
      
      this.recordDerivationStep();

      const rhsStr = rhsLength === 0 ? 'ε' : prod.rhs.join(' ');
      this.history.push({
        step: this.history.length,
        actionTitle: `Reduce (${prod.lhs} → ${rhsStr})`,
        explanation: [
          `Current parser state: ${currentState}`,
          `Lookahead symbol: ${currentToken}`,
          `ACTION[${currentState}, '${currentToken}'] = Reduce by production ${prodIndex} (${prod.lhs} → ${rhsStr})`,
          `Popped ${elementsToPop} elements from the stack (length of RHS × 2).`,
          `Pushed non-terminal '${prod.lhs}'.`,
          `Consulted GOTO[${topState}, '${prod.lhs}'] = state ${gotoTarget}.`,
          `Pushed state ${gotoTarget} onto the stack.`
        ],
        snapshot: this.takeSnapshot()
      });

      return true;
    }

    if (action.type === 'Accept') {
      this.status = 'accepted';
      
      // Stack should have [0, S, AcceptState]
      // Pop AcceptState
      this.stack.pop();
      // Pop S
      this.tree = this.stack.pop() as SyntaxTreeNode;

      this.history.push({
        step: this.history.length,
        actionTitle: `Accept`,
        explanation: [
          `Current parser state: ${currentState}`,
          `Lookahead symbol: ${currentToken} (EOF)`,
          `ACTION[${currentState}, '${currentToken}'] = Accept`,
          `Input fully parsed successfully. Extracted Syntax Tree from stack.`
        ],
        snapshot: this.takeSnapshot()
      });
      
      return true;
    }

    return false;
  }
}
