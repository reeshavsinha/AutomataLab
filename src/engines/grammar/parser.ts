import { CFG, Production, EPSILON, GrammarSymbol } from './types';

export function isNonterminal(sym: GrammarSymbol): boolean {
  return /^[A-Z][A-Za-z0-9_']*$/.test(sym);
}

export function isTerminal(sym: GrammarSymbol): boolean {
  if (sym === EPSILON) return false;
  return !isNonterminal(sym);
}

// Characters that make up a single unquoted grammar symbol (identifier run).
const IDENT_CHAR = /[A-Za-z0-9_']/;
// Multi-character terminal operators that should stay as one symbol.
const OPERATOR_RE = /^(<=|>=|==|!=|&&|\|\|)/;
// Bare-word epsilon spellings.
const EPSILON_WORDS = new Set(['eps', 'epsilon', 'lambda']);

/**
 * Deterministic lexer for the RIGHT-HAND SIDE of a grammar production.
 *
 * Symbol boundaries are resolved purely from the source text — never by
 * scanning which nonterminals/terminals happen to be declared elsewhere.
 * The rules are:
 *   1. Whitespace is a hard boundary between symbols.
 *   2. A quoted string ("..." or '...') is exactly one symbol (its contents),
 *      so multi-character or punctuation-bearing terminals can be written explicitly.
 *   3. A maximal run of identifier characters ([A-Za-z0-9_']) is exactly one symbol.
 *   4. Recognised epsilon spellings (ε, λ, \epsilon, \e, eps, epsilon, "", …) become EPSILON.
 *   5. Known multi-character operators (<=, >=, ==, !=, &&, ||) stay one symbol.
 *   6. Any other single non-space character is its own terminal symbol.
 *
 * Consequently:
 *   "a a A b" -> ["a", "a", "A", "b"]      (whitespace splits)
 *   "aa A b"  -> ["aa", "A", "b"]          ("aa" is one identifier run)
 *   "id | num" callers split on '|' first; "id" -> ["id"], never ["i","d"]
 *   '"aa" A b' -> ["aa", "A", "b"]         (quoted terminal)
 */
export function tokenizeGrammarString(str: string): GrammarSymbol[] {
  const tokens: GrammarSymbol[] = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    // 1. Whitespace: hard symbol boundary.
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // 2. Quoted terminal — contents are exactly one symbol. Empty quotes = epsilon.
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < str.length && str[j] !== quote) {
        if (str[j] === '\\' && j + 1 < str.length) {
          value += str[j + 1];
          j += 2;
        } else {
          value += str[j];
          j++;
        }
      }
      if (j >= str.length) {
        throw new Error(`Invalid grammar: unterminated quoted symbol starting at ${str.slice(i)}`);
      }
      tokens.push(value.length === 0 ? EPSILON : value);
      i = j + 1;
      continue;
    }

    // 3. Unicode epsilon / lambda sigils.
    if (ch === EPSILON || ch === 'λ') {
      tokens.push(EPSILON);
      i++;
      continue;
    }

    // 4. Backslash epsilon commands: \epsilon, \eps, \e, \lambda.
    if (ch === '\\') {
      const m = str.slice(i + 1).match(/^[A-Za-z]+/);
      const word = m ? m[0].toLowerCase() : '';
      if (word === 'e' || EPSILON_WORDS.has(word)) {
        tokens.push(EPSILON);
        i += 1 + word.length;
        continue;
      }
      // Unknown backslash command → treat the backslash as a single-char terminal.
      tokens.push(ch);
      i++;
      continue;
    }

    // 5. Identifier run: a maximal [A-Za-z0-9_'] sequence is exactly one symbol.
    if (IDENT_CHAR.test(ch)) {
      let j = i;
      while (j < str.length && IDENT_CHAR.test(str[j])) j++;
      const word = str.slice(i, j);
      tokens.push(EPSILON_WORDS.has(word.toLowerCase()) ? EPSILON : word);
      i = j;
      continue;
    }

    // 6. Known multi-character operators stay as a single symbol.
    const opMatch = str.slice(i).match(OPERATOR_RE);
    if (opMatch) {
      tokens.push(opMatch[0]);
      i += opMatch[0].length;
      continue;
    }

    // 7. Any other single, non-space character is its own terminal symbol.
    tokens.push(ch);
    i++;
  }

  return tokens;
}

/**
 * Tokenize an INPUT SENTENCE (e.g. a derivation/parse test string) into the
 * grammar's terminal symbols. This is a different concern from grammar-symbol
 * boundary resolution: here we match a raw string against a KNOWN terminal
 * alphabet, so longest-terminal-match is appropriate (e.g. "aabb" -> a a b b,
 * "id+id" -> id + id). Whitespace and quotes are still honoured as separators.
 */
export function tokenizeInputString(str: string, terminals: Set<string>): GrammarSymbol[] {
  const ts = Array.from(terminals)
    .filter(t => t.length > 0 && t !== EPSILON)
    .sort((a, b) => b.length - a.length);
  const tokens: GrammarSymbol[] = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < str.length && str[j] !== quote) {
        if (str[j] === '\\' && j + 1 < str.length) {
          value += str[j + 1];
          j += 2;
        } else {
          value += str[j];
          j++;
        }
      }
      if (j >= str.length) {
        throw new Error(`Invalid input: unterminated quoted token starting at ${str.slice(i)}`);
      }
      if (value.length > 0) tokens.push(value);
      i = j + 1;
      continue;
    }

    if (ch === EPSILON || ch === 'λ') {
      i++;
      continue;
    }

    let matched = false;
    for (const t of ts) {
      if (str.startsWith(t, i)) {
        tokens.push(t);
        i += t.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    tokens.push(ch);
    i++;
  }

  return tokens;
}

const PRODUCTION_ARROWS = ['::=', '->', '=>', '→'] as const;

/** Locate exactly one production arrow while ignoring operators inside quotes. */
function splitProductionRule(line: string): [string, string] | null {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let found: { index: number; length: number } | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    const arrow = PRODUCTION_ARROWS.find((candidate) => line.startsWith(candidate, i));
    if (!arrow) continue;
    if (found) {
      throw new Error(`Invalid grammar file: multiple production arrows in ${line}`);
    }
    found = { index: i, length: arrow.length };
    i += arrow.length - 1;
  }

  return found
    ? [line.slice(0, found.index), line.slice(found.index + found.length)]
    : null;
}

/** Split alternatives on unquoted ASCII/Unicode pipes, preserving empty arms. */
function splitAlternatives(rhs: string): string[] {
  const alternatives: string[] = [];
  let start = 0;
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < rhs.length; i++) {
    const ch = rhs[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '|' || ch === '∣') {
      alternatives.push(rhs.slice(start, i).trim());
      start = i + 1;
    }
  }
  alternatives.push(rhs.slice(start).trim());
  return alternatives;
}

export function parseGrammarText(text: string): CFG {
  const lines = text.split('\n');

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
    const rule = splitProductionRule(ruleLine);
    
    let lhs: string;
    let rhsPart: string;

    if (!rule) {
      if (lastLhs) {
        lhs = lastLhs;
        rhsPart = ruleLine.replace(/^[|∣]/, '').trim();
      } else {
        throw new Error('Invalid grammar file: malformed production ' + line);
      }
    } else {
      const lhsTokens = tokenizeGrammarString(rule[0]);
      if (lhsTokens.length !== 1 || !isNonterminal(lhsTokens[0])) {
        throw new Error('Invalid grammar file: LHS must be a single nonterminal in ' + line);
      }
      lhs = lhsTokens[0];
      if (lhs === 'START') {
        throw new Error('Invalid grammar file: "START" is a reserved nonterminal used internally. Please use a different name like "S".');
      }
      rhsPart = rule[1].trim();
      lastLhs = lhs;
    }
    
    nonterminals.add(lhs);
    if (!startSymbol) startSymbol = lhs;

    // Alternatives may be separated by the ASCII pipe '|' or the Unicode
    // DIVIDES symbol '∣' (U+2223).
    const alternatives = splitAlternatives(rhsPart);

    for (const alt of alternatives) {
      // Deterministic symbol-boundary resolution: whitespace separates symbols,
      // quotes group multi-character terminals. No declared-symbol heuristics.
      const symbols = tokenizeGrammarString(alt);

      const rhs: string[] = [];

      if (symbols.length === 0) {
        rhs.push(EPSILON);
      } else {
        for (const sym of symbols) {
          rhs.push(sym);
          if (sym !== EPSILON) {
            if (isNonterminal(sym)) {
              if (sym === 'START') {
                throw new Error('Invalid grammar file: "START" is a reserved nonterminal used internally. Please use a different name like "S".');
              }
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
