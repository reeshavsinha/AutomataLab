import React, { useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { Production } from '@/engines/grammar/types';

export function GrammarSampleTab() {
  const { cfg } = useGrammarStore();
  const [samples, setSamples] = useState<string[]>([]);
  const [maxLengthStr, setMaxLengthStr] = useState('5');
  const [maxStepsStr, setMaxStepsStr] = useState('1000');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!cfg) return <div style={{ padding: 16 }}>No valid grammar.</div>;

  const handleGenerate = () => {
    if (!cfg || !cfg.startSymbol) return;
    setIsGenerating(true);
    setSamples([]);

    const maxLength = Math.max(1, Number(maxLengthStr) || 1);
    const maxSteps = Math.max(10, Number(maxStepsStr) || 10);

    // Simple Breadth-First generation
    setTimeout(() => {
      const generated = new Set<string>();
      
      interface QueueItem {
        form: string[];
        steps: number;
      }

      const queue: QueueItem[] = [{ form: [cfg.startSymbol!], steps: 0 }];
      let iterations = 0;
      let qIndex = 0;

      while (qIndex < queue.length && iterations < maxSteps && generated.size < 500) {
        iterations++;
        const current = queue[qIndex++];
        
        // Prevent explosive queue growth that causes memory/CPU freezes
        if (queue.length - qIndex > 50000) {
           break;
        }
        
        // If entirely terminals, add to generated
        if (current.form.every(sym => cfg.terminals.has(sym) || sym === 'ε')) {
          const numSymbols = current.form.filter(s => s !== 'ε').length;
          if (numSymbols <= maxLength) {
            const str = current.form.filter(s => s !== 'ε').join('');
            generated.add(str === '' ? 'ε' : str);
          }
          continue;
        }

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
          if (numTerminals <= maxLength && current.steps < 100) {
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
            type="text" 
            value={maxLengthStr} 
            onChange={e => setMaxLengthStr(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => {
              if (maxLengthStr === '') setMaxLengthStr('0');
            }}
            style={{ 
              width: 80, 
              padding: '4px 8px', 
              border: '1px solid var(--border-color, #555)', 
              borderRadius: 4, 
              background: 'var(--bg-tertiary, #2a2a2a)', 
              color: 'var(--text-primary)' 
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Search Steps</label>
          <input 
            type="text" 
            value={maxStepsStr} 
            onChange={e => setMaxStepsStr(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => {
              if (maxStepsStr === '') setMaxStepsStr('0');
            }}
            style={{ 
              width: 100, 
              padding: '4px 8px', 
              border: '1px solid var(--border-color, #555)', 
              borderRadius: 4, 
              background: 'var(--bg-tertiary, #2a2a2a)', 
              color: 'var(--text-primary)' 
            }}
            min={10}
            max={100000}
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
