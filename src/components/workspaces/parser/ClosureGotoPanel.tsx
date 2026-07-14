import React from 'react';
import { useParserStore, useActiveSimulationState, useLR0Table, useSLR1Table, useCLR1Table, useLALR1Table } from '@/store/parserStore';
import { formatItem } from '@/engines/parser/lr0';

export function ClosureGotoPanel() {
  const [selectedStateId, setSelectedStateId] = React.useState<number | null>(null);
  const { algorithm } = useParserStore();
  const simulation = useActiveSimulationState();
  const lr0Table = useLR0Table();
  const slr1Table = useSLR1Table();
  const clr1Table = useCLR1Table();
  const lalr1Table = useLALR1Table();

  const getActiveTable = () => {
    if (algorithm === 'LR0') return lr0Table;
    if (algorithm === 'SLR1') return slr1Table;
    if (algorithm === 'CLR1') return clr1Table;
    if (algorithm === 'LALR1') return lalr1Table;
    return null;
  };

  const activeTable = getActiveTable();

  if (simulation?.presentation?.closureVisible === false || !activeTable || !simulation || simulation.stack.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg-primary)'
      }}>
        {simulation?.presentation?.closureVisible === false ? 'Not applicable for this algorithm' : 'Run the parser to see state details'}
      </div>
    );
  }

  let stackStateId = 0;
  for (let i = simulation.stack.length - 1; i >= 0; i--) {
    if (typeof simulation.stack[i] === 'number') {
      stackStateId = simulation.stack[i] as number;
      break;
    }
  }

  const activeStateId = selectedStateId !== null ? selectedStateId : stackStateId;

  const state = activeTable.states.find(s => s.id === activeStateId);
  if (!state) return null;

  const gotos = activeTable.gotoTable.get(activeStateId);
  const actions = activeTable.actionTable.get(activeStateId);

  // Collect all transitions (shifts and gotos)
  const transitions: { symbol: string, to: number }[] = [];
  if (gotos) {
    for (const [nt, target] of gotos.entries()) {
      if (target !== -1) transitions.push({ symbol: nt, to: target });
    }
  }
  if (actions) {
    for (const [t, acts] of actions.entries()) {
      const shift = acts.find(a => a.type === 'Shift');
      if (shift && shift.target !== undefined) transitions.push({ symbol: t, to: shift.target });
    }
  }

  const isLR1 = algorithm === 'CLR1' || algorithm === 'LALR1';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)'
        }}>
          STATE
        </span>
        <select 
          value={selectedStateId === null ? 'auto' : selectedStateId}
          onChange={(e) => setSelectedStateId(e.target.value === 'auto' ? null : parseInt(e.target.value))}
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '3px',
            fontSize: '0.7rem',
            padding: '2px 4px',
            fontFamily: 'var(--font-mono)',
            outline: 'none'
          }}
        >
          <option value="auto">Auto ({stackStateId})</option>
          {activeTable.states.map(s => (
            <option key={s.id} value={s.id}>{s.id}</option>
          ))}
        </select>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)'
        }}>
          CLOSURE & GOTO
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Closure Items:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {state.items.map((item: any, idx: number) => (
              <div key={idx} style={{
                background: 'var(--bg-secondary)',
                padding: '4px 8px',
                borderRadius: '3px',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: 'var(--text-primary)' }}>{formatItem(item, activeTable.augmentedCfg).replace('.', '•')}</span>
                {isLR1 && item.lookaheads && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    [{Array.from(item.lookaheads).join(', ')}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {transitions.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Transitions (Goto):</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {transitions.map((trans, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-secondary)',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)'
                }}>
                  On <strong style={{ color: 'var(--blue-400)' }}>{trans.symbol}</strong> ➔ Goto State {trans.to}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
