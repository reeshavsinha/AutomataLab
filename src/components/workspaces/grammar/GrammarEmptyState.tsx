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
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', maxWidth: '460px', lineHeight: '1.5', fontSize: '0.9rem' }}>
        Define a Context-Free Grammar (CFG) using production rules (e.g., <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>S -&gt; a S b | ε</code>).
      </p>

      <div style={{
        maxWidth: '460px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        marginBottom: '24px',
        lineHeight: '1.55'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Token Formatting Rules:</div>
        • <strong>Nonterminals</strong>: Must start with uppercase (<code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>S</code>, <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>Expr</code>, <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>T'</code>).<br />
        • <strong>Multi-character terminal</strong>: Write together (<code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>num</code>, <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>id</code>) to treat as <strong>1 token</strong>.<br />
        • <strong>Separate terminals</strong>: Separate with spaces (<code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>n u m</code>) to produce <strong>3 separate tokens</strong>.<br />
        • <strong>Quoted literals</strong>: Wrap in quotes (<code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>"num"</code>, <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>"=="</code>, <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>'if'</code>) for explicit multi-character tokens.
      </div>

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
