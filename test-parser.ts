import { parseGrammarText } from './src/engines/grammar/parser';
try {
  const cfg = parseGrammarText('S -> aSa | bSb');
  console.log('Success:', JSON.stringify(cfg.productions, null, 2));
} catch (e) {
  console.error("ERROR", e);
}
