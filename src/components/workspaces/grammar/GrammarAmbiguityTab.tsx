import React, { useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { BacktrackingSimulation } from '@/engines/parser/backtracking';
import { tokenizeGrammarString } from '@/engines/grammar/parser';

export function GrammarAmbiguityTab() {
  const { cfg } = useGrammarStore();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ ambiguous: boolean; counterexample?: string; message: string } | null>(null);

  if (!cfg) return <div style={{ padding: 16 }}>No valid grammar.</div>;

  const handleCheck = () => {
    if (!cfg.startSymbol) return;
    setIsChecking(true);
    setResult(null);

    setTimeout(() => {
      // 1. Generate samples up to depth/length bound using BFS
      const generated = new Set<string>();
      
      interface QueueItem {
        form: string[];
        steps: number;
      }

      const queue: QueueItem[] = [{ form: [cfg.startSymbol!], steps: 0 }];
      const maxSteps = 2000;
      let iterations = 0;
      
      const samples: string[] = [];

      while (queue.length > 0 && iterations < maxSteps && samples.length < 50) {
        iterations++;
        const current = queue.shift()!;
        
        if (current.form.every(sym => cfg.terminals.has(sym) || sym === 'ε')) {
          const str = current.form.filter(s => s !== 'ε').join('');
          if (!generated.has(str)) {
            generated.add(str);
            samples.push(str === '' ? 'ε' : str);
          }
          continue;
        }
        
        const ntIndex = current.form.findIndex(sym => cfg.nonterminals.has(sym));
        if (ntIndex === -1) continue;

        const nt = current.form[ntIndex];
        const prods = cfg.productions.filter(p => p.lhs === nt);

        for (const p of prods) {
          const nextForm = [...current.form];
          nextForm.splice(ntIndex, 1, ...(p.rhs.length > 0 ? p.rhs : ['ε']));
          
          if (current.steps < 12) {
            queue.push({ form: nextForm, steps: current.steps + 1 });
          }
        }
      }

      // 2. We don't have a full ambiguous parse tree generator easily available in BacktrackingSimulation.
      // BacktrackingSimulation stops at the FIRST valid parse tree.
      // To check ambiguity, we need to find all parse trees for a given string and see if count > 1.
      
      // Let's implement a quick multi-parse recursive descent just for this string
      let foundAmbiguity = false;
      let counterexample = '';

      for (const str of samples) {
        const tokens = str === 'ε' ? [] : tokenizeGrammarString(str);
        
        let parseCount = 0;
        let opsCount = 0;
        
        // Local backtracking function that counts all derivations
        const countParses = (symbol: string, index: number, depth: number): number[] => {
          opsCount++;
          if (opsCount > 10000) return []; // limit exponential blowup

          if (depth > 20) return []; // limit
          
          if (cfg.terminals.has(symbol)) {
            if (index < tokens.length && tokens[index] === symbol) return [index + 1];
            return [];
          }
          
          if (symbol === 'ε') return [index];
          
          if (cfg.nonterminals.has(symbol)) {
            const prods = cfg.productions.filter(p => p.lhs === symbol);
            let validEnds: number[] = [];
            
            for (const p of prods) {
              const rhs = p.rhs.length > 0 ? p.rhs : ['ε'];
              
              let currentIndices = [index];
              for (const sym of rhs) {
                const nextIndices: number[] = [];
                for (const idx of currentIndices) {
                  nextIndices.push(...countParses(sym, idx, depth + 1));
                }
                currentIndices = nextIndices;
                if (currentIndices.length === 0) break;
              }
              validEnds.push(...currentIndices);
            }
            return validEnds;
          }
          
          return [];
        };

        const ends = countParses(cfg.startSymbol!, 0, 0);
        parseCount = ends.filter(e => e === tokens.length).length;

        if (parseCount > 1) {
          foundAmbiguity = true;
          counterexample = str;
          break;
        }
      }

      if (foundAmbiguity) {
        setResult({
          ambiguous: true,
          counterexample,
          message: `Ambiguity detected! The string '${counterexample}' has multiple valid parse trees.`
        });
      } else {
        setResult({
          ambiguous: false,
          message: `No ambiguity found up to depth 12. Note: CFG Ambiguity is undecidable in general, so this does not guarantee the grammar is unambiguous.`
        });
      }
      setIsChecking(false);
    }, 50);
  };

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ambiguity Checker</h3>
      
      <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Determining if an arbitrary Context-Free Grammar is ambiguous is mathematically undecidable. 
          This tool performs a bounded breadth-first search to find a counterexample string that has multiple valid parse trees.
        </p>
        
        <button 
          onClick={handleCheck}
          disabled={isChecking}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isChecking ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            fontWeight: 'bold',
            width: '100%'
          }}
        >
          {isChecking ? 'Checking...' : 'Run Bounded Ambiguity Check'}
        </button>
      </div>

      {result && (
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: 16, 
          borderRadius: 8,
          border: `1px solid ${result.ambiguous ? '#ef4444' : '#10b981'}`
        }}>
          <div style={{ color: result.ambiguous ? '#ef4444' : '#10b981', fontWeight: 'bold', marginBottom: 8 }}>
            {result.ambiguous ? 'Grammar is Ambiguous' : 'No Ambiguity Detected'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            {result.message}
          </div>
        </div>
      )}
    </div>
  );
}
