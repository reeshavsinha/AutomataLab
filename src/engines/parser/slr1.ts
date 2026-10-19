// src/engines/parser/slr1.ts

import { CFG, EPSILON, EOF_SYMBOL, GrammarAnalysisResult } from '../grammar/types';
import { LR0Item, LR0ItemSet, ActionEntry, LR0Table, formatItem } from './lr0';
import { assertLRCollectionBudget, assertParserGrammarBudget } from './limits';

// Helper to check if two items are equal
const itemsEqual = (a: LR0Item, b: LR0Item) => a.prodIndex === b.prodIndex && a.dot === b.dot;

// Helper to check if item is in set
const setContains = (set: LR0Item[], item: LR0Item) => set.some(i => itemsEqual(i, item));

export function generateSLR1Table(cfg: CFG, analysis: GrammarAnalysisResult): LR0Table {
  assertParserGrammarBudget(cfg.productions.length);
  // 1. Augment Grammar: START -> S
  const startPrime = 'START';
  const augmentedProds = [
    { lhs: startPrime, rhs: [cfg.startSymbol] },
    ...cfg.productions
  ];
  
  const augCfg: CFG = {
    terminals: new Set(cfg.terminals),
    nonterminals: new Set(cfg.nonterminals),
    productions: augmentedProds,
    startSymbol: startPrime
  };
  augCfg.nonterminals.add(startPrime);

  const terminals = new Set(augCfg.terminals);
  terminals.add(EOF_SYMBOL);
  const nonterminals = new Set(augCfg.nonterminals);
  nonterminals.delete(startPrime); // Goto doesn't need S'

  // Helper to generate a deterministic string signature for an entire LR(0) state
  const getStateSignature = (items: LR0Item[]): string => {
    const sorted = [...items].sort((a, b) => {
      if (a.prodIndex !== b.prodIndex) return a.prodIndex - b.prodIndex;
      return a.dot - b.dot;
    });
    return sorted.map(i => `${i.prodIndex}-${i.dot}`).join('|');
  };

  // 2. Closure Function
  const closure = (items: LR0Item[]): LR0Item[] => {
    const coreSet = new Set<string>();
    const queue: LR0Item[] = [];
    const result: LR0Item[] = [];

    for (const item of items) {
      const key = `${item.prodIndex}-${item.dot}`;
      if (!coreSet.has(key)) {
        coreSet.add(key);
        queue.push(item);
        result.push(item);
      }
    }

    while (queue.length > 0) {
      const item = queue.shift()!;
      const prod = augCfg.productions[item.prodIndex];
      
      if (item.dot >= prod.rhs.length || prod.rhs[0] === EPSILON) continue;
      
      const symbolAfterDot = prod.rhs[item.dot];
      if (augCfg.nonterminals.has(symbolAfterDot)) {
        for (let i = 0; i < augCfg.productions.length; i++) {
          if (augCfg.productions[i].lhs === symbolAfterDot) {
            const key = `${i}-0`;
            if (!coreSet.has(key)) {
              coreSet.add(key);
              const newItem = { prodIndex: i, dot: 0 };
              queue.push(newItem);
              result.push(newItem);
            }
          }
        }
      }
    }
    return result;
  };

  // 3. Goto Function
  const goto = (items: LR0Item[], symbol: string): LR0Item[] => {
    const nextItems: LR0Item[] = [];
    for (const item of items) {
      const prod = augCfg.productions[item.prodIndex];
      if (item.dot < prod.rhs.length && prod.rhs[item.dot] === symbol && prod.rhs[0] !== EPSILON) {
        nextItems.push({ prodIndex: item.prodIndex, dot: item.dot + 1 });
      }
    }
    return closure(nextItems);
  };

  // 4. Build Canonical Collection of Item Sets
  let totalClosures = 0;
  const startTime = Date.now();

  const initialItem: LR0Item = { prodIndex: 0, dot: 0 };
  const initialStateItems = closure([initialItem]);
  totalClosures++;

  const states: LR0ItemSet[] = [
    { id: 0, items: initialStateItems }
  ];
  let totalStateItems = initialStateItems.length;
  assertLRCollectionBudget(states.length, totalStateItems);

  const stateSignatureMap = new Map<string, number>();
  stateSignatureMap.set(getStateSignature(initialStateItems), 0);

  const transitions: Array<{ from: number, symbol: string, to: number }> = [];
  const allSymbols = [...Array.from(augCfg.terminals), ...Array.from(augCfg.nonterminals)];

  let queueIdx = 0;
  while (queueIdx < states.length) {
    const currentState = states[queueIdx];

    for (const sym of allSymbols) {
      const nextSet = goto(currentState.items, sym);
      if (nextSet.length > 0) {
        totalClosures++;
        const sig = getStateSignature(nextSet);
        let existingId = stateSignatureMap.get(sig);

        if (existingId === undefined) {
          existingId = states.length;
          states.push({ id: existingId, items: nextSet });
          totalStateItems += nextSet.length;
          assertLRCollectionBudget(states.length, totalStateItems);
          stateSignatureMap.set(sig, existingId);
        }

        transitions.push({ from: currentState.id, symbol: sym, to: existingId });
      }
    }
    queueIdx++;
  }

  const generationTime = Date.now() - startTime;
  console.log(`[SLR1 Generation] States: ${states.length}, Closures: ${totalClosures}, Time: ${generationTime}ms`);

  // 5. Build Action and Goto Tables
  const actionTable = new Map<number, Map<string, ActionEntry[]>>();
  const gotoTable = new Map<number, Map<string, number>>();
  let hasConflict = false;

  for (const state of states) {
    actionTable.set(state.id, new Map());
    gotoTable.set(state.id, new Map());

    for (const t of terminals) actionTable.get(state.id)!.set(t, []);
    for (const nt of nonterminals) gotoTable.get(state.id)!.set(nt, -1);
  }

  // Populate Goto and Shift Actions
  for (const trans of transitions) {
    if (augCfg.terminals.has(trans.symbol)) {
      actionTable.get(trans.from)!.get(trans.symbol)!.push({ type: 'Shift', target: trans.to });
    } else if (augCfg.nonterminals.has(trans.symbol)) {
      gotoTable.get(trans.from)!.set(trans.symbol, trans.to);
    }
  }

  // Populate Reduce and Accept Actions using SLR(1) Logic
  for (const state of states) {
    for (const item of state.items) {
      const prod = augCfg.productions[item.prodIndex];
      const isAtEnd = item.dot === prod.rhs.length || prod.rhs[0] === EPSILON;

      if (isAtEnd) {
        if (item.prodIndex === 0) {
          // S' -> S . (Accept)
          actionTable.get(state.id)!.get(EOF_SYMBOL)!.push({ type: 'Accept' });
        } else {
          // SLR(1): Only reduce for terminals in FOLLOW(A)
          const followSet = analysis.followSets.get(prod.lhs);
          if (followSet) {
            for (const t of terminals) {
              if (followSet.has(t)) {
                actionTable.get(state.id)!.get(t)!.push({ type: 'Reduce', target: item.prodIndex });
              }
            }
          }
        }
      }
    }
  }

  // Check for conflicts
  for (const state of states) {
    for (const t of terminals) {
      const cell = actionTable.get(state.id)!.get(t)!;
      if (cell.length > 1) {
        hasConflict = true;
      }
    }
  }

  return {
    states,
    actionTable,
    gotoTable,
    augmentedCfg: augCfg,
    hasConflict,
    terminals,
    nonterminals
  };
}
