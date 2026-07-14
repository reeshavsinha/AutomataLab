import { parseGrammarText } from './src/engines/grammar/parser';
import { convertToCNF } from './src/engines/grammar/cnf';
import { formatCFGToString } from './src/engines/grammar/transformations';

try {
  const cfg = parseGrammarText(`
S -> E + E
E -> a
  `);
  const cnf = convertToCNF(cfg);
  const out = formatCFGToString(cnf);
  console.log(out);
  // Verify it parses back
  parseGrammarText(out);
  console.log("Parse back successful!");
} catch (e) {
  console.error("ERROR", e);
}
