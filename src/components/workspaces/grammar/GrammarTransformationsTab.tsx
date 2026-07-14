import React, { useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { 
  convertToCNF, 
  convertToGNF, 
  eliminateDirectLeftRecursion, 
  leftFactor,
  formatCFGToString
} from '@/engines/grammar/transformations';

export function GrammarTransformationsTab() {
  const { cfg, diagnostics, setRawText } = useGrammarStore();
  const [result, setResult] = useState<{ title: string, text: string } | null>(null);

  const isValid = !!cfg;
  const hasLeftRecursion = diagnostics?.some(d => d.type === 'left-recursion');
  const hasLeftFactoring = diagnostics?.some(d => d.type === 'left-factoring');

  const handleTransform = (title: string, transformFn: any, nt: string = '') => {
    if (!cfg) return;
    try {
      const newCfg = transformFn(cfg, nt);
      const newText = formatCFGToString(newCfg);
      setResult({ title, text: newText });
    } catch (e: any) {
      setResult({ title, text: `Error: ${e.message}` });
    }
  };

  const btnStyle = (disabled: boolean, highlight: boolean = false) => ({
    padding: '8px 16px',
    background: disabled ? 'var(--bg-tertiary)' : highlight ? '#3b82f6' : 'var(--bg-secondary)',
    color: disabled ? 'var(--text-muted)' : highlight ? 'white' : 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'bold' as const,
    width: '100%',
    textAlign: 'left' as const,
    marginBottom: '12px',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Transformations</h3>
      
      <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>Normal Forms</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Convert the grammar into standard normal forms used in algorithms and proofs.
        </p>
        
        <button 
          style={btnStyle(!isValid)}
          disabled={!isValid}
          onClick={() => handleTransform('Chomsky Normal Form', convertToCNF)}
        >
          Chomsky Normal Form (CNF)
          <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: 4 }}>
            A → BC | a
          </div>
        </button>

        <button 
          style={btnStyle(!isValid)}
          disabled={!isValid}
          onClick={() => handleTransform('Greibach Normal Form', convertToGNF)}
        >
          Greibach Normal Form (GNF)
          <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginTop: 4 }}>
            A → aα
          </div>
        </button>
      </div>

      <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8, marginBottom: result ? 24 : 0 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>LL(1) Optimizations</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Resolve ambiguities and conflicts to make the grammar parsable by LL(1) parsers.
        </p>

        <button 
          style={btnStyle(!isValid || !hasLeftRecursion, hasLeftRecursion)}
          disabled={!isValid || !hasLeftRecursion}
          onClick={() => {
            const diag = diagnostics?.find(d => d.type === 'left-recursion');
            if (diag) handleTransform('Eliminate Left Recursion', eliminateDirectLeftRecursion, diag.nonterminal);
          }}
        >
          Eliminate Left Recursion
          <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: hasLeftRecursion ? '#bfdbfe' : 'var(--text-muted)', marginTop: 4 }}>
            Removes A → Aα productions
          </div>
        </button>

        <button 
          style={btnStyle(!isValid || !hasLeftFactoring, hasLeftFactoring)}
          disabled={!isValid || !hasLeftFactoring}
          onClick={() => {
            const diag = diagnostics?.find(d => d.type === 'left-factoring');
            if (diag) handleTransform('Left Factoring', leftFactor, diag.nonterminal);
          }}
        >
          Apply Left Factoring
          <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: hasLeftFactoring ? '#bfdbfe' : 'var(--text-muted)', marginTop: 4 }}>
            Extracts common prefixes (A → αβ | αγ)
          </div>
        </button>
      </div>

      {result && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{result.title} Result</span>
            <button 
              onClick={() => setResult(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: 12 }}>
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {result.text}
            </pre>
            {!result.text.startsWith('Error:') && (
              <button 
                onClick={() => {
                  setRawText(result.text);
                  setResult(null);
                }}
                style={{ marginTop: 12, width: '100%', padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Apply to Editor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
