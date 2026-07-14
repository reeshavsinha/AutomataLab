// src/engines/grammar/diagnostics.ts

import { CFG, Production } from './types';

export type DiagnosticType = 'left-recursion' | 'left-factoring' | 'unreachable' | 'error';

export interface GrammarDiagnostic {
  type: DiagnosticType;
  nonterminal: string;
  message: string;
  productions: Production[];
}

export function runDiagnostics(cfg: CFG): GrammarDiagnostic[] {
  const diagnostics: GrammarDiagnostic[] = [];

  // 0. Undefined Nonterminals & Suspicious Terminals
  const lhsSet = new Set(cfg.productions.map(p => p.lhs));
  for (const nt of cfg.nonterminals) {
    if (!lhsSet.has(nt)) {
      let msg = 'Undefined nonterminal ' + nt;
      if (nt.length > 1) {
        msg += `. Did you forget spaces? (e.g., '${nt.split('').join(' ')}')`;
      }
      diagnostics.push({
        type: 'error',
        nonterminal: nt,
        message: msg,
        productions: []
      });
    }
  }

  for (const t of cfg.terminals) {
    if (t.length > 1 && /[A-Z]/.test(t)) {
      diagnostics.push({
        type: 'error',
        nonterminal: '',
        message: `Suspicious terminal '${t}' contains uppercase letters. Did you forget spaces? (e.g., '${t.split('').join(' ')}')`,
        productions: []
      });
    }
  }

  // 1. Direct Left Recursion
  for (const nt of cfg.nonterminals) {
    const ntProds = cfg.productions.filter(p => p.lhs === nt);
    const leftRecursive = ntProds.filter(p => p.rhs[0] === nt);
    
    if (leftRecursive.length > 0) {
      diagnostics.push({
        type: 'left-recursion',
        nonterminal: nt,
        message: `Direct Left Recursion detected on '${nt}'. This prevents LL(1) parsing.`,
        productions: ntProds
      });
    }
  }

  // 2. Left Factoring
  for (const nt of cfg.nonterminals) {
    const ntProds = cfg.productions.filter(p => p.lhs === nt);
    if (ntProds.length < 2) continue;

    // Check if any two productions share the same first symbol
    const prefixes = new Map<string, Production[]>();
    for (const prod of ntProds) {
      if (prod.rhs.length === 0) continue;
      const firstSym = prod.rhs[0];
      if (!prefixes.has(firstSym)) prefixes.set(firstSym, []);
      prefixes.get(firstSym)!.push(prod);
    }

    let needsFactoring = false;
    for (const [sym, prods] of prefixes.entries()) {
      if (prods.length > 1) {
        needsFactoring = true;
        break;
      }
    }

    if (needsFactoring) {
      diagnostics.push({
        type: 'left-factoring',
        nonterminal: nt,
        message: `Left Factoring required on '${nt}'. Multiple productions share a common prefix.`,
        productions: ntProds
      });
    }
  }

  // 3. Unreachable Symbols
  if (cfg.startSymbol) {
    const reachable = new Set<string>([cfg.startSymbol]);
    const queue = [cfg.startSymbol];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const prods = cfg.productions.filter(p => p.lhs === current);
      
      for (const prod of prods) {
        for (const sym of prod.rhs) {
          if (cfg.nonterminals.has(sym) && !reachable.has(sym)) {
            reachable.add(sym);
            queue.push(sym);
          }
        }
      }
    }

    for (const nt of cfg.nonterminals) {
      if (!reachable.has(nt)) {
        diagnostics.push({
          type: 'unreachable',
          nonterminal: nt,
          message: `Unreachable nonterminal '${nt}'. It cannot be reached from the start symbol.`,
          productions: cfg.productions.filter(p => p.lhs === nt)
        });
      }
    }
  }

  return diagnostics;
}
