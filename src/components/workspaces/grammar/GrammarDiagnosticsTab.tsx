import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { eliminateDirectLeftRecursion, leftFactor, removeUnreachable } from '@/engines/grammar/transformations';
import { generalGrammarProblemMessages } from '@/engines/grammar/grammarFundamentals';

export function GrammarDiagnosticsTab() {
  const { diagnostics, applyTransformation, grammar, grammarFormat, classification } = useGrammarStore();

  const handleAutoFix = (type: string, nt: string) => {
    switch (type) {
      case 'left-recursion':
        applyTransformation(eliminateDirectLeftRecursion, nt);
        break;
      case 'left-factoring':
        applyTransformation(leftFactor, nt);
        break;
      case 'unreachable':
        applyTransformation(removeUnreachable, nt);
        break;
    }
  };

  if (grammarFormat === 'REGEX') {
    return null;
  }

  if ((grammarFormat === 'TYPE_0' || grammarFormat === 'TYPE_1') && grammar && classification) {
    const messages = generalGrammarProblemMessages(grammarFormat, grammar);
    if (messages.length === 0) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>✓</div>
          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>No format violations</div>
          <div style={{ fontSize: '0.85rem', marginTop: '8px', maxWidth: 400, margin: '8px auto 0', lineHeight: 1.5 }}>
            {grammarFormat === 'TYPE_0'
              ? 'Type 0 rules have few shape restrictions. Properties explains the inferred class; Derivations tests strings with a bounded search (see F2 handbook → Conversions & recognizers).'
              : 'Productions satisfy the context-sensitive (non-contracting) shape. CFG-specific fixes apply only to Type 2/3 grammars.'}
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Found {messages.length} issue{messages.length === 1 ? '' : 's'} for {grammarFormat.replace('_', ' ')}:
        </div>
        {messages.map((message, idx) => (
          <div key={idx} style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
          }}>
            {message}
          </div>
        ))}
      </div>
    );
  }

  if (!diagnostics || diagnostics.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>✓</div>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>No Problems Detected</div>
        <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>The grammar is valid, reachable, and optimized for CFG analysis.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Found {diagnostics.length} issue{diagnostics.length === 1 ? '' : 's'}:
      </div>

      {diagnostics.map((diag, idx) => (
        <div key={idx} style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          padding: '12px',
        }}>
          <div style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: '4px' }}>
            {diag.type === 'error' ? 'Error' : diag.type.replace('-', ' ')}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {diag.message}
          </div>
          {(diag.type === 'left-recursion' || diag.type === 'left-factoring' || diag.type === 'unreachable') && (
            <button
              onClick={() => handleAutoFix(diag.type, diag.nonterminal)}
              style={{
                padding: '4px 8px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Auto-fix
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
