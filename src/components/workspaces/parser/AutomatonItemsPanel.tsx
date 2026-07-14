import React from 'react';
import { LR0Table, formatItem } from '@/engines/parser/lr0';
import { LR1Item } from '@/engines/parser/lr1_types';

interface AutomatonItemsPanelProps {
  table: LR0Table;
}

export function AutomatonItemsPanel({ table }: AutomatonItemsPanelProps) {
  const { states, augmentedCfg } = table;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {states.map(state => (
          <div key={state.id} style={{ 
            background: 'var(--bg-primary)', 
            border: '1px solid #21262d', 
            borderRadius: '4px', 
            overflow: 'hidden'
          }}>
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '2px 8px', 
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700, 
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}>
              State {state.id}
            </div>
            <div style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {state.items.map((item, idx) => {
                const formatted = formatItem(item, augmentedCfg);
                const isLR1 = 'lookaheads' in item;
                return (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    lineHeight: '18px'
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>{formatted.replace('.', '•')}</span>
                    {isLR1 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '12px' }}>
                        [{Array.from((item as any).lookaheads).join(', ')}]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
