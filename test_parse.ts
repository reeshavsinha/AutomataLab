import { parseGrammarText } from './src/engines/grammar/parser.ts';

const text = `N -> I+F
I -> IB | 
B
F -> BF | B
B -> 0 | 1 | `;

try {
  const cfg = parseGrammarText(text);
  console.log(cfg.productions.map(p => `${p.lhs} -> ${p.rhs.join(' ')}`));
} catch(e) {
  console.error(e);
}
