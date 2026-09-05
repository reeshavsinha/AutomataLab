// src/engines/grammar/transformations.ts

import { CFG, Production, EPSILON } from './types';
export { convertToCNF } from './cnf';
export { convertToGNF } from './gnf';
import { generateUniqueNonterminal } from './utils';
import { tokenizeGrammarString } from './parser';

// Render a single grammar symbol so it survives a format → parse round-trip as
// exactly one symbol. Symbols containing whitespace/punctuation (or that would
// otherwise be re-tokenized into several symbols, e.g. a literal quote) are
// wrapped in double quotes with backslash-escaping.
function formatSymbol(sym: string): string {
  if (sym === EPSILON) return '\\epsilon';
  // "Clean" symbols tokenize back to exactly themselves and need no quoting.
  // Tokenizing can throw for symbols like a lone '"' (an unterminated quote),
  // so treat any throw as "not clean" and fall through to the quoted form.
  let clean = false;
  try {
    const toks = tokenizeGrammarString(sym);
    clean = toks.length === 1 && toks[0] === sym;
  } catch {
    clean = false;
  }
  if (clean) return sym;
  // Escape backslashes first, then double-quotes, so the quoted form re-parses
  // to the identical symbol (e.g. '"' → "\"", '\' → "\\").
  const escaped = sym.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

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
      return p.rhs.map(formatSymbol).join(' ');
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
  let removedTrivialSelfLoop = false;

  for (const p of cfg.productions) {
    if (p.lhs === nt) {
      if (p.rhs[0] === nt) {
        const alpha = p.rhs.slice(1);
        if (alpha.length === 0) removedTrivialSelfLoop = true;
        else alphas.push(alpha);
      } else {
        betas.push(p.rhs);
      }
    } else {
      otherProds.push(p);
    }
  }

  if (alphas.length === 0) {
    if (!removedTrivialSelfLoop || betas.length === 0) return cfg;
    return {
      ...newCfg,
      productions: [...otherProds, ...betas.map((rhs) => ({ lhs: nt, rhs: [...rhs] }))],
    };
  }

  // With no non-left-recursive base, A cannot derive a finite terminal string.
  // Introducing ε here would change the language, so leave the grammar unchanged.
  if (betas.length === 0) return cfg;

  const newNt = generateUniqueNonterminal(newCfg, nt, "'");
  newCfg.nonterminals.add(newNt);

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

  for (const [firstSym, remainders] of prefixes.entries()) {
    if (remainders.length > 1) {
      const newNt = generateUniqueNonterminal(newCfg, nt, "1");
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
