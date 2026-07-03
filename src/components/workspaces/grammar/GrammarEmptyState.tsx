import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';

export function GrammarEmptyState() {
  const { setRawText } = useGrammarStore();

  const loadExample = (type: 'palindrome' | 'arithmetic') => {
    if (type === 'palindrome') {
      setRawText("S -> a S a\nS -> b S b\nS -> \\epsilon");
    } else if (type === 'arithmetic') {
      setRawText("E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id");
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      zIndex: 10,
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📝</div>
      <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '1.5rem' }}>Start writing a Grammar</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px', lineHeight: '1.5' }}>
        Define a Context-Free Grammar using production rules (e.g., S -&gt; a S b). Use A-Z for Nonterminals. The parser will automatically analyze your grammar.
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => loadExample('palindrome')}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
        >
          Load Palindrome Example
        </button>
        <button
          onClick={() => loadExample('arithmetic')}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
        >
          Load Arithmetic Example
        </button>
      </div>
    </div>
  );
}
