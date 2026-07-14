// src/engines/parser/lrSimulation.test.ts

import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { generateSLR1Table } from './slr1';
import { LRSimulation } from './lrSimulation';

describe('LR Simulation Engine', () => {
  it('correctly simulates a Shift/Reduce parse for a valid string', () => {
    // S -> A a | b
    // A -> b
    const text = `S -> A a | b\nA -> b`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const slr1 = generateSLR1Table(cfg, analysis);

    const sim = new LRSimulation(cfg, slr1);
    sim.initialize(['b', 'a']); // Valid string for S -> A a, where A -> b
    
    expect(sim.status).toBe('running');
    
    // Step 1: Shift 'b'
    sim.step();
    expect(sim.stack.length).toBe(3); // [0, b, StateTarget]
    expect(sim.inputIndex).toBe(1);

    // Step 2: Reduce A -> b
    // Note: GOTO(I0, A) gives State for A
    sim.step();
    expect(sim.stack.length).toBe(3); // [0, A, StateTarget]

    // Step 3: Shift 'a'
    sim.step();
    expect(sim.stack.length).toBe(5); // [0, A, StateTarget, a, StateTarget]

    // Step 4: Reduce S -> A a
    sim.step();
    expect(sim.stack.length).toBe(3); // [0, S, StateTarget]

    // Step 5: Accept
    sim.step();
    expect(sim.status).toBe('accepted');
    expect(sim.tree).toBeDefined();
    expect(sim.tree?.symbol).toBe('S');
    expect(sim.tree?.children?.length).toBe(2);
    expect(sim.tree?.children![0].symbol).toBe('A');
    expect(sim.tree?.children![1].symbol).toBe('a');
  });

  it('rejects invalid strings', () => {
    const text = `S -> a`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const slr1 = generateSLR1Table(cfg, analysis);

    const sim = new LRSimulation(cfg, slr1);
    sim.initialize(['b']); // Invalid string
    
    sim.step();
    expect(sim.status).toBe('rejected');
  });
});
