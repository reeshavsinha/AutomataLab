const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', 'utf8');

// Pull focusedItemSetId and setFocusedItemSet
code = code.replace(/const \{ focusedProductionIndex, setFocusedParseAction \} = useTraceabilityStore\(\);/, "const { focusedProductionIndex, setFocusedParseAction, focusedItemSetId, setFocusedItemSet } = useTraceabilityStore();");

// Update row TR to be clickable and highlight
const targetTr = "<tr key={state.id}";
const replaceTr = "<tr key={state.id} onClick={() => setFocusedItemSet(state.id.toString())} style={{ background: focusedItemSetId === state.id.toString() ? 'rgba(96,165,250,0.1)' : 'transparent', cursor: 'pointer' }}";
code = code.replace(targetTr, replaceTr);

fs.writeFileSync('src/components/workspaces/parser/ParseTablePanel.tsx', code);
