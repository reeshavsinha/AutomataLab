import { parseGrammarText, tokenizeGrammarString } from './src/engines/grammar/parser';
import { EarleySimulation } from './src/engines/parser/earley';

try {
  const cfg = parseGrammarText('S -> S S | a | ε');
  const inputStr = '';
  const tokens = tokenizeGrammarString(inputStr, cfg.nonterminals, cfg.terminals);

  const sim = new EarleySimulation(cfg);
  sim.initialize(tokens);
  while (sim.status === 'running') {
    sim.step();
  }

  console.log("Status:", sim.status);
  console.log("Total Parses:", sim.totalParses);
} catch (e) {
  console.error("ERROR", e);
}
