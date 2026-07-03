import React, { useMemo } from 'react';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { buildLMD, buildRMD } from '@/engines/parser/derivation';

export function DerivationPanel() {
  const { currentStep } = useParserStore();
  const simulation = useActiveSimulationState();
  const derivationVisible = simulation?.presentation?.derivationVisible;
  const tree = simulation?.tree;
  
  const { lmd, rmd } = useMemo(() => {
    if (!tree) return { lmd: [], rmd: [] };
    return {
      lmd: buildLMD(tree),
      rmd: buildRMD(tree)
    };
  }, [tree]);

  if (derivationVisible === false) {
    return null;
  }

  if (!tree) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        background: 'var(--bg-primary)'
      }}>
        Run the parser to see derivation
      </div>
    );
  }

  const renderSteps = (steps: string[][]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{i === 0 ? 'Start' : '=>'}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {step.map((sym, j) => (
              <span key={j} style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem'
              }}>
                {sym}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)'
        }}>
          DERIVATIONS
        </span>
        
        {simulation.isAmbiguous && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--danger)', fontWeight: 'bold' }} title="Grammar is ambiguous for this input.">
              AMBIGUOUS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
              <button 
                disabled={!simulation.currentParseIndex || simulation.currentParseIndex === 0}
                onClick={() => simulation.recomputeTree?.(simulation.currentParseIndex! - 1)}
                style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                ◀
              </button>
              <span>Parse {(simulation.currentParseIndex || 0) + 1} of {simulation.totalParses}</span>
              <button 
                disabled={simulation.currentParseIndex === undefined || simulation.currentParseIndex >= (simulation.totalParses || 1) - 1}
                onClick={() => simulation.recomputeTree?.(simulation.currentParseIndex! + 1)}
                style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Left-Most Derivation</h4>
          {renderSteps(lmd)}
        </div>
        
        <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
        
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Right-Most Derivation</h4>
          {renderSteps(rmd)}
        </div>
      </div>
    </div>
  );
}
