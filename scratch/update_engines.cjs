const fs = require('fs');
const path = require('path');

function getBaseUpdateScript(filename, metadata, presentation, importPath = '../parser/model') {
  let code = fs.readFileSync(filename, 'utf8');
  
  if (!code.includes('TreeMode')) {
    code = code.replace(/import \{.*ParserEngine.*\} from '.*';/, `import { ParserEngine, ParserStatus, SyntaxTreeNode, ParserMetadata, ParserPresentation, TreeMode, AmbiguityMode, TimelineStyle } from '${importPath}';`);
  }

  const classRegex = /export class [a-zA-Z0-9_]+ implements ParserEngine \{/;
  const match = classRegex.exec(code);
  if (match) {
    const insertStr = `\n  public metadata: ParserMetadata = ${JSON.stringify(metadata, null, 4).replace(/"([^"]+)":/g, '$1:')};\n  public presentation: ParserPresentation = ${JSON.stringify(presentation, null, 4).replace(/"([^"]+)":/g, '$1:').replace(/"(TreeMode\.[A-Z]+)"/g, '$1').replace(/"(AmbiguityMode\.[A-Z]+)"/g, '$1').replace(/"(TimelineStyle\.[A-Z]+)"/g, '$1')};\n`;
    code = code.substring(0, match.index + match[0].length) + insertStr + code.substring(match.index + match[0].length);
  }

  fs.writeFileSync(filename, code);
}

// 1. LL1
getBaseUpdateScript('src/engines/parser/ll1Simulation.ts', 
  {
    parserType: 'LL(1) Top-Down',
    deterministic: true,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: 'O(n)',
    educationalDescription: 'A deterministic top-down parser building a left-most derivation using 1 symbol of lookahead.'
  },
  {
    treeMode: 'TreeMode.INCREMENTAL',
    timelineStyle: 'TimelineStyle.LL',
    ambiguityMode: 'AmbiguityMode.NONE',
    stackVisible: true,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  }
);

// 2. LR
getBaseUpdateScript('src/engines/parser/lrSimulation.ts', 
  {
    parserType: 'LR Bottom-Up',
    deterministic: true,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: 'O(n)',
    educationalDescription: 'A deterministic bottom-up parser building a right-most derivation in reverse.'
  },
  {
    treeMode: 'TreeMode.INCREMENTAL',
    timelineStyle: 'TimelineStyle.LR',
    ambiguityMode: 'AmbiguityMode.NONE',
    stackVisible: true,
    automatonVisible: true,
    closureVisible: true,
    gotoVisible: true,
    derivationVisible: true
  },
  './model'
);

// 3. CYK
getBaseUpdateScript('src/engines/parser/cyk.ts', 
  {
    parserType: 'CYK Dynamic Programming',
    deterministic: false,
    requiresCNF: true,
    supportsAmbiguity: true,
    complexity: 'O(n³)',
    educationalDescription: 'A dynamic programming parser utilizing Chomsky Normal Form to build parses from the bottom up.'
  },
  {
    treeMode: 'TreeMode.FINAL',
    timelineStyle: 'TimelineStyle.CYK',
    ambiguityMode: 'AmbiguityMode.MULTIPLE',
    stackVisible: false,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  }
);

// 4. Earley
getBaseUpdateScript('src/engines/parser/earley.ts', 
  {
    parserType: 'Earley Chart Parser',
    deterministic: false,
    requiresCNF: false,
    supportsAmbiguity: true,
    complexity: 'O(n³) / O(n²)',
    educationalDescription: 'A dynamic programming chart parser utilizing Predict, Scan, and Complete operations.'
  },
  {
    treeMode: 'TreeMode.FINAL',
    timelineStyle: 'TimelineStyle.EARLEY',
    ambiguityMode: 'AmbiguityMode.MULTIPLE',
    stackVisible: false,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  }
);

// 5. Backtracking
getBaseUpdateScript('src/engines/parser/backtracking.ts', 
  {
    parserType: 'Recursive Descent (Backtracking)',
    deterministic: false,
    requiresCNF: false,
    supportsAmbiguity: false,
    complexity: 'O(kⁿ)',
    educationalDescription: 'A naive top-down parser that tries all paths recursively. Not suitable for left-recursive grammars.'
  },
  {
    treeMode: 'TreeMode.INCREMENTAL',
    timelineStyle: 'TimelineStyle.RD',
    ambiguityMode: 'AmbiguityMode.SINGLE',
    stackVisible: true,
    automatonVisible: false,
    closureVisible: false,
    gotoVisible: false,
    derivationVisible: true
  }
);
