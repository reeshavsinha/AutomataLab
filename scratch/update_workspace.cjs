const fs = require('fs');
let code = fs.readFileSync('src/components/workspaces/ParserWorkspace.tsx', 'utf8');

code = code.replace(
  `import { usePanelLayout } from "../../hooks/usePanelLayout";`,
  `import { usePanelLayout } from "../../hooks/usePanelLayout";\nimport { useParserStore } from "../../store/parserStore";`
);

const componentRegex = /export function ParserWorkspace\(\{[^}]*\}\) \{[\s\S]*?(?=return \()/;
const match = componentRegex.exec(code);

if (match) {
  const replacement = `export function ParserWorkspace({ definition }: { definition?: MachineDefinition }) {
  const [rightTab, setRightTab] = React.useState<'stack' | 'closure' | 'derivation'>('stack');
  const { layout, onLayoutChange } = usePanelLayout('parser-workspace-vertical-split', {
    table: 45,
    tree: 55
  });
  const { simulation } = useParserStore();
  const presentation = simulation?.presentation;

  const tabs: Array<'stack' | 'closure' | 'derivation'> = [];
  if (presentation?.stackVisible !== false) tabs.push('stack');
  if (presentation?.closureVisible !== false) tabs.push('closure');
  if (presentation?.derivationVisible !== false) tabs.push('derivation');

  React.useEffect(() => {
    if (!tabs.includes(rightTab) && tabs.length > 0) {
      setRightTab(tabs[tabs.length - 1]);
    }
  }, [presentation, rightTab, tabs]);

  `;
  code = code.replace(match[0], replacement);
}

// Replace the hardcoded tabs mapping
code = code.replace(
  `{(['stack', 'closure', 'derivation'] as const).map(tab => (`,
  `{tabs.map(tab => (`
);

fs.writeFileSync('src/components/workspaces/ParserWorkspace.tsx', code);
