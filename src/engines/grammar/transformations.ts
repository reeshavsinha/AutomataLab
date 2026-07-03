// src/engines/grammar/transformations.ts

import { CFG, Production, EPSILON } from './types';
export { convertToCNF } from './cnf';
export { convertToGNF } from './gnf';

// Convert CFG back to string format
export function formatCFGToString(cfg: CFG): string {
  const lines: string[] = [];
  
  // Keep start symbol first
  const order = Array.from(cfg.nonterminals);
  if (cfg.startSymbol) {
    const idx = order.indexOf(cfg.startSymbol);
    if (idx > -1) {
      order.splice(idx, 1);
      order.unshift(cfg.startSymbol);
    }
  }

  for (const nt of order) {
    const prods = cfg.productions.filter(p => p.lhs === nt);
    if (prods.length === 0) continue;
    
    const rhsStrings = prods.map(p => {
      if (p.rhs.length === 1 && p.rhs[0] === EPSILON) return '\\epsilon';
      return p.rhs.map(sym => sym === EPSILON ? '\\epsilon' : sym).join(' ');
    });
    
    lines.push(`${nt} -> ${rhsStrings.join(' | ')}`);
  }

  return lines.join('\n');
}

export function eliminateDirectLeftRecursion(cfg: CFG, nt: string): CFG {
  const newCfg: CFG = {
    nonterminals: new Set(cfg.nonterminals),
    terminals: new Set(cfg.terminals),
    productions: [],
    startSymbol: cfg.startSymbol
  };

  const alphas: string[][] = [];
  const betas: string[][] = [];
  const otherProds: Production[] = [];

  for (const p of cfg.productions) {
    if (p.lhs === nt) {
      if (p.rhs[0] === nt) {
        alphas.push(p.rhs.slice(1));
      } else {
        betas.push(p.rhs);
      }
    } else {
      otherProds.push(p);
    }
  }

  if (alphas.length === 0) return cfg; // No direct left recursion

  const newNt = nt + 'prime';
  newCfg.nonterminals.add(newNt);

  // If no betas, we implicitly have an empty beta (epsilon)
  if (betas.length === 0) {
    betas.push([EPSILON]);
  }

  // A -> beta A'
  for (const beta of betas) {
    const rhs = beta[0] === EPSILON && beta.length === 1 ? [newNt] : [...beta, newNt];
    newCfg.productions.push({ lhs: nt, rhs });
  }

  // A' -> alpha A' | epsilon
  for (const alpha of alphas) {
    newCfg.productions.push({ lhs: newNt, rhs: [...alpha, newNt] });
  }
  newCfg.productions.push({ lhs: newNt, rhs: [EPSILON] });

  // Add all other unaffected productions
  for (const p of otherProds) {
    newCfg.productions.push(p);
  }

  return newCfg;
}

export function leftFactor(cfg: CFG, nt: string): CFG {
  const newCfg: CFG = {
    nonterminals: new Set(cfg.nonterminals),
    terminals: new Set(cfg.terminals),
    productions: [],
    startSymbol: cfg.startSymbol
  };

  const ntProds = cfg.productions.filter(p => p.lhs === nt);
  const otherProds = cfg.productions.filter(p => p.lhs !== nt);

  // Group by first symbol
  const prefixes = new Map<string, string[][]>();
  for (const p of ntProds) {
    const first = p.rhs[0];
    if (!prefixes.has(first)) prefixes.set(first, []);
    prefixes.get(first)!.push(p.rhs.slice(1));
  }

  newCfg.productions.push(...otherProds);

  let newNtCounter = 1;

  for (const [firstSym, remainders] of prefixes.entries()) {
    if (remainders.length > 1) {
      const newNt = nt + newNtCounter++;
      newCfg.nonterminals.add(newNt);

      // A -> alpha A'
      newCfg.productions.push({ lhs: nt, rhs: [firstSym, newNt] });

      // A' -> beta1 | beta2
      for (const r of remainders) {
        newCfg.productions.push({ lhs: newNt, rhs: r.length > 0 ? r : [EPSILON] });
      }
    } else {
      // Keep original
      const rhs = remainders[0];
      newCfg.productions.push({ lhs: nt, rhs: [firstSym, ...rhs] });
    }
  }

  return newCfg;
}

export function removeUnreachable(cfg: CFG, ntToRemove: string): CFG {
  const newCfg: CFG = {
    nonterminals: new Set(Array.from(cfg.nonterminals).filter(n => n !== ntToRemove)),
    terminals: new Set(cfg.terminals),
    productions: cfg.productions.filter(p => p.lhs !== ntToRemove),
    startSymbol: cfg.startSymbol
  };
  return newCfg;
}
