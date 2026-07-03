import { CFG, Production, EPSILON } from './types';
import { convertToCNF } from './cnf';

// Greibach Normal Form requires A -> a\alpha
// A simplified approach:
// 1. Convert to CNF first.
// 2. Eliminate left recursion and perform substitution (standard algorithm).
export function convertToGNF(cfg: CFG): CFG {
  let cnf = convertToCNF(cfg);

  // In CNF, we have A -> BC and A -> a
  // We need to order non-terminals A1, A2, ..., An
  const nts = Array.from(cnf.nonterminals);
  
  // Create a map to quickly look up productions by LHS
  const getProds = (A: string) => cnf.productions.filter(p => p.lhs === A);
  const replaceProds = (A: string, newProds: Production[]) => {
    cnf.productions = cnf.productions.filter(p => p.lhs !== A).concat(newProds);
  };

  // Step 1: For i = 1 to n, ensure A_i -> A_j ... implies j > i
  for (let i = 0; i < nts.length; i++) {
    const Ai = nts[i];

    for (let j = 0; j < i; j++) {
      const Aj = nts[j];
      
      // If Ai -> Aj \gamma
      let changed = false;
      let newAiProds: Production[] = [];
      const aiProds = getProds(Ai);

      for (const p of aiProds) {
        if (p.rhs.length > 0 && p.rhs[0] === Aj) {
          changed = true;
          const gamma = p.rhs.slice(1);
          // Substitute Aj -> \delta_1 | \delta_2 ...
          const ajProds = getProds(Aj);
          for (const ajP of ajProds) {
            newAiProds.push({ lhs: Ai, rhs: [...ajP.rhs, ...gamma] });
          }
        } else {
          newAiProds.push(p);
        }
      }
      
      if (changed) replaceProds(Ai, newAiProds);
    }

    // Eliminate direct left recursion on Ai
    cnf = eliminateDirectLeftRecursionGNF(cnf, Ai);
  }

  // Step 2: Backward substitution
  // Ensure every RHS starts with a terminal
  for (let i = nts.length - 1; i >= 0; i--) {
    const Ai = nts[i];
    let changed = false;
    let newAiProds: Production[] = [];
    const aiProds = getProds(Ai);

    for (const p of aiProds) {
      if (p.rhs.length > 0 && cnf.nonterminals.has(p.rhs[0])) {
        changed = true;
        const Aj = p.rhs[0];
        const gamma = p.rhs.slice(1);
        const ajProds = getProds(Aj);
        for (const ajP of ajProds) {
          newAiProds.push({ lhs: Ai, rhs: [...ajP.rhs, ...gamma] });
        }
      } else {
        newAiProds.push(p);
      }
    }
    if (changed) replaceProds(Ai, newAiProds);
  }

  return cnf;
}

// GNF specific direct left recursion elimination (produces B -> \beta Z, Z -> \alpha Z | \alpha)
function eliminateDirectLeftRecursionGNF(cfg: CFG, nt: string): CFG {
  const alphas: string[][] = [];
  const betas: string[][] = [];
  const otherProds: Production[] = [];

  for (const p of cfg.productions) {
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

  if (alphas.length === 0) return cfg;

  const Z = nt + '_Z';
  cfg.nonterminals.add(Z);

  const newProds: Production[] = [];

  for (const beta of betas) {
    newProds.push({ lhs: nt, rhs: [...beta] });
    newProds.push({ lhs: nt, rhs: [...beta, Z] });
  }

  for (const alpha of alphas) {
    newProds.push({ lhs: Z, rhs: [...alpha] });
    newProds.push({ lhs: Z, rhs: [...alpha, Z] });
  }

  cfg.productions = [...otherProds, ...newProds];
  return cfg;
}
