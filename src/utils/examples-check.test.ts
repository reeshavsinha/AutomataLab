import { test, expect, describe } from 'vitest';
import { EXAMPLES } from './examples';
import { runToCompletion } from '../engines/machine/core/engineFactory';
import { parseGrammarText } from '../engines/grammar/parser';
import { generateLR0Table } from '../engines/parser/lr0';
import { generateSLR1Table } from '../engines/parser/slr1';
import { generateLALR1Table } from '../engines/parser/lalr1';
import { generateCLR1Table } from '../engines/parser/clr1';
import { analyzeGrammar } from '../engines/grammar/analysis';
import { LRSimulation } from '../engines/parser/lrSimulation';
import { EarleySimulation } from '../engines/parser/earley';

describe('Examples deep execution check', () => {
  for (const [key, ex] of Object.entries(EXAMPLES)) {
    test(`Example: ${ex.name} (${ex.type}) executes completely`, () => {
      if (ex.type === 'CFG' || ex.type === 'CSG' || ex.type === 'CFG_PARSER') {
        const text = ex.grammarText || '';
        expect(text.length).toBeGreaterThan(0);
        
        let cfg: any;
        if (ex.type !== 'CSG') {
          // 1. Parsing
          expect(() => {
            cfg = parseGrammarText(text);
          }).not.toThrow();
          
          if (cfg) {
            // 2. Properties (Analysis)
            let analysis: any;
            expect(() => {
              analysis = analyzeGrammar(cfg);
            }).not.toThrow();

            // 4. Parse Trees (Earley)
            expect(() => {
              const earley = new EarleySimulation(cfg);
              earley.initialize(['eps']);
              while (earley.status === 'running') earley.step();
              earley.tree; // just accessing it
            }).not.toThrow();

            // 5. Automaton Graphs (LR/SLR/LALR/CLR)
            if (ex.type === 'CFG_PARSER') {
              expect(() => {
                const lr0 = generateLR0Table(cfg);
                generateSLR1Table(cfg, analysis);
                generateLALR1Table(cfg, analysis);
                generateCLR1Table(cfg, analysis);
                
                // 6. LR Parser simulation initialization
                const engine = new LRSimulation(cfg, lr0);
              }).not.toThrow();
            }
          }
        }
      } else {
        // Machine types: DFA, NFA, PDA, TM, etc.
        // Try running them on a few basic inputs to ensure no engine crashes
        const inputs = ['', '0', '1', 'a', 'b', 'c', '00', '11', 'aab', '()', '(()'];
        
        for (const input of inputs) {
          expect(() => {
            // @ts-ignore
            runToCompletion(ex, input, 100);
          }).not.toThrow();
        }
      }
    });
  }
});
