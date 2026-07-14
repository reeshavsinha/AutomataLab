// src/engines/parser/lalr1.ts

import { CFG, EOF_SYMBOL, EPSILON, GrammarAnalysisResult } from '../grammar/types';
import { ActionEntry, LR0Table, generateLR0Table } from './lr0';
import { LR1Item, LR1ItemSet } from './lr1_types';

// Helper to compute FIRST(sequence)
// If the sequence can derive epsilon, it returns a boolean flag as well.
const getFirstSequence = (
  seq: string[],
  firstSets: Map<string, Set<string>>,
  cfg: CFG
): { firsts: Set<string>, derivesEpsilon: boolean } => {
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

  return { firsts: result, derivesEpsilon: allEpsilon };
};

export function generateLALR1Table(cfg: CFG, analysis: GrammarAnalysisResult): LR0Table {
  // 1. Build LR(0) Automaton
  const lr0 = generateLR0Table(cfg);
  const augCfg = lr0.augmentedCfg;

  // 2. Initialize LALR(1) states from LR(0) items
  // Deep copy the LR(0) items to hold our lookaheads
  const lalrStates: LR1ItemSet[] = lr0.states.map(state => ({
    id: state.id,
    items: state.items.map(item => ({
      prodIndex: item.prodIndex,
      dot: item.dot,
      lookaheads: new Set<string>()
    }))
  }));

  // Initial state receives EOF on the augmented start production
  const startItem = lalrStates[0].items.find(i => i.prodIndex === 0 && i.dot === 0);
  if (startItem) {
    startItem.lookaheads.add(EOF_SYMBOL);
  }

  // 3. Propagate Lookaheads iteratively using a worklist queue
  const queue: { stateId: number, itemIdx: number }[] = [];
  const inQueue = new Set<string>();

  const enqueue = (stateId: number, itemIdx: number) => {
    const key = `${stateId}-${itemIdx}`;
    if (!inQueue.has(key)) {
      inQueue.add(key);
      queue.push({ stateId, itemIdx });
    }
  };

  // Enqueue all items initially to trigger spontaneous lookahead generation
  for (let s = 0; s < lalrStates.length; s++) {
    for (let i = 0; i < lalrStates[s].items.length; i++) {
      enqueue(s, i);
    }
  }

  let totalPropagations = 0;
  const startTime = Date.now();

  while (queue.length > 0) {
    const { stateId, itemIdx } = queue.shift()!;
    inQueue.delete(`${stateId}-${itemIdx}`);
    totalPropagations++;

    const state = lalrStates[stateId];
    const item = state.items[itemIdx];

    const prod = augCfg.productions[item.prodIndex];
    if (item.dot >= prod.rhs.length || prod.rhs[0] === EPSILON) continue;

    const symbolAfterDot = prod.rhs[item.dot];

    // A. GOTO Propagation
    const nextStateId = lr0.gotoTable.get(stateId)?.get(symbolAfterDot) ?? lr0.actionTable.get(stateId)?.get(symbolAfterDot)?.[0]?.target;
    if (nextStateId !== undefined && nextStateId !== -1) {
      const nextState = lalrStates[nextStateId];
      const nextItemIdx = nextState.items.findIndex(i => i.prodIndex === item.prodIndex && i.dot === item.dot + 1);
      if (nextItemIdx !== -1) {
        const nextItem = nextState.items[nextItemIdx];
        let added = false;
        for (const la of item.lookaheads) {
          if (!nextItem.lookaheads.has(la)) {
            nextItem.lookaheads.add(la);
            added = true;
          }
        }
        if (added) enqueue(nextStateId, nextItemIdx);
      }
    }

    // B. CLOSURE Propagation
    if (augCfg.nonterminals.has(symbolAfterDot)) {
      const beta = prod.rhs.slice(item.dot + 1);
      const { firsts, derivesEpsilon } = getFirstSequence(beta, analysis.firstSets, augCfg);

      for (let pIndex = 0; pIndex < augCfg.productions.length; pIndex++) {
        if (augCfg.productions[pIndex].lhs === symbolAfterDot) {
          const closureItemIdx = state.items.findIndex(i => i.prodIndex === pIndex && i.dot === 0);
          if (closureItemIdx !== -1) {
            const closureItem = state.items[closureItemIdx];
            let added = false;
            
            // Spontaneous Lookaheads
            for (const f of firsts) {
              if (!closureItem.lookaheads.has(f)) {
                closureItem.lookaheads.add(f);
                added = true;
              }
            }

            // Propagated Lookaheads
            if (derivesEpsilon) {
              for (const la of item.lookaheads) {
                if (!closureItem.lookaheads.has(la)) {
                  closureItem.lookaheads.add(la);
                  added = true;
                }
              }
            }

            if (added) enqueue(stateId, closureItemIdx);
          }
        }
      }
    }
  }

  const generationTime = Date.now() - startTime;
  console.log(`[LALR1 Generation] Propagations: ${totalPropagations}, Time: ${generationTime}ms`);

  // 4. Build Action and Goto Tables based on the populated lookaheads
  const actionTable = new Map<number, Map<string, ActionEntry[]>>();
  const gotoTable = lr0.gotoTable; // GOTO table remains identical to LR(0)
  let hasConflict = false;

  for (const state of lalrStates) {
    actionTable.set(state.id, new Map());
    for (const t of lr0.terminals) actionTable.get(state.id)!.set(t, []);
  }

  // Shifts are identical to LR(0)
  for (const [stateId, actionMap] of lr0.actionTable.entries()) {
    for (const [terminal, actions] of actionMap.entries()) {
      const shiftActions = actions.filter(a => a.type === 'Shift');
      for (const sa of shiftActions) {
        actionTable.get(stateId)!.get(terminal)!.push(sa);
      }
    }
  }

  // Reduces and Accepts are determined by the new LALR(1) lookaheads
  for (const state of lalrStates) {
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
          // Reduce only on the propagated lookaheads
          for (const la of item.lookaheads) {
            actionTable.get(state.id)!.get(la)!.push({ type: 'Reduce', target: item.prodIndex });
          }
        }
      }
    }
  }

  // Check for conflicts
  for (const state of lalrStates) {
    for (const t of lr0.terminals) {
      const cell = actionTable.get(state.id)!.get(t)!;
      if (cell.length > 1) {
        hasConflict = true;
      }
    }
  }

  return {
    states: lalrStates as any, // Cast to match interface, we just enriched them with lookaheads
    actionTable,
    gotoTable,
    augmentedCfg: augCfg,
    hasConflict,
    terminals: lr0.terminals,
    nonterminals: lr0.nonterminals
  };
}
