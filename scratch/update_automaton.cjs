const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/AutomatonViewerPanel.tsx', 'utf8');

// Insert traceability store import
code = code.replace(/import \{ useParserStore \} from '@\/store\/parserStore';/, "import { useParserStore } from '@/store/parserStore';\nimport { useTraceabilityStore } from '@/store/traceabilityStore';");

// Get setFocusedItemSet and focusedItemSetId
code = code.replace(/const \{ session \} = useParserStore\(\);/, "const { session } = useParserStore();\n  const { focusedItemSetId, setFocusedItemSet } = useTraceabilityStore();");

// Update onNodeClick
code = code.replace(/onNodeClick=\{\(e, node\) => \{\s*console\.log\('Clicked node', node\.id\);\s*\}\}/, "onNodeClick={(e, node) => setFocusedItemSet(node.id)}");

// Add highlighting to nodes based on focusedItemSetId
code = code.replace(/data: \{\s*label: s\.id\.toString\(\),\s*lrState: s\s*\}/g, "data: { label: s.id.toString(), lrState: s, isFocused: focusedItemSetId === s.id.toString() }");

fs.writeFileSync('src/components/workspaces/parser/AutomatonViewerPanel.tsx', code);
