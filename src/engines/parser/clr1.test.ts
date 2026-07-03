import { describe, it, expect } from 'vitest';
import { CFG, EOF_SYMBOL } from '../grammar/types';
import { analyzeGrammar } from '../grammar/analysis';
import { generateCLR1Table } from './clr1';

describe('CLR(1) Parser Engine', () => {
  it('should parse an LR(1) grammar without conflicts', () => {
    // Classic LR(1) but not LALR(1) grammar
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
    const table = generateCLR1Table(cfg, analysis);

    expect(table.hasConflict).toBe(false);
  });
});
