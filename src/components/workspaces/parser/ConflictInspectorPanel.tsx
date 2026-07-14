import React from 'react';
import { useTraceabilityStore } from '@/store/traceabilityStore';
import { LR0Table } from '@/engines/parser/lr0';
import { EPSILON } from '@/engines/grammar/types';

export function ConflictInspectorPanel({ table }: { table: LR0Table }) {
  const { focusedParseAction, setFocusedParseAction } = useTraceabilityStore();

  if (!focusedParseAction) return null;
  const { state, symbol } = focusedParseAction;

  const actions = table.actionTable.get(state)?.get(symbol) || [];
  if (actions.length <= 1) return null; // Not a conflict

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-primary)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
        <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span> Conflict Inspector
        </h3>
        <button onClick={() => setFocusedParseAction(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
      </div>

      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* The Collision */}
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>The Collision</h4>
          <p style={{ margin: 0 }}>
            In <strong>State {state}</strong>, when the lookahead symbol is <strong>'{symbol}'</strong>, the parser does not know which action to take.
          </p>
        </div>

        {/* The Anatomy */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Competing Actions</h4>
          <div style={{ display: 'flex', gap: '16px' }}>
            {actions.map((act, idx) => (
              <div key={idx} style={{ flex: 1, background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: act.type === 'Shift' ? '#3b82f6' : '#d97706' }}>
                  {act.type} {act.type === 'Shift' ? `to State ${act.target}` : `using Production ${act.target}`}
                </div>
                {act.type === 'Reduce' && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    (The parser believes it has seen a complete rule)
                  </div>
                )}
                {act.type === 'Shift' && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    (The parser believes it is still in the middle of a rule)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Strategies */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Educational Resolution Strategies</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '16px', borderLeft: '4px solid #3b82f6', background: 'var(--bg-secondary)' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Strategy 1: Operator Precedence</h5>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                If this is a Shift/Reduce conflict involving operators (like <code>+</code> or <code>*</code>), or the "Dangling Else" problem, modern parser generators (like Yacc/Bison) use precedence declarations (e.g., <code>%left</code>, <code>%right</code>) to force a resolution without modifying the grammar.
              </p>
            </div>

            <div style={{ padding: '16px', borderLeft: '4px solid #10b981', background: 'var(--bg-secondary)' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Strategy 2: Grammar Rewriting (Left Factoring)</h5>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                If this is a Reduce/Reduce conflict, or a Shift/Reduce conflict where two rules share a common prefix, you must rewrite the grammar. Use <strong>Left Factoring</strong> to delay the decision until more symbols are seen.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
