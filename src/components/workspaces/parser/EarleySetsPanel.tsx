import React from 'react';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { EarleySimulation } from '@/engines/parser/earley';
import { useGrammarStore } from '@/store/grammarStore';

export function EarleySetsPanel() {
  const simulation = useActiveSimulationState();
  
  if (!(simulation instanceof EarleySimulation)) {
    return null;
  }
  
  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Earley State Sets</h3>
      
      <details style={{ marginBottom: '16px', alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        <summary title="Show augmented root" style={{ cursor: 'pointer', listStyle: 'none', width: 20, height: 20, textAlign: 'center', border: '1px solid var(--border-default)', borderRadius: '50%' }}>i</summary>
        <div style={{ marginTop: 6, padding: '5px 8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--blue-500)', borderRadius: 4 }}>Augmented Root: <span style={{ color: 'var(--text-primary)' }}>[ 0: START → {useGrammarStore.getState().cfg?.startSymbol} ]</span></div>
      </details>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {simulation.stateSets.map((set, setIdx) => {
          const isCurrentSet = setIdx === simulation.currentSetIndex;
          
          return (
            <div key={setIdx} style={{ 
              background: 'var(--bg-primary)', 
              border: isCurrentSet ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: 8, 
                color: isCurrentSet ? '#3b82f6' : 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Set S{setIdx}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {setIdx > 0 && setIdx <= simulation.input.length ? `Input: '${simulation.input[setIdx-1]}'` : ''}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {set.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Empty</div>
                ) : (
                  set.map((item, itemIdx) => {
                    const isCurrentItem = isCurrentSet && itemIdx === simulation.currentItemIndex;
                    
                    const rhsArr = [...item.rhs];
                    rhsArr.splice(item.dot, 0, '•');
                    
                    return (
                      <div key={itemIdx} style={{
                        display: 'flex',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        background: isCurrentItem ? 'var(--trace-bg)' : 'transparent',
                        padding: '2px 4px',
                        borderRadius: 4
                      }}>
                        <span style={{ width: 24, color: 'var(--text-muted)' }}>{itemIdx}.</span>
                        <span style={{ color: '#3b82f6', marginRight: 8 }}>{item.lhs}</span>
                        <span style={{ marginRight: 8 }}>→</span>
                        <span style={{ flex: 1, letterSpacing: '0.1em' }}>{rhsArr.join(' ')}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 16 }}>({item.origin})</span>
                      </div>
                    );
                  })
                )}
              </div>
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
