import React from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { regexToNfa } from '@/engines/machine/conversions/regexToNfa';
import { computeGrammarFundamentals } from '@/engines/grammar/grammarFundamentals';
import { canOpenInParserStudio, grammarMachineTargets } from '@/engines/machine/core/capabilities';

export function GrammarPropertiesTab() {
  const { grammar, rawText, grammarFormat, classification, cfg, analysis } = useGrammarStore();

  if (grammarFormat === 'REGEX') {
    let result: ReturnType<typeof regexToNfa>['result'] | null = null;
    try {
      result = regexToNfa(rawText).result;
    } catch {
      result = null;
    }
    const alphabet = !result || typeof result === 'string' ? [] : (result.alphabet ?? []);
    const stateCount = !result || typeof result === 'string' ? 0 : result.states.filter((state) => !state.isText).length;
    const valid = Boolean(result && typeof result !== 'string');
    const targets = grammarMachineTargets('REGEX').join(', ');

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', height: '100%' }}>
        <FundamentalSectionView
          title="Regular expression"
          rows={[
            {
              label: 'Language class',
              value: 'Regular (Type 3)',
              detail: 'Same power as finite automata and right/left-linear grammars.',
            },
            { label: 'Alphabet', value: alphabet.length ? alphabet.join(', ') : valid ? 'ε' : '—', detail: 'Symbols that appear in the pattern.' },
            { label: 'Thompson NFA states', value: String(stateCount), detail: 'States in the ε-NFA built from your pattern (preview of conversion size).' },
            { label: 'Syntax', value: valid ? 'Valid' : 'Invalid', highlight: !valid, detail: valid ? undefined : 'Fix grouping or operators; see F2 handbook → Grammar formats.' },
            {
              label: 'Parser Studio',
              value: canOpenInParserStudio('REGEX') ? 'Available' : 'Unavailable',
              detail: 'The app converts regex to an equivalent Type 3 grammar before building tables.',
            },
          ]}
          notes={[
            'Alternation is | ; repetition uses * + ? with parentheses for grouping. Character classes like [a-z] are not supported — each symbol is literal.',
            `Build a machine: toolbar → Machine icon → choose a target (${targets}).`,
            'Sampler lists short matching strings. For derivation trees or CNF, switch to Type 3 or open Parser Studio.',
          ]}
        />
        <div>
          <h4 style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>Expression</h4>
          <code style={{ display: 'block', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '6px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {rawText || 'ε'}
          </code>
        </div>
      </div>
    );
  }

  if (!grammar || !classification) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Enter valid productions, then open Properties for a plain-language summary of your grammar format.
      </div>
    );
  }

  const sections = computeGrammarFundamentals(
    grammarFormat,
    grammar,
    classification,
    cfg,
    analysis,
  );

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', height: '100%' }}>
      {sections.map((section) => (
        <FundamentalSectionView
          key={section.title}
          title={section.title}
          rows={section.rows}
          notes={section.notes}
        />
      ))}
    </div>
  );
}

function FundamentalSectionView({
  title,
  rows,
  notes,
}: {
  title: string;
  rows: Array<{ label: string; value: string; detail?: string; highlight?: boolean }>;
  notes: string[];
}) {
  return (
    <div>
      <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
        {rows.map((row) => (
          <PropertyBox key={row.label} label={row.label} value={row.value} highlight={row.highlight} />
        ))}
      </div>
      {rows.filter((r) => r.detail).map((row) => (
        <p key={`${row.label}-detail`} style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>{row.label}:</strong> {row.detail}
        </p>
      ))}
      {notes.length > 0 && (
        <ul style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PropertyBox({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
      border: highlight ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
      padding: '12px',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 72,
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: highlight ? '#3b82f6' : 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: '4px', textAlign: 'center' }}>{label}</div>
    </div>
  );
}
