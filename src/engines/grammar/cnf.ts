import { CFG, Production, EPSILON } from './types';
import { generateUniqueNonterminal } from './utils';

// Step 1: Add new start symbol S0 -> S (if missing)
function addStartSymbol(cfg: CFG): CFG {
  if (!cfg.startSymbol) return cfg;
  // Always add a new start symbol to guarantee it doesn't appear on RHS
  const newStart = generateUniqueNonterminal(cfg, 'S', '0');
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

  // Find all nullable nonterminals
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
  const addedProds = new Set<string>();

  const addUnique = (p: Production) => {
    const key = `${p.lhs}->${p.rhs.join(',')}`;
    if (!addedProds.has(key)) {
      addedProds.add(key);
      newProductions.push(p);
    }
  };

  for (const p of cfg.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === EPSILON) {
      if (p.lhs === cfg.startSymbol) {
        addUnique(p); // Start symbol can derive epsilon
      }
      continue;
    }

    const nullableIndices: number[] = [];
    for (let i = 0; i < p.rhs.length; i++) {
      if (nullables.has(p.rhs[i])) nullableIndices.push(i);
    }

    const numCombos = 1 << nullableIndices.length;
    if (numCombos > 10000) {
      throw new Error("Grammar is too complex for CNF conversion (too many nullable symbols in RHS).");
    }
    for (let i = 0; i < numCombos; i++) {
      const rhs: string[] = [];
      let nullIdx = 0;
      for (let j = 0; j < p.rhs.length; j++) {
        if (nullableIndices.includes(j)) {
          // If the bit is NOT set, keep the symbol
          if ((i & (1 << nullIdx)) === 0) {
            rhs.push(p.rhs[j]);
          }
          nullIdx++;
        } else {
          rhs.push(p.rhs[j]);
        }
      }

      if (rhs.length > 0) {
        addUnique({ lhs: p.lhs, rhs });
      }
    }
  }

  return { ...cfg, productions: newProductions };
}

// Step 3: Remove Unit productions (A -> B)
function removeUnitProductions(cfg: CFG): CFG {
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
        // If A -> B, then for any X where X ->* A, we add X ->* B
        for (const nt of cfg.nonterminals) {
          if (unitPairs.has(`${nt},${a}`) && !unitPairs.has(`${nt},${b}`)) {
            unitPairs.add(`${nt},${b}`);
            changed = true;
          }
        }
      }
    }
  }

  const newProductions: Production[] = [];
  const addedProds = new Set<string>();

  const addUnique = (p: Production) => {
    const key = `${p.lhs}->${p.rhs.join(',')}`;
    if (!addedProds.has(key)) {
      addedProds.add(key);
      newProductions.push(p);
    }
  };

  for (const pair of unitPairs) {
    const [a, b] = pair.split(',');
    for (const p of cfg.productions) {
      if (p.lhs === b) {
        // Skip unit productions
        if (p.rhs.length === 1 && cfg.nonterminals.has(p.rhs[0])) continue;
        addUnique({ lhs: a, rhs: [...p.rhs] });
      }
    }
  }

  return { ...cfg, productions: newProductions };
}

// Step 4: Remove Useless Symbols
function removeUselessSymbols(cfg: CFG): CFG {
  // 1. Find generating symbols (derive terminal strings)
  const generating = new Set<string>();
  for (const t of cfg.terminals) generating.add(t);
  
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of cfg.productions) {
      if (!generating.has(p.lhs)) {
        if (p.rhs.every(sym => generating.has(sym) || sym === EPSILON)) {
          generating.add(p.lhs);
          changed = true;
        }
      }
    }
  }

  // Filter out productions with non-generating symbols
  let prods = cfg.productions.filter(p => 
    generating.has(p.lhs) && p.rhs.every(sym => generating.has(sym) || sym === EPSILON)
  );

  // 2. Find reachable symbols from Start Symbol
  const reachable = new Set<string>();
  if (cfg.startSymbol && generating.has(cfg.startSymbol)) {
    reachable.add(cfg.startSymbol);
  }

  changed = true;
  while (changed) {
    changed = false;
    for (const p of prods) {
      if (reachable.has(p.lhs)) {
        for (const sym of p.rhs) {
          if (!reachable.has(sym) && sym !== EPSILON) {
            reachable.add(sym);
            changed = true;
          }
        }
      }
    }
  }

  prods = prods.filter(p => reachable.has(p.lhs));

  return {
    ...cfg,
    nonterminals: new Set([...cfg.nonterminals].filter(nt => reachable.has(nt))),
    terminals: new Set([...cfg.terminals].filter(t => reachable.has(t))),
    productions: prods
  };
}

// Step 5: Binarize (Isolate terminals, limit body length <= 2)
function binarizeCNF(cfg: CFG): CFG {
  const newCfg: CFG = { ...cfg, productions: [], nonterminals: new Set(cfg.nonterminals) };
  let varCounter = 1;
  const termMap = new Map<string, string>(); // 'a' -> 'U_a'

  const getTermVar = (t: string) => {
    if (termMap.has(t)) return termMap.get(t)!;
    const sanitizedT = t.replace(/[^A-Za-z0-9_]/g, 'term');
    const newNt = generateUniqueNonterminal(newCfg, `U_${sanitizedT}`, '');
    termMap.set(t, newNt);
    newCfg.nonterminals.add(newNt);
    newCfg.productions.push({ lhs: newNt, rhs: [t] });
    return newNt;
  };

  for (const p of cfg.productions) {
    // Keep S -> epsilon
    if (p.rhs.length === 1 && p.rhs[0] === EPSILON && p.lhs === cfg.startSymbol) {
      newCfg.productions.push(p);
      continue;
    }
    // Keep A -> a
    if (p.rhs.length === 1 && cfg.terminals.has(p.rhs[0])) {
      newCfg.productions.push(p);
      continue;
    }

    // Isolate terminals in RHS (replace 'a' with 'U_a')
    let currentRhs = p.rhs.map(sym => cfg.terminals.has(sym) ? getTermVar(sym) : sym);

    // Split long productions A -> X1 X2 ... Xn into binary
    while (currentRhs.length > 2) {
      const v1 = currentRhs[0];
      const v2 = currentRhs[1];
      const newNt = generateUniqueNonterminal(newCfg, 'V', `_${varCounter++}`);
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
  res = removeUselessSymbols(res);
  res = binarizeCNF(res);
  return res;
}
