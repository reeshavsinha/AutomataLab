import { parseGrammarText, tokenizeGrammarString } from './src/engines/grammar/parser';
import { EarleySimulation } from './src/engines/parser/earley';
import { SyntaxTreeNode } from './src/engines/parser/model';

try {
  const cfg = parseGrammarText('S -> S a | b | c');
  const inputStr = 'c a a a';
  const tokens = tokenizeGrammarString(inputStr, cfg.nonterminals);
  console.log("Tokens:", tokens);

  const sim = new EarleySimulation(cfg);
  sim.initialize(tokens);
  while (sim.status === 'running') {
    sim.step();
  }

  console.log("Status:", sim.status);
  
  if (sim.status === 'accepted' && sim.tree) {
    const tree = sim.tree;
    // leftmost
    const leftSteps: string[][] = [[tree.symbol]];
    let currentLeft = [tree];
    
    let changed = true;
    while (changed) {
      changed = false;
      const nextLeft: SyntaxTreeNode[] = [];
      let expanded = false;
      
      for (const node of currentLeft) {
        if (!expanded && node.children && node.children.length > 0) {
          nextLeft.push(...node.children);
          expanded = true;
          changed = true;
        } else {
          nextLeft.push(node);
        }
      }
      
      if (changed) {
        currentLeft = nextLeft;
        leftSteps.push(currentLeft.map(n => n.symbol).filter(s => s !== 'ε'));
      }
    }
    console.log("Leftmost Derivation:");
    leftSteps.forEach(step => console.log(step.join(' ')));
  } else {
    console.error("Failed to parse", sim.errorMsg);
  }
} catch (e) {
  console.error("ERROR", e);
}
