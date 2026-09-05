import React, { useState, useEffect } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { useMachineStore } from '@/store/machineStore';
import { Production } from '@/engines/grammar/types';
import { regexToNfa } from '@/engines/machine/conversions/regexToNfa';
import { runToCompletion } from '@/engines/machine/core/engineFactory';

export function GrammarSampleTab() {
  const { cfg, rawText, grammarFormat, getSession, updateSession } = useGrammarStore();
  const machine = useMachineStore((s) => s.machine);
  
  const session = machine ? getSession(machine.id) : {};
  
  const samples = session.samples || [];
  const maxLengthStr = session.maxLengthStr || '5';
  const maxStepsStr = session.maxStepsStr || '1000';
  
  const [isGenerating, setIsGenerating] = useState(false);

  if (!machine) return <div style={{ padding: 16 }}>No grammar loaded.</div>;

  const handleGenerate = () => {
    if (grammarFormat !== 'REGEX' && (!cfg || !cfg.startSymbol)) return;
    setIsGenerating(true);
    updateSession(machine.id, { samples: [] });

    const maxLength = Math.min(100, Math.max(1, Number(maxLengthStr) || 1));
    const maxSteps = Math.min(20_000, Math.max(10, Number(maxStepsStr) || 10));

    // Simple Breadth-First generation
    setTimeout(() => {
      const generated = new Set<string>();

      if (grammarFormat === 'REGEX') {
        let result;
        try {
          result = regexToNfa(rawText).result;
        } catch {
          setIsGenerating(false);
          return;
        }
        if (typeof result === 'string') {
          setIsGenerating(false);
          return;
        }
        const alphabet = result.alphabet ?? [];
        const queue = [''];
        let index = 0;
        while (index < queue.length && index < maxSteps && generated.size < 500) {
          const candidate = queue[index++];
          if (runToCompletion(result, candidate).accepted && candidate.length <= maxLength) {
            generated.add(candidate === '' ? 'ε' : candidate);
          }
          if (candidate.length < maxLength) {
            for (const symbol of alphabet) queue.push(candidate + symbol);
          }
        }
        const finalSamples = Array.from(generated).sort((a, b) => a.length - b.length || a.localeCompare(b));
        updateSession(machine.id, { samples: finalSamples });
        setIsGenerating(false);
        return;
      }

      if (!cfg) {
        setIsGenerating(false);
        return;
      }
      
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

      const finalSamples = Array.from(generated).sort((a, b) => a.length - b.length || a.localeCompare(b));
      updateSession(machine.id, { samples: finalSamples });
      setIsGenerating(false);
    }, 10);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Language Sampler</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {grammarFormat === 'REGEX'
          ? 'Generates short strings accepted by the regular expression using bounded breadth-first enumeration.'
          : 'Generates short strings belonging to the language using a bounded breadth-first derivation search.'}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Max Length</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxLengthStr}
            onChange={e => updateSession(machine.id, { maxLengthStr: e.target.value })}
            style={{ width: 80, padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Max Steps</label>
          <input
            type="number"
            value={maxStepsStr}
            onChange={e => updateSession(machine.id, { maxStepsStr: e.target.value })}
            style={{ width: 100, padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}
            min={10}
            max={20000}
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
            No samples generated yet, or the language is empty within the selected bound.
          </div>
        )}
      </div>
    </div>
  );
}
