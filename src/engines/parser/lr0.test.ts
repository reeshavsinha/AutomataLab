// src/engines/parser/lr0.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { generateLR0Table, formatItem } from './lr0';

describe('LR(0) Matrix Generator', () => {
  it('generates correct states for a simple grammar', () => {
    // A classic simple grammar:
    // S -> A B
    // A -> a
    // B -> b
    const text = `S -> A B\nA -> a\nB -> b`;
    const cfg = parseGrammarText(text);
    const lr0 = generateLR0Table(cfg);

    // Initial state I0 should have S' -> . S, S -> . A B, A -> . a
    const state0 = lr0.states.find(s => s.id === 0);
    expect(state0).toBeDefined();
    
    const items = state0!.items.map(i => formatItem(i, lr0.augmentedCfg));
    expect(items).toContain("START -> . S");
    expect(items).toContain("S -> . A B");
    expect(items).toContain("A -> . a");
    
    // GOTO(I0, A) should exist
    const gotoA = lr0.gotoTable.get(0)?.get('A');
    expect(gotoA).toBeDefined();
    expect(gotoA).not.toBe(-1);

    // The state for GOTO(I0, A) should have S -> A . B and B -> . b
    const stateGotoA = lr0.states.find(s => s.id === gotoA);
    const itemsGotoA = stateGotoA!.items.map(i => formatItem(i, lr0.augmentedCfg));
    expect(itemsGotoA).toContain("S -> A . B");
    expect(itemsGotoA).toContain("B -> . b");
  });

  it('detects shift/reduce conflicts in ambiguous grammars', () => {
    // E -> E + E | id
    const text = `E -> E + E | id`;
    const cfg = parseGrammarText(text);
    const lr0 = generateLR0Table(cfg);

    // LR(0) cannot handle E -> E + E because it doesn't look ahead.
    // So there will be a Shift/Reduce conflict.
    expect(lr0.hasConflict).toBe(true);
  });
});
