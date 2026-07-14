const fs = require('fs');
let code = fs.readFileSync('src/store/parserStore.ts', 'utf8');

// Interface definition addition
code = code.replace(/setModel: \(model: ParserModel \| null\) => void;/, "setModel: (model: ParserModel | null) => void;\n  buildDiagnostics: string | null;\n  setBuildDiagnostics: (d: string | null) => void;");

// Implementation addition
code = code.replace(/setModel: \(model\) => set\(\{ model \}\),/, "setModel: (model) => set({ model }),\n    buildDiagnostics: null,\n    setBuildDiagnostics: (d) => set({ buildDiagnostics: d }),");

// Subscriber update
const subscriberUpdate = `useGrammarStore.subscribe((state, prevState) => {
  if (state.cfg && state.cfg !== prevState.cfg) {
    const buildResult = ParserBuilder.build(state.cfg);
    if (buildResult.model) {
      useParserStore.getState().setModel(buildResult.model);
      useParserStore.getState().setBuildDiagnostics(null);
      useParserStore.getState().initializeSim();
    } else {
      useParserStore.getState().setModel(null);
      useParserStore.getState().setBuildDiagnostics(buildResult.diagnostics || 'Unknown build error');
      useParserStore.getState().resetSim();
    }
  }
});`;
code = code.replace(/useGrammarStore\.subscribe\(\(state, prevState\) => \{\s*if \(state\.cfg && state\.cfg !== prevState\.cfg\) \{\s*const model = ParserBuilder\.build\(state\.cfg\);\s*useParserStore\.getState\(\)\.setModel\(model\);\s*useParserStore\.getState\(\)\.initializeSim\(\);\s*\}\s*\}\);/, subscriberUpdate);

fs.writeFileSync('src/store/parserStore.ts', code);
