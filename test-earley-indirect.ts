import { parseGrammarText, tokenizeGrammarString } from './src/engines/grammar/parser';
import { EarleySimulation } from './src/engines/parser/earley';

try {
  const cfg = parseGrammarText(`A -> B a | ε
B -> C b
C -> A c`);
  const inputStr = 'c b a c b a';
  const tokens = tokenizeGrammarString(inputStr, cfg.nonterminals, cfg.terminals);
  console.log("Tokens:", tokens);
  console.log("Start Symbol:", cfg.startSymbol);
  console.log("Productions:", cfg.productions.map(p => `${p.lhs}->${p.rhs.join(',')}`));

  const sim = new EarleySimulation(cfg);
  sim.initialize(tokens);
  while (sim.status === 'running') {
    sim.step();
  }

  const set0 = (sim as any).stateSets[0];
  console.log("Set 0 Items:");
  set0.forEach((i: any) => console.log(`  ${i.lhs} -> ${i.rhs.slice(0, i.dot).join('')}.${i.rhs.slice(i.dot).join('')} (${i.origin})`));

  const finalSet = (sim as any).stateSets[tokens.length];
  console.log("Final Set Accept Items:", finalSet.filter((i: any) => i.lhs === "S'"));
  
  console.log("Status:", sim.status);
  console.log("Total Parses:", sim.totalParses);
} catch (e) {
  console.error("ERROR", e);
}
