import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';

export function GrammarStatusBar() {
  const { rawText, grammar, grammarFormat, classification, diagnostics } = useGrammarStore();

  const numNonterminals = grammar?.nonterminals.size ?? 0;
  const numTerminals = grammar?.terminals.size ?? 0;
  const numProductions = grammar?.productions.length ?? 0;
  const isEmpty = rawText.trim().length === 0;
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.type === 'error');
  const numWarnings = diagnostics.filter((diagnostic) => diagnostic.type !== 'error').length;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', height: '100%', padding: '0 8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Engine:</span>
        <span style={{ color: 'var(--text-primary)' }}>{grammarFormat === 'REGEX' ? 'Regex editor' : `${classification?.inferredType.replace('_', ' ') ?? grammarFormat.replace('_', ' ')} analyzer`}</span>
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
        {isEmpty ? (
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Empty</span>
        ) : hasErrors ? (
          <span style={{ color: 'var(--status-reject)', fontWeight: 'bold' }}>Syntax Error</span>
        ) : numWarnings > 0 ? (
          <span style={{ color: 'var(--status-warn, #f59e0b)', fontWeight: 'bold' }}>{numWarnings} Warning(s)</span>
        ) : (
          <span style={{ color: 'var(--status-accept)', fontWeight: 'bold' }}>Valid</span>
        )}
      </div>
    </div>
  );
}
