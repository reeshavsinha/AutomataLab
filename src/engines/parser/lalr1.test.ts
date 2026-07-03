import { describe, it, expect } from 'vitest';
import { CFG } from '../grammar/types';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLALR1Table } from './lalr1';
import { generateCLR1Table } from './clr1';
import { generateSLR1Table } from './slr1';

describe('LALR(1) Parser Engine', () => {
  it('should parse an LALR(1) grammar without conflicts and have fewer states than CLR(1)', () => {
    // Classic LALR(1) but not SLR(1) grammar
    // S -> L = R | R
    // L -> * R | id
    // R -> L
    const cfg: CFG = {
      terminals: new Set(['=', '*', 'id']),
      nonterminals: new Set(['S', 'L', 'R']),
      startSymbol: 'S',
      productions: [
        { lhs: 'S', rhs: ['L', '=', 'R'] },
        { lhs: 'S', rhs: ['R'] },
        { lhs: 'L', rhs: ['*', 'R'] },
        { lhs: 'L', rhs: ['id'] },
        { lhs: 'R', rhs: ['L'] }
      ]
    };

    const analysis = analyzeGrammar(cfg);
    const slrTable = generateSLR1Table(cfg, analysis);
    const clrTable = generateCLR1Table(cfg, analysis);
    const lalrTable = generateLALR1Table(cfg, analysis);

    // SLR(1) should have a conflict (shift/reduce on '=')
    expect(slrTable.hasConflict).toBe(true);

    // CLR(1) and LALR(1) should have no conflicts
    expect(clrTable.hasConflict).toBe(false);
    expect(lalrTable.hasConflict).toBe(false);

    // LALR(1) should merge states from CLR(1)
    expect(lalrTable.states.length).toBeLessThan(clrTable.states.length);
  });

  it('should detect conflicts for a grammar that is LR(1) but not LALR(1)', () => {
    // S -> a E c | a F d | b F c | b E d
    // E -> e
    // F -> e
    const cfg: CFG = {
      terminals: new Set(['a', 'b', 'c', 'd', 'e']),
      nonterminals: new Set(['S', 'E', 'F']),
      startSymbol: 'S',
      productions: [
        { lhs: 'S', rhs: ['a', 'E', 'c'] },
        { lhs: 'S', rhs: ['a', 'F', 'd'] },
        { lhs: 'S', rhs: ['b', 'F', 'c'] },
        { lhs: 'S', rhs: ['b', 'E', 'd'] },
        { lhs: 'E', rhs: ['e'] },
        { lhs: 'F', rhs: ['e'] }
      ]
    };

    const analysis = analyzeGrammar(cfg);
    const clrTable = generateCLR1Table(cfg, analysis);
    const lalrTable = generateLALR1Table(cfg, analysis);

    // CLR(1) has no conflicts
    expect(clrTable.hasConflict).toBe(false);
    
    // LALR(1) merging introduces a reduce/reduce conflict on 'c' and 'd'
    expect(lalrTable.hasConflict).toBe(true);
  });
});
