const fs = require('fs');
let code = fs.readFileSync('src/engines/parser/lrSimulation.ts', 'utf8');

// Inside Shift
const shiftReplacement = `    if (action.type === 'Shift') {
      const targetState = action.target!;
      if (targetState === undefined || targetState < 0 || targetState >= this.table.states.length) {
        this.status = 'error';
        this.errorMsg = \`Parse Error: Invalid parser table. Shift target state \${targetState} does not exist.\`;
        return true;
      }
      
      const leafNode: SyntaxTreeNode = {`;
code = code.replace(/    if \(action\.type === 'Shift'\) \{\s*const targetState = action\.target!;\s*const leafNode: SyntaxTreeNode = \{/, shiftReplacement);

// Inside Reduce
const reduceReplacement = `    if (action.type === 'Reduce') {
      const prodIndex = action.target!;
      const prod = this.table.augmentedCfg.productions[prodIndex];
      if (!prod) {
        this.status = 'error';
        this.errorMsg = \`Parse Error: Invalid parser table. Reduce target production \${prodIndex} does not exist.\`;
        return true;
      }`;
code = code.replace(/    if \(action\.type === 'Reduce'\) \{\s*const prodIndex = action\.target!;\s*const prod = this\.table\.augmentedCfg\.productions\[prodIndex\];/, reduceReplacement);

// Inside Goto check
const gotoReplacement = `      if (gotoTarget === undefined || gotoTarget === -1 || gotoTarget >= this.table.states.length) {
        this.status = 'error';
        this.errorMsg = \`Parse Error: Invalid parser table. Missing or invalid GOTO for State \${topState} on nonterminal '\${prod.lhs}'.\`;
        return true;
      }`;
code = code.replace(/      if \(gotoTarget === undefined \|\| gotoTarget === -1\) \{\s*this\.status = 'rejected';\s*this\.errorMsg = \`Parse Error: Missing GOTO for State \$\{topState\} on nonterminal '\$\{prod\.lhs\}'\`;\s*return true;\s*\}/, gotoReplacement);

fs.writeFileSync('src/engines/parser/lrSimulation.ts', code);
