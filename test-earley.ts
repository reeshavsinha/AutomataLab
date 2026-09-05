import { parseGrammarText, tokenizeGrammarString } from './src/engines/grammar/parser';
import { EarleySimulation } from './src/engines/parser/earley';

try {
  const cfg = parseGrammarText('S -> S S | a | b');
  const inputStr = 'a a a';
  const tokens = tokenizeGrammarString(inputStr, cfg.nonterminals, cfg.terminals);

  const sim = new EarleySimulation(cfg);
  sim.initialize(tokens);
  while (sim.status === 'running') {
    sim.step();
  }

  console.log("Status:", sim.status);
} catch (e) {
  console.error("ERROR", e);
}
