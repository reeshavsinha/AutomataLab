import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';

export function GrammarPropertiesTab() {
  const { cfg } = useGrammarStore();

  if (!cfg) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No valid grammar loaded.
      </div>
    );
  }

  const numTerminals = cfg.terminals.size;
  const numNonterminals = cfg.nonterminals.size;
  const numProductions = cfg.productions.length;
  const startSymbol = cfg.startSymbol;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Overview</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <PropertyBox label="Terminals" value={numTerminals} />
          <PropertyBox label="Nonterminals" value={numNonterminals} />
          <PropertyBox label="Productions" value={numProductions} />
          <PropertyBox label="Start Symbol" value={startSymbol} highlight />
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Grammar Type</h4>
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          <strong>Context-Free Grammar (CFG)</strong>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            A formal grammar where every production rule is of the form A → α, where A is a single nonterminal.
          </p>
        </div>
      </div>
    </div>
  );
}

function PropertyBox({ label, value, highlight = false }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div style={{ 
      background: highlight ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)', 
      border: highlight ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
      padding: '12px', 
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: highlight ? '#3b82f6' : 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
