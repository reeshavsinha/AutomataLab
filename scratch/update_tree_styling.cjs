const fs = require('fs');

let code1 = fs.readFileSync('src/components/workspaces/ParserWorkspace.tsx', 'utf8');
code1 = code1.replace(
  `Panel id="tree" minSize={20} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}`,
  `Panel id="tree" minSize={20} style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}`
);
fs.writeFileSync('src/components/workspaces/ParserWorkspace.tsx', code1);

let code2 = fs.readFileSync('src/components/workspaces/parser/SyntaxTreePanel.tsx', 'utf8');
code2 = code2.replace(
  `background: 'var(--bg-secondary)',\n        position: 'absolute',`,
  `background: 'var(--bg-primary)',\n        position: 'absolute',`
);
code2 = code2.replace(
  `import { ReactFlow, Background, MiniMap, Controls, Node, Edge, useNodesState, useEdgesState, Position, MarkerType } from '@xyflow/react';`,
  `import { ReactFlow, Background, BackgroundVariant, MiniMap, Controls, Node, Edge, useNodesState, useEdgesState, Position, MarkerType } from '@xyflow/react';`
);
code2 = code2.replace(
  `<Background\n              color="var(--border-subtle)"\n              gap={20}\n              size={1}\n              style={{ opacity: 0.6 }}\n            />`,
  `<Background\n              variant={BackgroundVariant.Dots}\n              color="var(--text-muted)"\n              gap={16}\n              size={1.5}\n              style={{ opacity: 0.2 }}\n            />`
);

fs.writeFileSync('src/components/workspaces/parser/SyntaxTreePanel.tsx', code2);
