import { parseGrammarText } from './src/engines/grammar/parser';
import { generateLR0Table } from './src/engines/parser/lr0';
import { generateSLR1Table } from './src/engines/parser/slr1';
import { buildCLR1States } from './src/engines/parser/clr1';
import { generateLALR1Table } from './src/engines/parser/lalr1';
import { analyzeGrammar } from './src/engines/grammar/analysis';
import { EarleySimulation } from './src/engines/parser/earley';

const text = 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id';
const cfg = parseGrammarText(text);
const analysis = analyzeGrammar(cfg);

try {
  const lr0 = generateLR0Table(cfg);
  console.log('LR0 table generated, states:', lr0.states.length);
  const slr1 = generateSLR1Table(cfg, analysis);
  console.log('SLR1 table generated, states:', slr1.states.length);
  const clr1 = buildCLR1States(cfg, analysis);
  console.log('CLR1 table generated, states:', clr1.length);
  const lalr1 = generateLALR1Table(cfg, analysis);
  console.log('LALR1 table generated, states:', lalr1.states.length);

  const earley = new EarleySimulation(cfg);
  earley.initialize(['id', '+', 'id']);
  let step = 0;
  while(earley.status === 'running' && step < 100) {
    earley.step();
    step++;
  }
  console.log('Earley completed parsing:', earley.status);

  console.log('✅ Parsers successfully compiled and ran.');
} catch (err) {
  console.error('❌ Parsing engine failed:', err);
}
