import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { eliminateDirectLeftRecursion, leftFactor, removeUnreachable } from '@/engines/grammar/transformations';

export function GrammarDiagnosticsTab() {
  const { diagnostics, applyTransformation } = useGrammarStore();

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

  if (!diagnostics || diagnostics.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>✓</div>
        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>No Problems Detected</div>
        <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>The grammar is valid, reachable, and optimized.</div>
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
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '1.2rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#ef4444', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {diag.type.replace('-', ' ')}
              </strong>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '4px', lineHeight: '1.4' }}>
                {diag.message}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => handleAutoFix(diag.type, diag.nonterminal)}
              style={{ 
                padding: '6px 16px', 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#dc2626')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#ef4444')}
            >
              Auto-Fix
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
