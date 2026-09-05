// src/engines/parser/ll1Simulation.ts

import { CFG, EPSILON, EOF_SYMBOL } from '../grammar/types';
import { LL1Table } from './ll1';

import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle, ParserHistoryEntry, cloneSyntaxTree } from '../parser/model';


export class LL1Simulation implements ParserEngine {
  public metadata: ParserMetadata = {
    parserType: "LL(1) Top-Down",
    deterministic: true,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: "O(n)",
    educationalDescription: "A deterministic top-down parser building a left-most derivation using 1 symbol of lookahead."
};
  public presentation: ParserPresentation = {
    treeMode: TreeMode.INCREMENTAL,
    timelineStyle: TimelineStyle.LL,
    ambiguityMode: AmbiguityMode.NONE,
    stackVisible: true,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
};

  private cfg: CFG;
  private table: LL1Table;
  private nextId = 1;
  
  public input: string[];
  public inputIndex: number = 0;
  public stack: SyntaxTreeNode[] = [];
  public tree: SyntaxTreeNode | null = null;
  public status: ParserStatus = 'idle';
  public errorMsg: string | null = null;
  public derivationSteps: string[][] = [];
  public history: ParserHistoryEntry[] = [];

  constructor(cfg: CFG, table: LL1Table) {
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

    const eofNode: SyntaxTreeNode = { id: `node_${this.nextId++}`, symbol: EOF_SYMBOL, children: [] };
    const startNode: SyntaxTreeNode = { id: `node_${this.nextId++}`, symbol: this.cfg.startSymbol, children: [] };
    
    this.tree = startNode;
    this.stack = [eofNode, startNode];
    this.derivationSteps = [[this.cfg.startSymbol]];
    this.history = [];
    
    this.history.push({
      step: 0,
      actionTitle: 'Initial State',
      explanation: ['Initialized parser with start symbol and EOF on stack.'],
      snapshot: this.takeSnapshot()
    });
  }

  private takeSnapshot(): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.stack = this.stack.map(n => cloneSyntaxTree(n)!);
    clone.tree = cloneSyntaxTree(this.tree);
    clone.derivationSteps = this.derivationSteps.length > 0
      ? [[...this.derivationSteps[this.derivationSteps.length - 1]]]
      : [];
    return clone;
  }

  private recordDerivationStep() {
    const matched = this.input.slice(0, this.inputIndex);
    const remaining = this.stack.map(n => n.symbol).reverse().filter(s => s !== EOF_SYMBOL && s !== EPSILON);
    const form = [...matched, ...remaining];
    
    // Only record if it changed (e.g. ignoring pure match steps if they don't change the logical form, but wait, matches don't change form)
    if (this.derivationSteps.length === 0) {
      this.derivationSteps.push(form);
    } else {
      const last = this.derivationSteps[this.derivationSteps.length - 1];
      if (last.join(' ') !== form.join(' ')) {
        this.derivationSteps.push(form);
      }
    }
  }

  public step(): boolean {
    if (this.status !== 'running') return false;
    if (this.stack.length === 0) return false;

    const topNode = this.stack[this.stack.length - 1];
    const topSymbol = topNode.symbol;
    const currentToken = this.input[this.inputIndex];

    // Case 1: Stack top is EOF
    if (topSymbol === EOF_SYMBOL) {
      if (currentToken === EOF_SYMBOL) {
        topNode.isMatched = true;
        this.stack.pop();
        this.status = 'accepted';
        this.history.push({
          step: this.history.length,
          actionTitle: 'Accept',
          explanation: ['Stack top is EOF and lookahead is EOF.', 'Parsing successfully completed.'],
          snapshot: this.takeSnapshot()
        });
      } else {
        this.status = 'rejected';
        this.errorMsg = `Expected EOF, but found '${currentToken}'`;
        this.history.push({
          step: this.history.length,
          actionTitle: 'Rejected',
          explanation: ['Stack top is EOF, but lookahead is not.', `Expected EOF, found '${currentToken}'.`],
          snapshot: this.takeSnapshot()
        });
      }
      return true;
    }

    // Case 2: Stack top is a terminal
    if (this.cfg.terminals.has(topSymbol)) {
      if (topSymbol === currentToken) {
        topNode.isMatched = true;
        this.stack.pop();
        this.inputIndex++;
        this.history.push({
          step: this.history.length,
          actionTitle: `Match '${topSymbol}'`,
          explanation: [
            `Stack top terminal '${topSymbol}' matches lookahead.`,
            `Popped '${topSymbol}' from stack and advanced input pointer.`
          ],
          snapshot: this.takeSnapshot()
        });
      } else {
        this.status = 'rejected';
        this.errorMsg = `Expected terminal '${topSymbol}', but found '${currentToken}'`;
        this.history.push({
          step: this.history.length,
          actionTitle: 'Rejected',
          explanation: [
            `Stack top is terminal '${topSymbol}'.`,
            `Lookahead is '${currentToken}'.`,
            `Mismatch detected. Parsing halted.`
          ],
          snapshot: this.takeSnapshot()
        });
      }
      return true;
    }

    // Case 3: Stack top is a nonterminal
    if (this.cfg.nonterminals.has(topSymbol)) {
      const cell = this.table.table.get(topSymbol)?.get(currentToken);
      if (!cell || cell.length === 0) {
        this.status = 'rejected';
        this.errorMsg = `No production in table for M[${topSymbol}, ${currentToken}]`;
        this.history.push({
          step: this.history.length,
          actionTitle: 'Rejected',
          explanation: [
            `Stack top is non-terminal '${topSymbol}'.`,
            `Lookahead is '${currentToken}'.`,
            `LL(1) parsing table has no entry for M[${topSymbol}, '${currentToken}'].`
          ],
          snapshot: this.takeSnapshot()
        });
        return true;
      }
      if (cell.length > 1) {
        this.status = 'error';
        this.errorMsg = `LL(1) conflict detected at M[${topSymbol}, ${currentToken}]`;
        this.history.push({
          step: this.history.length,
          actionTitle: 'Conflict Error',
          explanation: [
            `Multiple entries found in M[${topSymbol}, '${currentToken}']: ${cell.map(p => `${p.lhs} -> ${p.rhs.join(' ') || 'ε'}`).join(', ')}.`,
            `Grammar is not LL(1).`
          ],
          snapshot: this.takeSnapshot()
        });
        return true;
      }

      const prod = cell[0];
      this.stack.pop(); // Pop the LHS

      const childNodes: SyntaxTreeNode[] = prod.rhs.map(sym => ({
        id: `node_${this.nextId++}`,
        symbol: sym,
        children: []
      }));

      topNode.children = childNodes;

      // Push children to stack in reverse order
      for (let i = childNodes.length - 1; i >= 0; i--) {
        const child = childNodes[i];
        if (child.symbol === EPSILON) {
          child.isMatched = true;
        } else {
          this.stack.push(child);
        }
      }

      this.recordDerivationStep();
      const rhsStr = prod.rhs.length === 1 && prod.rhs[0] === EPSILON ? 'ε' : prod.rhs.join(' ');
      this.history.push({
        step: this.history.length,
        actionTitle: `Expand ${topSymbol} → ${rhsStr}`,
        explanation: [
          `Stack top is '${topSymbol}', Lookahead is '${currentToken}'.`,
          `Consulted LL(1) table M[${topSymbol}, '${currentToken}'] = ${topSymbol} → ${rhsStr}.`,
          `Popped '${topSymbol}' from stack.`,
          `Pushed RHS symbols ${rhsStr} onto stack in reverse order.`
        ],
        snapshot: this.takeSnapshot()
      });
      return true;
    }

    // Edge case
    this.status = 'error';
    this.errorMsg = `Unknown symbol on stack: '${topSymbol}'`;
    return true;
  }
}
