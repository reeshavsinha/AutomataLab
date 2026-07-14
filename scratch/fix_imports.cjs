const fs = require('fs');

let f1 = 'src/components/workspaces/grammar/GrammarDerivationTab.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/import \{.*?SyntaxTreeNode.*?\} from '@\/engines\/parser\/ll1Simulation';/, "import { SyntaxTreeNode } from '@/engines/parser/model';\nimport { LL1Simulation } from '@/engines/parser/ll1Simulation';");
fs.writeFileSync(f1, c1);

let f2 = 'src/components/workspaces/parser/SyntaxTreePanel.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/import \{ SyntaxTreeNode \} from '@\/engines\/parser\/ll1Simulation';/, "import { SyntaxTreeNode } from '@/engines/parser/model';");
fs.writeFileSync(f2, c2);
