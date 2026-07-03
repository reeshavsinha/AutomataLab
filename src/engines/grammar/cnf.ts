import { CFG, Production, EPSILON } from './types';

// Step 1: Add new start symbol S0 -> S
function addStartSymbol(cfg: CFG): CFG {
  if (!cfg.startSymbol) return cfg;
  const newStart = 'S0';
  const newCfg: CFG = {
    startSymbol: newStart,
    nonterminals: new Set(cfg.nonterminals),
    terminals: new Set(cfg.terminals),
    productions: [...cfg.productions]
  };
  newCfg.nonterminals.add(newStart);
  newCfg.productions.unshift({ lhs: newStart, rhs: [cfg.startSymbol] });
  return newCfg;
}

// Step 2: Remove Epsilon productions
function removeEpsilonProductions(cfg: CFG): CFG {
  const nullables = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (!nullables.has(p.lhs)) {
        if (p.rhs.length === 0 || p.rhs[0] === EPSILON || p.rhs.every(s => nullables.has(s))) {
          nullables.add(p.lhs);
          changed = true;
        }
      }
    }
  }

  const newProductions: Production[] = [];
  
  for (const p of cfg.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === EPSILON) {
      if (p.lhs === cfg.startSymbol) {
        newProductions.push(p); // Keep epsilon only for start symbol if needed
      }
      continue;
    }
    
    // Generate all combinations for nullable symbols
    const nullableIndices: number[] = [];
    for (let i = 0; i < p.rhs.length; i++) {
      if (nullables.has(p.rhs[i])) nullableIndices.push(i);
    }
    
    const numCombos = 1 << nullableIndices.length;
    for (let i = 0; i < numCombos; i++) {
      const rhs: string[] = [];
      let nullIdx = 0;
      for (let j = 0; j < p.rhs.length; j++) {
        if (nullableIndices.includes(j)) {
          if ((i & (1 << nullIdx)) === 0) {
            rhs.push(p.rhs[j]);
          }
          nullIdx++;
        } else {
          rhs.push(p.rhs[j]);
        }
      }
      
      if (rhs.length > 0) {
        // avoid adding duplicates
        if (!newProductions.some(existing => existing.lhs === p.lhs && existing.rhs.join('') === rhs.join(''))) {
          newProductions.push({ lhs: p.lhs, rhs });
        }
      }
    }
  }

  return { ...cfg, productions: newProductions };
}

// Step 3: Remove Unit productions (A -> B)
function removeUnitProductions(cfg: CFG): CFG {
  const newProductions: Production[] = [];
  const unitPairs = new Set<string>(); // "A,B"
  
  for (const nt of cfg.nonterminals) {
    unitPairs.add(`${nt},${nt}`);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (p.rhs.length === 1 && cfg.nonterminals.has(p.rhs[0])) {
        const a = p.lhs;
        const b = p.rhs[0];
        
        for (const nt of cfg.nonterminals) {
          if (unitPairs.has(`${nt},${a}`) && !unitPairs.has(`${nt},${b}`)) {
            unitPairs.add(`${nt},${b}`);
            changed = true;
          }
        }
      }
    }
  }

  for (const pair of unitPairs) {
    const [a, b] = pair.split(',');
    for (const p of cfg.productions) {
      if (p.lhs === b && !(p.rhs.length === 1 && cfg.nonterminals.has(p.rhs[0]))) {
        if (!newProductions.some(existing => existing.lhs === a && existing.rhs.join('') === p.rhs.join(''))) {
          newProductions.push({ lhs: a, rhs: [...p.rhs] });
        }
      }
    }
  }

  return { ...cfg, productions: newProductions };
}

// Step 4: Convert to CNF (A -> BC or A -> a)
function enforceCNF(cfg: CFG): CFG {
  const newCfg: CFG = { ...cfg, productions: [], nonterminals: new Set(cfg.nonterminals) };
  let newVarCounter = 1;
  const termMap = new Map<string, string>(); // 'a' -> 'U_a'

  const getTermVar = (t: string) => {
    if (termMap.has(t)) return termMap.get(t)!;
    const newNt = `U_${t}`;
    termMap.set(t, newNt);
    newCfg.nonterminals.add(newNt);
    newCfg.productions.push({ lhs: newNt, rhs: [t] });
    return newNt;
  };

  for (const p of cfg.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === EPSILON && p.lhs === cfg.startSymbol) {
      newCfg.productions.push(p);
      continue;
    }

    if (p.rhs.length === 1 && cfg.terminals.has(p.rhs[0])) {
      newCfg.productions.push(p);
      continue;
    }

    // Replace terminals with variables
    let currentRhs = p.rhs.map(sym => cfg.terminals.has(sym) ? getTermVar(sym) : sym);

    while (currentRhs.length > 2) {
      const v1 = currentRhs[0];
      const v2 = currentRhs[1];
      const newNt = `V_${newVarCounter++}`;
      newCfg.nonterminals.add(newNt);
      newCfg.productions.push({ lhs: newNt, rhs: [v1, v2] });
      currentRhs = [newNt, ...currentRhs.slice(2)];
    }

    newCfg.productions.push({ lhs: p.lhs, rhs: currentRhs });
  }

  return newCfg;
}

export function convertToCNF(cfg: CFG): CFG {
  let res = addStartSymbol(cfg);
  res = removeEpsilonProductions(res);
  res = removeUnitProductions(res);
  res = enforceCNF(res);
  return res;
}
