// ============================================================
// ConversionsModal — animated, step-by-step conversion utilities (v4.0).
// Lists the conversions that apply to the current machine (NFA→DFA, ε-NFA→NFA,
// DFA minimization) plus the constructions from text (Regex→NFA, CFG→PDA), runs
// the chosen one, and plays the construction step-by-step on a live SVG preview
// with a before/after toggle. "Open in new tab" loads the result into the editor.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMachineStore, isPristineTab } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import EpsilonInserter from '@/components/canvas/EpsilonInserter'
import { applyAutoLayout } from '@/utils/layout'
import { machineToSVG, LIGHT_COLORS, DARK_COLORS } from '@/utils/diagramSvg'
import {
  transformsFor,
  constructs,
  runTransform,
  runConstruct,
  type ConversionMeta,
  type ConversionResult,
} from '@/engines/conversions'
import type { MachineDefinition } from '@/engines/core/types'
import { generateId } from '@/engines/core/utils'
import { toast } from '@/store/toastStore'
import Dialog from '@/components/common/Dialog'

const REGEX_EXAMPLES = ['(a|b)*abb', 'a(a|b)*', '(ab)*', 'a*b*', '(0|1)*1']
const CFG_PLACEHOLDER = `S -> a S b | ε
# uppercase = nonterminal, anything else = terminal, ε/empty = epsilon`
const CFG_EXAMPLES = ['S -> a S b | ε', 'S -> (S)S | ε', 'S -> a S a | b S b | a | b | ε']

interface Reveal {
  states: Set<string>
  trans: Set<string>
  hlStates: Set<string>
  hlTrans: Set<string>
}

function computeReveal(result: ConversionResult, stepIndex: number): Reveal {
  const states = new Set<string>()
  const trans = new Set<string>()
  for (let i = 0; i <= stepIndex && i < result.steps.length; i++) {
    for (const id of result.steps[i].addedStateIds) states.add(id)
    for (const id of result.steps[i].addedTransitionIds) trans.add(id)
  }
  const step = result.steps[stepIndex]
  return {
    states,
    trans,
    hlStates: new Set(step?.addedStateIds ?? []),
    hlTrans: new Set(step?.addedTransitionIds ?? []),
  }
}

export default function ConversionsModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const openMachine = useMachineStore((s) => s.openMachine)
  const loadMachine = useMachineStore((s) => s.loadMachine)
  const requestFitView = useUIStore((s) => s.requestFitView)
  const theme = useUIStore((s) => s.theme)
  const dark = theme === 'dark'
  const colors = dark ? DARK_COLORS : LIGHT_COLORS

  const [selected, setSelected] = useState<ConversionMeta | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [laidOut, setLaidOut] = useState<MachineDefinition | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'result' | 'source'>('result')
  const [labelMode, setLabelMode] = useState<'short' | 'full'>('short')

  const transforms = useMemo(() => transformsFor(machine.type), [machine.type])
  const builders = useMemo(() => constructs(), [])

  // Lay out the result for the preview (grid first, then ELK when ready).
  useEffect(() => {
    if (!result) {
      setLaidOut(null)
      return
    }
    let cancelled = false
    setLaidOut(result.result)
    applyAutoLayout(result.result)
      .then((m) => {
        if (!cancelled) setLaidOut(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [result])

  // Auto-advance while "playing".
  useEffect(() => {
    if (!playing || !result) return
    if (stepIndex >= result.steps.length - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setStepIndex((i) => Math.min(i + 1, result.steps.length - 1)), 1100)
    return () => clearTimeout(id)
  }, [playing, stepIndex, result])

  const runTransformNow = (meta: ConversionMeta) => {
    try {
      const r = runTransform(meta.kind, machine)
      setResult(r)
      setStepIndex(0)
      setError(null)
      setView('result')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const choose = (meta: ConversionMeta) => {
    setSelected(meta)
    setResult(null)
    setError(null)
    setStepIndex(0)
    setPlaying(false)
    setText('')
    setView('result')
    setLabelMode('short')
    if (meta.mode === 'transform') runTransformNow(meta)
  }

  const build = () => {
    if (!selected) return
    try {
      const r = runConstruct(selected.kind, text)
      setResult(r)
      setStepIndex(0)
      setError(null)
      setView('result')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const back = () => {
    setSelected(null)
    setResult(null)
    setError(null)
    setPlaying(false)
  }

  // Give the result a fresh, unique machine id so tab bookkeeping (keyed by id)
  // never collides with an existing tab or another conversion result.
  const openInNewTab = () => {
    if (!laidOut) return
    // openMachine reuses the current tab when it's pristine, so report what
    // actually happened instead of always claiming "new tab" (UX audit DISC-2).
    const reused = isPristineTab(machine)
    openMachine({ ...laidOut, id: generateId('machine') }, null)
    requestFitView()
    toast.success(reused
      ? 'Loaded the converted machine into the current (empty) tab.'
      : 'Opened the converted machine in a new tab.')
    onClose()
  }

  // Apply the result to the current machine in place (UX audit DISC-2).
  const replaceCurrent = () => {
    if (!laidOut) return
    loadMachine({ ...laidOut, id: generateId('machine') }, false)
    requestFitView()
    toast.success('Replaced the current machine with the converted result.')
    onClose()
  }

  const verboseLabels = labelMode === 'full'

  const previewSvg = useMemo(() => {
    if (view === 'source') {
      if (selected?.mode === 'transform') {
        const { svg } = machineToSVG(machine, { colors, verboseLabels })
        return inject(svg)
      }
      return null // construct source is text, rendered separately
    }
    if (!laidOut || !result) return null
    const reveal = computeReveal(result, stepIndex)
    const { svg } = machineToSVG(laidOut, {
      includeStateIds: reveal.states,
      includeTransitionIds: reveal.trans,
      highlightStateIds: reveal.hlStates,
      highlightTransitionIds: reveal.hlTrans,
      frameStateIds: new Set(laidOut.states.map((s) => s.id)),
      colors,
      verboseLabels,
    })
    return inject(svg)
  }, [view, selected, machine, laidOut, result, stepIndex, colors, verboseLabels])

  const step = result?.steps[stepIndex]

  return (
    <Dialog
      onClose={onClose}
      label={selected ? selected.label : 'Convert / transform'}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '94vw',
        maxWidth: result ? '940px' : '560px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(selected || result) && (
              <button onClick={back} aria-label="Back" title="Back" style={ghostBtn}>
                ←
              </button>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {selected ? selected.label : 'Convert / transform'}
              </div>
              {selected && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selected.description}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={ghostBtn}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: '14px 16px' }}>
          {/* 1) Picker */}
          {!selected && (
            <Picker
              machineType={machine.type}
              transforms={transforms}
              builders={builders}
              onChoose={choose}
            />
          )}

          {/* 2) Construct input (regex / cfg) before a result exists */}
          {selected && selected.mode === 'construct' && !result && (
            <ConstructInput
              meta={selected}
              text={text}
              setText={setText}
              onBuild={build}
              error={error}
            />
          )}

          {/* Transform error (e.g. blow-up) */}
          {selected && selected.mode === 'transform' && !result && error && (
            <ErrorBox message={error} />
          )}

          {/* 3) Result: stepper + preview */}
          {result && step && (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {/* Steps column */}
              <div style={{ flex: '1 1 280px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StepBtn onClick={() => { setPlaying(false); setStepIndex(0) }} disabled={stepIndex === 0} title="First">⏮</StepBtn>
                  <StepBtn onClick={() => { setPlaying(false); setStepIndex((i) => Math.max(0, i - 1)) }} disabled={stepIndex === 0} title="Previous">◀</StepBtn>
                  <StepBtn
                    onClick={() => setPlaying((p) => !p)}
                    disabled={stepIndex >= result.steps.length - 1}
                    title={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? '⏸' : '▶'}
                  </StepBtn>
                  <StepBtn onClick={() => { setPlaying(false); setStepIndex((i) => Math.min(result.steps.length - 1, i + 1)) }} disabled={stepIndex >= result.steps.length - 1} title="Next">▶▶</StepBtn>
                  <StepBtn onClick={() => { setPlaying(false); setStepIndex(result.steps.length - 1) }} disabled={stepIndex >= result.steps.length - 1} title="Last">⏭</StepBtn>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {stepIndex + 1}/{result.steps.length}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={result.steps.length - 1}
                  value={stepIndex}
                  onChange={(e) => { setPlaying(false); setStepIndex(Number(e.target.value)) }}
                  style={{ width: '100%' }}
                  aria-label="Conversion step"
                />

                {/* Current step detail */}
                <div
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{step.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                    {step.detail}
                  </div>
                </div>

                {/* Full step list */}
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', maxHeight: '160px', overflow: 'auto' }}>
                  {result.steps.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setPlaying(false); setStepIndex(i) }}
                      style={{
                        display: 'flex',
                        gap: '8px',
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: i === stepIndex ? 'var(--bg-elevated)' : 'transparent',
                        color: i === stepIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '18px' }}>{i + 1}</span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>

                {result.summary.length > 0 && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {result.summary.map((line, i) => (
                      <div key={i}>• {line}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview column */}
              <div style={{ flex: '2 1 420px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <Toggle active={view === 'result'} onClick={() => setView('result')}>Result</Toggle>
                  <Toggle active={view === 'source'} onClick={() => setView('source')}>Source</Toggle>
                  {view === 'result' && laidOut?.states.some((s) => s.description) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} title="States are named q0, q1, … (short) — switch to full to show what each one stands for.">Labels</span>
                      <Toggle small active={labelMode === 'short'} onClick={() => setLabelMode('short')}>short</Toggle>
                      <Toggle small active={labelMode === 'full'} onClick={() => setLabelMode('full')}>full</Toggle>
                    </div>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {view === 'result' ? `${selected?.resultType} preview` : selected?.mode === 'transform' ? `${machine.type} (input)` : 'Input text'}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    minHeight: '300px',
                    maxHeight: '52vh',
                    overflow: 'auto',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    background: colors.background,
                    padding: '8px',
                  }}
                >
                  {view === 'source' && selected?.mode === 'construct' ? (
                    <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {text || '(empty)'}
                    </pre>
                  ) : previewSvg ? (
                    <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                      Nothing to preview.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div style={footerStyle}>
            <button onClick={back} style={secondaryBtn}>Choose another</button>
            <div style={{ flex: 1 }} />
            <button onClick={replaceCurrent} style={secondaryBtn} title="Apply the result to the current machine, replacing it">Replace current</button>
            <button onClick={openInNewTab} style={primaryBtn}>Open in new tab →</button>
          </div>
        )}
    </Dialog>
  )
}

// ─── sub-views ──────────────────────────────────────────────────

function Picker({
  machineType,
  transforms,
  builders,
  onChoose,
}: {
  machineType: string
  transforms: ConversionMeta[]
  builders: ConversionMeta[]
  onChoose: (m: ConversionMeta) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <GroupTitle>Transform this machine ({machineType})</GroupTitle>
        {transforms.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transforms.map((m) => (
              <ConvCard key={m.kind} meta={m} onClick={() => onChoose(m)} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No conversions apply to a {machineType}. Switch to a DFA/NFA/ε-NFA, or build one from text below.
          </div>
        )}
      </div>
      <div>
        <GroupTitle>Build a new machine from text</GroupTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {builders.map((m) => (
            <ConvCard key={m.kind} meta={m} onClick={() => onChoose(m)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ConstructInput({
  meta,
  text,
  setText,
  onBuild,
  error,
}: {
  meta: ConversionMeta
  text: string
  setText: (s: string) => void
  onBuild: () => void
  error: string | null
}) {
  const isRegex = meta.inputKind === 'regex'
  const examples = isRegex ? REGEX_EXAMPLES : CFG_EXAMPLES
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [epsOpen, setEpsOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {isRegex ? (
          <>
            Operators: <code>|</code> (or), <code>*</code> (zero+), <code>+</code> (one+), <code>?</code> (optional),
            <code> ( )</code> grouping. Use <code>ε</code> for the empty string; every other character is a literal.
          </>
        ) : (
          <>
            One rule per line: <code>A -&gt; α | β</code>. Uppercase letters are nonterminals, everything else is a
            terminal, and <code>ε</code> (or empty) is the empty production. Symbols are single characters.
          </>
        )}
      </div>

      {isRegex ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="(a|b)*abb"
            spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Enter') onBuild() }}
            style={{
              flex: 1,
              minWidth: 0,
              boxSizing: 'border-box',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              padding: '8px 10px',
              outline: 'none',
            }}
          />
          <EpsilonInserter targetRef={inputRef} open={epsOpen} setOpen={setEpsOpen} onInsert={setText} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={CFG_PLACEHOLDER}
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
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Examples:</span>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              cursor: 'pointer',
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      <div>
        <button onClick={onBuild} disabled={text.trim() === ''} style={{ ...primaryBtn, opacity: text.trim() === '' ? 0.4 : 1, cursor: text.trim() === '' ? 'not-allowed' : 'pointer' }}>
          Build {meta.resultType} →
        </button>
      </div>
    </div>
  )
}

// ─── small UI atoms ─────────────────────────────────────────────

function ConvCard({ meta, onClick }: { meta: ConversionMeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        width: '100%',
        textAlign: 'left',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color 120ms ease, background 120ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
    >
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</span>
      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{meta.description}</span>
    </button>
  )
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
      {children}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        fontSize: '12px',
        color: 'var(--status-reject)',
        border: '1px solid var(--status-reject)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 10px',
      }}
    >
      {message}
    </div>
  )
}

function StepBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: '12px',
        padding: '4px 8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Toggle({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--bg-elevated)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--border-strong)' : 'var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: small ? '11px' : '12px',
        fontWeight: active ? 600 : 500,
        padding: small ? '3px 8px' : '4px 12px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function inject(svg: string): string {
  return svg.replace('<svg ', '<svg style="max-width:100%;height:auto;display:block;margin:0 auto" ')
}

const headerStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

const footerStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderTop: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '8px',
  flexShrink: 0,
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '18px',
  lineHeight: 1,
  padding: '2px 8px',
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: 600,
  padding: '7px 16px',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  padding: '7px 14px',
  cursor: 'pointer',
}
