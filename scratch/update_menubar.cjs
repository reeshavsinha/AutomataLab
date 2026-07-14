const fs = require('fs');
let code = fs.readFileSync('src/components/layout/MenuBar.tsx', 'utf8');
code = code.replace(/import \{ isPDAType, isTMType \} from '@\/engines\/machine\/core\/utils'/, "import { isPDAType, isTMType } from '@/engines/machine/core/utils'\nimport WorkspaceSwitcher from './WorkspaceSwitcher'");

const target = "{menus.map((m, index) => (\n          <div key={m.id}";
const replacement = "<WorkspaceSwitcher />\n        {menus.map((m, index) => (\n          <div key={m.id}";
code = code.replace(target, replacement);

fs.writeFileSync('src/components/layout/MenuBar.tsx', code);
