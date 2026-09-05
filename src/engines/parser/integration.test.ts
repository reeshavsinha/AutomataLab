// src/engines/parser/integration.test.ts
//
// Full end-to-end integration coverage of the grammar/parser pipeline after the
// deterministic tokenizer change. Drives the REAL engines the UI uses:
//   parse → FIRST/FOLLOW → ParserBuilder (LL1/LR0/SLR1/CLR1/LALR1)
//         → LR & LL stack simulation → automaton graph (states/goto/actions)
//         → CYK / Earley / Backtracking parse trees
//         → grammar-lab tabs (diagnostics, transformations, CNF/GNF, derivation, ambiguity)

import { describe, it, expect } from 'vitest';
import { parseGrammarText, tokenizeInputString } from '../grammar/parser';
import { analyzeGrammar } from '../grammar/analysis';
import { runDiagnostics } from '../grammar/diagnostics';
import {
  eliminateDirectLeftRecursion,
  leftFactor,
  formatCFGToString,
  convertToCNF,
  convertToGNF,
} from '../grammar/transformations';
import { EOF_SYMBOL, EPSILON } from '../grammar/types';
import { ParserBuilder } from './builder';
import { ParsingSession } from './session';
import { generateLL1Table } from './ll1';
import { generateLR0Table, formatItem } from './lr0';
import { generateSLR1Table } from './slr1';
import { LL1Simulation } from './ll1Simulation';
import { LRSimulation } from './lrSimulation';
import { EarleySimulation } from './earley';
import { CYKSimulation } from './cyk';
import { BacktrackingSimulation } from './backtracking';
import type { ParserEngine } from './model';

function run(engine: ParserEngine, tokens: string[]): ParserEngine {
  engine.initialize(tokens);
  let guard = 0;
  while (engine.status === 'running' && guard++ < 100_000) engine.step();
  return engine;
}

// ─────────────────────────────────────────────────────────────────────────────
// G1: classic expression grammar — spaced symbols + multi-character terminal `id`
// ─────────────────────────────────────────────────────────────────────────────
const G1 = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`;

describe('Integration G1 — expression grammar (multi-char terminal id)', () => {
  const cfg = parseGrammarText(G1);

  it('tokenizes into correct grammar symbols', () => {
    expect(Array.from(cfg.terminals).sort()).toEqual(['(', ')', '*', '+', 'id']);
    expect(cfg.productions.find(p => p.lhs === 'F' && p.rhs[0] === 'id')?.rhs).toEqual(['id']);
  });

  it('FIRST/FOLLOW are correct', () => {
    const a = analyzeGrammar(cfg);
    expect(a.firstSets.get('E')).toEqual(new Set(['(', 'id']));
    expect(a.firstSets.get('T')).toEqual(new Set(['(', 'id']));
    expect(a.firstSets.get('F')).toEqual(new Set(['(', 'id']));
    expect(a.followSets.get('E')).toEqual(new Set([EOF_SYMBOL, '+', ')']));
    expect(a.followSets.get('T')).toEqual(new Set([EOF_SYMBOL, '+', ')', '*']));
  });

  it('ParserBuilder builds all five tables', () => {
    const { model, diagnostics } = ParserBuilder.build(cfg);
    expect(diagnostics).toBeUndefined();
    expect(model).toBeDefined();
    expect(model!.parsers.ll1.table).not.toBeNull();
    expect(model!.parsers.lr0.table).not.toBeNull();
    expect(model!.parsers.slr.table).not.toBeNull();
    expect(model!.parsers.clr.table).not.toBeNull();
    expect(model!.parsers.lalr.table).not.toBeNull();
    // Left recursion ⇒ not LL(1); SLR/CLR/LALR resolve the expression grammar.
    expect(model!.parsers.ll1.hasConflict).toBe(true);
    expect(model!.parsers.slr.hasConflict).toBe(false);
    expect(model!.parsers.clr.hasConflict).toBe(false);
    expect(model!.parsers.lalr.hasConflict).toBe(false);
  });

  it('automaton graph (SLR states / goto / actions) is well-formed', () => {
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);

    expect(slr.states.length).toBeGreaterThan(0);
    // Every state has at least one item, and its label renders the symbols.
    for (const s of slr.states) {
      expect(s.items.length).toBeGreaterThan(0);
      s.items.forEach(it => expect(typeof formatItem(it, slr.augmentedCfg)).toBe('string'));
    }
    // GOTO edges point to real states (absent entries are encoded as -1).
    const gotoTargets = [...slr.gotoTable.values()].flatMap(m => [...m.values()]);
    expect(gotoTargets.some(t => t >= 0 && t < slr.states.length)).toBe(true);
    expect(gotoTargets.every(t => t === -1 || (t >= 0 && t < slr.states.length))).toBe(true);
    // A shift action on the multi-char terminal `id` exists somewhere.
    const shiftsId = [...slr.actionTable.values()].some(m =>
      (m.get('id') || []).some(a => a.type === 'Shift'));
    expect(shiftsId).toBe(true);
    // The multi-char terminal survives into item labels (never split into i,d).
    const anyIdLabel = slr.states.some(s =>
      s.items.some(it => formatItem(it, slr.augmentedCfg).includes('id')));
    expect(anyIdLabel).toBe(true);
  });

  it('LR simulation accepts a valid string and exposes the stack', () => {
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    const sim = new LRSimulation(cfg, slr);
    sim.initialize(['id', '+', 'id', '*', 'id']);
    let sawStack = false;
    let guard = 0;
    while (sim.status === 'running' && guard++ < 100_000) {
      sim.step();
      if (sim.stack.length > 0) sawStack = true;
    }
    expect(sim.status).toBe('accepted');
    expect(sawStack).toBe(true);
  });

  it('LR simulation rejects an invalid string', () => {
    const analysis = analyzeGrammar(cfg);
    const slr = generateSLR1Table(cfg, analysis);
    const sim = run(new LRSimulation(cfg, slr), ['id', '+', '+']);
    expect(sim.status).toBe('rejected');
  });

  it('Earley builds a parse tree for a valid string', () => {
    const sim = run(new EarleySimulation(cfg), ['id', '+', 'id', '*', 'id']);
    expect(sim.status).toBe('accepted');
    expect(sim.tree).not.toBeNull();
    expect(sim.tree!.symbol).toBe('E');
  });

  it('CYK accepts a valid string (internal CNF conversion)', () => {
    const sim = run(new CYKSimulation(cfg), ['id', '+', 'id']);
    expect(sim.status).toBe('accepted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G2: quoted + multi-character terminals
// ─────────────────────────────────────────────────────────────────────────────
const G2 = `S -> A | B
A -> "aa" A b | "ab" | x
B -> a B b | x`;

describe('Integration G2 — quoted/multi-char terminals', () => {
  const cfg = parseGrammarText(G2);

  it('parses quoted terminals as single symbols', () => {
    expect(cfg.terminals.has('aa')).toBe(true);
    expect(cfg.terminals.has('ab')).toBe(true);
    const aProds = cfg.productions.filter(p => p.lhs === 'A').map(p => p.rhs);
    expect(aProds).toEqual([['aa', 'A', 'b'], ['ab'], ['x']]);
  });

  it('FIRST(A) uses the quoted multi-char terminals', () => {
    const a = analyzeGrammar(cfg);
    expect(a.firstSets.get('A')).toEqual(new Set(['aa', 'ab', 'x']));
  });

  it('Earley accepts strings built from multi-char terminals', () => {
    // A ⇒ "aa" A b ⇒ "aa" "ab" b
    const sim = run(new EarleySimulation(cfg), ['aa', 'ab', 'b']);
    expect(sim.status).toBe('accepted');
    expect(sim.tree).not.toBeNull();
  });

  it('ParserBuilder builds without throwing for this grammar', () => {
    const { model, diagnostics } = ParserBuilder.build(cfg);
    expect(diagnostics).toBeUndefined();
    expect(model).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G3: LL(1) grammar with epsilon — LL(1) parse table + LL stack simulation
// ─────────────────────────────────────────────────────────────────────────────
const G3 = `S -> a S b | eps`;

describe('Integration G3 — LL(1) table & stack simulation', () => {
  const cfg = parseGrammarText(G3);

  it('builds a conflict-free LL(1) table with correct entries', () => {
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    expect(ll1.hasConflict).toBe(false);
    expect(ll1.table.get('S')?.get('a')?.[0].rhs).toEqual(['a', 'S', 'b']);
    expect(ll1.table.get('S')?.get(EOF_SYMBOL)?.[0].rhs).toEqual([EPSILON]);
  });

  it('LL(1) simulation accepts a valid string and grows the stack', () => {
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    const sim = new LL1Simulation(cfg, ll1);
    sim.initialize(['a', 'a', 'b', 'b']);
    let sawStack = false;
    let guard = 0;
    while (sim.status === 'running' && guard++ < 100_000) {
      sim.step();
      if (sim.stack.length > 0) sawStack = true;
    }
    expect(sim.status).toBe('accepted');
    expect(sawStack).toBe(true);
  });

  it('LL(1) simulation rejects an invalid string', () => {
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    const sim = run(new LL1Simulation(cfg, ll1), ['a', 'b', 'b']);
    expect(sim.status).toBe('rejected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G4: LL(1) expression grammar with two multi-char terminals (id, num)
// ─────────────────────────────────────────────────────────────────────────────
const G4 = `E -> T Eprime
Eprime -> + T Eprime | eps
T -> F Tprime
Tprime -> * F Tprime | eps
F -> ( E ) | id | num`;

describe('Integration G4 — multi-char terminals in an LL(1) grammar', () => {
  const cfg = parseGrammarText(G4);

  it('FIRST(F) contains both multi-char terminals', () => {
    const a = analyzeGrammar(cfg);
    expect(a.firstSets.get('F')).toEqual(new Set(['(', 'id', 'num']));
  });

  it('LL(1) table distinguishes id and num', () => {
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    expect(ll1.hasConflict).toBe(false);
    expect(ll1.table.get('F')?.get('id')?.[0].rhs).toEqual(['id']);
    expect(ll1.table.get('F')?.get('num')?.[0].rhs).toEqual(['num']);
  });

  it('LL(1) simulation accepts id + num', () => {
    const analysis = analyzeGrammar(cfg);
    const ll1 = generateLL1Table(cfg, analysis);
    const sim = run(new LL1Simulation(cfg, ll1), ['id', '+', 'num']);
    expect(sim.status).toBe('accepted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ParsingSession wiring (as parserStore constructs it) + input tokenizer path
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration — ParsingSession + input tokenization', () => {
  it('accepts input tokenized against the terminal alphabet', () => {
    const cfg = parseGrammarText(G3);
    const { model } = ParserBuilder.build(cfg);
    const analysis = analyzeGrammar(cfg);
    const engine = new LRSimulation(cfg, generateSLR1Table(cfg, analysis));

    // parserStore tokenizes the raw input against the terminal alphabet.
    const tokens = tokenizeInputString('aabb', cfg.terminals);
    expect(tokens).toEqual(['a', 'a', 'b', 'b']);

    engine.initialize(tokens);
    const session = new ParsingSession(model!, 'slr', engine, 'aabb');
    expect(session.status).toBe('running');

    let guard = 0;
    while (engine.status === 'running' && guard++ < 100_000) engine.step();
    expect(engine.status).toBe('accepted');
    expect(session.stack).toBeDefined();
  });

  it('rejects input containing an unknown token', () => {
    const cfg = parseGrammarText(G3);
    const { model } = ParserBuilder.build(cfg);
    const analysis = analyzeGrammar(cfg);
    const engine = new LRSimulation(cfg, generateSLR1Table(cfg, analysis));
    engine.initialize(['a', 'z', 'b']); // 'z' is not a terminal
    expect(() => new ParsingSession(model!, 'slr', engine, 'azb')).toThrow(/unknown token/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Grammar Laboratory tabs (engine-level): diagnostics, transformations, CNF/GNF,
// derivation (Earley), ambiguity (backtracking)
// ─────────────────────────────────────────────────────────────────────────────
describe('Integration — Grammar Laboratory tabs', () => {
  it('diagnostics detect left recursion in the expression grammar', () => {
    const cfg = parseGrammarText(G1);
    const diags = runDiagnostics(cfg);
    const lr = diags.filter(d => d.type === 'left-recursion').map(d => d.nonterminal).sort();
    expect(lr).toEqual(['E', 'T']);
  });

  it('does NOT emit "forgot spaces" style diagnostics for multi-char symbols', () => {
    const cfg = parseGrammarText('S -> id num Foo\nFoo -> a');
    const diags = runDiagnostics(cfg);
    expect(diags.every(d => !/forget spaces|Suspicious terminal/i.test(d.message))).toBe(true);
  });

  it('left-recursion elimination round-trips through the tokenizer', () => {
    const cfg = parseGrammarText(`E -> E + T | T\nT -> a`);
    const out = formatCFGToString(eliminateDirectLeftRecursion(cfg, 'E'));
    expect(out).toContain("E -> T E'");
    // The reformatted grammar re-parses cleanly (round-trip safe).
    expect(() => parseGrammarText(out)).not.toThrow();
    expect(runDiagnostics(parseGrammarText(out)).some(d => d.type === 'left-recursion')).toBe(false);
  });

  it('left factoring works', () => {
    const cfg = parseGrammarText(`A -> a b c | a b d`);
    const out = formatCFGToString(leftFactor(cfg, 'A'));
    expect(out).toContain('A -> a A1');
    expect(out).toContain('A1 -> b c | b d');
  });

  it('CNF and GNF conversions produce re-parseable grammars', () => {
    const cnf = convertToCNF(parseGrammarText(G1));
    expect(cnf.productions.length).toBeGreaterThan(0);
    // CNF should still accept a valid string via CYK.
    const cyk = run(new CYKSimulation(cnf), ['id', '+', 'id']);
    expect(cyk.status).toBe('accepted');

    // GNF conversion may introduce a fresh start symbol; just assert it is valid.
    const gnf = convertToGNF(parseGrammarText(`A -> a A | a`));
    expect(gnf.startSymbol.length).toBeGreaterThan(0);
    expect(gnf.nonterminals.has(gnf.startSymbol)).toBe(true);
    expect(gnf.productions.length).toBeGreaterThan(0);
  });

  it('derivation tab: Earley yields a tree whose root is the start symbol', () => {
    const cfg = parseGrammarText(G1);
    const tokens = tokenizeInputString('id + id', cfg.terminals);
    expect(tokens).toEqual(['id', '+', 'id']);
    const sim = run(new EarleySimulation(cfg), tokens);
    expect(sim.status).toBe('accepted');
    expect(sim.tree?.symbol).toBe('E');
  });

  it('ambiguity tab: backtracking parser accepts a valid string', () => {
    const cfg = parseGrammarText(`S -> a S | a`);
    const sim = run(new BacktrackingSimulation(cfg), ['a', 'a', 'a']);
    expect(sim.status).toBe('accepted');
  });
});
