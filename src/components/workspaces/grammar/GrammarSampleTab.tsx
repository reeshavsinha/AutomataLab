import React, { useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { Production } from '@/engines/grammar/types';

export function GrammarSampleTab() {
  const { cfg } = useGrammarStore();
  const [samples, setSamples] = useState<string[]>([]);
  const [maxLength, setMaxLength] = useState(5);
  const [maxSteps, setMaxSteps] = useState(1000);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!cfg) return <div style={{ padding: 16 }}>No valid grammar.</div>;

  const handleGenerate = () => {
    if (!cfg || !cfg.startSymbol) return;
    setIsGenerating(true);
    setSamples([]);

    // Simple Breadth-First generation
    setTimeout(() => {
      const generated = new Set<string>();
      
      interface QueueItem {
        form: string[];
        steps: number;
      }

      const queue: QueueItem[] = [{ form: [cfg.startSymbol!], steps: 0 }];
      let iterations = 0;

      while (queue.length > 0 && iterations < maxSteps && generated.size < 50) {
        iterations++;
        const current = queue.shift()!;
        
        // If entirely terminals, add to generated
        if (current.form.every(sym => cfg.terminals.has(sym) || sym === 'ε')) {
          const str = current.form.filter(s => s !== 'ε').join('');
          if (str.length <= maxLength) {
            generated.add(str === '' ? 'ε' : str);
          }
          continue;
        }

        // If length exceeds max length and no epsilons are possible (rough heuristic), skip
        // For accurate sampling we just limit based on steps
        
        // Find the first non-terminal (Leftmost derivation)
        const ntIndex = current.form.findIndex(sym => cfg.nonterminals.has(sym));
        if (ntIndex === -1) continue;

        const nt = current.form[ntIndex];
        const prods = cfg.productions.filter(p => p.lhs === nt);

        for (const p of prods) {
          const nextForm = [...current.form];
          nextForm.splice(ntIndex, 1, ...(p.rhs.length > 0 ? p.rhs : ['ε']));
          
          // Rough length check to prevent explosion
          const numTerminals = nextForm.filter(sym => cfg.terminals.has(sym)).length;
          if (numTerminals <= maxLength && current.steps < 20) {
            queue.push({ form: nextForm, steps: current.steps + 1 });
          }
        }
      }

      setSamples(Array.from(generated));
      setIsGenerating(false);
    }, 10);
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Language Sampler</h3>
      
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Max Length</label>
          <input 
            type="number" 
            value={maxLength} 
            onChange={e => setMaxLength(Number(e.target.value))}
            style={{ width: 80, padding: 4 }}
            min={1}
            max={20}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Search Steps</label>
          <input 
            type="number" 
            value={maxSteps} 
            onChange={e => setMaxSteps(Number(e.target.value))}
            style={{ width: 100, padding: 4 }}
            min={10}
            max={10000}
          />
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {isGenerating ? 'Generating...' : 'Sample'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
        {samples.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {samples.map((s, i) => (
              <div key={i} style={{ padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                {s}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No samples generated yet, or grammar language is empty.
          </div>
        )}
      </div>
    </div>
  );
}
