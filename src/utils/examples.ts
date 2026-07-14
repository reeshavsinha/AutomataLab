import { MachineDefinition } from '@/engines/machine/core/types';
import { generateId } from '@/engines/machine/core/utils';

export const EXAMPLES: Record<string, Omit<MachineDefinition, 'id'> & { id?: string }> = {
  dfaEvenZeros: {
    name: 'DFA: Even 0s',
    type: 'DFA',
    states: [
      { id: 'q0', label: 'q0', x: 200, y: 200, isStart: true, isAccept: true },
      { id: 'q1', label: 'q1', x: 400, y: 200, isStart: false, isAccept: false }
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q1', symbols: ['0'] },
      { id: 't2', from: 'q0', to: 'q0', symbols: ['1'] },
      { id: 't3', from: 'q1', to: 'q0', symbols: ['0'] },
      { id: 't4', from: 'q1', to: 'q1', symbols: ['1'] }
    ],
    alphabet: ['0', '1'],
    language: 'Strings with an even number of 0s'
  },
  nfaEndsIn11: {
    name: 'NFA: Ends in 11',
    type: 'NFA',
    states: [
      { id: 'q0', label: 'q0', x: 150, y: 200, isStart: true, isAccept: false },
      { id: 'q1', label: 'q1', x: 300, y: 200, isStart: false, isAccept: false },
      { id: 'q2', label: 'q2', x: 450, y: 200, isStart: false, isAccept: true }
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q0', symbols: ['0', '1'] },
      { id: 't2', from: 'q0', to: 'q1', symbols: ['1'] },
      { id: 't3', from: 'q1', to: 'q2', symbols: ['1'] }
    ],
    alphabet: ['0', '1'],
    language: 'Strings ending in 11'
  },
  npdaBalancedParens: {
    name: 'NPDA: Balanced Parens',
    type: 'NPDA',
    states: [
      { id: 'qStart', label: 'qS', x: 50, y: 200, isStart: true, isAccept: false },
      { id: 'q0', label: 'q0', x: 200, y: 200, isStart: false, isAccept: false },
      { id: 'q1', label: 'q1', x: 350, y: 200, isStart: false, isAccept: true }
    ],
    transitions: [
      { id: 't0', from: 'qStart', to: 'q0', symbols: ['eps'], read: 'eps', pop: 'eps', push: 'Z' },
      { id: 't1', from: 'q0', to: 'q0', symbols: ['('], read: '(', pop: 'Z', push: 'X,Z' },
      { id: 't2', from: 'q0', to: 'q0', symbols: ['('], read: '(', pop: 'X', push: 'X,X' },
      { id: 't3', from: 'q0', to: 'q0', symbols: [')'], read: ')', pop: 'X', push: 'eps' },
      { id: 't4', from: 'q0', to: 'q1', symbols: ['eps'], read: 'eps', pop: 'Z', push: 'Z' }
    ],
    alphabet: ['(', ')'],
    stackAlphabet: ['X', 'Z'],
    language: 'Balanced parentheses'
  },
  tmAnBnCn: {
    name: 'TM: a^n b^n c^n',
    type: 'TM',
    tapeCount: 1,
    blankSymbol: '_',
    states: [
      { id: 'q0', label: 'q0', x: 150, y: 200, isStart: true, isAccept: false },
      { id: 'q1', label: 'q1', x: 300, y: 100, isStart: false, isAccept: false },
      { id: 'q2', label: 'q2', x: 450, y: 100, isStart: false, isAccept: false },
      { id: 'q3', label: 'q3', x: 600, y: 200, isStart: false, isAccept: false },
      { id: 'q4', label: 'q4', x: 450, y: 300, isStart: false, isAccept: false },
      { id: 'q_acc', label: 'q_acc', x: 300, y: 300, isStart: false, isAccept: true }
    ],
    transitions: [
      { id: 't1', from: 'q0', to: 'q1', symbols: [], read: 'a', write: 'X', direction: 'R' },
      { id: 't2', from: 'q1', to: 'q1', symbols: [], read: 'a', write: 'a', direction: 'R' },
      { id: 't3', from: 'q1', to: 'q1', symbols: [], read: 'Y', write: 'Y', direction: 'R' },
      { id: 't4', from: 'q1', to: 'q2', symbols: [], read: 'b', write: 'Y', direction: 'R' },
      { id: 't5', from: 'q2', to: 'q2', symbols: [], read: 'b', write: 'b', direction: 'R' },
      { id: 't6', from: 'q2', to: 'q2', symbols: [], read: 'Z', write: 'Z', direction: 'R' },
      { id: 't7', from: 'q2', to: 'q3', symbols: [], read: 'c', write: 'Z', direction: 'L' },
      { id: 't8', from: 'q3', to: 'q3', symbols: [], read: 'a', write: 'a', direction: 'L' },
      { id: 't9', from: 'q3', to: 'q3', symbols: [], read: 'b', write: 'b', direction: 'L' },
      { id: 't10', from: 'q3', to: 'q3', symbols: [], read: 'Y', write: 'Y', direction: 'L' },
      { id: 't11', from: 'q3', to: 'q3', symbols: [], read: 'Z', write: 'Z', direction: 'L' },
      { id: 't12', from: 'q3', to: 'q0', symbols: [], read: 'X', write: 'X', direction: 'R' },
      { id: 't13', from: 'q0', to: 'q4', symbols: [], read: 'Y', write: 'Y', direction: 'R' },
      { id: 't14', from: 'q4', to: 'q4', symbols: [], read: 'Y', write: 'Y', direction: 'R' },
      { id: 't15', from: 'q4', to: 'q4', symbols: [], read: 'Z', write: 'Z', direction: 'R' },
      { id: 't16', from: 'q4', to: 'q_acc', symbols: [], read: '_', write: '_', direction: 'S' }
    ],
    alphabet: ['a', 'b', 'c'],
    tapeAlphabet: ['a', 'b', 'c', 'X', 'Y', 'Z', '_'],
    language: 'a^n b^n c^n'
  },
  arithmeticCfg: {
    name: 'Parser: Arithmetic',
    type: 'CFG_PARSER',
    grammarText: "E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id",
    states: [],
    transitions: [],
    alphabet: [],
    language: 'Arithmetic Expressions'
  },
  palindromeCfg: {
    name: 'CFG: Palindromes',
    type: 'CFG',
    grammarText: "S -> a S a | b S b | a | b | eps",
    states: [],
    transitions: [],
    alphabet: [],
    language: 'Palindromes over {a, b}'
  },
  dyckLanguage: {
    name: 'CFG: Balanced Parens',
    type: 'CFG',
    grammarText: "S -> S S | ( S ) | eps",
    states: [],
    transitions: [],
    alphabet: [],
    language: 'Dyck Language'
  },
  anBnCnCsg: {
    name: 'CSG: a^n b^n c^n',
    type: 'CSG',
    grammarText: "S -> a b c | a S B c\nc B -> B c\nb B -> b b",
    states: [],
    transitions: [],
    alphabet: [],
    language: 'a^n b^n c^n'
  },
  jsonParser: {
    name: 'Parser: Tiny JSON',
    type: 'CFG_PARSER',
    grammarText: "VALUE -> DICT | ARRAY | string | number\nDICT -> { PAIRS } | { }\nPAIRS -> PAIR , PAIRS | PAIR\nPAIR -> string : VALUE\nARRAY -> [ ELEMENTS ] | [ ]\nELEMENTS -> VALUE , ELEMENTS | VALUE",
    states: [],
    transitions: [],
    alphabet: [],
    language: 'Tiny JSON subset'
  },
  equal01Cfg: {
    name: 'CFG: Equal 0s and 1s',
    type: 'CFG',
    grammarText: "S -> 0 S 1 S | 1 S 0 S | eps",
    states: [], transitions: [], alphabet: [], language: 'Equal 0s and 1s'
  },
  booleanExprCfg: {
    name: 'CFG: Boolean Logic',
    type: 'CFG',
    grammarText: "S -> S or T | T\nT -> T and F | F\nF -> not F | ( S ) | true | false",
    states: [], transitions: [], alphabet: [], language: 'Boolean expressions'
  },
  wwCopyCsg: {
    name: 'CSG: Copy Language (ww)',
    type: 'CSG',
    grammarText: "S -> a A S | b B S | eps\nA a -> a A\nA b -> b A\nB a -> a B\nB b -> b B\nA -> a\nB -> b",
    states: [], transitions: [], alphabet: [], language: 'w w'
  },
  powersOf2Csg: {
    name: 'CSG: Powers of 2',
    type: 'CSG',
    grammarText: "S -> L D R\nL D -> L a D D\nD a -> a D\nD R -> R\nL a -> a L\nL R -> eps",
    states: [], transitions: [], alphabet: [], language: 'a^(2^n)'
  },
  wwrEvenPalindromes: {
    name: 'CFG: Even Palindromes',
    type: 'CFG',
    grammarText: "S -> a S a | b S b | eps",
    states: [], transitions: [], alphabet: [], language: 'w w^R'
  },
  lispParser: {
    name: 'Parser: LISP S-Expr',
    type: 'CFG_PARSER',
    grammarText: "S_EXP -> atom | ( LIST )\nLIST -> S_EXP LIST | eps",
    states: [], transitions: [], alphabet: [], language: 'LISP S-expressions'
  },
  sqlParser: {
    name: 'Parser: SQL Subset',
    type: 'CFG_PARSER',
    grammarText: "QUERY -> SELECT FROM WHERE\nSELECT -> select COLS\nCOLS -> id , COLS | id\nFROM -> from id\nWHERE -> where COND | eps\nCOND -> id = val",
    states: [], transitions: [], alphabet: [], language: 'Basic SQL SELECT'
  },
  xmlParser: {
    name: 'Parser: HTML/XML',
    type: 'CFG_PARSER',
    grammarText: "ELEMENT -> < id > CONTENT < / id > | < id / >\nCONTENT -> ELEMENT CONTENT | text CONTENT | eps",
    states: [], transitions: [], alphabet: [], language: 'Tags and content'
  },
  regexParser: {
    name: 'Parser: RegEx',
    type: 'CFG_PARSER',
    grammarText: "RE -> RE | TERM\nTERM -> TERM FACTOR | FACTOR\nFACTOR -> BASE * | BASE + | BASE ? | BASE\nBASE -> char | ( RE )",
    states: [], transitions: [], alphabet: [], language: 'Regex AST'
  },
  cBlocksParser: {
    name: 'Parser: C-Style Blocks',
    type: 'CFG_PARSER',
    grammarText: "BLOCK -> { STMTS }\nSTMTS -> STMT STMTS | eps\nSTMT -> id = expr ; | if ( expr ) BLOCK | while ( expr ) BLOCK | return expr ;",
    states: [], transitions: [], alphabet: [], language: 'C/Java/JS statements'
  }
};
