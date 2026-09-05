import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { regexToNfa } from '@/engines/machine/conversions/regexToNfa';

export function GrammarPropertiesTab() {
  const { grammar, rawText, grammarFormat, classification } = useGrammarStore();

  if (grammarFormat === 'REGEX') {
    let result: ReturnType<typeof regexToNfa>['result'] | null = null;
    try {
      result = regexToNfa(rawText).result;
    } catch {
      result = null;
    }
    const alphabet = !result || typeof result === 'string' ? [] : (result.alphabet ?? []);
    const stateCount = !result || typeof result === 'string' ? 0 : result.states.filter((state) => !state.isText).length;
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>Regular Expression</h4>
          <code style={{ display: 'block', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {rawText || 'ε'}
          </code>
        </div>
        <div>
          <h4 style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>Properties</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <PropertyBox label="Alphabet" value={alphabet.length ? alphabet.join(', ') : 'ε'} />
            <PropertyBox label="NFA States" value={stateCount} />
            <PropertyBox label="Notation" value="Regular" />
            <PropertyBox label="Status" value={!result || typeof result === 'string' ? 'Invalid' : 'Valid'} />
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
          {result && typeof result !== 'string'
            ? 'This expression denotes a regular language and can be converted to an equivalent DFA, Type 3 grammar, or Parser Studio input.'
            : 'Enter a valid regular expression to view its properties and conversion targets.'}
        </div>
      </div>
    )
  }

  if (!grammar) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No valid grammar loaded.
      </div>
    );
  }

  const numTerminals = grammar.terminals.size;
  const numNonterminals = grammar.nonterminals.size;
  const numProductions = grammar.productions.length;
  const startSymbol = grammar.startSymbol;
  const typeLabel = {
    TYPE_0: 'Type 0 — Unrestricted grammar',
    TYPE_1: 'Type 1 — Context-sensitive grammar',
    TYPE_2: 'Type 2 — Context-free grammar',
    TYPE_3: 'Type 3 — Regular grammar',
  }[classification?.inferredType ?? grammarFormat as Exclude<typeof grammarFormat, 'REGEX'>]

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
          <strong>{typeLabel}</strong>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {classification?.isValidForSelectedFormat
              ? `Validated as ${typeLabel}.`
              : 'The selected grammar format has validation errors.'}
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
