const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/parser/LRStateNode.tsx', 'utf8');

code = code.replace(/items: string\[\];/, "items: string[];\n  isFocused?: boolean;");

code = code.replace(/border: '1px solid var\(--border-subtle\)',/, "border: data.isFocused ? '1px solid var(--blue-400)' : '1px solid var(--border-subtle)',\n      boxShadow: data.isFocused ? '0 0 0 1px var(--blue-400)' : 'none',");

code = code.replace(/background: 'var\(--bg-tertiary\)',/, "background: data.isFocused ? 'rgba(96,165,250,0.15)' : 'var(--bg-tertiary)',");

fs.writeFileSync('src/components/workspaces/parser/LRStateNode.tsx', code);
