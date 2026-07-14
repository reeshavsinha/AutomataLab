const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/AutomatonViewerPanel.tsx', 'utf8');

code = code.replace(
  `  const { algorithm } = useParserStore();`,
  `  const { algorithm, simulation } = useParserStore();`
);

code = code.replace(
  `  if (algorithm === 'LL1') {`,
  `  if (simulation?.presentation?.automatonVisible === false) {`
);

fs.writeFileSync('src/components/workspaces/parser/AutomatonViewerPanel.tsx', code);

let code2 = fs.readFileSync('src/components/workspaces/parser/ClosureGotoPanel.tsx', 'utf8');
code2 = code2.replace(
  `  if (algorithm === 'LL1' || !activeTable || !simulation || simulation.stack.length === 0) {`,
  `  if (simulation?.presentation?.closureVisible === false || !activeTable || !simulation || simulation.stack.length === 0) {`
);
code2 = code2.replace(
  `{algorithm === 'LL1' ? 'Not applicable for LL(1)' : 'Run the parser to see state details'}`,
  `{simulation?.presentation?.closureVisible === false ? 'Not applicable for this algorithm' : 'Run the parser to see state details'}`
);

fs.writeFileSync('src/components/workspaces/parser/ClosureGotoPanel.tsx', code2);
