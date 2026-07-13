import { parseGrammarText } from './src/engines/grammar/parser';
import { convertToCNF } from './src/engines/grammar/cnf';
import { convertToGNF } from './src/engines/grammar/gnf';
import { formatCFGToString } from './src/engines/grammar/transformations';

try {
  const cfg = parseGrammarText('S -> a S a | b S b | a | b');
  console.log('--- CNF ---');
  const cnf = convertToCNF(cfg);
  console.log(formatCFGToString(cnf));
  
  console.log('--- GNF ---');
  const gnf = convertToGNF(cfg);
  console.log(formatCFGToString(gnf));
} catch (e) {
  console.error("ERROR", e);
}
