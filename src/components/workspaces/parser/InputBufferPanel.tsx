import React, { useState, useRef } from 'react';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { useGrammarStore } from '@/store/grammarStore';

// ── Grammar-aware tokenizer ──────────────────────────────────
// Builds tokens using longest-match against the grammar's terminals.
// Falls back to single character for unrecognized symbols.
function tokenizeInput(raw: string, terminals: Set<string>): string[] {
  const sorted = [...terminals].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === ' ' || raw[i] === '\t') { i++; continue; }
    let matched = false;
    for (const t of sorted) {
      if (raw.startsWith(t, i)) {
        tokens.push(t);
        i += t.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(raw[i]);
      i++;
    }
  }
  return tokens;
}

// ── Parser Batch Modal ────────────────────────────────────────
function ParserBatchModal({ onClose }: { onClose: () => void }) {
  const { initializeSim, seekToEnd } = useParserStore();
  const { cfg } = useGrammarStore();
  const [text, setText] = useState('');
  const [results, setResults] = useState<{ input: string; status: string }[] | null>(null);

  const run = () => {
    if (!cfg) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    const out: { input: string; status: string }[] = [];
    for (const line of lines) {
      useParserStore.getState().setRawInput(line);
      useParserStore.getState().initializeSim();
      useParserStore.getState().seekToEnd();
      const sim = useParserStore.getState().simulation;
      out.push({ input: line, status: sim?.status ?? 'error' });
    }
    setResults(out);
  };

  const statusColor = (s: string) => s === 'accepted' ? '#22c55e' : s === 'rejected' ? '#ef4444' : '#a78bfa';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: '8px',
        padding: '24px', width: '520px', maxWidth: '92vw', color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)', fontSize: '13px', boxShadow: 'var(--shadow-lg)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
          Batch Parser Test
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          One input string per line. Lines starting with # are comments.
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'id*id\nid+id*id\n# this is a comment\na+b'}
          style={{
            width: '100%', height: '120px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)', borderRadius: '4px', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '8px',
            resize: 'vertical', outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-default)', borderRadius: '4px',
            color: 'var(--text-secondary)', padding: '5px 14px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px'
          }}>Cancel</button>
          <button onClick={run} disabled={!cfg} style={{
            background: 'var(--text-primary)', border: '1px solid var(--text-primary)', borderRadius: '4px',
            color: 'var(--bg-primary)', padding: '5px 14px', cursor: cfg ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, opacity: cfg ? 1 : 0.5
          }}>Run Batch</button>
        </div>
        {results && (
          <div style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Input</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--text-primary)' }}>{r.input || 'ε'}</td>
                    <td style={{ padding: '4px 8px', color: statusColor(r.status), fontWeight: 600 }}>
                      {r.status.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main InputBufferPanel ─────────────────────────────────────
export function InputBufferPanel() {
  const { rawInput, setRawInput, initializeSim, tokens, setIsPlaying } = useParserStore();
  const simulation = useActiveSimulationState();
  const { cfg } = useGrammarStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const inputIndex = simulation?.inputIndex ?? 0;
  const status = simulation?.status ?? 'idle';

  const handleLoad = () => { initializeSim(); setIsPlaying(true); };

  const insertAtCursor = (text: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? rawInput.length;
    const end = el.selectionEnd ?? rawInput.length;
    const newVal = rawInput.slice(0, start) + text + rawInput.slice(end);
    setRawInput(newVal);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + text.length; el.focus(); }, 0);
  };

  const terminals = cfg ? cfg.terminals : new Set<string>();
  const tokenDisplay = [...(tokens.length > 0 || simulation ? tokens : []), '$'];

  const BTN: React.CSSProperties = {
    padding: '1px 8px',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    borderRadius: '3px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  };

  return (
    <>
      <div style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)'
      }}>
        {/* Row 1: INPUT STRING — full width, Enter key loads */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderBottom: '1px solid var(--border-subtle)', minHeight: '28px'
        }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0
          }}>INPUT STRING</span>

          <input
            ref={inputRef}
            type="text"
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLoad(); } }}
            placeholder="Enter input string…"
            style={{
              flex: 1,
              padding: '2px 8px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              outline: 'none',
              minWidth: 0
            }}
          />

          <button onClick={() => insertAtCursor('ε')} style={BTN} title="Insert epsilon (ε)">ε</button>
          <button onClick={() => setBatchOpen(true)} style={BTN} title="Run batch parser test">Batch</button>

          {status !== 'idle' && status !== 'running' && (
            <span style={{
              padding: '1px 8px',
              background: status === 'accepted' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: status === 'accepted' ? '#22c55e' : '#ef4444',
              border: `1px solid ${status === 'accepted' ? '#22c55e' : '#ef4444'}`,
              borderRadius: '3px', fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.06em', flexShrink: 0
            }}>
              {status.toUpperCase()}
            </span>
          )}
        </div>

        {/* Row 2: INPUT BUFFER — token view */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          padding: '3px 10px', minHeight: '24px', overflowX: 'auto',
          background: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '4px',
          marginTop: '2px'
        }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '92px', flexShrink: 0
          }}>INPUT BUFFER</span>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {rawInput && tokenDisplay.map((token, idx) => {
              const isActive = simulation ? idx === inputIndex : false;
              const isPast = simulation ? idx < inputIndex : false;
              return (
                <span key={idx} style={{
                  padding: '0px 5px',
                  background: isActive ? 'var(--trace-ring)' : 'transparent',
                  color: isActive ? 'var(--trace)' : (isPast ? 'var(--text-muted)' : 'var(--text-primary)'),
                  borderRadius: '2px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.77rem',
                  fontWeight: isActive ? 700 : 400,
                  borderBottom: isActive ? '2px solid var(--trace)' : '2px solid transparent'
                }}>
                  {token === 'ε' || token === '\\epsilon' ? 'ε' : token}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {batchOpen && <ParserBatchModal onClose={() => setBatchOpen(false)} />}
    </>
  );
}
