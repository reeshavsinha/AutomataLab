// Shared grammar & regex syntax copy — editor panel, Help modal, user manual.

import type { CSSProperties, ReactNode } from 'react'
import { BookOpen, Sparkles } from 'lucide-react'

const mono: CSSProperties = {
  background: 'var(--bg-primary)',
  padding: '1px 4px',
  borderRadius: '3px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.95em',
}

function M({ children }: { children: ReactNode }) {
  return <code style={mono}>{children}</code>
}

export const GRAMMAR_TOKEN_ROWS: { example: string; result: string; rule: string }[] = [
  { example: 'S -> num + num', result: 'Terminals: num, +', rule: 'Contiguous letters form one terminal (not n, u, m).' },
  { example: 'S -> n u m', result: 'Terminals: n, u, m', rule: 'Spaces separate symbols — three one-character terminals.' },
  { example: 'S -> "==" | \'if\'', result: 'Terminals: ==, if', rule: 'Quotes keep the exact spelling as one terminal.' },
  { example: 'E -> Expr + Term', result: 'Nonterminals: E, Expr, Term', rule: 'Identifiers starting with A–Z are nonterminals.' },
  { example: 'S -> eps', result: 'Empty right-hand side (ε)', rule: 'ε, eps, epsilon, λ, or "" on the RHS.' },
]

const panelShell: CSSProperties = {
  background: 'var(--bg-secondary)',
  borderBottom: '2px solid var(--border-default)',
  padding: '10px 12px',
  fontSize: '0.72rem',
  lineHeight: 1.55,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-sans)',
  flexShrink: 0,
}

export function GrammarSyntaxGuidePanel({ onClose }: { onClose?: () => void }) {
  return (
    <div style={{ ...panelShell, overflowY: 'auto', maxHeight: '280px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <BookOpen size={12} style={{ color: 'var(--chrome-active-border, #3b82f6)' }} />
          How to write productions
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            title="Close syntax guide"
          >
            ✕
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
        One rule per line in grouped view; the first left-hand side is the start symbol. <strong>F1</strong> opens the user manual;{' '}
        <strong>F2</strong> opens the theory handbook (grammar Types 0–3 and more).
      </p>

      <Section title="Production arrow">
        Use <M>-&gt;</M>, <M>→</M>, <M>::=</M>, or <M>:</M>. Alternatives on one line: <M>|</M> or <M>∣</M> (normalized to <M>|</M>). After <M>|</M>, press Enter in grouped mode to continue on an indented line.
      </Section>

      <Section title="Nonterminals">
        Must start with an uppercase letter: <M>S</M>, <M>Expr</M>, <M>T'</M>, <M>Term_1</M>.
      </Section>

      <Highlight title="Terminals — read this before naming tokens">
        <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
          <li><M>num</M> and <M>id</M> are each <strong>one</strong> terminal.</li>
          <li><M>n u m</M> is three terminals: <M>n</M>, <M>u</M>, <M>m</M>.</li>
          <li>Use quotes for operators or keywords: <M>"=="</M>, <M>'if'</M>, <M>";"</M>.</li>
          <li>Lowercase words (not quoted) are terminals; uppercase words are nonterminals.</li>
        </ul>
      </Highlight>

      <Section title="Epsilon (empty string)">
        <M>ε</M>, <M>λ</M>, <M>eps</M>, <M>epsilon</M>, <M>\epsilon</M>, or <M>""</M> on the right-hand side.
      </Section>

      <Section title="Editor assists">
        Ghost completions for <M>-&gt;</M> and <M>|</M> (Tab), ε insert button, automatic <M>∣</M> → <M>|</M>, and format validation in the status bar.
      </Section>

      <pre style={{
        margin: '8px 0 0',
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.69rem',
        color: 'var(--text-primary)',
      }}>
        {'# Example\nE -> E + T | T\nT -> T * F | F\nF -> ( E ) | id | num'}
      </pre>
    </div>
  )
}

export function RegexSyntaxGuidePanel() {
  return (
    <div style={panelShell}>
      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Regular-expression syntax</strong>
      <p style={{ margin: '0 0 6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        Whitespace is ignored. There are no <M>[a-z]</M> character classes — each symbol is literal unless it is an operator below.
      </p>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        <li>Concatenation: write symbols next to each other (<M>ab</M>).</li>
        <li>Alternation: <M>|</M> or classroom <M>+</M> between alternatives (<M>a|b</M>, <M>a+b</M>).</li>
        <li>Repetition: <M>*</M> (zero or more), <M>?</M> (optional). Postfix <M>+</M> on an atom means one or more: <M>(a+)b</M>.</li>
        <li>Grouping: parentheses. Empty string: <M>ε</M>, <M>λ</M>, <M>eps</M>, <M>epsilon</M>.</li>
      </ul>
      <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.68rem' }}>
        Examples: <M>(a+b)*ab</M>, <M>(a|b)*abb</M>, <M>(0|1(01*0)*1)*</M>
      </p>
    </div>
  )
}

/** Compact block for Help modal — grammar token rules */
export function GrammarSyntaxHelpSection() {
  return (
    <>
      <p style={{ margin: '0 0 10px', fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        The lexer treats your production text literally. Getting <M>num</M> vs <M>n u m</M> wrong is the most common source of “my parse does not match” bugs.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', marginBottom: '10px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>You write</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {GRAMMAR_TOKEN_ROWS.map((row) => (
            <tr key={row.example} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{row.example}</td>
              <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{row.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
        Test strings use <strong>longest match</strong> over the terminal alphabet (Parser Studio input bar). Open the syntax guide in the editor toolbar for arrows, ε, and grouped layout.
      </p>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <strong style={{ color: 'var(--text-primary)' }}>{title}:</strong>{' '}
      <span>{children}</span>
    </div>
  )
}

function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '6px 8px', margin: '6px 0' }}>
      <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
        <Sparkles size={11} style={{ color: '#eab308' }} />
        {title}
      </strong>
      {children}
    </div>
  )
}
