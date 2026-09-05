// src/engines/grammar/parser.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText, tokenizeGrammarString, tokenizeInputString } from './parser';
import { analyzeGrammar } from './analysis';
import { formatCFGToString } from './transformations';
import { EPSILON, EOF_SYMBOL } from './types';

/** Convenience: RHS arrays of every production for a given LHS, in order. */
function rhsOf(text: string, lhs: string): string[][] {
  const cfg = parseGrammarText(text);
  return cfg.productions.filter(p => p.lhs === lhs).map(p => p.rhs);
}

describe('Grammar tokenizer — deterministic symbol boundaries', () => {
  it('Test 1: repeated single-character terminals split on whitespace', () => {
    const rhs = rhsOf('A -> a a A b | a b | x', 'A');
    expect(rhs).toEqual([
      ['a', 'a', 'A', 'b'],
      ['a', 'b'],
      ['x'],
    ]);

    const first = analyzeGrammar(parseGrammarText('A -> a a A b | a b | x')).firstSets.get('A');
    expect(first).toEqual(new Set(['a', 'x']));
  });

  it('Test 2: multi-character whitespace-delimited tokens stay one symbol', () => {
    const rhs = rhsOf('F -> id | num', 'F');
    expect(rhs).toEqual([['id'], ['num']]);

    const first = analyzeGrammar(parseGrammarText('F -> id | num')).firstSets.get('F');
    expect(first).toEqual(new Set(['id', 'num']));
  });

  it('Test 3: explicit quoted terminals become one symbol', () => {
    const rhs = rhsOf('A -> "aa" A b | "ab" | x', 'A');
    expect(rhs).toEqual([
      ['aa', 'A', 'b'],
      ['ab'],
      ['x'],
    ]);

    const first = analyzeGrammar(parseGrammarText('A -> "aa" A b | "ab" | x')).firstSets.get('A');
    expect(first).toEqual(new Set(['aa', 'ab', 'x']));
  });

  it('Test 4: multi-character nonterminals and terminals are never split', () => {
    const rhs = rhsOf('Expr -> id | EPrime | identifier', 'Expr');
    expect(rhs).toEqual([['id'], ['EPrime'], ['identifier']]);
  });

  it('Test 5: punctuation-heavy expression grammar tokenizes correctly', () => {
    const text = `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`;
    const cfg = parseGrammarText(text);
    const first = analyzeGrammar(cfg).firstSets;

    expect(cfg.productions.filter(p => p.lhs === 'E').map(p => p.rhs)).toEqual([
      ['E', '+', 'T'],
      ['T'],
    ]);
    expect(cfg.productions.filter(p => p.lhs === 'F').map(p => p.rhs)).toEqual([
      ['(', 'E', ')'],
      ['id'],
    ]);
    expect(first.get('F')).toEqual(new Set(['(', 'id']));
  });

  it('Test 6: "a a" and "aa" produce different RHS arrays', () => {
    expect(rhsOf('A -> a a', 'A')).toEqual([['a', 'a']]);
    expect(rhsOf('A -> aa', 'A')).toEqual([['aa']]);
  });

  it('Test 7: quoted vs unquoted single-symbol equivalence, distinct from spaced', () => {
    expect(rhsOf('A -> aa', 'A')).toEqual([['aa']]);
    expect(rhsOf('A -> "aa"', 'A')).toEqual([['aa']]);
    expect(rhsOf('A -> a a', 'A')).toEqual([['a', 'a']]);
  });

  it('does not depend on which nonterminals are declared elsewhere', () => {
    // S -> ABC must be ONE symbol regardless of A/AB/ABC appearing elsewhere.
    const withDecls = rhsOf('S -> ABC\nA -> a\nAB -> b\nABC -> c', 'S');
    const withoutDecls = rhsOf('S -> ABC', 'S');
    expect(withDecls).toEqual([['ABC']]);
    expect(withoutDecls).toEqual([['ABC']]);
  });

  it('recognizes epsilon spellings but not partial matches', () => {
    expect(tokenizeGrammarString('eps')).toEqual([EPSILON]);
    expect(tokenizeGrammarString('\\epsilon')).toEqual([EPSILON]);
    expect(tokenizeGrammarString('ε')).toEqual([EPSILON]);
    expect(tokenizeGrammarString('""')).toEqual([EPSILON]);
    // 'epsilonX' is a legitimate identifier, not epsilon.
    expect(tokenizeGrammarString('epsilonX')).toEqual(['epsilonX']);
  });
});

describe('Arrow and alternative-separator variants', () => {
  it('recognizes the Unicode arrow "→" as a production separator', () => {
    expect(rhsOf('S → a S b | ε', 'S')).toEqual([['a', 'S', 'b'], [EPSILON]]);
  });

  it('recognizes the Unicode DIVIDES "∣" (U+2223) as an alternative separator', () => {
    expect(rhsOf('S -> a S b ∣ ε', 'S')).toEqual([['a', 'S', 'b'], [EPSILON]]);
  });

  it('recognizes "→" and "∣" together and matches the ASCII form', () => {
    const unicode = parseGrammarText('E → E + T ∣ T\nT → id');
    const ascii = parseGrammarText('E -> E + T | T\nT -> id');
    expect(unicode.productions).toEqual(ascii.productions);
    expect(Array.from(unicode.terminals).sort()).toEqual(['+', 'id']);
  });

  it('recognizes "∣" as a leading separator on continuation lines', () => {
    // Second line has no arrow; it continues the previous LHS via '∣'.
    expect(rhsOf('S -> a\n   ∣ b', 'S')).toEqual([['a'], ['b']]);
  });

  it('preserves leading, middle, and trailing empty alternatives as epsilon', () => {
    expect(rhsOf('S -> | a', 'S')).toEqual([[EPSILON], ['a']]);
    expect(rhsOf('S -> a | | b', 'S')).toEqual([['a'], [EPSILON], ['b']]);
    expect(rhsOf('S -> a |', 'S')).toEqual([['a'], [EPSILON]]);
  });

  it('does not split quoted pipes or arrows', () => {
    expect(rhsOf(`S -> "|" | "∣" | "->"`, 'S')).toEqual([['|'], ['∣'], ['->']]);
  });

  it('treats colon as a terminal rather than a production arrow', () => {
    expect(rhsOf('S -> id:type', 'S')).toEqual([['id', ':', 'type']]);
  });

  it('rejects multiple unquoted production arrows', () => {
    expect(() => parseGrammarText('S -> a -> b')).toThrow(/multiple production arrows/i);
  });
});

describe('Quote characters as terminal symbols', () => {
  it('accepts a literal double-quote via single quotes', () => {
    expect(rhsOf(`S -> '"' | a`, 'S')).toEqual([['"'], ['a']]);
  });

  it('accepts a literal double-quote escaped inside double quotes', () => {
    expect(rhsOf(`S -> "\\"" | a`, 'S')).toEqual([['"'], ['a']]);
  });

  it('accepts a literal single-quote via double quotes', () => {
    expect(rhsOf(`S -> "'" | a`, 'S')).toEqual([["'"], ['a']]);
  });

  it('FIRST set includes the literal quote terminal', () => {
    const first = analyzeGrammar(parseGrammarText(`S -> '"' | a`)).firstSets.get('S');
    expect(first).toEqual(new Set(['"', 'a']));
  });

  it('round-trips a grammar whose terminal is a double-quote (no crash)', () => {
    const cfg = parseGrammarText(`S -> '"' | a`);
    const text = formatCFGToString(cfg); // must not throw
    const reparsed = parseGrammarText(text);
    expect(reparsed.productions).toEqual(cfg.productions);
    expect(reparsed.terminals.has('"')).toBe(true);
  });

  it('round-trips a terminal containing a backslash', () => {
    const cfg = parseGrammarText(`S -> "a\\\\b"`); // terminal literally: a\b
    expect(cfg.productions[0].rhs).toEqual(['a\\b']);
    const reparsed = parseGrammarText(formatCFGToString(cfg));
    expect(reparsed.productions).toEqual(cfg.productions);
  });

  it('rejects a bare unterminated double-quote', () => {
    expect(() => parseGrammarText(`S -> "`)).toThrow(/unterminated/i);
  });
});

describe('FIRST/FOLLOW correctness after tokenization', () => {
  it('unquoted single-char grammar', () => {
    const text = `S -> A | B\nA -> a a A b | a b | x\nB -> a B b | x`;
    const { firstSets, followSets } = analyzeGrammar(parseGrammarText(text));

    expect(firstSets.get('S')).toEqual(new Set(['a', 'x']));
    expect(firstSets.get('A')).toEqual(new Set(['a', 'x']));
    expect(firstSets.get('B')).toEqual(new Set(['a', 'x']));

    expect(followSets.get('S')).toEqual(new Set([EOF_SYMBOL]));
    expect(followSets.get('A')).toEqual(new Set([EOF_SYMBOL, 'b']));
    expect(followSets.get('B')).toEqual(new Set([EOF_SYMBOL, 'b']));
  });

  it('quoted multi-char terminal grammar', () => {
    const text = `S -> A | B\nA -> "aa" A b | "ab" | x\nB -> a B b | x`;
    const { firstSets } = analyzeGrammar(parseGrammarText(text));
    expect(firstSets.get('A')).toEqual(new Set(['aa', 'ab', 'x']));
  });
});

describe('tokenizeInputString — sentence tokenization', () => {
  it('longest-matches declared terminals for compact input', () => {
    expect(tokenizeInputString('aabb', new Set(['a', 'b']))).toEqual(['a', 'a', 'b', 'b']);
  });

  it('prefers longer terminals and respects whitespace', () => {
    expect(tokenizeInputString('id+id', new Set(['id', '+']))).toEqual(['id', '+', 'id']);
    expect(tokenizeInputString('id + id', new Set(['id', '+']))).toEqual(['id', '+', 'id']);
  });

  it('rejects an unterminated quoted input token', () => {
    expect(() => tokenizeInputString('"abc', new Set(['abc']))).toThrow(/unterminated quoted token/i);
  });
});
