const fs = require('fs');
let code = fs.readFileSync('src/components/panels/DeltaTablePanel.tsx', 'utf8');

// Insert the intercept function at the top of the file
code = code.replace(/import \{.*?\} from 'react'/, "$&\n\nfunction convertEpsilon(val: string): string {\n  return val.replace(/\\b(eps|epsilon)\\b/gi, 'ε');\n}");

// Update standard symbol inputs
code = code.replace(/setSymbols\(e\.target\.value\)/g, 'setSymbols(convertEpsilon(e.target.value))');
code = code.replace(/setRead\(e\.target\.value\)/g, 'setRead(convertEpsilon(e.target.value))');
code = code.replace(/setPop\(e\.target\.value\)/g, 'setPop(convertEpsilon(e.target.value))');
code = code.replace(/setPush\(e\.target\.value\)/g, 'setPush(convertEpsilon(e.target.value))');
code = code.replace(/setTmRead\(e\.target\.value\)/g, 'setTmRead(convertEpsilon(e.target.value))');
code = code.replace(/setTmWrite\(e\.target\.value\)/g, 'setTmWrite(convertEpsilon(e.target.value))');
code = code.replace(/setWrite\(e\.target\.value\)/g, 'setWrite(convertEpsilon(e.target.value))');

fs.writeFileSync('src/components/panels/DeltaTablePanel.tsx', code);
