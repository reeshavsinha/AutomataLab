import { MachineDefinition, AutomataState, MachineType } from '@/engines/machine/core/types';

// ============================================================
// AutomataLab — Built-in example gallery
// One flat registry consumed by the Toolbar "Load Example" menu. Entries are
// grouped in the UI by their `type` (machine workspace: DFA/NFA/ENFA/DPDA/
// NPDA/TM/LBA; grammar workspace: CFG/CSG; parser workspace: CFG_PARSER).
//
// Machine automata are built with small helpers so coordinates/ids stay
// consistent and correct. Grammars are plain `grammarText`.
// ============================================================

type Ex = Omit<MachineDefinition, 'id'> & { id?: string };
type Flag = 'S' | 'A' | 'SA' | 'AS' | '';
type SDef = [string, Flag?];

const GAP_X = 170;
const GAP_Y = 150;
const PER_ROW = 6;
const X0 = 120;
const Y0 = 120;

function layoutStates(defs: SDef[]): AutomataState[] {
  return defs.map(([id, flag = ''], i) => ({
    id,
    label: id,
    x: X0 + (i % PER_ROW) * GAP_X,
    y: Y0 + Math.floor(i / PER_ROW) * GAP_Y,
    isStart: flag.includes('S'),
    isAccept: flag.includes('A'),
  }));
}

function syms(on: string | string[]): string[] {
  const arr = Array.isArray(on) ? on : on.split(',');
  return arr.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Finite automaton (DFA / NFA / ε-NFA). Edges: [from, to, symbols]. */
function fa(
  name: string,
  type: 'DFA' | 'NFA' | 'ENFA',
  alphabet: string[],
  language: string,
  states: SDef[],
  edges: Array<[string, string, string | string[]]>,
): Ex {
  return {
    name,
    type,
    language,
    alphabet,
    states: layoutStates(states),
    transitions: edges.map(([from, to, on], i) => ({
      id: `t${i + 1}`,
      from,
      to,
      symbols: syms(on),
    })),
  };
}

interface PEdge { from: string; to: string; read?: string; pop?: string; push?: string }

/** Pushdown automaton (DPDA / NPDA). ε defaults for read/pop/push. */
function pda(
  name: string,
  type: 'DPDA' | 'NPDA',
  alphabet: string[],
  stackAlphabet: string[],
  language: string,
  states: SDef[],
  edges: PEdge[],
): Ex {
  return {
    name,
    type,
    language,
    alphabet,
    stackAlphabet,
    states: layoutStates(states),
    transitions: edges.map((e, i) => ({
      id: `t${i + 1}`,
      from: e.from,
      to: e.to,
      symbols: [e.read || 'eps'],
      read: e.read || 'eps',
      pop: e.pop || 'eps',
      push: e.push || 'eps',
    })),
  };
}

interface TEdge { from: string; to: string; read: string; write?: string; dir: 'L' | 'R' | 'S' }

/** Single-tape Turing machine / LBA. Edges: {from,to,read,write?,dir}. */
function tm(
  name: string,
  type: 'TM' | 'LBA',
  alphabet: string[],
  tapeAlphabet: string[],
  language: string,
  states: SDef[],
  edges: TEdge[],
  blank = '_',
): Ex {
  return {
    name,
    type,
    language,
    alphabet,
    tapeAlphabet,
    blankSymbol: blank,
    states: layoutStates(states),
    transitions: edges.map((e, i) => ({
      id: `t${i + 1}`,
      from: e.from,
      to: e.to,
      symbols: [],
      read: e.read,
      write: e.write ?? e.read,
      direction: e.dir,
    })),
  };
}

/** Grammar / parser example (CFG / CSG / CFG_PARSER). */
function g(name: string, type: 'CFG' | 'CSG' | 'CFG_PARSER', grammarText: string, language: string): Ex {
  return { name, type, grammarText, language, states: [], transitions: [], alphabet: [] };
}

export const EXAMPLES: Record<string, Ex> = {
  mealyParity: {
    name: 'Mealy: Running parity',
    type: 'MEALY',
    language: 'Outputs 0 for even and 1 for odd parity after each input bit',
    alphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    states: [
      { id: 'even', label: 'even', x: 120, y: 140, isStart: true, isAccept: true },
      { id: 'odd', label: 'odd', x: 300, y: 140, isStart: false, isAccept: false },
    ],
    transitions: [
      { id: 't1', from: 'even', to: 'odd', symbols: ['1'], output: '1' },
      { id: 't2', from: 'even', to: 'even', symbols: ['0'], output: '0' },
      { id: 't3', from: 'odd', to: 'even', symbols: ['1'], output: '0' },
      { id: 't4', from: 'odd', to: 'odd', symbols: ['0'], output: '1' },
    ],
  },
  mooreParity: {
    name: 'Moore: Running parity',
    type: 'MOORE',
    language: 'Outputs the current parity state after each transition',
    alphabet: ['0', '1'],
    outputAlphabet: ['0', '1'],
    states: [
      { id: 'even', label: 'even', x: 120, y: 140, isStart: true, isAccept: true, output: '0' },
      { id: 'odd', label: 'odd', x: 300, y: 140, isStart: false, isAccept: false, output: '1' },
    ],
    transitions: [
      { id: 't1', from: 'even', to: 'odd', symbols: ['1'] },
      { id: 't2', from: 'even', to: 'even', symbols: ['0'] },
      { id: 't3', from: 'odd', to: 'even', symbols: ['1'] },
      { id: 't4', from: 'odd', to: 'odd', symbols: ['0'] },
    ],
  },
  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — Deterministic Finite Automata (DFA)
  // ══════════════════════════════════════════════════════════
  dfaEvenZeros: fa('DFA: Even number of 0s', 'DFA', ['0', '1'], 'Strings with an even number of 0s',
    [['q0', 'SA'], ['q1', '']],
    [['q0', 'q1', '0'], ['q1', 'q0', '0'], ['q0', 'q0', '1'], ['q1', 'q1', '1']]),

  dfaOddOnes: fa('DFA: Odd number of 1s', 'DFA', ['0', '1'], 'Strings with an odd number of 1s',
    [['even', 'S'], ['odd', 'A']],
    [['even', 'odd', '1'], ['odd', 'even', '1'], ['even', 'even', '0'], ['odd', 'odd', '0']]),

  dfaEvenAB: fa('DFA: Even number of a', 'DFA', ['a', 'b'], 'Even number of a over {a,b}',
    [['q0', 'SA'], ['q1', '']],
    [['q0', 'q1', 'a'], ['q1', 'q0', 'a'], ['q0', 'q0', 'b'], ['q1', 'q1', 'b']]),

  dfaDiv3Binary: fa('DFA: Binary divisible by 3', 'DFA', ['0', '1'], 'Binary numbers with value ≡ 0 (mod 3)',
    [['r0', 'SA'], ['r1', ''], ['r2', '']],
    [['r0', 'r0', '0'], ['r0', 'r1', '1'], ['r1', 'r2', '0'], ['r1', 'r0', '1'], ['r2', 'r1', '0'], ['r2', 'r2', '1']]),

  dfaEvenBinary: fa('DFA: Binary divisible by 2', 'DFA', ['0', '1'], 'Binary numbers ending in 0 (even)',
    [['q0', 'S'], ['q1', 'A']],
    [['q0', 'q1', '0'], ['q1', 'q1', '0'], ['q0', 'q0', '1'], ['q1', 'q0', '1']]),

  dfaContains101: fa('DFA: Contains 101', 'DFA', ['0', '1'], 'Strings containing the substring 101',
    [['s0', 'S'], ['s1', ''], ['s2', ''], ['s3', 'A']],
    [['s0', 's1', '1'], ['s0', 's0', '0'], ['s1', 's1', '1'], ['s1', 's2', '0'], ['s2', 's3', '1'], ['s2', 's0', '0'], ['s3', 's3', '0'], ['s3', 's3', '1']]),

  dfaContains00: fa('DFA: Contains 00', 'DFA', ['0', '1'], 'Strings containing the substring 00',
    [['s0', 'S'], ['s1', ''], ['s2', 'A']],
    [['s0', 's1', '0'], ['s0', 's0', '1'], ['s1', 's2', '0'], ['s1', 's0', '1'], ['s2', 's2', '0'], ['s2', 's2', '1']]),

  dfaEndsIn00: fa('DFA: Ends in 00', 'DFA', ['0', '1'], 'Strings ending in 00',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q1', '0'], ['q0', 'q0', '1'], ['q1', 'q2', '0'], ['q1', 'q0', '1'], ['q2', 'q2', '0'], ['q2', 'q0', '1']]),

  dfaEndsIn11: fa('DFA: Ends in 11', 'DFA', ['0', '1'], 'Strings ending in 11',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q1', '1'], ['q0', 'q0', '0'], ['q1', 'q2', '1'], ['q1', 'q0', '0'], ['q2', 'q2', '1'], ['q2', 'q0', '0']]),

  dfaStartsWith1: fa('DFA: Starts with 1', 'DFA', ['0', '1'], 'Strings that begin with 1',
    [['q0', 'S'], ['q1', 'A'], ['dead', '']],
    [['q0', 'q1', '1'], ['q0', 'dead', '0'], ['q1', 'q1', '0'], ['q1', 'q1', '1'], ['dead', 'dead', '0'], ['dead', 'dead', '1']]),

  dfaEvenLength: fa('DFA: Even length', 'DFA', ['0', '1'], 'Strings of even length',
    [['even', 'SA'], ['odd', '']],
    [['even', 'odd', '0'], ['even', 'odd', '1'], ['odd', 'even', '0'], ['odd', 'even', '1']]),

  dfaLenMult3: fa('DFA: Length multiple of 3', 'DFA', ['0', '1'], 'Strings whose length is a multiple of 3',
    [['q0', 'SA'], ['q1', ''], ['q2', '']],
    [['q0', 'q1', '0'], ['q0', 'q1', '1'], ['q1', 'q2', '0'], ['q1', 'q2', '1'], ['q2', 'q0', '0'], ['q2', 'q0', '1']]),

  dfaNoConsecutive1: fa('DFA: No two consecutive 1s', 'DFA', ['0', '1'], 'Strings with no substring 11',
    [['q0', 'SA'], ['q1', 'A'], ['dead', '']],
    [['q0', 'q0', '0'], ['q0', 'q1', '1'], ['q1', 'q0', '0'], ['q1', 'dead', '1'], ['dead', 'dead', '0'], ['dead', 'dead', '1']]),

  dfaEven0Even1: fa('DFA: Even 0s and even 1s', 'DFA', ['0', '1'], 'Even number of 0s and even number of 1s',
    [['ee', 'SA'], ['eo', ''], ['oe', ''], ['oo', '']],
    [['ee', 'oe', '0'], ['ee', 'eo', '1'], ['oe', 'ee', '0'], ['oe', 'oo', '1'], ['eo', 'oo', '0'], ['eo', 'ee', '1'], ['oo', 'eo', '0'], ['oo', 'oe', '1']]),

  dfaAtLeastTwo1: fa('DFA: At least two 1s', 'DFA', ['0', '1'], 'Strings with at least two 1s',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q1', '1'], ['q0', 'q0', '0'], ['q1', 'q2', '1'], ['q1', 'q1', '0'], ['q2', 'q2', '1'], ['q2', 'q2', '0']]),

  dfaExactlyTwo1: fa('DFA: Exactly two 1s', 'DFA', ['0', '1'], 'Strings with exactly two 1s',
    [['q0', 'S'], ['q1', ''], ['q2', 'A'], ['dead', '']],
    [['q0', 'q1', '1'], ['q0', 'q0', '0'], ['q1', 'q2', '1'], ['q1', 'q1', '0'], ['q2', 'dead', '1'], ['q2', 'q2', '0'], ['dead', 'dead', '0'], ['dead', 'dead', '1']]),

  dfaContainsAb: fa('DFA: Contains "ab"', 'DFA', ['a', 'b'], 'Strings over {a,b} containing "ab"',
    [['s0', 'S'], ['s1', ''], ['s2', 'A']],
    [['s0', 's1', 'a'], ['s0', 's0', 'b'], ['s1', 's1', 'a'], ['s1', 's2', 'b'], ['s2', 's2', 'a'], ['s2', 's2', 'b']]),

  dfaEndsA: fa('DFA: Ends with a', 'DFA', ['a', 'b'], 'Strings over {a,b} ending with a',
    [['q0', 'S'], ['q1', 'A']],
    [['q0', 'q1', 'a'], ['q0', 'q0', 'b'], ['q1', 'q1', 'a'], ['q1', 'q0', 'b']]),

  dfaContainsAbc: fa('DFA: Contains "abc"', 'DFA', ['a', 'b', 'c'], 'Strings over {a,b,c} containing "abc"',
    [['s0', 'S'], ['s1', ''], ['s2', ''], ['s3', 'A']],
    [['s0', 's1', 'a'], ['s0', 's0', 'b'], ['s0', 's0', 'c'], ['s1', 's1', 'a'], ['s1', 's2', 'b'], ['s1', 's0', 'c'], ['s2', 's1', 'a'], ['s2', 's0', 'b'], ['s2', 's3', 'c'], ['s3', 's3', 'a'], ['s3', 's3', 'b'], ['s3', 's3', 'c']]),

  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — Nondeterministic Finite Automata (NFA)
  // ══════════════════════════════════════════════════════════
  nfaEndsIn11: fa('NFA: Ends in 11', 'NFA', ['0', '1'], 'Strings ending in 11',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q0', '0,1'], ['q0', 'q1', '1'], ['q1', 'q2', '1']]),

  nfaContains01: fa('NFA: Contains 01', 'NFA', ['0', '1'], 'Strings containing 01',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q0', '0,1'], ['q0', 'q1', '0'], ['q1', 'q2', '1'], ['q2', 'q2', '0,1']]),

  nfaThirdFromEnd1: fa('NFA: 3rd symbol from end is 1', 'NFA', ['0', '1'], 'Third symbol from the end is a 1',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', 'A']],
    [['q0', 'q0', '0,1'], ['q0', 'q1', '1'], ['q1', 'q2', '0,1'], ['q2', 'q3', '0,1']]),

  nfaEndsAb: fa('NFA: Ends with "ab"', 'NFA', ['a', 'b'], 'Strings over {a,b} ending with ab',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q0', 'a,b'], ['q0', 'q1', 'a'], ['q1', 'q2', 'b']]),

  nfaAbbClass: fa('NFA: (a|b)*abb', 'NFA', ['a', 'b'], 'Strings ending in abb',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', 'A']],
    [['q0', 'q0', 'a,b'], ['q0', 'q1', 'a'], ['q1', 'q2', 'b'], ['q2', 'q3', 'b']]),

  nfaContainsAba: fa('NFA: Contains "aba"', 'NFA', ['a', 'b'], 'Strings over {a,b} containing aba',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', 'A']],
    [['q0', 'q0', 'a,b'], ['q0', 'q1', 'a'], ['q1', 'q2', 'b'], ['q2', 'q3', 'a'], ['q3', 'q3', 'a,b']]),

  nfa00or11: fa('NFA: Contains 00 or 11', 'NFA', ['0', '1'], 'Strings containing 00 or 11',
    [['q0', 'S'], ['qa', ''], ['qb', ''], ['acc', 'A']],
    [['q0', 'q0', '0,1'], ['q0', 'qa', '0'], ['qa', 'acc', '0'], ['q0', 'qb', '1'], ['qb', 'acc', '1'], ['acc', 'acc', '0,1']]),

  nfaSecondIsB: fa('NFA: Second symbol is b', 'NFA', ['a', 'b'], 'Strings whose second symbol is b',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q1', 'a,b'], ['q1', 'q2', 'b'], ['q2', 'q2', 'a,b']]),

  nfaEndsInAbc: fa('NFA: Ends with "abc"', 'NFA', ['a', 'b', 'c'], 'Strings over {a,b,c} ending in abc',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', 'A']],
    [['q0', 'q0', 'a,b,c'], ['q0', 'q1', 'a'], ['q1', 'q2', 'b'], ['q2', 'q3', 'c']]),

  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — ε-NFA
  // ══════════════════════════════════════════════════════════
  enfaAStarBStar: fa('ε-NFA: a*b*', 'ENFA', ['a', 'b'], 'Zero or more a followed by zero or more b',
    [['q0', 'SA'], ['q1', 'A']],
    [['q0', 'q0', 'a'], ['q0', 'q1', 'ε'], ['q1', 'q1', 'b']]),

  enfaAStarBStarCStar: fa('ε-NFA: a*b*c*', 'ENFA', ['a', 'b', 'c'], 'a* b* c*',
    [['q0', 'SA'], ['q1', 'A'], ['q2', 'A']],
    [['q0', 'q0', 'a'], ['q0', 'q1', 'ε'], ['q1', 'q1', 'b'], ['q1', 'q2', 'ε'], ['q2', 'q2', 'c']]),

  enfaAbStar: fa('ε-NFA: (ab)*', 'ENFA', ['a', 'b'], 'Zero or more repetitions of ab',
    [['start', 'SA'], ['q0', 'A'], ['q1', '']],
    [['start', 'q0', 'ε'], ['q0', 'q1', 'a'], ['q1', 'q0', 'b']]),

  enfaUnionWords: fa('ε-NFA: "abc" | "de"', 'ENFA', ['a', 'b', 'c', 'd', 'e'], 'The word abc or the word de',
    [['start', 'S'], ['a1', ''], ['a2', ''], ['a3', 'A'], ['d1', ''], ['d2', 'A']],
    [['start', 'a1', 'ε'], ['start', 'd1', 'ε'], ['a1', 'a2', 'a'], ['a2', 'a3', 'b'], ['a3', 'a3', 'c'], ['d1', 'd2', 'd'], ['d2', 'd2', 'e']]
  ),

  enfaOptSignDigits: fa('ε-NFA: (+|-)? d+', 'ENFA', ['+', '-', 'd'], 'Optional sign then one or more digits',
    [['q0', 'S'], ['q1', ''], ['q2', 'A']],
    [['q0', 'q1', 'ε'], ['q0', 'q1', '+'], ['q0', 'q1', '-'], ['q1', 'q2', 'd'], ['q2', 'q2', 'd']]),

  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — Pushdown Automata (PDA)
  // ══════════════════════════════════════════════════════════
  npdaBalancedParens: pda('NPDA: Balanced parentheses', 'NPDA', ['(', ')'], ['X', 'Z'], 'Balanced parentheses',
    [['qs', 'S'], ['q0', ''], ['q1', 'A']],
    [
      { from: 'qs', to: 'q0', read: 'eps', pop: 'eps', push: 'Z' },
      { from: 'q0', to: 'q0', read: '(', pop: 'Z', push: 'X,Z' },
      { from: 'q0', to: 'q0', read: '(', pop: 'X', push: 'X,X' },
      { from: 'q0', to: 'q0', read: ')', pop: 'X', push: 'eps' },
      { from: 'q0', to: 'q1', read: 'eps', pop: 'Z', push: 'Z' },
    ]),

  npdaAnBn: pda('NPDA: aⁿbⁿ', 'NPDA', ['a', 'b'], ['A', 'Z'], 'Equal a then b (aⁿbⁿ)',
    [['qs', 'S'], ['q0', ''], ['q1', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', push: 'A' },
      { from: 'q0', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'qf', pop: 'Z', push: 'Z' },
      { from: 'q0', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  dpdaAnBn: pda('DPDA: aⁿbⁿ (n≥1)', 'DPDA', ['a', 'b'], ['A', 'Z'], 'Deterministic aⁿbⁿ, n ≥ 1',
    [['qs', 'S'], ['q0', ''], ['q1', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', push: 'A' },
      { from: 'q0', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  npdaWWR: pda('NPDA: wwᴿ (even palindromes)', 'NPDA', ['a', 'b'], ['a', 'b', 'Z'], 'Even-length palindromes wwᴿ',
    [['qs', 'S'], ['q0', ''], ['q1', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', push: 'a' },
      { from: 'q0', to: 'q0', read: 'b', push: 'b' },
      { from: 'q0', to: 'q1', read: 'eps', pop: 'eps', push: 'eps' },
      { from: 'q1', to: 'q1', read: 'a', pop: 'a' },
      { from: 'q1', to: 'q1', read: 'b', pop: 'b' },
      { from: 'q1', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  npdaPalindrome: pda('NPDA: Palindromes over {a,b}', 'NPDA', ['a', 'b'], ['a', 'b', 'Z'], 'All palindromes over {a,b}',
    [['qs', 'S'], ['q0', ''], ['q1', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', push: 'a' },
      { from: 'q0', to: 'q0', read: 'b', push: 'b' },
      { from: 'q0', to: 'q1', read: 'eps' },
      { from: 'q0', to: 'q1', read: 'a' },
      { from: 'q0', to: 'q1', read: 'b' },
      { from: 'q1', to: 'q1', read: 'a', pop: 'a' },
      { from: 'q1', to: 'q1', read: 'b', pop: 'b' },
      { from: 'q1', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  npdaEqualAB: pda('NPDA: Equal a and b', 'NPDA', ['a', 'b'], ['a', 'b', 'Z'], 'Equal number of a and b',
    [['qs', 'S'], ['q0', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', pop: 'Z', push: 'a,Z' },
      { from: 'q0', to: 'q0', read: 'a', pop: 'a', push: 'a,a' },
      { from: 'q0', to: 'q0', read: 'a', pop: 'b', push: 'eps' },
      { from: 'q0', to: 'q0', read: 'b', pop: 'Z', push: 'b,Z' },
      { from: 'q0', to: 'q0', read: 'b', pop: 'b', push: 'b,b' },
      { from: 'q0', to: 'q0', read: 'b', pop: 'a', push: 'eps' },
      { from: 'q0', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  npdaAnB2n: pda('NPDA: aⁿb²ⁿ', 'NPDA', ['a', 'b'], ['A', 'Z'], 'n a followed by 2n b',
    [['qs', 'S'], ['q0', ''], ['q1', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: 'a', push: 'A,A' },
      { from: 'q0', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'q1', read: 'b', pop: 'A' },
      { from: 'q1', to: 'qf', pop: 'Z', push: 'Z' },
      { from: 'q0', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  npdaBrackets: pda('NPDA: Balanced () and []', 'NPDA', ['(', ')', '[', ']'], ['P', 'B', 'Z'], 'Balanced round and square brackets',
    [['qs', 'S'], ['q0', ''], ['qf', 'A']],
    [
      { from: 'qs', to: 'q0', push: 'Z' },
      { from: 'q0', to: 'q0', read: '(', push: 'P' },
      { from: 'q0', to: 'q0', read: '[', push: 'B' },
      { from: 'q0', to: 'q0', read: ')', pop: 'P' },
      { from: 'q0', to: 'q0', read: ']', pop: 'B' },
      { from: 'q0', to: 'qf', pop: 'Z', push: 'Z' },
    ]),

  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — Turing Machines (TM)
  // ══════════════════════════════════════════════════════════
  tmAnBn: tm('TM: aⁿbⁿ', 'TM', ['a', 'b'], ['a', 'b', 'X', 'Y', '_'], 'aⁿbⁿ (n ≥ 0)',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q1', read: 'a', write: 'X', dir: 'R' },
      { from: 'q0', to: 'q3', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q0', to: 'acc', read: '_', write: '_', dir: 'S' },
      { from: 'q1', to: 'q1', read: 'a', write: 'a', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q1', to: 'q2', read: 'b', write: 'Y', dir: 'L' },
      { from: 'q2', to: 'q2', read: 'a', write: 'a', dir: 'L' },
      { from: 'q2', to: 'q2', read: 'Y', write: 'Y', dir: 'L' },
      { from: 'q2', to: 'q0', read: 'X', write: 'X', dir: 'R' },
      { from: 'q3', to: 'q3', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q3', to: 'acc', read: '_', write: '_', dir: 'S' },
    ]),

  tmAnBnCn: tm('TM: aⁿbⁿcⁿ', 'TM', ['a', 'b', 'c'], ['a', 'b', 'c', 'X', 'Y', 'Z', '_'], 'aⁿbⁿcⁿ',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', ''], ['q4', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q1', read: 'a', write: 'X', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'a', write: 'a', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q1', to: 'q2', read: 'b', write: 'Y', dir: 'R' },
      { from: 'q2', to: 'q2', read: 'b', write: 'b', dir: 'R' },
      { from: 'q2', to: 'q2', read: 'Z', write: 'Z', dir: 'R' },
      { from: 'q2', to: 'q3', read: 'c', write: 'Z', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'a', write: 'a', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'b', write: 'b', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'Y', write: 'Y', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'Z', write: 'Z', dir: 'L' },
      { from: 'q3', to: 'q0', read: 'X', write: 'X', dir: 'R' },
      { from: 'q0', to: 'q4', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q4', to: 'q4', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q4', to: 'q4', read: 'Z', write: 'Z', dir: 'R' },
      { from: 'q4', to: 'acc', read: '_', write: '_', dir: 'S' },
    ]),

  tmPalindromeAB: tm('TM: Palindromes over {a,b}', 'TM', ['a', 'b'], ['a', 'b', '_'], 'Palindromes over {a,b}',
    [['q0', 'S'], ['qRa', ''], ['qRb', ''], ['qCa', ''], ['qCb', ''], ['qBack', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'qRa', read: 'a', write: '_', dir: 'R' },
      { from: 'q0', to: 'qRb', read: 'b', write: '_', dir: 'R' },
      { from: 'q0', to: 'acc', read: '_', write: '_', dir: 'S' },
      { from: 'qRa', to: 'qRa', read: 'a', write: 'a', dir: 'R' },
      { from: 'qRa', to: 'qRa', read: 'b', write: 'b', dir: 'R' },
      { from: 'qRa', to: 'qCa', read: '_', write: '_', dir: 'L' },
      { from: 'qRb', to: 'qRb', read: 'a', write: 'a', dir: 'R' },
      { from: 'qRb', to: 'qRb', read: 'b', write: 'b', dir: 'R' },
      { from: 'qRb', to: 'qCb', read: '_', write: '_', dir: 'L' },
      { from: 'qCa', to: 'qBack', read: 'a', write: '_', dir: 'L' },
      { from: 'qCa', to: 'acc', read: '_', write: '_', dir: 'S' },
      { from: 'qCb', to: 'qBack', read: 'b', write: '_', dir: 'L' },
      { from: 'qCb', to: 'acc', read: '_', write: '_', dir: 'S' },
      { from: 'qBack', to: 'qBack', read: 'a', write: 'a', dir: 'L' },
      { from: 'qBack', to: 'qBack', read: 'b', write: 'b', dir: 'L' },
      { from: 'qBack', to: 'q0', read: '_', write: '_', dir: 'R' },
    ]),

  tmBinaryIncrement: tm('TM: Binary increment (+1)', 'TM', ['0', '1'], ['0', '1', '_'], 'Adds 1 to a binary number',
    [['q0', 'S'], ['q1', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q0', read: '0', write: '0', dir: 'R' },
      { from: 'q0', to: 'q0', read: '1', write: '1', dir: 'R' },
      { from: 'q0', to: 'q1', read: '_', write: '_', dir: 'L' },
      { from: 'q1', to: 'q1', read: '1', write: '0', dir: 'L' },
      { from: 'q1', to: 'acc', read: '0', write: '1', dir: 'S' },
      { from: 'q1', to: 'acc', read: '_', write: '1', dir: 'S' },
    ]),

  tmUnaryAddition: tm('TM: Unary addition (1ᵐ+1ⁿ)', 'TM', ['1', '+'], ['1', '+', '_'], 'Computes m+n in unary',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q0', read: '1', write: '1', dir: 'R' },
      { from: 'q0', to: 'q1', read: '+', write: '1', dir: 'R' },
      { from: 'q1', to: 'q1', read: '1', write: '1', dir: 'R' },
      { from: 'q1', to: 'q2', read: '_', write: '_', dir: 'L' },
      { from: 'q2', to: 'acc', read: '1', write: '_', dir: 'S' },
    ]),

  // ══════════════════════════════════════════════════════════
  // MACHINE WORKSPACE — Linear Bounded Automata (LBA)
  // ══════════════════════════════════════════════════════════
  lbaAnBn: tm('LBA: aⁿbⁿ', 'LBA', ['a', 'b'], ['a', 'b', 'X', 'Y', '_'], 'aⁿbⁿ (linear bounded)',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q1', read: 'a', write: 'X', dir: 'R' },
      { from: 'q0', to: 'q3', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q0', to: 'acc', read: '_', write: '_', dir: 'S' },
      { from: 'q1', to: 'q1', read: 'a', write: 'a', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q1', to: 'q2', read: 'b', write: 'Y', dir: 'L' },
      { from: 'q2', to: 'q2', read: 'a', write: 'a', dir: 'L' },
      { from: 'q2', to: 'q2', read: 'Y', write: 'Y', dir: 'L' },
      { from: 'q2', to: 'q0', read: 'X', write: 'X', dir: 'R' },
      { from: 'q3', to: 'q3', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q3', to: 'acc', read: '_', write: '_', dir: 'S' },
    ]),

  lbaAnBnCn: tm('LBA: aⁿbⁿcⁿ', 'LBA', ['a', 'b', 'c'], ['a', 'b', 'c', 'X', 'Y', 'Z', '_'], 'aⁿbⁿcⁿ (linear bounded)',
    [['q0', 'S'], ['q1', ''], ['q2', ''], ['q3', ''], ['q4', ''], ['acc', 'A']],
    [
      { from: 'q0', to: 'q1', read: 'a', write: 'X', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'a', write: 'a', dir: 'R' },
      { from: 'q1', to: 'q1', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q1', to: 'q2', read: 'b', write: 'Y', dir: 'R' },
      { from: 'q2', to: 'q2', read: 'b', write: 'b', dir: 'R' },
      { from: 'q2', to: 'q2', read: 'Z', write: 'Z', dir: 'R' },
      { from: 'q2', to: 'q3', read: 'c', write: 'Z', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'a', write: 'a', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'b', write: 'b', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'Y', write: 'Y', dir: 'L' },
      { from: 'q3', to: 'q3', read: 'Z', write: 'Z', dir: 'L' },
      { from: 'q3', to: 'q0', read: 'X', write: 'X', dir: 'R' },
      { from: 'q0', to: 'q4', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q4', to: 'q4', read: 'Y', write: 'Y', dir: 'R' },
      { from: 'q4', to: 'q4', read: 'Z', write: 'Z', dir: 'R' },
      { from: 'q4', to: 'acc', read: '_', write: '_', dir: 'S' },
    ]),

  // ══════════════════════════════════════════════════════════
  // GRAMMAR WORKSPACE — Context-Free Grammars (CFG)
  // ══════════════════════════════════════════════════════════
  cfgPalindromeAB: g('CFG: Palindromes {a,b}', 'CFG', 'S -> a S a | b S b | a | b | eps', 'Palindromes over {a, b}'),
  cfgBinaryPalindrome: g('CFG: Binary palindromes', 'CFG', 'S -> 0 S 0 | 1 S 1 | 0 | 1 | eps', 'Palindromes over {0, 1}'),
  cfgEvenPalindrome: g('CFG: Even palindromes (wwᴿ)', 'CFG', 'S -> a S a | b S b | eps', 'Even-length palindromes'),
  cfgDyck: g('CFG: Balanced parentheses', 'CFG', 'S -> S S | ( S ) | eps', 'The Dyck language'),
  cfgMatchedBrackets3: g('CFG: Matched () [] {}', 'CFG', 'S -> S S | ( S ) | [ S ] | { S } | eps', 'Three kinds of balanced brackets'),
  cfgEqual01: g('CFG: Equal 0s and 1s', 'CFG', 'S -> 0 S 1 S | 1 S 0 S | eps', 'Equal number of 0s and 1s'),
  cfgEqualAB: g('CFG: Equal a and b', 'CFG', 'S -> a S b S | b S a S | eps', 'Equal number of a and b'),
  cfgAnBn: g('CFG: aⁿbⁿ', 'CFG', 'S -> a S b | eps', 'Equal a then b'),
  cfgAnBmGE: g('CFG: aⁿbᵐ (n ≥ m)', 'CFG', 'S -> a S b | X\nX -> a X | eps', 'At least as many a as b'),
  cfgAnBmLE: g('CFG: aⁿbᵐ (n ≤ m)', 'CFG', 'S -> a S b | Y\nY -> b Y | eps', 'At least as many b as a'),
  cfgUnequalAB: g('CFG: aᵐbⁿ (m ≠ n)', 'CFG', 'S -> a S b | A | B\nA -> a A | a\nB -> b B | b', 'Unequal a and b'),
  cfgNestedAbcd: g('CFG: aⁿbᵐcᵐdⁿ', 'CFG', 'S -> a S d | T\nT -> b T c | eps', 'Nested dependencies'),
  cfgArithmetic: g('CFG: Arithmetic expressions', 'CFG', 'E -> E + T | E - T | T\nT -> T * F | T / F | F\nF -> ( E ) | id | num', 'Arithmetic with precedence'),
  cfgBoolean: g('CFG: Boolean logic', 'CFG', 'S -> S or T | T\nT -> T and F | F\nF -> not F | ( S ) | true | false', 'Boolean expressions'),
  cfgIfElse: g('CFG: Dangling else', 'CFG', 'S -> if C then S | if C then S else S | a\nC -> b', 'Ambiguous if/else'),
  cfgList: g('CFG: Comma-separated list', 'CFG', 'L -> L , e | e', 'Non-empty comma list'),
  cfgAStarBStar: g('CFG: a*b* (regular)', 'CFG', 'S -> a S | B\nB -> b B | eps', 'a* b* as a CFG'),
  cfgSameFirstLast: g('CFG: Same first and last symbol', 'CFG', 'S -> a M a | b M b | a | b\nM -> a M | b M | eps', 'First symbol equals last'),
  cfgIdentifiers: g('CFG: Identifiers', 'CFG', 'ID -> L R\nR -> L R | D R | eps\nL -> a | b | c\nD -> 0 | 1 | 2', 'Letter followed by letters/digits'),
  cfgEnglish: g('CFG: English sentences', 'CFG', 'S -> NP VP\nNP -> Det N | Det Adj N\nVP -> V NP | V\nDet -> the | a\nAdj -> big | small\nN -> dog | cat | ball\nV -> chased | saw | kicked', 'Toy natural-language grammar'),
  cfgPhoneNumber: g('CFG: US phone number', 'CFG', 'PHONE -> ( AREA ) PREFIX - LINE\nAREA -> D D D\nPREFIX -> D D D\nLINE -> D D D D\nD -> 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9', 'Formatted phone numbers'),
  cfgArithUnary: g('CFG: Arithmetic with unary minus', 'CFG', 'E -> E + T | T\nT -> T * F | F\nF -> - F | ( E ) | id', 'Expressions with negation'),
  cfgTwiceB: g('CFG: aⁿb²ⁿ', 'CFG', 'S -> a S b b | eps', 'n a followed by 2n b'),
  cfgMoreAThanB: g('CFG: More a than b', 'CFG', 'S -> a S | a S b | a', 'Strictly more a than b'),
  cfgTripleA: g('CFG: a^(3n)', 'CFG', 'S -> a a a S | eps', 'Length a multiple of three'),
  cfgAltAB: g('CFG: (ab)*', 'CFG', 'S -> a b S | eps', 'Zero or more ab'),
  cfgSignedNumber: g('CFG: Signed binary number', 'CFG', 'N -> SIGN D | D\nSIGN -> + | -\nD -> 0 D | 1 D | 0 | 1', 'Optionally signed binary'),
  cfgFloat: g('CFG: Fixed-point number', 'CFG', 'F -> D . D\nD -> 0 D | 1 D | 0 | 1', 'Binary fixed-point literal'),
  cfgOddLength: g('CFG: Odd-length strings', 'CFG', 'S -> a S a | a S b | b S a | b S b | a | b', 'Odd-length strings over {a,b}'),

  // ══════════════════════════════════════════════════════════
  // GRAMMAR WORKSPACE — Context-Sensitive Grammars (CSG)
  // ══════════════════════════════════════════════════════════
  csgAnBnCn: g('CSG: aⁿbⁿcⁿ', 'CSG', 'S -> a b c | a S B c\nc B -> B c\nb B -> b b', 'aⁿbⁿcⁿ'),
  csgWW: g('CSG: Copy language (ww)', 'CSG', 'S -> a A S | b B S | eps\nA a -> a A\nA b -> b A\nB a -> a B\nB b -> b B\nA -> a\nB -> b', 'w w'),
  csgPow2: g('CSG: a^(2ⁿ)', 'CSG', 'S -> L D R\nL D -> L a D D\nD a -> a D\nD R -> R\nL a -> a L\nL R -> eps', 'a raised to a power of two'),

  // ══════════════════════════════════════════════════════════
  // PARSER WORKSPACE — CFG_PARSER (LL/LR table demos & Theory)
  // ══════════════════════════════════════════════════════════
  // 1. Simple recursive CFG
  parseSimpleRecursive: g('Parser: Simple Recursive (aⁿbⁿ)', 'CFG_PARSER', 'S -> a S b | eps', 'S -> a S b | ε (generates equal a and b)'),
  // 2. Balanced parentheses
  parseBalancedParens: g('Parser: Balanced Parentheses', 'CFG_PARSER', 'S -> ( S ) S | eps', 'S -> ( S ) S | ε (Dyck language)'),
  // 3. Palindrome
  parsePalindrome: g('Parser: Palindromes', 'CFG_PARSER', 'S -> a S a | b S b | a | b | eps', 'S -> a S a | b S b | a | b | ε (Palindromes over {a,b})'),
  // 4. Expression grammar (standard recursive)
  parseArithmetic: g('Parser: Expression Grammar (Recursive)', 'CFG_PARSER', 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id', 'Classic left-recursive arithmetic grammar with precedence'),
  // 5. LL(1) expression grammar
  parseArithLL1: g('Parser: LL(1) Expression Grammar', 'CFG_PARSER', 'E -> T E2\nE2 -> + T E2 | eps\nT -> F T2\nT2 -> * F T2 | eps\nF -> ( E ) | id', 'Left-factored & left-recursion eliminated arithmetic for LL(1)'),
  // 6. Grammar requiring left factoring
  parseLeftFactoring: g('Parser: Needs Left Factoring', 'CFG_PARSER', 'S -> if E then S else S | if E then S | id = E\nE -> id', 'Common prefix in S productions creates LL(1) FIRST/FIRST conflict'),
  // 7. Grammar with indirect left recursion
  parseIndirectLeftRecursion: g('Parser: Indirect Left Recursion', 'CFG_PARSER', 'A -> B a | b\nB -> A c | d', 'Indirect cycle A => B a => A c a prevents naive top-down parsing'),
  // 8. Ambiguous expression grammar
  parseAmbiguousExpr: g('Parser: Ambiguous Expressions', 'CFG_PARSER', 'E -> E + E | E * E | ( E ) | id', 'Ambiguous expression grammar with multiple parse trees'),
  // 9. Dangling-else grammar
  parseDanglingElse: g('Parser: Dangling Else', 'CFG_PARSER', 'S -> if E then S else S | if E then S | other\nE -> cond', 'Classic shift/reduce ambiguity in nested conditionals'),
  // 10. LR(0) grammar
  parseLR0: g('Parser: LR(0) Grammar', 'CFG_PARSER', 'S -> ( S ) | id', 'Conflict-free in LR(0) without lookahead'),
  // 11. SLR(1)-but-not-LR(0) grammar
  parseSLR1NotLR0: g('Parser: SLR(1) but not LR(0)', 'CFG_PARSER', 'S -> A a | b\nA -> b', 'LR(0) reduce/reduce conflict resolved by SLR(1) FOLLOW sets'),
  // 12. LALR(1)-but-not-SLR(1) grammar
  parseLALR1NotSLR1: g('Parser: LALR(1) but not SLR(1)', 'CFG_PARSER', 'S -> L = R | R\nL -> * R | id\nR -> L', 'Dragon Book canonical: SLR(1) conflict resolved in LALR(1)'),
  // 13. CLR(1)-but-not-LALR(1) grammar
  parseCLR1NotLALR1: g('Parser: CLR(1) but not LALR(1)', 'CFG_PARSER', 'S -> a E c | a F d | b F c | b E d\nE -> e\nF -> e', 'Merging LR(1) states introduces reduce/reduce conflict in LALR(1)'),
  // 14. CFG that is not LR(1), for Earley
  parseNonLR1Earley: g('Parser: Non-LR(1) CFG (Earley)', 'CFG_PARSER', 'S -> a S a | b S b | eps', 'Non-LR(1) grammar requiring unbounded lookahead, parsed by Earley'),
  // 15. Ambiguous CFG for Earley
  parseAmbiguousEarley: g('Parser: Ambiguous CFG (Earley)', 'CFG_PARSER', 'E -> E + E | E * E | ( E ) | id', 'Ambiguous grammar generating parse forests in Earley chart parser'),
  // 16. CNF grammar specifically for CYK
  parseCnfCYK: g('Parser: Chomsky Normal Form (CYK)', 'CFG_PARSER', 'S -> A B | B C\nA -> B A | a\nB -> C C | b\nC -> A B | c', 'Chomsky Normal Form (A -> BC | a) specifically for CYK parsing'),

  // Additional practical parser grammars
  parseAssign: g('Parser: Assignment', 'CFG_PARSER', 'S -> id = E\nE -> E + id | id', 'Assignment statement'),
  parseIfElse: g('Parser: If / then / else', 'CFG_PARSER', 'S -> if E then S | if E then S else S | id = E\nE -> id | num', 'Conditional statements'),
  parseBool: g('Parser: Boolean logic', 'CFG_PARSER', 'S -> S or T | T\nT -> T and F | F\nF -> not F | ( S ) | true | false', 'Boolean expression parser'),
  parseFuncCall: g('Parser: Function call', 'CFG_PARSER', 'CALL -> id ( ARGS )\nARGS -> E , ARGS | E | eps\nE -> id | num', 'Function-call syntax'),
  parseList: g('Parser: Identifier list', 'CFG_PARSER', 'L -> id L2\nL2 -> , id L2 | eps', 'Comma-separated identifiers'),
  parseVarDecl: g('Parser: Variable declaration', 'CFG_PARSER', 'D -> type id ; | type id = E ;\nE -> id | num', 'Typed declarations'),
  parseCsvRow: g('Parser: CSV row', 'CFG_PARSER', 'ROW -> FIELD ROW2\nROW2 -> , FIELD ROW2 | eps\nFIELD -> id | num', 'A single CSV record'),
  parsePropLogic: g('Parser: Propositional logic', 'CFG_PARSER', 'F -> F implies G | G\nG -> G or H | H\nH -> H and I | I\nI -> not I | ( F ) | p | q', 'Implication / or / and / not'),
  parseTypeExpr: g('Parser: Type expressions', 'CFG_PARSER', 'T -> T plus T | T times T | ( T ) | int | bool', 'Ambiguous type algebra'),
  parseLambda: g('Parser: Lambda calculus', 'CFG_PARSER', 'T -> var | lambda var . T | T T | ( T )', 'Untyped lambda terms'),
  parseDict: g('Parser: Dictionary literal', 'CFG_PARSER', 'D -> { P } | { }\nP -> id : V P2\nP2 -> , id : V P2 | eps\nV -> id | num | D', 'Nested key/value maps'),
  parseArrayAccess: g('Parser: Array / member access', 'CFG_PARSER', 'A -> A [ E ] | A . id | id\nE -> num | id', 'Indexing and field access'),
  parseJson: g('Parser: Tiny JSON', 'CFG_PARSER', 'VALUE -> DICT | ARRAY | string | number\nDICT -> { PAIRS } | { }\nPAIRS -> PAIR , PAIRS | PAIR\nPAIR -> string : VALUE\nARRAY -> [ ELEMENTS ] | [ ]\nELEMENTS -> VALUE , ELEMENTS | VALUE', 'Tiny JSON subset'),
  parseLisp: g('Parser: LISP S-expressions', 'CFG_PARSER', 'S_EXP -> atom | ( LIST )\nLIST -> S_EXP LIST | eps', 'LISP S-expressions'),
  parseSql: g('Parser: SQL SELECT', 'CFG_PARSER', 'QUERY -> SELECT FROM WHERE\nSELECT -> select COLS\nCOLS -> id , COLS | id\nFROM -> from id\nWHERE -> where COND | eps\nCOND -> id = val', 'Basic SQL SELECT'),
  parseXml: g('Parser: HTML / XML', 'CFG_PARSER', 'ELEMENT -> < id > CONTENT < / id > | < id / >\nCONTENT -> ELEMENT CONTENT | text CONTENT | eps', 'Tags and content'),
  parseRegex: g('Parser: Regular expressions', 'CFG_PARSER', 'RE -> RE | TERM\nTERM -> TERM FACTOR | FACTOR\nFACTOR -> BASE * | BASE + | BASE ? | BASE\nBASE -> char | ( RE )', 'Regex abstract syntax'),
  parseCBlocks: g('Parser: C-style blocks', 'CFG_PARSER', 'BLOCK -> { STMTS }\nSTMTS -> STMT STMTS | eps\nSTMT -> id = expr ; | if ( expr ) BLOCK | while ( expr ) BLOCK | return expr ;', 'C/Java/JS statements'),
  parseForLoop: g('Parser: For loop', 'CFG_PARSER', 'F -> for ( INIT ; COND ; STEP ) BODY\nINIT -> id = E\nCOND -> E < E\nSTEP -> id = E\nBODY -> { STMTS }\nSTMTS -> id = E ; STMTS | eps\nE -> id | num', 'C-style for loop'),
  parsePostfix: g('Parser: Postfix (RPN)', 'CFG_PARSER', 'E -> E E OP | num\nOP -> + | - | *', 'Reverse Polish notation'),
  parseWhile: g('Parser: While loop', 'CFG_PARSER', 'S -> while ( E ) S | id = E ;\nE -> id | num', 'While statement'),
  parseSwitch: g('Parser: Switch / case', 'CFG_PARSER', 'SW -> switch ( id ) { CASES }\nCASES -> case num : STMT CASES | eps\nSTMT -> id = num ;', 'Switch statement'),
  parseEnum: g('Parser: Enum declaration', 'CFG_PARSER', 'E -> enum id { NAMES }\nNAMES -> id , NAMES | id', 'Enumerated types'),
  parseUrlPath: g('Parser: URL path', 'CFG_PARSER', 'P -> / SEG P | / SEG | /\nSEG -> id | id . id', 'Slash-separated path'),
  parseMatrix: g('Parser: Matrix literal', 'CFG_PARSER', 'M -> [ ROWS ]\nROWS -> ROW ; ROWS | ROW\nROW -> num , ROW | num', 'Rows of numbers'),
  parseTernary: g('Parser: Ternary conditional', 'CFG_PARSER', 'E -> C ? E : E | C\nC -> id | num', 'The ?: operator'),
  parseKeyVal: g('Parser: Key/value config', 'CFG_PARSER', 'L -> KV & L | KV\nKV -> id = val', 'Ampersand-joined pairs'),
  parseBlockComment: g('Parser: Statement list', 'CFG_PARSER', 'PROG -> STMT PROG | eps\nSTMT -> id = E ;\nE -> E + T | T\nT -> id | num', 'A small program'),
};

export type ExampleDef = Ex;

export const EXAMPLE_GROUP_LABEL: Partial<Record<MachineType, string>> = {
  DFA: 'DFA — Deterministic Finite Automata',
  NFA: 'NFA — Nondeterministic Finite Automata',
  ENFA: 'ε-NFA',
  MEALY: 'Mealy Machines',
  MOORE: 'Moore Machines',
  DPDA: 'DPDA — Deterministic Pushdown',
  NPDA: 'NPDA — Nondeterministic Pushdown',
  TM: 'TM — Turing Machines',
  LBA: 'LBA — Linear Bounded Automata',
  CFG: 'CFG — Context-Free Grammars',
  CSG: 'CSG — Context-Sensitive Grammars',
  CFG_PARSER: 'Parser Grammars',
}

export const EXAMPLE_TYPES_BY_WORKSPACE: Record<'machine' | 'grammar' | 'parser', MachineType[]> = {
  machine: ['DFA', 'NFA', 'ENFA', 'MEALY', 'MOORE', 'DPDA', 'NPDA', 'TM', 'LBA'],
  grammar: ['CFG', 'CSG'],
  parser: ['CFG_PARSER'],
}

export function groupedExamples(types: MachineType[]) {
  return types
    .map((t) => ({
      type: t,
      label: EXAMPLE_GROUP_LABEL[t] ?? t,
      items: Object.entries(EXAMPLES).filter(([, ex]) => ex.type === t),
    }))
    .filter((g) => g.items.length > 0)
}
