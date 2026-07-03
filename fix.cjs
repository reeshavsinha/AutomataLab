const fs = require('fs');
let content = fs.readFileSync('src/components/layout/MenuBar.tsx', 'utf8');
content = content.replace(/\\'/g, "'");
fs.writeFileSync('src/components/layout/MenuBar.tsx', content);
