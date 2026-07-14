import { CFG, Production, EPSILON } from './types';
import { convertToCNF } from './cnf';
import { generateUniqueNonterminal } from './utils';

// Helper: Substitutes A -> B alpha with A -> beta_1 alpha | beta_2 alpha ...
// Returns a completely new array of productions, preventing mutation bugs via flatMap.
function substituteLeadingVariable(
  productions: Production[],
  targetLhs: string,
  targetLeadingSymbol: string,
  replacementProductions: Production[]
): Production[] {
  return productions.flatMap(p => {
    // Only substitute if the production matches targetLhs and starts with targetLeadingSymbol
    if (p.lhs === targetLhs && p.rhs.length > 0 && p.rhs[0] === targetLeadingSymbol) {
      const alpha = p.rhs.slice(1);
      return replacementProductions.map(repl => ({
        lhs: targetLhs,
        rhs: [...repl.rhs, ...alpha]
      }));
    }
    return [p];
  });
}

// Eliminate direct left recursion for a specific nonterminal and introduce a Z variable.
function eliminateDirectLeftRecursionGNF(
  productions: Production[],
  nt: string,
  newZ: string
): Production[] {
  const alphas: string[][] = [];
  const betas: string[][] = [];
  const otherProds: Production[] = [];

  for (const p of productions) {
    if (p.lhs === nt) {
      if (p.rhs.length > 0 && p.rhs[0] === nt) {
        alphas.push(p.rhs.slice(1));
      } else {
        betas.push(p.rhs);
      }
    } else {
      otherProds.push(p);
    }
  }

  if (alphas.length === 0) return productions;

  const newProds: Production[] = [...otherProds];

  // A -> beta | beta Z
  for (const beta of betas) {
    newProds.push({ lhs: nt, rhs: [...beta] });
    newProds.push({ lhs: nt, rhs: [...beta, newZ] });
  }

  // Z -> alpha | alpha Z
  for (const alpha of alphas) {
    newProds.push({ lhs: newZ, rhs: [...alpha] });
    newProds.push({ lhs: newZ, rhs: [...alpha, newZ] });
  }

  return newProds;
}

export function convertToGNF(cfg: CFG): CFG {
  const gnf = convertToCNF(cfg);
  
  // Exclude start symbol epsilon rule from standard loop processing
  const startEpsilon = gnf.productions.find(
    p => p.lhs === gnf.startSymbol && p.rhs.length === 1 && p.rhs[0] === EPSILON
  );
  let productions = gnf.productions.filter(p => p !== startEpsilon);

  // Top-Down Indexing Pass
  const nts = Array.from(gnf.nonterminals).filter(n => {
    // Filter out isolated nonterminals with no productions if any, but array order serves as indexing
    return productions.some(p => p.lhs === n);
  });
  
  const zVars: string[] = [];
  let zCounter = 1;

  // Forward Elimination Loop
  for (let i = 0; i < nts.length; i++) {
    const Ai = nts[i];

    for (let j = 0; j < i; j++) {
      const Aj = nts[j];
      const ajProds = productions.filter(p => p.lhs === Aj);
      productions = substituteLeadingVariable(productions, Ai, Aj, ajProds);
    }

    // Eliminate direct left recursion
    const newZ = generateUniqueNonterminal(gnf, 'Z', `_${zCounter++}`);
    const originalLength = productions.length;
    productions = eliminateDirectLeftRecursionGNF(productions, Ai, newZ);
    if (productions.length !== originalLength) {
      gnf.nonterminals.add(newZ);
      zVars.push(newZ);
    }
    if (productions.length > 2000) {
      throw new Error("Grammar is too complex for GNF conversion.");
    }
  }

  // Backward Substitution Loop
  for (let i = nts.length - 1; i >= 0; i--) {
    const Ai = nts[i];
    for (let j = i + 1; j < nts.length; j++) {
      const Aj = nts[j];
      const ajProds = productions.filter(p => p.lhs === Aj);
      productions = substituteLeadingVariable(productions, Ai, Aj, ajProds);
    }
  }

  // Final Z-Variable Pass
  // Since Z variables might start with another non-terminal that requires substitution,
  // we iteratively resolve any Z variable production that doesn't start with a terminal.
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 1000) {
    changed = false;
    iterations++;
    for (const z of zVars) {
      const zProds = productions.filter(p => p.lhs === z);
      for (const p of zProds) {
        if (p.rhs.length > 0 && gnf.nonterminals.has(p.rhs[0])) {
          const leadingNt = p.rhs[0];
          const leadingProds = productions.filter(lp => lp.lhs === leadingNt);
          productions = substituteLeadingVariable(productions, z, leadingNt, leadingProds);
          changed = true;
        }
      }
    }
  }

  if (startEpsilon) {
    productions.unshift(startEpsilon);
  }

  gnf.productions = productions;
  return gnf;
}
