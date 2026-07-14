// ============================================================
// ConversionsModal — animated, step-by-step conversion utilities (v4.0).
// Lists the conversions that apply to the current machine (NFA→DFA, ε-NFA→NFA,
// DFA minimization) plus the constructions from text (Regex→NFA, CFG→PDA), runs
// the chosen one, and plays the construction step-by-step on a live SVG preview
// with a before/after toggle. "Open in new tab" loads the result into the editor.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useMachineStore, isPristineTab } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import { applyAutoLayout } from '@/utils/layout'
import { machineToSVG, LIGHT_COLORS, DARK_COLORS } from '@/utils/diagramSvg'
import {
  CONVERSION_PLUGINS,
  transformsForPlugin,
  constructsPlugins,
  extractsPlugins,
  defaultAnimationBuilder,
  type ConversionPlugin,
} from './conversionsRegistry'
import type { MachineDefinition } from '@/engines/machine/core/types'
import type { ConversionResult } from '@/engines/machine/conversions'
import { generateId } from '@/engines/machine/core/utils'
import { toast } from '@/store/toastStore'
import Dialog from '@/components/common/Dialog'

export default function ConversionsModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const openMachine = useMachineStore((s) => s.openMachine)
  const loadMachine = useMachineStore((s) => s.loadMachine)
  const requestFitView = useUIStore((s) => s.requestFitView)
  const theme = useUIStore((s) => s.theme)
  const dark = theme === 'dark'
  const colors = dark ? DARK_COLORS : LIGHT_COLORS

  const [selected, setSelected] = useState<ConversionPlugin | null>(null)
  const [text, setText] = useState('')
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [laidOut, setLaidOut] = useState<MachineDefinition | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'result' | 'source'>('result')
  const [labelMode, setLabelMode] = useState<'short' | 'full'>('short')

  const transforms = useMemo(() => transformsForPlugin(machine.type), [machine.type])
  const builders = useMemo(() => constructsPlugins(), [])
  const extracts = useMemo(() => extractsPlugins(machine.type), [machine.type])

  // Lay out the result for the preview (grid first, then ELK when ready).
  useEffect(() => {
    if (!result) {
      setLaidOut(null)
      return
    }
    if (typeof result.result === 'string') {
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

  const runTransformNow = (plugin: ConversionPlugin) => {
    try {
      const r = plugin.execute(machine)
      setResult(r)
      setStepIndex(0)
      setError(null)
      setView('result')
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const choose = (plugin: ConversionPlugin) => {
    setSelected(plugin)
    setResult(null)
    setError(null)
    setStepIndex(0)
    setPlaying(false)
    setText('')
    setView('result')
    setLabelMode('short')
    if (plugin.mode === 'transform') runTransformNow(plugin)
  }

  const build = () => {
    if (!selected) return
    try {
      const r = selected.execute(text)
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

  const openInNewTab = () => {
    if (!laidOut) return
    openMachine({ ...laidOut, id: generateId('machine') }, null)
    requestFitView()
    toast.success('Opened the converted machine in a new tab.')
    onClose()
  }

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
      if (selected?.mode === 'transform' || selected?.mode === 'extract') {
        const { svg } = machineToSVG(machine, { colors, verboseLabels })
        return inject(svg)
      }
      return null
    }
    if (!laidOut || !result || typeof result.result === 'string') return null
    const builder = selected?.animationBuilder || defaultAnimationBuilder
    const reveal = builder(result, stepIndex)
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
              extracts={extracts}
              onChoose={choose}
            />
          )}

          {/* 2) Construct input (regex / cfg) before a result exists */}
          {selected && selected.mode === 'construct' && !result && selected.inputComponent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <selected.inputComponent
                text={text}
                setText={setText}
                onBuild={build}
              />
              {error && <ErrorBox message={error} />}
              <div>
                <button
                  onClick={build}
                  disabled={text.trim() === ''}
                  style={{
                    ...primaryBtn,
                    opacity: text.trim() === '' ? 0.4 : 1,
                    cursor: text.trim() === '' ? 'not-allowed' : 'pointer'
                  }}
                >
                  Build {selected.resultType} →
                </button>
              </div>
            </div>
          )}

          {/* Transform error */}
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
                    {view === 'result' ? (typeof result?.result === 'string' ? 'Extracted text' : `${selected?.resultType} preview`) : (selected?.mode === 'transform' || selected?.mode === 'extract') ? `${machine.type} (input)` : 'Input text'}
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
                  ) : view === 'result' && typeof result?.result === 'string' ? (
                    <div style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {result.result}
                    </div>
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
            {typeof result.result === 'string' ? (
              <button onClick={() => { navigator.clipboard.writeText(result.result as string); toast.success('Copied to clipboard!') }} style={primaryBtn}>Copy to Clipboard</button>
            ) : (
              <>
                <button onClick={replaceCurrent} style={secondaryBtn} title="Apply the result to the current machine, replacing it">Replace current</button>
                <button onClick={openInNewTab} style={primaryBtn}>Open in new tab →</button>
              </>
            )}
          </div>
        )}
    </Dialog>
  )
}

function Picker({
  machineType,
  transforms,
  builders,
  extracts,
  onChoose,
}: {
  machineType: string
  transforms: ConversionPlugin[]
  builders: ConversionPlugin[]
  extracts: ConversionPlugin[]
  onChoose: (m: ConversionPlugin) => void
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
      <div>
        <GroupTitle>Extract text from this machine</GroupTitle>
        {extracts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {extracts.map((m) => (
              <ConvCard key={m.kind} meta={m} onClick={() => onChoose(m)} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No extractions available for a {machineType}.
          </div>
        )}
      </div>
    </div>
  )
}

function ConvCard({ meta, onClick }: { meta: ConversionPlugin; onClick: () => void }) {
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
