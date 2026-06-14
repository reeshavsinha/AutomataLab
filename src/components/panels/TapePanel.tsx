// ============================================================
// TapePanel — Turing-machine / LBA tape visualizer (single- or multi-tape).
// One horizontal row of cells per tape, each with a highlighted head and a ▲
// head marker; the current state is shown once in the instantaneous description.
// Renders a bounded window from each TapeSnapshot (never an infinite array).
// Plain black & white, consistent with the rest of the side panel.
// ============================================================

import { useEffect, useMemo, useRef } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'
import { isTMType } from '@/engines/core/utils'
import type { TapeSnapshot } from '@/engines/core/types'

/** Blank padding / max half-width for the idle preview window (mirrors the engine). */
const PREVIEW_PAD = 3
const PREVIEW_HALF = 150

/**
 * Build an engine-less tape preview from the current input so the panel reflects
 * what the user is typing — head at the start cell, before any move. Keeps the
 * tape live while idle instead of showing an empty placeholder.
 */
function buildPreviewTapes(input: string, tapeCount: number, blank: string): TapeSnapshot[] {
  const chars = input === '' ? [] : input.split('')
  const tapes: TapeSnapshot[] = []
  for (let i = 0; i < tapeCount; i++) {
    const tc = i === 0 ? chars : []
    const head = 0
    const from = Math.max(Math.min(0, head) - PREVIEW_PAD, head - PREVIEW_HALF)
    const to = Math.min(Math.max(tc.length - 1, head) + PREVIEW_PAD, head + PREVIEW_HALF)
    const cells: string[] = []
    for (let j = from; j <= to; j++) cells.push(tc[j] ?? blank)
    tapes.push({ cells, head: head - from, left: from })
  }
  return tapes
}

/** LBA end-of-tape marker (⊢ / ⊣) rendered between cells at the bounds. */
function BoundaryMarker({ glyph }: { glyph: string }) {
  return (
    <div
      title="LBA tape boundary — the head cannot move past this marker"
      style={{
        width: '16px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '16px',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {glyph}
    </div>
  )
}

/** Trim a run of the blank symbol from both ends (for the compact ID display). */
function trimBlanks(s: string, blank: string): string {
  let start = 0
  let end = s.length
  while (start < end && s[start] === blank) start++
  while (end > start && s[end - 1] === blank) end--
  return s.slice(start, end)
}

/** A single tape row: cells + head marker, with its own horizontal auto-scroll. */
function TapeRow({
  tape,
  index,
  total,
  stateLabel,
}: {
  tape: TapeSnapshot
  index: number
  total: number
  stateLabel: string
}) {
  const headCellRef = useRef<HTMLDivElement>(null)
  const hasBounds = tape.leftBound !== undefined && tape.rightBound !== undefined

  // "Came from here" cue: the cell the head occupied before the last move, with
  // a faded arrow pointing the way it went. Omitted for a stay ('S') or no move.
  const prevHeadIndex =
    tape.lastMove === 'R' ? tape.head - 1 : tape.lastMove === 'L' ? tape.head + 1 : null
  const moveGlyph = tape.lastMove === 'R' ? '→' : tape.lastMove === 'L' ? '←' : ''

  // Keep this row's head cell centred as the machine moves.
  useEffect(() => {
    headCellRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tape.head, tape.left])

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: total > 1 ? '14px' : 0 }}>
      {total > 1 && (
        <div style={{
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: 'var(--text-muted)',
          paddingTop: '9px',
          minWidth: '22px',
          flexShrink: 0,
        }}>
          T{index + 1}
        </div>
      )}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: tape.cells.length < 10 ? 'center' : 'flex-start',
      }}>
        {tape.cells.map((sym, i) => {
          const isHead = i === tape.head
          const isPrevHead = i === prevHeadIndex
          const absIndex = tape.left + i
          const showLeftMarker = hasBounds && absIndex === tape.leftBound
          const showRightMarker = hasBounds && absIndex === tape.rightBound
          // Cells outside the LBA's linear bound are unusable padding — dim them.
          const outOfBounds = hasBounds && (absIndex < tape.leftBound! || absIndex > tape.rightBound!)
          return (
            <div key={absIndex} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              {showLeftMarker && <BoundaryMarker glyph="⊢" />}
              <div
                ref={isHead ? headCellRef : undefined}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}
              >
                <div style={{
                  width: '30px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isHead ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isHead ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  marginLeft: i === 0 || showLeftMarker ? 0 : '-1px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: outOfBounds && !isHead ? 0.35 : 1,
                  transition: 'background 150ms ease, color 150ms ease',
                }}>
                  {sym}
                </div>
                {/* Head marker (+ state label for a single tape) under the active
                    cell; a faded arrow under the previous cell shows the last move. */}
                <div style={{ height: '28px', marginTop: '3px', textAlign: 'center' }}>
                  {isHead ? (
                    <>
                      <div style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1 }}>▲</div>
                      {total === 1 && (
                        <div style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--state-active)',
                          marginTop: '1px',
                          whiteSpace: 'nowrap',
                        }}>
                          {stateLabel}
                        </div>
                      )}
                    </>
                  ) : isPrevHead ? (
                    <div
                      title={`Head moved ${tape.lastMove === 'R' ? 'right' : 'left'} from here`}
                      style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1, opacity: 0.6 }}
                    >
                      {moveGlyph}
                    </div>
                  ) : null}
                </div>
              </div>
              {showRightMarker && <BoundaryMarker glyph="⊣" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TapePanel() {
  const { activeTapes, configurations, status, inputString } = useSimulationStore()
  const { machine } = useMachineStore()

  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id
  const blank = machine.blankSymbol || '_'
  const isIdle = status === 'idle'
  const isLBA = machine.type === 'LBA'
  const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
  const startLabel = machine.states.find((s) => s.isStart)?.label ?? '—'

  // While idle, mirror the input box live on the tape (head at the start cell)
  // instead of showing an empty placeholder; once running, use the engine tapes.
  const previewTapes = useMemo(
    () => buildPreviewTapes(inputString, tapeCount, blank),
    [inputString, tapeCount, blank]
  )

  const config = configurations[0]
  const stateLabel = config ? labelFor(config.stateId) : isIdle ? startLabel : '—'
  const tapes = isIdle ? previewTapes : activeTapes
  const multi = tapes.length > 1
  const primary = tapes[0]

  if (!isTMType(machine.type)) {
    return (
      <div style={{ padding: '16px 12px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        This panel applies to Turing machines and LBAs.
      </div>
    )
  }

  // Instantaneous description for the primary (single-tape) view: α [q] β.
  const cells = primary?.cells ?? []
  const head = primary?.head ?? 0
  const idLeft = trimBlanks(cells.slice(0, head).join(''), blank)
  const idRight = trimBlanks(cells.slice(head).join(''), blank) || blank

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Instantaneous description */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
          marginBottom: '4px',
        }}>
          INSTANTANEOUS DESCRIPTION
        </div>
        {tapes.length === 0 ? (
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>—</div>
        ) : multi ? (
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            <div style={{ marginBottom: '3px' }}>
              state <span style={{ color: 'var(--state-active)', fontWeight: 700 }}>{stateLabel}</span>
            </div>
            {tapes.map((t, i) => {
              const l = trimBlanks(t.cells.slice(0, t.head).join(''), blank)
              const r = trimBlanks(t.cells.slice(t.head).join(''), blank) || blank
              return (
                <div key={i} style={{ wordBreak: 'break-all', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>T{i + 1}:</span> {l}
                  <span style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '0 2px', borderRadius: '2px' }}>{r[0]}</span>
                  {r.slice(1)}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
          }}>
            {idLeft}
            <span style={{ color: 'var(--state-active)', fontWeight: 700, padding: '0 4px' }}>
              {stateLabel}
            </span>
            {idRight}
          </div>
        )}
      </div>

      {/* Header / step hint */}
      <div style={{
        padding: '8px 12px 4px',
        fontSize: '10px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        flexShrink: 0,
      }}>
        {multi ? `TAPES · ${tapes.length}` : 'TAPE'}
        {primary && !multi && ` · head @ ${primary.left + primary.head}`}
        {isLBA && ' · bounded'}
      </div>

      {/* Tape rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px 16px' }}>
        {tapes.length === 0 ? (
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            marginTop: '8px',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            {isIdle
              ? 'Tape is empty. Set an initial tape in the input bar, then run the machine.'
              : 'No tape.'}
          </div>
        ) : (
          tapes.map((tape, i) => (
            <TapeRow key={i} tape={tape} index={i} total={tapes.length} stateLabel={stateLabel} />
          ))
        )}
      </div>
    </div>
  )
}
