// src/engines/grammar/transformations.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from './parser';
import { runDiagnostics } from './diagnostics';
import { eliminateDirectLeftRecursion, leftFactor, removeUnreachable, formatCFGToString } from './transformations';

describe('Grammar Diagnostics & Transformations', () => {
  it('detects and eliminates direct left recursion', () => {
    // E -> E + T | T
    const cfg = parseGrammarText(`E -> E + T | T\nT -> a`);
    const diags = runDiagnostics(cfg);
    
    expect(diags.length).toBe(1);
    expect(diags[0].type).toBe('left-recursion');
    expect(diags[0].nonterminal).toBe('E');

    const newCfg = eliminateDirectLeftRecursion(cfg, 'E');
    const text = formatCFGToString(newCfg);
    
    // Expected output:
    // E -> T E'
    // E' -> + T E' | \epsilon
    expect(text).toContain("E -> T E'");
    expect(text).toContain("E' -> + T E' | \\epsilon");
    
    // Check that diagnostics are clear now
    const newDiags = runDiagnostics(newCfg);
    expect(newDiags.length).toBe(0);
  });

  it('detects and applies left factoring', () => {
    // A -> a b c | a b d
    const cfg = parseGrammarText(`A -> a b c | a b d`);
    const diags = runDiagnostics(cfg);

    expect(diags.length).toBe(1);
    expect(diags[0].type).toBe('left-factoring');
    expect(diags[0].nonterminal).toBe('A');

    const newCfg = leftFactor(cfg, 'A');
    const text = formatCFGToString(newCfg);

    // Expected output:
    // A -> a A1
    // A1 -> b c | b d
    expect(text).toContain('A -> a A1');
    expect(text).toContain('A1 -> b c | b d');
  });

  it('detects and removes unreachable symbols', () => {
    const cfg = parseGrammarText(`S -> a\nB -> b`);
    const diags = runDiagnostics(cfg);

    expect(diags.length).toBe(1);
    expect(diags[0].type).toBe('unreachable');
    expect(diags[0].nonterminal).toBe('B');

    const newCfg = removeUnreachable(cfg, 'B');
    const text = formatCFGToString(newCfg);

    expect(text).toBe('S -> a');
    expect(runDiagnostics(newCfg).length).toBe(0);
  });
});
