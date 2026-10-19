import { test, expect, describe } from 'vitest';
import { EXAMPLES } from './examples';
import { runToCompletion } from '../engines/machine/core/engineFactory';
import { parseGrammarText, parseGeneralGrammarText } from '../engines/grammar/parser';
import { validateGrammarFormat } from '../engines/grammar/classification';
import { validateRegex } from '../engines/machine/conversions/regexToNfa';
import { generateLR0Table } from '../engines/parser/lr0';
import { generateSLR1Table } from '../engines/parser/slr1';
import { generateLALR1Table } from '../engines/parser/lalr1';
import { generateCLR1Table } from '../engines/parser/clr1';
import { analyzeGrammar } from '../engines/grammar/analysis';
import { LRSimulation } from '../engines/parser/lrSimulation';
import { EarleySimulation } from '../engines/parser/earley';
import type { GrammarFormat } from '@/engines/machine/core/types';

function grammarFormatForExample(ex: (typeof EXAMPLES)[string]): Exclude<GrammarFormat, 'REGEX'> | null {
  if (ex.grammarFormat && ex.grammarFormat !== 'REGEX') return ex.grammarFormat;
  if (ex.type === 'CSG') return 'TYPE_1';
  if (ex.type === 'UG') return 'TYPE_0';
  if (ex.type === 'CFG' || ex.type === 'CFG_PARSER') return 'TYPE_2';
  return null;
}

describe('Examples deep execution check', () => {
  for (const [key, ex] of Object.entries(EXAMPLES)) {
    test(`Example: ${ex.name} (${ex.type}) executes completely`, () => {
      if (ex.type === 'CFG' || ex.type === 'CSG' || ex.type === 'UG' || ex.type === 'CFG_PARSER') {
        const text = ex.grammarText || '';
        expect(text.length).toBeGreaterThan(0);

        if (ex.grammarFormat === 'REGEX') {
          expect(() => validateRegex(text)).not.toThrow();
          return;
        }

        const format = grammarFormatForExample(ex);
        if (ex.type === 'CSG' || ex.type === 'UG') {
          expect(() => parseGeneralGrammarText(text, format!)).not.toThrow();
          return;
        }

        if (format && (ex.grammarFormat === 'TYPE_3' || ex.grammarFormat === 'TYPE_0')) {
          expect(() => {
            const grammar = parseGeneralGrammarText(text, format);
            const validation = validateGrammarFormat(grammar, format);
            expect(validation.isValidForSelectedFormat, `${key}: ${validation.violations.join('; ')}`).toBe(true);
          }).not.toThrow();
          if (ex.grammarFormat === 'TYPE_3') return;
        }

        let cfg: ReturnType<typeof parseGrammarText> | undefined;
        expect(() => {
          cfg = parseGrammarText(text);
        }).not.toThrow();

        if (cfg) {
          let analysis: ReturnType<typeof analyzeGrammar> | undefined;
          expect(() => {
            analysis = analyzeGrammar(cfg!);
          }).not.toThrow();

          expect(() => {
            const earley = new EarleySimulation(cfg!);
            earley.initialize(['eps']);
            while (earley.status === 'running') earley.step();
            earley.tree;
          }).not.toThrow();

          if (ex.type === 'CFG_PARSER') {
            expect(() => {
              const lr0 = generateLR0Table(cfg!);
              generateSLR1Table(cfg!, analysis!);
              generateLALR1Table(cfg!, analysis!);
              generateCLR1Table(cfg!, analysis!);
              new LRSimulation(cfg!, lr0);
            }).not.toThrow();
          }
        }
      } else {
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
