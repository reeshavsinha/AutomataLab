import { SyntaxTreeNode } from './model';

export function buildLMD(tree: SyntaxTreeNode): string[][] {
  const steps: string[][] = [];
  
  // The current string of symbols (leaf nodes of the expanding tree)
  // We represent it as a list of nodes so we can easily replace the leftmost non-terminal
  let currentString: SyntaxTreeNode[] = [tree];
  
  steps.push(currentString.map(n => n.symbol));

  let changed = true;
  while (changed) {
    changed = false;
    
    // Find leftmost non-terminal that has children (was expanded)
    for (let i = 0; i < currentString.length; i++) {
      const node = currentString[i];
      if (node.children && node.children.length > 0) {
        // Replace this node with its children
        currentString = [
          ...currentString.slice(0, i),
          ...node.children,
          ...currentString.slice(i + 1)
        ];
        
        steps.push(currentString.map(n => n.symbol));
        changed = true;
        break; // Start over to find the *new* leftmost
      }
    }
  }

  return steps;
}

export function buildRMD(tree: SyntaxTreeNode): string[][] {
  const steps: string[][] = [];
  
  let currentString: SyntaxTreeNode[] = [tree];
  
  steps.push(currentString.map(n => n.symbol));

  let changed = true;
  while (changed) {
    changed = false;
    
    // Find rightmost non-terminal that has children
    for (let i = currentString.length - 1; i >= 0; i--) {
      const node = currentString[i];
      if (node.children && node.children.length > 0) {
        currentString = [
          ...currentString.slice(0, i),
          ...node.children,
          ...currentString.slice(i + 1)
        ];
        
        steps.push(currentString.map(n => n.symbol));
        changed = true;
        break; // Start over to find the *new* rightmost
      }
    }
  }

  return steps;
}
