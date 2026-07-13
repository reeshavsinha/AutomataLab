import { parseGrammarText } from './src/engines/grammar/parser';
import { convertToCNF } from './src/engines/grammar/cnf';
import { formatCFGToString } from './src/engines/grammar/transformations';

try {
  const cfg = parseGrammarText('S -> aSa | bSb | a | b');
  const cnf = convertToCNF(cfg);
  console.log('CNF:');
  console.log(formatCFGToString(cnf));
} catch (e) {
  console.error("ERROR", e);
}
