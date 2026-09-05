import { describe, it, expect } from 'vitest';
import { parseGrammarText } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { generateLL1Table } from './ll1';
import { generateLR0Table } from './lr0';
import { generateSLR1Table } from './slr1';
import { generateLALR1Table } from './lalr1';
import { generateCLR1Table } from './clr1';
import { EarleySimulation } from './earley';
import { CYKSimulation } from './cyk';
import { LL1Simulation } from './ll1Simulation';
import { LRSimulation } from './lrSimulation';

describe('16 Requested Grammar Examples Validation', () => {
  // 1. Simple recursive CFG
  it('1. Simple recursive CFG (S -> a S b | eps)', () => {
    const text = 'S -> a S b | eps';
    const cfg = parseGrammarText(text);
    expect(cfg.startSymbol).toBe('S');
    const analysis = analyzeGrammar(cfg);
    expect(analysis.nullable.has('S')).toBe(true);

    const earley = new EarleySimulation(cfg);
    earley.initialize(['a', 'a', 'b', 'b']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
  });

  // 2. Balanced parentheses
  it('2. Balanced parentheses (S -> ( S ) S | eps)', () => {
    const text = 'S -> ( S ) S | eps';
    const cfg = parseGrammarText(text);
    const earley = new EarleySimulation(cfg);
    earley.initialize(['(', '(', ')', ')']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
  });

  // 3. Palindrome
  it('3. Palindrome (S -> a S a | b S b | a | b | eps)', () => {
    const text = 'S -> a S a | b S b | a | b | eps';
    const cfg = parseGrammarText(text);
    const earley = new EarleySimulation(cfg);
    earley.initialize(['a', 'b', 'b', 'a']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
  });

  // 4. Expression grammar (recursive / LR)
  it('4. Expression grammar (E -> E + T | T; T -> T * F | F; F -> ( E ) | id)', () => {
    const text = `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    expect(slr.hasConflict).toBe(false);

    const lrSim = new LRSimulation(cfg, slr);
    lrSim.initialize(['id', '+', 'id', '*', 'id']);
    while (lrSim.status === 'running') lrSim.step();
    expect(lrSim.status).toBe('accepted');
  });

  // 5. LL(1) expression grammar
  it('5. LL(1) expression grammar', () => {
    const text = `E -> T E2\nE2 -> + T E2 | eps\nT -> F T2\nT2 -> * F T2 | eps\nF -> ( E ) | id`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    expect(ll1.hasConflict).toBe(false);

    const llSim = new LL1Simulation(cfg, ll1);
    llSim.initialize(['id', '+', 'id', '*', 'id']);
    while (llSim.status === 'running') llSim.step();
    expect(llSim.status).toBe('accepted');
  });

  // 6. Grammar requiring left factoring
  it('6. Grammar requiring left factoring', () => {
    const text = `S -> if E then S else S | if E then S | id = E\nE -> id`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    // Left factoring needed means LL(1) has FIRST/FIRST conflict on 'if'
    expect(ll1.hasConflict).toBe(true);
  });

  // 7. Grammar with indirect left recursion
  it('7. Grammar with indirect left recursion', () => {
    const text = `A -> B a | b\nB -> A c | d`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    expect(cfg.nonterminals.has('A')).toBe(true);
    expect(cfg.nonterminals.has('B')).toBe(true);
  });

  // 8. Ambiguous expression grammar
  it('8. Ambiguous expression grammar', () => {
    const text = `E -> E + E | E * E | ( E ) | id`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const lr0 = generateLR0Table(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    const lalr = generateLALR1Table(cfg, analysis);
    const clr = generateCLR1Table(cfg, analysis);
    expect(lr0.hasConflict).toBe(true);
    expect(slr.hasConflict).toBe(true);
    expect(lalr.hasConflict).toBe(true);
    expect(clr.hasConflict).toBe(true);

    const earley = new EarleySimulation(cfg);
    earley.initialize(['id', '+', 'id', '*', 'id']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
    expect(earley.totalParses).toBeGreaterThan(1);
    expect(earley.isAmbiguous).toBe(true);
  });

  // 9. Dangling-else grammar
  it('9. Dangling-else grammar', () => {
    const text = `S -> if E then S else S | if E then S | other\nE -> cond`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    // Dangling else produces shift-reduce conflict in LR/SLR parsers
    expect(slr.hasConflict).toBe(true);
  });

  // 10. LR(0) grammar
  it('10. LR(0) grammar (conflict-free in LR(0))', () => {
    const text = `S -> ( S ) | id`;
    const cfg = parseGrammarText(text);
    const lr0 = generateLR0Table(cfg);
    expect(lr0.hasConflict).toBe(false);

    const lrSim = new LRSimulation(cfg, lr0);
    lrSim.initialize(['(', '(', 'id', ')', ')']);
    while (lrSim.status === 'running') lrSim.step();
    expect(lrSim.status).toBe('accepted');
  });

  // 11. SLR(1)-but-not-LR(0) grammar
  it('11. SLR(1)-but-not-LR(0) grammar', () => {
    const text = `S -> A a | b\nA -> b`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const lr0 = generateLR0Table(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    expect(lr0.hasConflict).toBe(true);
    expect(slr.hasConflict).toBe(false);
  });

  // 12. LALR(1)-but-not-SLR(1) grammar
  it('12. LALR(1)-but-not-SLR(1) grammar', () => {
    const text = `S -> L = R | R\nL -> * R | id\nR -> L`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    const lalr = generateLALR1Table(cfg, analysis);
    const clr = generateCLR1Table(cfg, analysis);
    expect(slr.hasConflict).toBe(true);
    expect(lalr.hasConflict).toBe(false);
    expect(clr.hasConflict).toBe(false);
  });

  // 13. CLR(1)-but-not-LALR(1) grammar
  it('13. CLR(1)-but-not-LALR(1) grammar', () => {
    const text = `S -> a E c | a F d | b F c | b E d\nE -> e\nF -> e`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const lalr = generateLALR1Table(cfg, analysis);
    const clr = generateCLR1Table(cfg, analysis);
    expect(lalr.hasConflict).toBe(true);
    expect(clr.hasConflict).toBe(false);
  });

  // 14. CFG that is not LR(1), for Earley
  it('14. CFG that is not LR(1), for Earley', () => {
    // Unbounded lookahead requirement: S -> A | B; A -> a A b | 0; B -> a B b b | 1
    // (or unmarked palindrome S -> a S a | b S b | eps)
    const text = `S -> a S a | b S b | eps`;
    const cfg = parseGrammarText(text);
    const analysis = analyzeGrammar(cfg);
    const clr = generateCLR1Table(cfg, analysis);
    expect(clr.hasConflict).toBe(true);

    const earley = new EarleySimulation(cfg);
    earley.initialize(['a', 'b', 'b', 'a']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
  });

  // 15. Ambiguous CFG for Earley
  it('15. Ambiguous CFG for Earley', () => {
    const text = `E -> E + E | E * E | ( E ) | id`;
    const cfg = parseGrammarText(text);
    const earley = new EarleySimulation(cfg);
    earley.initialize(['id', '+', 'id', '+', 'id']);
    while (earley.status === 'running') earley.step();
    expect(earley.status).toBe('accepted');
    expect(earley.totalParses).toBe(2);
    expect(earley.isAmbiguous).toBe(true);
  });

  // 16. CNF grammar specifically for CYK
  it('16. CNF grammar specifically for CYK', () => {
    const text = `S -> A B | B C\nA -> B A | a\nB -> C C | b\nC -> A B | c`;
    const cfg = parseGrammarText(text);
    
    // Verify every production is in Chomsky Normal Form (A -> BC or A -> a)
    for (const p of cfg.productions) {
      const isTwoNT = p.rhs.length === 2 && /^[A-Z]/.test(p.rhs[0]) && /^[A-Z]/.test(p.rhs[1]);
      const isOneTerm = p.rhs.length === 1 && !/^[A-Z]/.test(p.rhs[0]);
      expect(isTwoNT || isOneTerm).toBe(true);
    }

    const cyk = new CYKSimulation(cfg);
    cyk.initialize(['b', 'a', 'b']);
    while (cyk.status === 'running') cyk.step();
    expect(cyk.status).toBe('accepted');
  });
});
