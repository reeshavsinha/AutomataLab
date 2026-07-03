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

  // 3. Propagate Lookaheads iteratively until fixed point
  let changed = true;
  while (changed) {
    changed = false;

    for (let stateId = 0; stateId < lalrStates.length; stateId++) {
      const state = lalrStates[stateId];
      const items = state.items;

      for (const item of items) {
        if (item.lookaheads.size === 0 && item.prodIndex !== 0) {
          // Optimization: if no lookaheads to propagate and not generating spontaneous ones, we could skip.
          // But wait, spontaneous lookaheads are generated regardless of the source lookahead!
          // We must process it at least once. It's fine to process.
        }

        const prod = augCfg.productions[item.prodIndex];
        if (item.dot >= prod.rhs.length || prod.rhs[0] === EPSILON) continue;

        const symbolAfterDot = prod.rhs[item.dot];

        // A. GOTO Propagation
        // If there's a transition on symbolAfterDot, lookaheads propagate to the next state's kernel item
        const nextStateId = lr0.gotoTable.get(stateId)?.get(symbolAfterDot) ?? lr0.actionTable.get(stateId)?.get(symbolAfterDot)?.[0]?.target;
        if (nextStateId !== undefined && nextStateId !== -1) {
          const nextState = lalrStates[nextStateId];
          const nextItem = nextState.items.find(i => i.prodIndex === item.prodIndex && i.dot === item.dot + 1);
          if (nextItem) {
            for (const la of item.lookaheads) {
              if (!nextItem.lookaheads.has(la)) {
                nextItem.lookaheads.add(la);
                changed = true;
              }
            }
          }
        }

        // B. CLOSURE Propagation
        // If symbolAfterDot is a NonTerminal, we compute spontaneous lookaheads and propagation links to its closure
        if (augCfg.nonterminals.has(symbolAfterDot)) {
          const beta = prod.rhs.slice(item.dot + 1);
          const { firsts, derivesEpsilon } = getFirstSequence(beta, analysis.firstSets, augCfg);

          for (let pIndex = 0; pIndex < augCfg.productions.length; pIndex++) {
            if (augCfg.productions[pIndex].lhs === symbolAfterDot) {
              const closureItem = items.find(i => i.prodIndex === pIndex && i.dot === 0);
              if (closureItem) {
                // Spontaneous Lookaheads from FIRST(beta)
                for (const f of firsts) {
                  if (!closureItem.lookaheads.has(f)) {
                    closureItem.lookaheads.add(f);
                    changed = true;
                  }
                }

                // Propagated Lookaheads if beta derives EPSILON
                if (derivesEpsilon) {
                  for (const la of item.lookaheads) {
                    if (!closureItem.lookaheads.has(la)) {
                      closureItem.lookaheads.add(la);
                      changed = true;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

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
