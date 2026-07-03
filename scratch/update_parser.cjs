const fs = require('fs');
let code = fs.readFileSync('src/engines/grammar/parser.ts', 'utf8');

const replacement = `export function parseGrammarText(text: string): CFG {
  const lines = text.split('\\n');
  const productions: Production[] = [];
  const nonterminals = new Set<string>();
  const terminals = new Set<string>();
  let startSymbol: string | null = null;
  const seenProductions = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Split by -> or => or :
    const parts = trimmed.split(/->|=>|:/);
    if (parts.length < 2) throw new Error('Invalid grammar file: malformed production ' + line);

    // LHS is the first token found before the arrow
    const lhsTokens = tokenizeGrammarString(parts[0]);
    if (lhsTokens.length === 0 || lhsTokens.length > 1 || !isNonterminal(lhsTokens[0])) {
      throw new Error('Invalid grammar file: LHS must be a single nonterminal in ' + line);
    }
    
    const lhs = lhsTokens[0]; 
    
    nonterminals.add(lhs);
    if (!startSymbol) {
      startSymbol = lhs;
    }

    const rhsPart = parts.slice(1).join('->').trim();
    if (!rhsPart) throw new Error('Invalid grammar file: missing RHS in ' + line);
    const alternatives = rhsPart.split('|');

    for (const alt of alternatives) {
      const symbols = tokenizeGrammarString(alt);
      const rhs: string[] = [];

      if (symbols.length === 0) {
        // Empty RHS is treated as Epsilon
        rhs.push(EPSILON);
      } else {
        for (const sym of symbols) {
          rhs.push(sym);
          if (sym !== EPSILON) {
            if (isNonterminal(sym)) {
              nonterminals.add(sym);
            } else {
              terminals.add(sym);
            }
          }
        }
      }
      
      const prodString = \`\${lhs}->\${rhs.join(' ')}\`;
      if (seenProductions.has(prodString)) {
        throw new Error('Invalid grammar file: duplicate production ' + prodString);
      }
      seenProductions.add(prodString);
      
      productions.push({ lhs, rhs });
    }
  }
  
  if (productions.length === 0) {
    throw new Error('Invalid grammar file: grammar is empty');
  }
  if (!startSymbol) {
    throw new Error('Invalid grammar file: missing start symbol');
  }

  // Phase 2 Validation: Check for undefined non-terminals (used in RHS but no LHS)
  const lhsSet = new Set(productions.map(p => p.lhs));
  for (const nt of nonterminals) {
    if (!lhsSet.has(nt)) {
      throw new Error('Invalid grammar file: undefined nonterminal ' + nt);
    }
  }

  return {
    nonterminals,
    terminals,
    productions,
    startSymbol: startSymbol || '',
  };
}`;

code = code.replace(/export function parseGrammarText[\s\S]*?startSymbol: startSymbol \|\| '',\n  \};\n\}/, replacement);
fs.writeFileSync('src/engines/grammar/parser.ts', code);
