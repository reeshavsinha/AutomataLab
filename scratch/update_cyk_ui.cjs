const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/CYKTablePanel.tsx', 'utf8');

code = code.replace(
  `const items = cell ? Array.from(cell).join(', ') : '';`,
  `const items = cell ? Array.from(cell.keys()).join(', ') : '';`
);

fs.writeFileSync('src/components/workspaces/parser/CYKTablePanel.tsx', code);
