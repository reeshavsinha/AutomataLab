// src/engines/parser/ll1.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLL1Table } from './ll1';
import { EOF_SYMBOL } from '../grammar/types';

describe('LL(1) Table Generator', () => {
  it('generates a conflict-free table for a classic LL(1) grammar', () => {
    // S -> a S b | \epsilon
    const text = `S -> a S b | \\epsilon`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);

    expect(ll1.hasConflict).toBe(false);
    
    // M[S, 'a'] = [S -> a S b]
    expect(ll1.table.get('S')?.get('a')?.length).toBe(1);
    expect(ll1.table.get('S')?.get('a')?.[0].rhs).toEqual(['a', 'S', 'b']);

    // M[S, '$'] = [S -> \epsilon] (because FOLLOW(S) contains $)
    expect(ll1.table.get('S')?.get(EOF_SYMBOL)?.length).toBe(1);
    expect(ll1.table.get('S')?.get(EOF_SYMBOL)?.[0].rhs).toEqual(['ε']);

    // M[S, 'b'] = [S -> \epsilon] (because FOLLOW(S) contains 'b' from the recursive rule)
    expect(ll1.table.get('S')?.get('b')?.length).toBe(1);
    expect(ll1.table.get('S')?.get('b')?.[0].rhs).toEqual(['ε']);
  });

  it('detects conflicts in a non-LL(1) grammar (Left Recursion)', () => {
    // E -> E + T | T
    // T -> id
    const text = `E -> E + T | T\nT -> id`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);

    // Left recursion naturally produces FIRST/FIRST or FIRST/FOLLOW conflicts
    expect(ll1.hasConflict).toBe(true);
  });
});
