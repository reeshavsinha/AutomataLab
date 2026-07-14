import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';

export function GrammarStatusBar() {
  const { cfg, diagnostics } = useGrammarStore();

  const numNonterminals = cfg?.nonterminals.size ?? 0;
  const numTerminals = cfg?.terminals.size ?? 0;
  const numProductions = cfg?.productions.length ?? 0;
  const hasErrors = !cfg;
  const numWarnings = diagnostics?.length ?? 0;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', height: '100%', padding: '0 8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Engine:</span>
        <span style={{ color: 'var(--text-primary)' }}>CFG Analyzer</span>
      </div>

      <div style={{ width: '1px', height: '12px', background: 'var(--border-strong)', opacity: 0.5 }} />

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Nonterminals:</span>
          <span style={{ color: 'var(--text-primary)' }}>{numNonterminals}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Terminals:</span>
          <span style={{ color: 'var(--text-primary)' }}>{numTerminals}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Rules:</span>
          <span style={{ color: 'var(--text-primary)' }}>{numProductions}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {hasErrors ? (
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Syntax Error</span>
        ) : numWarnings > 0 ? (
          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{numWarnings} Warning(s)</span>
        ) : (
          <span style={{ color: '#10b981', fontWeight: 'bold' }}>Valid</span>
        )}
      </div>
    </div>
  );
}
