import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';

export function GrammarFirstFollowTab() {
  const { analysis, cfg } = useGrammarStore();

  if (!cfg || !analysis) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No valid grammar loaded to compute sets.
      </div>
    );
  }

  const renderSets = (map: Map<string, Set<string>> | undefined) => {
    if (!map || map.size === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No sets computed.</div>;
    
    return Array.from(map.entries()).map(([nt, set]) => {
      if (cfg && !cfg.nonterminals.has(nt)) return null;

      return (
        <div key={nt} style={{ 
          display: 'flex', 
          alignItems: 'baseline', 
          marginBottom: '8px',
          background: 'var(--bg-tertiary)',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: '#d97706', fontWeight: 'bold', minWidth: '40px' }}>{nt}</span>
          <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>=</span>
          <span style={{ color: 'var(--text-primary)' }}>{'{ '}</span> 
          <span style={{ color: '#16a34a' }}>{Array.from(set).join(', ')}</span> 
          <span style={{ color: 'var(--text-primary)' }}>{' }'}</span>
        </div>
      );
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>FIRST Sets</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {renderSets(analysis.firstSets)}
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>FOLLOW Sets</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {renderSets(analysis.followSets)}
        </div>
      </div>
    </div>
  );
}
