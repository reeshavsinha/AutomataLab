// ============================================================
// BatchRunnerModal — test many strings against the current machine at once.
// Paste a list (optionally tagged `accept:` / `reject:`); get a pass/fail table
// and a CSV export. (UX audit #7 / FR-4.7.)
// ============================================================

import { useMemo, useState } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { validateMachine, hasBlockingErrors } from '@/utils/validator'
import { parseBatchCases, runBatch, batchSummary, type BatchResult } from '@/utils/batch'
import { downloadText, fileStem } from '@/utils/exporters'
import Dialog from '@/components/common/Dialog'

const PLACEHOLDER = `aabb
abab
# lines starting with # are comments; ε tests the empty string
accept: aabb
reject: abc
ε`

function verdictColor(r: BatchResult): string {
  if (r.accepted === null) return 'var(--text-muted)'
  if (r.accepted) return 'var(--status-accept)'
  return r.status === 'stuck' ? 'var(--status-running)' : 'var(--status-reject)'
}

function verdictText(r: BatchResult): string {
  if (r.accepted === null) return 'error'
  if (r.accepted) return 'accept'
  return r.status === 'stuck' ? 'stuck' : 'reject'
}

export default function BatchRunnerModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const [text, setText] = useState('')
  const [results, setResults] = useState<BatchResult[] | null>(null)

  const blocking = useMemo(() => hasBlockingErrors(validateMachine(machine)), [machine])
  const summary = results ? batchSummary(results) : null

  const run = () => {
    if (blocking) return
    setResults(runBatch(machine, parseBatchCases(text)))
  }

  const exportCSV = async () => {
    if (!results) return
    const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const header = ['Input', 'Result', 'Expected', 'Pass', 'Steps']
    const rows = results.map((r) => [
      r.raw,
      verdictText(r),
      r.expected ?? '',
      r.pass === null ? '' : r.pass ? 'PASS' : 'FAIL',
      String(r.steps),
    ])
    const csv = [header, ...rows].map((row) => row.map(esc).join(',')).join('\r\n')
    await downloadText(`${fileStem(machine)}-batch.csv`, csv, 'csv')
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

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={run}
              disabled={blocking || text.trim() === ''}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                padding: '6px 16px',
                cursor: blocking || text.trim() === '' ? 'not-allowed' : 'pointer',
                opacity: blocking || text.trim() === '' ? 0.4 : 1,
              }}
            >
              Run batch
            </button>
            {results && results.length > 0 && (
              <button
                onClick={exportCSV}
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
            )}
            {summary && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                {summary.total} run · {summary.accepted} accept · {summary.rejected} reject
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
                    <th style={{ ...thStyle, textAlign: 'center' }}></th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{r.raw}</td>
                      <td style={{ ...tdStyle, color: verdictColor(r) }}>{verdictText(r)}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{r.expected ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {r.pass === null ? (
                          <span style={{ color: 'var(--text-muted)' }}>·</span>
                        ) : r.pass ? (
                          <span style={{ color: 'var(--status-accept)' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--status-reject)' }}>✗</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>{r.steps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
