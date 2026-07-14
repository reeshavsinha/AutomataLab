import { describe, it, expect } from 'vitest';
import { analyzeGrammar } from '../grammar/analysis';
import { generateCLR1Table } from './clr1';
import { generateLALR1Table } from './lalr1';
import { CFG } from '../grammar/types';
import { GraphModel } from './layout/GraphModel';

describe('Parser Engine Stress Test', () => {
  it('should generate LALR(1) and CLR(1) states rapidly for a complex C-like grammar', () => {
    const complexCfg: CFG = {
      terminals: new Set(['id', 'num', 'int', 'float', 'if', 'else', 'while', 'return', '{', '}', '(', ')', ';', '=', '+', '-', '*', '/', '==', '<', '>', ',']),
      nonterminals: new Set(['Program', 'DeclList', 'Decl', 'VarDecl', 'FuncDecl', 'Type', 'ParamList', 'Param', 'Block', 'StmtList', 'Stmt', 'ExprStmt', 'IfStmt', 'WhileStmt', 'ReturnStmt', 'Expr', 'AssignExpr', 'RelExpr', 'AddExpr', 'MultExpr', 'PrimaryExpr']),
      startSymbol: 'Program',
      productions: [
        { lhs: 'Program', rhs: ['DeclList'] },
        { lhs: 'DeclList', rhs: ['DeclList', 'Decl'] },
        { lhs: 'DeclList', rhs: ['Decl'] },
        { lhs: 'Decl', rhs: ['VarDecl'] },
        { lhs: 'Decl', rhs: ['FuncDecl'] },
        { lhs: 'VarDecl', rhs: ['Type', 'id', ';'] },
        { lhs: 'Type', rhs: ['int'] },
        { lhs: 'Type', rhs: ['float'] },
        { lhs: 'FuncDecl', rhs: ['Type', 'id', '(', 'ParamList', ')', 'Block'] },
        { lhs: 'FuncDecl', rhs: ['Type', 'id', '(', ')', 'Block'] },
        { lhs: 'ParamList', rhs: ['ParamList', ',', 'Param'] },
        { lhs: 'ParamList', rhs: ['Param'] },
        { lhs: 'Param', rhs: ['Type', 'id'] },
        { lhs: 'Block', rhs: ['{', 'StmtList', '}'] },
        { lhs: 'Block', rhs: ['{', '}'] },
        { lhs: 'StmtList', rhs: ['StmtList', 'Stmt'] },
        { lhs: 'StmtList', rhs: ['Stmt'] },
        { lhs: 'Stmt', rhs: ['ExprStmt'] },
        { lhs: 'Stmt', rhs: ['Block'] },
        { lhs: 'Stmt', rhs: ['IfStmt'] },
        { lhs: 'Stmt', rhs: ['WhileStmt'] },
        { lhs: 'Stmt', rhs: ['ReturnStmt'] },
        { lhs: 'ExprStmt', rhs: ['Expr', ';'] },
        { lhs: 'ExprStmt', rhs: [';'] },
        { lhs: 'IfStmt', rhs: ['if', '(', 'Expr', ')', 'Stmt'] },
        { lhs: 'IfStmt', rhs: ['if', '(', 'Expr', ')', 'Stmt', 'else', 'Stmt'] },
        { lhs: 'WhileStmt', rhs: ['while', '(', 'Expr', ')', 'Stmt'] },
        { lhs: 'ReturnStmt', rhs: ['return', ';'] },
        { lhs: 'ReturnStmt', rhs: ['return', 'Expr', ';'] },
        { lhs: 'Expr', rhs: ['AssignExpr'] },
        { lhs: 'AssignExpr', rhs: ['id', '=', 'AssignExpr'] },
        { lhs: 'AssignExpr', rhs: ['RelExpr'] },
        { lhs: 'RelExpr', rhs: ['AddExpr', '==', 'AddExpr'] },
        { lhs: 'RelExpr', rhs: ['AddExpr', '<', 'AddExpr'] },
        { lhs: 'RelExpr', rhs: ['AddExpr', '>', 'AddExpr'] },
        { lhs: 'RelExpr', rhs: ['AddExpr'] },
        { lhs: 'AddExpr', rhs: ['AddExpr', '+', 'MultExpr'] },
        { lhs: 'AddExpr', rhs: ['AddExpr', '-', 'MultExpr'] },
        { lhs: 'AddExpr', rhs: ['MultExpr'] },
        { lhs: 'MultExpr', rhs: ['MultExpr', '*', 'PrimaryExpr'] },
        { lhs: 'MultExpr', rhs: ['MultExpr', '/', 'PrimaryExpr'] },
        { lhs: 'MultExpr', rhs: ['PrimaryExpr'] },
        { lhs: 'PrimaryExpr', rhs: ['(', 'Expr', ')'] },
        { lhs: 'PrimaryExpr', rhs: ['id'] },
        { lhs: 'PrimaryExpr', rhs: ['num'] },
      ]
    };

    const analysis = analyzeGrammar(complexCfg);
    
    const lalr1Table = generateLALR1Table(complexCfg, analysis);
    const clr1Table = generateCLR1Table(complexCfg, analysis);

    // Test Automaton Graph Generation
    const startGraphTime = Date.now();
    
    // We simulate the width estimation roughly
    const graph = GraphModel.extractGraph(clr1Table as any, () => 150);
    
    const graphTime = Date.now() - startGraphTime;
    console.log(`[STRESS TEST] Graph Extracted - Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}, Time: ${graphTime}ms`);
    
    expect(graph.nodes.length).toBe(clr1Table.states.length);
    expect(graph.edges.length).toBeGreaterThan(100);
    expect(graphTime).toBeLessThan(1000);
  });
});
