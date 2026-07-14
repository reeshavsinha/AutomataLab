const fs = require('fs');
let code = fs.readFileSync('src/components/layout/MenuBar.tsx', 'utf8');

const target1 = `    } else if (workspaceType === 'grammar') {
      // TODO
    } else if (workspaceType === 'parser') {
      // TODO
    }`;
code = code.replace(target1, '    }');
code = code.replace(target1, '    }');

fs.writeFileSync('src/components/layout/MenuBar.tsx', code);
