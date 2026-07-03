// src/engines/grammar/analysis.ts

import { CFG, EPSILON, EOF_SYMBOL, GrammarAnalysisResult } from './types';

export function analyzeGrammar(cfg: CFG): GrammarAnalysisResult {
  const nullable = computeNullable(cfg);
  const firstSets = computeFirstSets(cfg, nullable);
  const followSets = computeFollowSets(cfg, firstSets, nullable);

  return {
    nullable,
    firstSets,
    followSets
  };
}

function computeNullable(cfg: CFG): Set<string> {
  const nullable = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const prod of cfg.productions) {
      if (!nullable.has(prod.lhs)) {
        // A production makes the LHS nullable if all RHS symbols are nullable or it's EPSILON
        let allNullable = true;
        for (const sym of prod.rhs) {
          if (sym !== EPSILON && !nullable.has(sym)) {
            allNullable = false;
            break;
          }
        }
        if (allNullable) {
          nullable.add(prod.lhs);
          changed = true;
        }
      }
    }
  }

  return nullable;
}

function computeFirstSets(cfg: CFG, nullable: Set<string>): Map<string, Set<string>> {
  const firstSets = new Map<string, Set<string>>();

  // Initialize empty sets for all nonterminals
  for (const nt of cfg.nonterminals) {
    firstSets.set(nt, new Set<string>());
  }
  // Terminals have themselves in their FIRST set
  for (const t of cfg.terminals) {
    firstSets.set(t, new Set<string>([t]));
  }
  firstSets.set(EPSILON, new Set<string>([EPSILON]));

  let changed = true;
  while (changed) {
    changed = false;

    for (const prod of cfg.productions) {
      const lhsSet = firstSets.get(prod.lhs)!;
      const initialSize = lhsSet.size;

      let i = 0;
      let allPreviousNullable = true;

      while (i < prod.rhs.length && allPreviousNullable) {
        const sym = prod.rhs[i];
        const symFirst = firstSets.get(sym);

        if (symFirst) {
          // Add everything except EPSILON (unless it's the only symbol and it IS EPSILON)
          for (const val of symFirst) {
            if (val !== EPSILON) {
              lhsSet.add(val);
            }
          }
        }

        if (sym !== EPSILON && !nullable.has(sym)) {
          allPreviousNullable = false;
        }
        i++;
      }

      // If all symbols in RHS are nullable, or RHS is empty/epsilon, add EPSILON
      if (allPreviousNullable) {
        lhsSet.add(EPSILON);
      }

      if (lhsSet.size > initialSize) {
        changed = true;
      }
    }
  }

  return firstSets;
}

function computeFollowSets(cfg: CFG, firstSets: Map<string, Set<string>>, nullable: Set<string>): Map<string, Set<string>> {
  const followSets = new Map<string, Set<string>>();

  for (const nt of cfg.nonterminals) {
    followSets.set(nt, new Set<string>());
  }

  if (cfg.startSymbol && followSets.has(cfg.startSymbol)) {
    followSets.get(cfg.startSymbol)!.add(EOF_SYMBOL);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const prod of cfg.productions) {
      for (let i = 0; i < prod.rhs.length; i++) {
        const symB = prod.rhs[i];
        
        if (cfg.nonterminals.has(symB)) {
          const followB = followSets.get(symB)!;
          const initialSize = followB.size;

          let j = i + 1;
          let allSubsequentNullable = true;

          while (j < prod.rhs.length && allSubsequentNullable) {
            const symBeta = prod.rhs[j];
            const firstBeta = firstSets.get(symBeta);

            if (firstBeta) {
              for (const val of firstBeta) {
                if (val !== EPSILON) {
                  followB.add(val);
                }
              }
            }

            if (symBeta !== EPSILON && !nullable.has(symBeta)) {
              allSubsequentNullable = false;
            }
            j++;
          }

          if (allSubsequentNullable) {
            const followA = followSets.get(prod.lhs)!;
            for (const val of followA) {
              followB.add(val);
            }
          }

          if (followB.size > initialSize) {
            changed = true;
          }
        }
      }
    }
  }

  return followSets;
}
