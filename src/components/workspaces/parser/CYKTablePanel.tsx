import React from 'react';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { CYKSimulation } from '@/engines/parser/cyk';

export function CYKTablePanel() {
  const simulation = useActiveSimulationState();
  
  if (!(simulation instanceof CYKSimulation)) {
    return null;
  }
  
  const n = simulation.input.length;
  if (n === 0) {
    return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Input is empty.</div>;
  }
  
  // The table is n x n. We usually render it as a triangle.
  // Rows correspond to lengths (1 to n), usually length 1 at the bottom or top.
  // Standard textbook renders length 1 at the bottom, or length 1 at the top. Let's do length 1 at the top.
  
  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CYK Parse Table</h3>
      
      <div style={{ display: 'flex', flexWrap: 'nowrap', marginBottom: 8 }}>
        {simulation.input.map((token, i) => (
          <div key={i} style={{ 
            width: 60, 
            textAlign: 'center', 
            fontWeight: 'bold', 
            marginRight: 4,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)'
          }}>
            {token}
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Array.from({ length: n }).map((_, r) => {
          const length = r + 1;
          const numCells = n - length + 1;
          
          return (
            <div key={r} style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: numCells }).map((_, c) => {
                const i = c;
                const j = i + length - 1;
                const cell = simulation.table[i]?.[j];
                const items = cell ? Array.from(cell.keys()).join(', ') : '';
                
                // Highlight the cell being currently computed
                const isCurrent = (simulation.currentLength === length && simulation.currentStart === i);
                
                return (
                  <div key={c} style={{
                    width: 60,
                    height: 60,
                    border: isCurrent ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                    background: isCurrent ? 'var(--trace-bg)' : 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    color: items ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {items || '∅'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      
      {simulation.status !== 'idle' && simulation.status !== 'running' && (
        <div style={{ marginTop: 16, fontWeight: 'bold', color: simulation.status === 'accepted' ? '#10b981' : '#ef4444' }}>
          Parser finished: {simulation.status.toUpperCase()}
        </div>
      )}
    </div>
  );
}
