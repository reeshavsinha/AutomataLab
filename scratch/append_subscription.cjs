const fs = require('fs');
let code = fs.readFileSync('src/store/parserStore.ts', 'utf8');

const subscription = `
useGrammarStore.subscribe((state, prevState) => {
  if (state.cfg && state.cfg !== prevState.cfg) {
    const model = ParserBuilder.build(state.cfg);
    useParserStore.getState().setModel(model);
    useParserStore.getState().initializeSim();
  }
});
`;

// Add ParserBuilder import if not exists
if (!code.includes('ParserBuilder')) {
  code = code.replace(/import \{ ParserModel, ParserEngine \} from '@\/engines\/parser\/model';/, 
  "import { ParserModel, ParserEngine } from '@/engines/parser/model';\nimport { ParserBuilder } from '@/engines/parser/builder';");
}

code += subscription;
fs.writeFileSync('src/store/parserStore.ts', code);
