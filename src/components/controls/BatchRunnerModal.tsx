// ============================================================
// BatchRunnerModal — test many strings against the current machine at once.
// Paste a list (optionally tagged `accept:` / `reject:`); get a scored table
// and deterministic CSV/JSON/Markdown/LaTeX reports. (UX audit #7 / FR-4.7.)
// ============================================================

import { useMemo, useState, useRef } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { validateMachine, hasBlockingErrors } from '@/utils/validator'
import {
  firstFailingCase,
  countSuiteExpectations,
  parseTestSuite,
  runMachineSuiteAsync,
  suiteResultsToCSV,
  suiteResultsToJSON,
  suiteResultsToLatex,
  suiteResultsToMarkdown,
  type SuiteResult,
} from '@/utils/testSuite'
import { downloadText, fileStem } from '@/utils/exporters'
import { loadTextFile } from '@/utils/fileManager'
import { toast } from '@/store/toastStore'
import Dialog from '@/components/common/Dialog'
import EpsilonInserter from '@/components/canvas/EpsilonInserter'
import { isTransducerType } from '@/engines/machine/core/utils'

const PLACEHOLDER = `aabb
abab
# lines starting with # are comments; ε tests the empty string
accept: aabb
reject: abc
ε`

function verdictColor(r: SuiteResult): string {
  if (r.classification === 'limit') return 'var(--status-running)'
  if (r.actualStatus === 'completed') return 'var(--status-accept)'
  if (r.accepted === null) return 'var(--text-muted)'
  if (r.accepted) return 'var(--status-accept)'
  return r.actualStatus === 'stuck' ? 'var(--status-running)' : 'var(--status-reject)'
}

function verdictText(r: SuiteResult): string {
  if (r.classification === 'limit') return 'limit'
  if (r.actualStatus === 'completed') return 'complete'
  if (r.classification === 'error') return 'error'
  if (r.accepted === null) return 'error'
  if (r.accepted) return 'accept'
  return r.actualStatus === 'stuck' ? 'stuck' : 'reject'
}

export default function BatchRunnerModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const [text, setText] = useState('')
  const [results, setResults] = useState<SuiteResult[] | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [epsOpen, setEpsOpen] = useState(false)
  const isTransducer = isTransducerType(machine.type)

  const blocking = useMemo(() => hasBlockingErrors(validateMachine(machine)), [machine])
  const summary = results
    ? {
        total: results.length,
        accepted: results.filter((result) => result.accepted === true).length,
        rejected: results.filter((result) => result.accepted === false).length,
        expected: countSuiteExpectations(results),
        passed: results.filter((result) => result.pass === true).length,
        failed: results.filter((result) => result.classification !== 'pass').length,
      }
    : null
  const run = async () => {
    if (blocking) return
    try {
      setIsRunning(true)
      setProgress({ completed: 0, total: 0 })
      const suite = parseTestSuite(text)
      setProgress({ completed: 0, total: suite.cases.length })
      setResults(await runMachineSuiteAsync(machine, suite, {
        onProgress: (completed, total) => setProgress({ completed, total }),
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid test suite.')
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }

  const exportReport = async (format: 'csv' | 'json' | 'md' | 'tex') => {
    if (!results) return
    const content = format === 'csv'
      ? suiteResultsToCSV(results)
      : format === 'json'
        ? suiteResultsToJSON(results)
        : format === 'md'
          ? suiteResultsToMarkdown(results)
          : suiteResultsToLatex(results)
    const extension = format
    await downloadText(`${fileStem(machine)}-batch.${extension}`, content, extension)
  }

  const handleLoadFile = async () => {
    try {
      const res = await loadTextFile({
        title: 'Load Batch Test File',
        extensions: ['txt', 'csv', 'json'],
      })
      if (res && res.content) {
        setText(res.content)
        setResults(null)
        toast.success(`Loaded ${res.filename}`)
      }
    } catch (err) {
      toast.error('Failed to load text file')
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label={`Batch test — ${machine.name}`}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '90vw',
        maxWidth: '620px',
        maxHeight: '84vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Batch test — {machine.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              One string per line. Tag with <code>accept:</code> / <code>reject:</code> to check
              expectations. Use <code>ε</code> for the empty string.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close batch tester"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', overflow: 'auto' }}>
          {blocking && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--status-reject)',
                border: '1px solid var(--status-reject)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
              }}
            >
              The machine has blocking validation errors — fix them (see the Validate tab) before
              running a batch.
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setResults(null)
              }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                padding: '8px 10px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
              <EpsilonInserter targetRef={textareaRef} open={epsOpen} setOpen={setEpsOpen} onInsert={setText} size="sm" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={run}
              disabled={blocking || text.trim() === '' || isRunning}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                padding: '6px 16px',
                cursor: blocking || text.trim() === '' || isRunning ? 'not-allowed' : 'pointer',
                opacity: blocking || text.trim() === '' || isRunning ? 0.4 : 1,
                fontWeight: 600,
              }}
            >
              {isRunning ? 'Running…' : 'Run batch'}
            </button>
            {progress && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {progress.completed}/{progress.total}
              </span>
            )}
            <button
              onClick={handleLoadFile}
              title="Load a .txt, .csv, or .json test suite"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              Load suite
            </button>
            {results && results.length > 0 && (
              <>
              <button
                onClick={() => exportReport('csv')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                Export CSV
              </button>
              <button
                onClick={() => exportReport('md')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                Markdown
              </button>
              <button
                onClick={() => exportReport('json')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                JSON
              </button>
              <button
                onClick={() => exportReport('tex')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                LaTeX
              </button>
              </>
            )}
            {summary && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                {isTransducer
                  ? `${summary.total} run · output generated`
                  : `${summary.total} run · ${summary.accepted} accept · ${summary.rejected} reject`}
                {summary.expected > 0 && (
                  <>
                    {' · '}
                    <span style={{ color: summary.failed === 0 ? 'var(--status-accept)' : 'var(--status-reject)' }}>
                      {summary.passed}/{summary.expected} passed
                    </span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Results table */}
          {results && results.length > 0 && (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={thStyle}>Input</th>
                    <th style={thStyle}>Result</th>
                    <th style={thStyle}>Expected</th>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Check</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Steps</th>
                    {isTransducer && <th style={thStyle}>Output</th>}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{r.input || 'ε'}</td>
                      <td style={{ ...tdStyle, color: verdictColor(r) }}>{verdictText(r)}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{r.expected ?? '—'}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{r.category}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }} title={r.classification}>
                        {r.pass === null ? (
                          <span style={{ color: 'var(--text-muted)' }}>·</span>
                        ) : r.pass ? (
                          <span style={{ color: 'var(--status-accept)' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--status-reject)' }}>✗</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>{r.steps}</td>
                      {isTransducer && <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{r.outputTrace?.join(' ') || '∅'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results && firstFailingCase(results) && (
            <div style={{ fontSize: '11px', color: 'var(--status-reject)' }}>
              Counterexample: <code>{firstFailingCase(results)!.input || 'ε'}</code>
              {' '}({firstFailingCase(results)!.classification})
              {firstFailingCase(results)!.error ? ` — ${firstFailingCase(results)!.error}` : ''}
            </div>
          )}

          {results && results.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No test strings found. Add one string per line above.
            </div>
          )}
        </div>
    </Dialog>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontWeight: 600,
  letterSpacing: '0.03em',
}

const tdStyle: React.CSSProperties = {
  padding: '5px 10px',
  verticalAlign: 'top',
}
