// src/engines/parser/clr1.ts

import { CFG, EPSILON, EOF_SYMBOL, GrammarAnalysisResult } from '../grammar/types';
import { ActionEntry, LR0Table } from './lr0';
import { LR1Item, LR1ItemSet } from './lr1_types';

// Helper to check if two cores are equal
const coresEqual = (a: LR1Item, b: LR1Item) => a.prodIndex === b.prodIndex && a.dot === b.dot;

// Helper to merge an item into a set. Returns true if the set changed (new lookaheads added or new item added)
const mergeItemIntoSet = (set: LR1Item[], item: LR1Item): boolean => {
  let changed = false;
  for (const existing of set) {
    if (coresEqual(existing, item)) {
      for (const la of item.lookaheads) {
        if (!existing.lookaheads.has(la)) {
          existing.lookaheads.add(la);
          changed = true;
        }
      }
      return changed;
    }
  }
  // If not found, add it
  set.push({ prodIndex: item.prodIndex, dot: item.dot, lookaheads: new Set(item.lookaheads) });
  return true;
};

// Helper to compute FIRST(sequence + lookahead)
const getFirstSequence = (
  seq: string[],
  lookahead: string,
  firstSets: Map<string, Set<string>>,
  cfg: CFG
): Set<string> => {
  const result = new Set<string>();
  let allEpsilon = true;

  for (const sym of seq) {
    if (cfg.terminals.has(sym)) {
      result.add(sym);
      allEpsilon = false;
      break;
    } else if (cfg.nonterminals.has(sym)) {
      const fSet = firstSets.get(sym);
      if (fSet) {
        for (const t of fSet) {
          if (t !== EPSILON) result.add(t);
        }
        if (!fSet.has(EPSILON)) {
          allEpsilon = false;
          break;
        }
      }
    }
  }

  if (allEpsilon) {
    result.add(lookahead);
  }

  return result;
};

export function buildCLR1States(cfg: CFG, analysis: GrammarAnalysisResult) {
  // 1. Augment Grammar: S' -> S
  const startPrime = cfg.startSymbol + "'";
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
  nonterminals.delete(startPrime);

  // 2. Closure Function for LR(1)
  const closure = (items: LR1Item[]): LR1Item[] => {
    const result: LR1Item[] = items.map(i => ({ prodIndex: i.prodIndex, dot: i.dot, lookaheads: new Set(i.lookaheads) }));
    let changed = true;

    while (changed) {
      changed = false;
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const prod = augCfg.productions[item.prodIndex];
        
        if (item.dot >= prod.rhs.length || prod.rhs[0] === EPSILON) continue;
        
        const symbolAfterDot = prod.rhs[item.dot];
        if (augCfg.nonterminals.has(symbolAfterDot)) {
          const beta = prod.rhs.slice(item.dot + 1);
          
          for (let pIndex = 0; pIndex < augCfg.productions.length; pIndex++) {
            if (augCfg.productions[pIndex].lhs === symbolAfterDot) {
              for (const la of item.lookaheads) {
                const firstBetaA = getFirstSequence(beta, la, analysis.firstSets, augCfg);
                const newItem: LR1Item = { prodIndex: pIndex, dot: 0, lookaheads: firstBetaA };
                if (mergeItemIntoSet(result, newItem)) {
                  changed = true;
                }
              }
            }
          }
        }
      }
    }
    return result;
  };

  // 3. Goto Function for LR(1)
  const goto = (items: LR1Item[], symbol: string): LR1Item[] => {
    const nextItems: LR1Item[] = [];
    for (const item of items) {
      const prod = augCfg.productions[item.prodIndex];
      if (item.dot < prod.rhs.length && prod.rhs[item.dot] === symbol && prod.rhs[0] !== EPSILON) {
        mergeItemIntoSet(nextItems, { prodIndex: item.prodIndex, dot: item.dot + 1, lookaheads: new Set(item.lookaheads) });
      }
    }
    return closure(nextItems);
  };

  const setsEqual = (s1: LR1Item[], s2: LR1Item[]) => {
    if (s1.length !== s2.length) return false;
    for (const i1 of s1) {
      const match = s2.find(i2 => coresEqual(i1, i2));
      if (!match) return false;
      if (i1.lookaheads.size !== match.lookaheads.size) return false;
      for (const la of i1.lookaheads) {
        if (!match.lookaheads.has(la)) return false;
      }
    }
    return true;
  };

  // 4. Build Canonical Collection of LR(1) Item Sets
  const initialItem: LR1Item = { prodIndex: 0, dot: 0, lookaheads: new Set([EOF_SYMBOL]) };
  const states: LR1ItemSet[] = [
    { id: 0, items: closure([initialItem]) }
  ];

  const transitions: Array<{ from: number, symbol: string, to: number }> = [];
  const allSymbols = [...Array.from(augCfg.terminals), ...Array.from(augCfg.nonterminals)];

  let queue = 0;
  while (queue < states.length) {
    const currentState = states[queue];

    for (const sym of allSymbols) {
      const nextSet = goto(currentState.items, sym);
      if (nextSet.length > 0) {
        let existingId = -1;
        for (const s of states) {
          if (setsEqual(s.items, nextSet)) {
            existingId = s.id;
            break;
          }
        }

        if (existingId === -1) {
          existingId = states.length;
          states.push({ id: existingId, items: nextSet });
        }

        transitions.push({ from: currentState.id, symbol: sym, to: existingId });
      }
    }
    queue++;
  }

  return { states, transitions, augCfg, terminals, nonterminals };
}

export function generateCLR1Table(cfg: CFG, analysis: GrammarAnalysisResult): LR0Table {
  const { states, transitions, augCfg, terminals, nonterminals } = buildCLR1States(cfg, analysis);

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

  // Populate Reduce and Accept Actions using CLR(1) Logic
  for (const state of states) {
    for (const item of state.items) {
      const prod = augCfg.productions[item.prodIndex];
      const isAtEnd = item.dot === prod.rhs.length || prod.rhs[0] === EPSILON;

      if (isAtEnd) {
        if (item.prodIndex === 0) {
          // S' -> S . (Accept)
          if (item.lookaheads.has(EOF_SYMBOL)) {
            actionTable.get(state.id)!.get(EOF_SYMBOL)!.push({ type: 'Accept' });
          }
        } else {
          // CLR(1): Only reduce for exactly the lookaheads in the item
          for (const la of item.lookaheads) {
            actionTable.get(state.id)!.get(la)!.push({ type: 'Reduce', target: item.prodIndex });
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
    states: states as any, // Cast because we return LR0Table which expects LR0ItemSet (we just add lookaheads)
    actionTable,
    gotoTable,
    augmentedCfg: augCfg,
    hasConflict,
    terminals,
    nonterminals
  };
}
