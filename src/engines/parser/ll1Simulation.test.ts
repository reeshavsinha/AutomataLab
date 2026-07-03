// src/engines/parser/ll1Simulation.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLL1Table } from './ll1';
import { LL1Simulation } from './ll1Simulation';
import { EOF_SYMBOL } from '../grammar/types';

describe('LL(1) Simulation Engine', () => {
  it('simulates parsing and accepts valid input', () => {
    // S -> a S b | \epsilon
    const text = `S -> a S b | \\epsilon`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const table = generateLL1Table(cfg, analysis);

    const sim = new LL1Simulation(cfg, table);
    // Input: 'a', 'a', 'b', 'b' -> derived from S -> aSb -> aaSbb -> aabb
    sim.initialize(['a', 'a', 'b', 'b']);

    expect(sim.status).toBe('running');
    expect(sim.stack.length).toBe(2); // [$, S]

    // Step 1: Expand S -> a S b
    expect(sim.step()).toBe(true);
    expect(sim.stack.map(n => n.symbol)).toEqual([EOF_SYMBOL, 'b', 'S', 'a']);

    // Step 2: Match 'a'
    expect(sim.step()).toBe(true);
    expect(sim.stack.map(n => n.symbol)).toEqual([EOF_SYMBOL, 'b', 'S']);
    expect(sim.inputIndex).toBe(1);

    // Run remaining steps automatically until complete or stuck
    let maxSteps = 50;
    while (sim.status === 'running' && maxSteps-- > 0) {
      sim.step();
    }

    expect(sim.status).toBe('accepted');
    expect(sim.stack.length).toBe(0);
    // Tree root is S, with 3 children: a, S, b
    expect(sim.tree?.symbol).toBe('S');
    expect(sim.tree?.children.length).toBe(3);
    expect(sim.tree?.children[0].symbol).toBe('a');
    expect(sim.tree?.children[1].symbol).toBe('S');
    expect(sim.tree?.children[2].symbol).toBe('b');
  });

  it('rejects invalid input', () => {
    const text = `S -> a S b | \\epsilon`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const table = generateLL1Table(cfg, analysis);

    const sim = new LL1Simulation(cfg, table);
    // Input: 'a', 'b', 'b' (missing 'a')
    sim.initialize(['a', 'b', 'b']);

    let maxSteps = 50;
    while (sim.status === 'running' && maxSteps-- > 0) {
      sim.step();
    }

    expect(sim.status).toBe('rejected');
  });
});
