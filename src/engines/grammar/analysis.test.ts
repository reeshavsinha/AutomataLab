// src/engines/grammar/analysis.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from './parser';
import { analyzeGrammar } from './analysis';
import { EPSILON, EOF_SYMBOL } from './types';

describe('Grammar Analysis Engine', () => {
  it('computes FIRST and FOLLOW sets for a simple expression grammar', () => {
    const text = `
      E -> T Eprime
      Eprime -> + T Eprime | \\epsilon
      T -> F Tprime
      Tprime -> * F Tprime | \\epsilon
      F -> ( E ) | id
    `;
    const cfg = parseGrammarText(text);
    const result = analyzeGrammar(cfg);

    expect(result.nullable.has('E')).toBe(false);
    expect(result.nullable.has('Eprime')).toBe(true);
    expect(result.nullable.has('Tprime')).toBe(true);

    expect(result.firstSets.get('E')).toEqual(new Set(['(', 'id']));
    expect(result.firstSets.get('Eprime')).toEqual(new Set(['+', EPSILON]));
    expect(result.firstSets.get('T')).toEqual(new Set(['(', 'id']));
    expect(result.firstSets.get('Tprime')).toEqual(new Set(['*', EPSILON]));
    expect(result.firstSets.get('F')).toEqual(new Set(['(', 'id']));

    expect(result.followSets.get('E')).toEqual(new Set([EOF_SYMBOL, ')']));
    expect(result.followSets.get('Eprime')).toEqual(new Set([EOF_SYMBOL, ')']));
    expect(result.followSets.get('T')).toEqual(new Set(['+', EOF_SYMBOL, ')']));
    expect(result.followSets.get('Tprime')).toEqual(new Set(['+', EOF_SYMBOL, ')']));
    expect(result.followSets.get('F')).toEqual(new Set(['*', '+', EOF_SYMBOL, ')']));
  });
});
