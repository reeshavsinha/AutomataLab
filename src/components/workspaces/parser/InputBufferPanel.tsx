import React, { useState, useRef } from 'react';
import { useParserStore, useActiveSimulationState } from '@/store/parserStore';
import { useGrammarStore } from '@/store/grammarStore';
import { loadTextFile } from '@/utils/fileManager';
import { toast } from '@/store/toastStore';
import { downloadText, fileStem } from '@/utils/exporters';
import {
  firstFailingCase,
  countSuiteExpectations,
  parseTestSuite,
  runParserSuiteAsync,
  suiteResultsToCSV,
  suiteResultsToJSON,
  suiteResultsToLatex,
  suiteResultsToMarkdown,
  type SuiteResult,
} from '@/utils/testSuite';
import type { ParserAlgorithm } from '@/engines/parser/runner';
import { useMachineStore } from '@/store/machineStore';
import Dialog from '@/components/common/Dialog';

const parserBatchButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: '4px',
  color: 'var(--text-secondary)',
  padding: '5px 10px',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
};

// ── Parser Batch Modal: uses the same pure suite runner as Machine Studio ──
function ParserBatchModal({ onClose }: { onClose: () => void }) {
  const { model, algorithm } = useParserStore();
  const machine = useMachineStore((s) => s.machine);
  const [text, setText] = useState('');
  const [results, setResults] = useState<SuiteResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);

  const handleLoadFile = async () => {
    try {
      const res = await loadTextFile({
        title: 'Load Parser Batch File',
        extensions: ['txt', 'csv', 'json'],
      });
      if (res && res.content) {
        setText(res.content);
        setResults(null);
        toast.success(`Loaded ${res.filename}`);
      }
    } catch (err) {
      toast.error('Failed to load text file');
    }
  };

  const run = async () => {
    if (!model) return;
    try {
      const suite = parseTestSuite(text);
      setIsRunning(true);
      setProgress({ completed: 0, total: suite.cases.length });
      setResults(await runParserSuiteAsync(model, algorithm as ParserAlgorithm, suite, {
        onProgress: (completed, total) => setProgress({ completed, total }),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid parser test suite.');
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  const statusColor = (s: string) => s === 'accepted' ? '#22c55e' : s === 'rejected' ? '#ef4444' : '#a78bfa';

  const exportReport = async (format: 'csv' | 'json' | 'md' | 'tex') => {
    if (!results) return;
    const content = format === 'csv'
      ? suiteResultsToCSV(results)
      : format === 'json'
        ? suiteResultsToJSON(results)
        : format === 'md'
          ? suiteResultsToMarkdown(results)
          : suiteResultsToLatex(results);
    const extension = format;
    const out = await downloadText(
      `${fileStem(machine)}-batch.${extension}`,
      content,
      extension,
    );
    if (out) toast.success(`Exported parser batch ${extension.toUpperCase()}`);
  };

  return (
    <Dialog onClose={onClose} label="Batch parser test" zIndex={3000} cardStyle={{
      background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: '8px',
      padding: '24px', width: '520px', maxWidth: '92vw', color: 'var(--text-primary)',
      fontFamily: 'var(--font-mono)', fontSize: '13px', boxShadow: 'var(--shadow-lg)'
    }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
          Batch Parser Test
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          One input string per line. Lines starting with # are comments.
        </div>
        <textarea
          value={text}
          onChange={e => {
            setText(e.target.value);
            setResults(null);
          }}
          placeholder={'id*id\nid+id*id\n# this is a comment\na+b'}
          style={{
            width: '100%', height: '120px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)', borderRadius: '4px', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '8px',
            resize: 'vertical', outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleLoadFile}
            title="Load a .txt, .csv, or .json test suite"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              padding: '5px 12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
          >
            Load suite
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid var(--border-default)', borderRadius: '4px',
              color: 'var(--text-secondary)', padding: '5px 14px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px'
            }}>Cancel</button>
            <button onClick={run} disabled={!model || isRunning} style={{
              background: 'var(--text-primary)', border: '1px solid var(--text-primary)', borderRadius: '4px',
              color: 'var(--bg-primary)', padding: '5px 14px', cursor: model ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, opacity: model && !isRunning ? 1 : 0.5
            }}>{isRunning ? 'Running…' : 'Run Batch'}</button>
          </div>
        </div>
        {progress && <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>{progress.completed}/{progress.total}</div>}
        {results && (
          <div style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Input</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Result</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Check</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>Steps</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--text-primary)' }}>{r.input || 'ε'}</td>
                    <td style={{ padding: '4px 8px', color: statusColor(r.actualStatus), fontWeight: 600 }}>
                      {r.actualStatus.toUpperCase()}
                    </td>
                    <td style={{ padding: '4px 8px', color: r.classification === 'pass' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                      {r.classification.toUpperCase()}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.steps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button onClick={() => exportReport('csv')} style={parserBatchButtonStyle}>Export CSV</button>
              <button onClick={() => exportReport('md')} style={parserBatchButtonStyle}>Markdown</button>
              <button onClick={() => exportReport('json')} style={parserBatchButtonStyle}>JSON</button>
              <button onClick={() => exportReport('tex')} style={parserBatchButtonStyle}>LaTeX</button>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              {results.length} run · {countSuiteExpectations(results) > 0 ? `${results.filter((result) => result.pass === true).length}/${countSuiteExpectations(results)} passed` : 'no expectations'}
            </div>
            {firstFailingCase(results) && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444' }}>
                Counterexample: <code>{firstFailingCase(results)!.input || 'ε'}</code>
                {' '}({firstFailingCase(results)!.classification})
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
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
