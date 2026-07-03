// src/engines/parser/ll1.ts

import { CFG, Production, EPSILON, EOF_SYMBOL, GrammarAnalysisResult } from '../grammar/types';

export interface LL1Table {
  // Nonterminal -> Terminal -> Array of Productions
  // Array length > 1 means a conflict (not LL(1))
  table: Map<string, Map<string, Production[]>>;
  hasConflict: boolean;
  terminals: Set<string>;
  nonterminals: Set<string>;
}

export function generateLL1Table(cfg: CFG, analysis: GrammarAnalysisResult): LL1Table {
  const table = new Map<string, Map<string, Production[]>>();
  let hasConflict = false;

  const terminals = new Set(cfg.terminals);
  terminals.add(EOF_SYMBOL);
  const nonterminals = new Set(cfg.nonterminals);

  // Initialize table
  for (const nt of cfg.nonterminals) {
    const row = new Map<string, Production[]>();
    for (const t of terminals) {
      row.set(t, []);
    }
    table.set(nt, row);
  }

  // Helper to get FIRST(alpha)
  const getFirstOfSequence = (sequence: string[]): Set<string> => {
    const result = new Set<string>();
    let allNullable = true;
    
    for (const sym of sequence) {
      if (sym === EPSILON) {
        // Epsilon itself is nullable
        continue;
      }
      
      const symFirst = analysis.firstSets.get(sym);
      if (symFirst) {
        for (const val of symFirst) {
          if (val !== EPSILON) result.add(val);
        }
      } else {
        // Should not happen in a valid CFG, but fallback
        result.add(sym);
      }

      if (!analysis.nullable.has(sym)) {
        allNullable = false;
        break;
      }
    }

    if (allNullable || sequence.length === 0 || (sequence.length === 1 && sequence[0] === EPSILON)) {
      result.add(EPSILON);
    }
    
    return result;
  };

  // Populate table
  for (const prod of cfg.productions) {
    const firstAlpha = getFirstOfSequence(prod.rhs);
    
    for (const a of firstAlpha) {
      if (a !== EPSILON) {
        const cell = table.get(prod.lhs)?.get(a);
        if (cell) {
          cell.push(prod);
          if (cell.length > 1) hasConflict = true;
        }
      }
    }

    if (firstAlpha.has(EPSILON)) {
      const followA = analysis.followSets.get(prod.lhs);
      if (followA) {
        for (const b of followA) {
          const cell = table.get(prod.lhs)?.get(b);
          if (cell) {
            cell.push(prod);
            if (cell.length > 1) hasConflict = true;
          }
        }
      }
    }
  }

  return {
    table,
    hasConflict,
    terminals,
    nonterminals,
  };
}
