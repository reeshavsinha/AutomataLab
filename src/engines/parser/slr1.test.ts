// src/engines/parser/slr1.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLR0Table } from './lr0';
import { generateSLR1Table } from './slr1';

describe('SLR(1) Matrix Generator', () => {
  it('resolves Reduce/Reduce conflicts in grammars that LR(0) fails on', () => {
    // S -> A a | b
    // A -> b
    const text = `S -> A a | b\nA -> b`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);

    const lr0 = generateLR0Table(cfg);
    const slr1 = generateSLR1Table(cfg, analysis);

    // LR(0) reduces both S -> b and A -> b in the state after shifting 'b'.
    expect(lr0.hasConflict).toBe(true);

    // SLR(1) uses FOLLOW(S) = {$} and FOLLOW(A) = {a},
    // which are disjoint, correctly resolving the Reduce/Reduce conflict.
    expect(slr1.hasConflict).toBe(false);
  });
});
