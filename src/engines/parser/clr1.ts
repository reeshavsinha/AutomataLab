// src/engines/parser/clr1.ts

import { CFG, EPSILON, EOF_SYMBOL, GrammarAnalysisResult } from '../grammar/types';
import { ActionEntry, LR0Table } from './lr0';
import { LR1Item, LR1ItemSet } from './lr1_types';
import { assertLRCollectionBudget, assertParserGrammarBudget } from './limits';

// Helper to generate a deterministic string signature for a set of lookaheads
const getLookaheadSignature = (lookaheads: Set<string>): string => {
  return Array.from(lookaheads).sort().join(',');
};

// Helper to generate a deterministic string signature for an item
const getItemSignature = (item: LR1Item): string => {
  return `${item.prodIndex}:${item.dot}:${getLookaheadSignature(item.lookaheads)}`;
};

// Helper to generate a deterministic string signature for an entire state
const getStateSignature = (items: LR1Item[]): string => {
  // Sort items primarily by prodIndex, then by dot
  const sortedItems = [...items].sort((a, b) => {
    if (a.prodIndex !== b.prodIndex) return a.prodIndex - b.prodIndex;
    return a.dot - b.dot;
  });
  return sortedItems.map(getItemSignature).join('|');
};

// Helper to compute FIRST(sequence + lookahead). Returns whether allEpsilon is true, and the result set.
const getFirstSequence = (
  seq: string[],
  firstSets: Map<string, Set<string>>,
  cfg: CFG
): { firstSeq: Set<string>, nullable: boolean } => {
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

  return { firstSeq: result, nullable: allEpsilon };
};

export function buildCLR1States(cfg: CFG, analysis: GrammarAnalysisResult) {
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
  nonterminals.delete(startPrime);

  // Precompute FIRST(beta) for closure to avoid redundant work
  const firstBetaCache = new Map<string, { firstSeq: Set<string>, nullable: boolean }>();
  const getFirstBeta = (beta: string[]) => {
    const key = beta.join(',');
    if (firstBetaCache.has(key)) return firstBetaCache.get(key)!;
    const res = getFirstSequence(beta, analysis.firstSets, augCfg);
    firstBetaCache.set(key, res);
    return res;
  };

  // 2. Closure Function for LR(1)
  const closure = (items: LR1Item[]): LR1Item[] => {
    const itemMap = new Map<string, Set<string>>(); // core -> lookaheads
    const queue: { prodIndex: number, dot: number, lookaheads: string[] }[] = [];

    // Initialize
    for (const i of items) {
      const coreKey = `${i.prodIndex}-${i.dot}`;
      if (!itemMap.has(coreKey)) {
        itemMap.set(coreKey, new Set(i.lookaheads));
        queue.push({ prodIndex: i.prodIndex, dot: i.dot, lookaheads: Array.from(i.lookaheads) });
      } else {
        const existingLa = itemMap.get(coreKey)!;
        const newLas: string[] = [];
        for (const la of i.lookaheads) {
          if (!existingLa.has(la)) {
            existingLa.add(la);
            newLas.push(la);
          }
        }
        if (newLas.length > 0) {
          queue.push({ prodIndex: i.prodIndex, dot: i.dot, lookaheads: newLas });
        }
      }
    }

    while (queue.length > 0) {
      const item = queue.shift()!;
      const prod = augCfg.productions[item.prodIndex];
      
      if (item.dot >= prod.rhs.length || prod.rhs[0] === EPSILON) continue;
      
      const symbolAfterDot = prod.rhs[item.dot];
      if (augCfg.nonterminals.has(symbolAfterDot)) {
        const beta = prod.rhs.slice(item.dot + 1);
        const { firstSeq, nullable } = getFirstBeta(beta);
        
        for (let pIndex = 0; pIndex < augCfg.productions.length; pIndex++) {
          if (augCfg.productions[pIndex].lhs === symbolAfterDot) {
            const coreKey = `${pIndex}-0`;
            let existingLa = itemMap.get(coreKey);
            let isNewCore = false;
            
            if (!existingLa) {
              existingLa = new Set<string>();
              itemMap.set(coreKey, existingLa);
              isNewCore = true;
            }

            const addedLas: string[] = [];
            
            // Add FIRST(beta)
            for (const t of firstSeq) {
              if (!existingLa.has(t)) {
                existingLa.add(t);
                addedLas.push(t);
              }
            }
            
            // If beta is nullable, add the lookaheads of the current item
            if (nullable) {
              for (const la of item.lookaheads) {
                if (!existingLa.has(la)) {
                  existingLa.add(la);
                  addedLas.push(la);
                }
              }
            }

            if (addedLas.length > 0) {
              queue.push({ prodIndex: pIndex, dot: 0, lookaheads: addedLas });
            }
          }
        }
      }
    }

    const result: LR1Item[] = [];
    for (const [coreKey, lookaheads] of itemMap.entries()) {
      const [pIdx, dIdx] = coreKey.split('-').map(Number);
      result.push({ prodIndex: pIdx, dot: dIdx, lookaheads });
    }
    return result;
  };

  // 3. Goto Function for LR(1)
  const goto = (items: LR1Item[], symbol: string): LR1Item[] => {
    const nextItems: LR1Item[] = [];
    for (const item of items) {
      const prod = augCfg.productions[item.prodIndex];
      if (item.dot < prod.rhs.length && prod.rhs[item.dot] === symbol && prod.rhs[0] !== EPSILON) {
        nextItems.push({ prodIndex: item.prodIndex, dot: item.dot + 1, lookaheads: new Set(item.lookaheads) });
      }
    }
    return closure(nextItems);
  };

  // 4. Build Canonical Collection of LR(1) Item Sets
  let totalClosures = 0;
  const startTime = Date.now();

  const initialItem: LR1Item = { prodIndex: 0, dot: 0, lookaheads: new Set([EOF_SYMBOL]) };
  const initialStateItems = closure([initialItem]);
  totalClosures++;

  const states: LR1ItemSet[] = [
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
  console.log(`[CLR1 Generation] States: ${states.length}, Closures: ${totalClosures}, Time: ${generationTime}ms`);

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
