import { parseGrammarText, tokenizeGrammarString } from './src/engines/grammar/parser';
import { EarleySimulation } from './src/engines/parser/earley';

function runTest(name: string, grammar: string, input: string) {
  console.log(`\n=== Running Test: ${name} ===`);
  console.log(`Grammar:\n${grammar}`);
  console.log(`Input: '${input}'`);
  
  const startTime = Date.now();
  try {
    const cfg = parseGrammarText(grammar);
    const tokens = input.trim() ? tokenizeGrammarString(input, cfg.nonterminals, cfg.terminals) : [];

    const sim = new EarleySimulation(cfg);
    sim.initialize(tokens);
    while (sim.status === 'running') {
      sim.step();
    }

    const duration = Date.now() - startTime;
    console.log(`Result: ${sim.status} (Total Parses: ${sim.totalParses})`);
    console.log(`Time taken: ${duration}ms`);
    
    if (sim.errorMsg) {
      console.log(`Error Message: ${sim.errorMsg}`);
    }
  } catch (e) {
    console.error(`FAILED with exception:`, e);
  }
}

// 1. Extreme Ambiguity & Cycles
runTest(
  'Extreme Ambiguity & Cycles',
  'S -> S S | a | ε',
  'a a a'
);

// 2. Pure Cyclic Unit Production
runTest(
  'Pure Cyclic Unit Production',
  'S -> S | a',
  'a'
);

// 3. Standard Left-Recursive Arithmetic
runTest(
  'Left-Recursive Arithmetic',
  `E -> E + T | T
   T -> T * F | F
   F -> ( E ) | x`,
  'x + x * x'
);

// 4. Balanced/Unbalanced Match Language (ambiguous)
runTest(
  'Balanced Match Language',
  'S -> a S b S | b S a S | ε',
  'a b a b a b'
);

// 5. Extreme Epsilon Cycle
runTest(
  'Extreme Epsilon Cycle',
  'S -> S | ε',
  ''
);

// 6. Direct & Indirect Left Recursion
runTest(
  'Indirect Left Recursion',
  `A -> B a | ε
   B -> C b
   C -> A c`,
  'c b a c b a'
);
