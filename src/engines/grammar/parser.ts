import { CFG, Production, EPSILON, GrammarSymbol } from './types';

export function isNonterminal(sym: GrammarSymbol): boolean {
  return /^[A-Z][A-Za-z0-9_']*$/.test(sym);
}

export function isTerminal(sym: GrammarSymbol): boolean {
  if (sym === EPSILON) return false;
  return !isNonterminal(sym);
}

export function tokenizeGrammarString(str: string, declaredNonterminals: Set<string>, declaredTerminals?: Set<string>): GrammarSymbol[] {
  const tokens: GrammarSymbol[] = [];
  const nts = Array.from(declaredNonterminals).sort((a, b) => b.length - a.length);
  const ts = declaredTerminals ? Array.from(declaredTerminals).sort((a, b) => b.length - a.length) : [];
  
  let i = 0;
  while (i < str.length) {
    if (/^\s$/.test(str[i])) {
      i++;
      continue;
    }
    
    const epsMatch = str.slice(i).match(/^(\\epsilon|\\e|epsilon|eps|''|""|ε)/i);
    if (epsMatch) {
      tokens.push(EPSILON);
      i += epsMatch[0].length;
      continue;
    }
    
    let matchedNt = false;
    for (const nt of nts) {
      if (str.startsWith(nt, i)) {
        tokens.push(nt);
        i += nt.length;
        matchedNt = true;
        break;
      }
    }
    if (matchedNt) continue;
    
    let matchedT = false;
    for (const t of ts) {
      if (str.startsWith(t, i)) {
        tokens.push(t);
        i += t.length;
        matchedT = true;
        break;
      }
    }
    if (matchedT) continue;
    
    // If it didn't match a declared nonterminal, check if it's a single uppercase letter
    if (/^[A-Z]$/.test(str[i])) {
      // We also want to support people typing 'S1' without spaces if S1 is undeclared?
      // No, if S1 is undeclared, it becomes 'S', '1' (which is terminal 1). This is fine.
      tokens.push(str[i]);
      i++;
      continue;
    }
    
    const opMatch = str.slice(i).match(/^(<=|>=|==|!=|&&|\|\|)/);
    if (opMatch) {
      tokens.push(opMatch[0]);
      i += opMatch[0].length;
      continue;
    }
    
    // Check for multi-character terminal (lowercase only, no uppercase)
    const termMatch = str.slice(i).match(/^([a-z][a-z0-9_]*)/);
    if (termMatch) {
      tokens.push(termMatch[0]);
      i += termMatch[0].length;
      continue;
    }
    
    // Otherwise, it's a single character terminal
    tokens.push(str[i]);
    i++;
  }
  
  return tokens;
}

export function parseGrammarText(text: string): CFG {
  const lines = text.split('\n');
  const declaredNonterminals = new Set<string>();
  
  for (const line of lines) {
    let ruleLine = line.trim().replace(/^\d+:\s*/, '');
    if (!ruleLine || ruleLine.startsWith('//') || ruleLine.startsWith('#')) continue;
    const parts = ruleLine.split(/->|=>|:/);
    if (parts.length >= 2) {
      // Extract the first token that looks like a generalized nonterminal
      const lhsMatch = parts[0].match(/([A-Z][A-Za-z0-9_']*)/);
      if (lhsMatch) {
        declaredNonterminals.add(lhsMatch[1]);
      }
    }
  }

  const productions: Production[] = [];
  const nonterminals = new Set<string>();
  const terminals = new Set<string>();
  let startSymbol: string | null = null;
  const seenProductions = new Set<string>();
  let lastLhs: string | null = null;

  for (const line of lines) {
    let ruleLine = line.trim();
    if (!ruleLine || ruleLine.startsWith('//') || ruleLine.startsWith('#')) continue;

    ruleLine = ruleLine.replace(/^\d+:\s*/, '');
    const parts = ruleLine.split(/->|=>|:/);
    
    let lhs: string;
    let rhsPart: string;

    if (parts.length < 2) {
      if (lastLhs) {
        lhs = lastLhs;
        rhsPart = ruleLine.replace(/^\|/, '').trim();
      } else {
        throw new Error('Invalid grammar file: malformed production ' + line);
      }
    } else {
      const lhsTokens = tokenizeGrammarString(parts[0], declaredNonterminals);
      if (lhsTokens.length === 0 || lhsTokens.length > 1 || !isNonterminal(lhsTokens[0])) {
        throw new Error('Invalid grammar file: LHS must be a single nonterminal in ' + line);
      }
      lhs = lhsTokens[0];
      rhsPart = parts.slice(1).join('->').trim();
      lastLhs = lhs;
    }
    
    nonterminals.add(lhs);
    if (!startSymbol) startSymbol = lhs;

    let alternatives = rhsPart.split('|').map(s => s.trim());
    const validAlts = alternatives.filter(a => a.length > 0);
    if (validAlts.length === 0) {
      alternatives = [''];
    } else {
      alternatives = validAlts;
    }

    for (const alt of alternatives) {
      const symbols = tokenizeGrammarString(alt, declaredNonterminals);
      const rhs: string[] = [];

      if (symbols.length === 0) {
        rhs.push(EPSILON);
      } else {
        for (const sym of symbols) {
          rhs.push(sym);
          if (sym !== EPSILON) {
            if (isNonterminal(sym)) {
              nonterminals.add(sym);
            } else {
              terminals.add(sym);
            }
          }
        }
      }
      
      const prodString = `${lhs}->${rhs.join(' ')}`;
      if (seenProductions.has(prodString)) {
        throw new Error('Invalid grammar file: duplicate production ' + prodString);
      }
      seenProductions.add(prodString);
      
      productions.push({ lhs, rhs });
    }
  }
  
  if (productions.length === 0) {
    throw new Error('Invalid grammar file: grammar is empty');
  }
  if (!startSymbol) {
    throw new Error('Invalid grammar file: missing start symbol');
  }

  // We removed undefined nonterminal checks here so it doesn't break live typing sync.
  // These are now handled in diagnostics.ts instead.

  return {
    nonterminals,
    terminals,
    productions,
    startSymbol: startSymbol || '',
  };
}
