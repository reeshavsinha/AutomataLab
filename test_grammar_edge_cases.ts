import { parseGrammarText } from './src/engines/grammar/parser.ts';

const runTests = () => {
  let passed = 0;
  let failed = 0;

  const testCases = [
    {
      name: "Standard medium length grammar",
      input: `S -> A B | C
A -> a A | epsilon
B -> b B
   | eps
C -> c C | `,
      expectedFlat: [
        "S -> A B", "S -> C", 
        "A -> a A", "A -> ε", 
        "B -> b B", "B -> ε", 
        "C -> c C"
      ]
    },
    {
      name: "Multi-line with trailing pipes",
      input: `
      S -> A |
           B |
           C |
      `,
      expectedFlat: ["S -> A", "S -> B", "S -> C"]
    },
    {
      name: "Empty grammar error",
      input: `   \n  \n  // comment \n  `,
      expectError: true
    },
    {
      name: "Missing RHS",
      input: `S -> A \nA -> `,
      expectedFlat: ["S -> A", "A -> ε"]
    },
    {
      name: "Undefined non-terminal soft diagnostic (parser shouldn't throw)",
      input: `S -> A \n B -> C`,
      expectedFlat: ["S -> A", "B -> C"]
    },
    {
      name: "Malformed LHS",
      input: `S S -> A`,
      expectError: true
    },
    {
      name: "Epsilon alias resolution",
      input: `S -> eps | epsilon | ε`,
      expectError: true
    }
  ];

  for (const tc of testCases) {
    try {
      const cfg = parseGrammarText(tc.input);
      if (tc.expectError) {
        console.error(`❌ FAILED [${tc.name}]: Expected error but parsed successfully`);
        failed++;
        continue;
      }
      
      const flat = cfg.productions.map(p => `${p.lhs} -> ${p.rhs.join(' ')}`);
      
      const setExpected = new Set(tc.expectedFlat);
      const setActual = new Set(flat);
      
      let match = setExpected.size === setActual.size;
      if (match) {
        for (const f of flat) {
          if (!setExpected.has(f)) match = false;
        }
      }

      if (!match) {
        console.error(`❌ FAILED [${tc.name}]: \n  Expected: ${tc.expectedFlat.join(', ')}\n  Got:      ${flat.join(', ')}`);
        failed++;
      } else {
        console.log(`✅ PASSED [${tc.name}]`);
        passed++;
      }
    } catch (e: any) {
      if (tc.expectError) {
        console.log(`✅ PASSED [${tc.name}] (Caught expected error)`);
        passed++;
      } else {
        console.error(`❌ FAILED [${tc.name}]: Unexpected error: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runTests();
