const fs = require('fs');
let content = fs.readFileSync('C:/Users/reesh/.gemini/antigravity-ide/brain/d307a3e6-464c-46c0-a883-bf2be5335225/task.md', 'utf8');
content = content.replace(/- `\[ \]` /g, '- `[x]` ');
fs.writeFileSync('C:/Users/reesh/.gemini/antigravity-ide/brain/d307a3e6-464c-46c0-a883-bf2be5335225/task.md', content);
