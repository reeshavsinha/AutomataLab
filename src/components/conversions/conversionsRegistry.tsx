import React, { useRef, useState } from 'react'
import type { MachineDefinition, MachineType } from '@/engines/machine/core/types'
import {
  enfaToNfa,
  nfaToDfa,
  minimizeDfa,
  regexToNfa,
  cfgToPda,
  mealyToMoore,
  mooreToMealy,
  type ConversionResult,
  type ConversionMode,
} from '@/engines/machine/conversions'
import EpsilonInserter from '@/components/canvas/EpsilonInserter'

export interface ConversionPlugin {
  kind: string
  label: string
  description: string
  mode: ConversionMode
  appliesTo?: MachineType[]
  inputKind?: 'regex' | 'cfg'
  resultType: MachineType
  inputComponent?: React.ComponentType<{
    text: string
    setText: (s: string) => void
    onBuild: () => void
  }>
  execute: (input: any) => ConversionResult
  animationBuilder?: (result: ConversionResult, stepIndex: number) => {
    states: Set<string>
    trans: Set<string>
    hlStates: Set<string>
    hlTrans: Set<string>
  }
}

// Default animation builder implementing standard step reveal logic
export function defaultAnimationBuilder(result: ConversionResult, stepIndex: number) {
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

const REGEX_EXAMPLES = ['(a|b)*abb', 'a(a|b)*', '(ab)*', 'a*b*', '(0|1)*1']
const CFG_PLACEHOLDER = `S -> a S b | ε
# uppercase = nonterminal, anything else = terminal, ε/empty = epsilon`
const CFG_EXAMPLES = ['S -> a S b | ε', 'S -> (S)S | ε', 'S -> a S a | b S b | a | b | ε']

const exampleBtnStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  padding: '3px 8px',
  cursor: 'pointer',
}

function RegexInput({
  text,
  setText,
  onBuild,
}: {
  text: string
  setText: (s: string) => void
  onBuild: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [epsOpen, setEpsOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Operators: <code>|</code> (or), <code>*</code> (zero+), <code>+</code> (one+), <code>?</code> (optional),
        <code> ( )</code> grouping. Use <code>ε</code> for the empty string; every other character is a literal.
      </div>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Examples:</span>
        {REGEX_EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            style={exampleBtnStyle}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

function CFGInput({
  text,
  setText,
  onBuild,
}: {
  text: string
  setText: (s: string) => void
  onBuild: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [epsOpen, setEpsOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        One rule per line: <code>A -&gt; α | β</code>. Uppercase letters are nonterminals, everything else is a
        terminal, and <code>ε</code> (or empty) is the empty production. Symbols are single characters.
      </div>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Examples:</span>
        {CFG_EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            style={exampleBtnStyle}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

export const CONVERSION_PLUGINS: ConversionPlugin[] = [
  {
    kind: 'moore-to-mealy',
    label: 'Moore → Mealy',
    description: 'Move destination-state outputs onto transitions.',
    mode: 'transform',
    appliesTo: ['MOORE'],
    resultType: 'MEALY',
    execute: (machine: MachineDefinition) => mooreToMealy(machine),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'mealy-to-moore',
    label: 'Mealy → Moore',
    description: 'Split states when incoming transitions emit different outputs.',
    mode: 'transform',
    appliesTo: ['MEALY'],
    resultType: 'MOORE',
    execute: (machine: MachineDefinition) => mealyToMoore(machine),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'enfa-to-nfa',
    label: 'ε-NFA → NFA',
    description: 'Remove ε-transitions (epsilon elimination).',
    mode: 'transform',
    appliesTo: ['ENFA'],
    resultType: 'NFA',
    execute: (machine: MachineDefinition) => enfaToNfa(machine),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'nfa-to-dfa',
    label: 'NFA → DFA',
    description: 'Subset (powerset) construction.',
    mode: 'transform',
    appliesTo: ['NFA', 'ENFA'],
    resultType: 'DFA',
    execute: (machine: MachineDefinition) => nfaToDfa(machine),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'minimize-dfa',
    label: 'Minimize DFA',
    description: 'Partition refinement (Hopcroft / Moore).',
    mode: 'transform',
    appliesTo: ['DFA'],
    resultType: 'DFA',
    execute: (machine: MachineDefinition) => minimizeDfa(machine),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'regex-to-nfa',
    label: 'Regex → NFA',
    description: "Thompson's construction — builds an ε-NFA.",
    mode: 'construct',
    inputKind: 'regex',
    resultType: 'ENFA',
    inputComponent: RegexInput,
    execute: (text: string) => regexToNfa(text),
    animationBuilder: defaultAnimationBuilder,
  },
  {
    kind: 'cfg-to-pda',
    label: 'CFG → PDA',
    description: 'Standard one-state construction (NPDA).',
    mode: 'construct',
    inputKind: 'cfg',
    resultType: 'NPDA',
    inputComponent: CFGInput,
    execute: (text: string) => cfgToPda(text),
    animationBuilder: defaultAnimationBuilder,
  },
]

export function getPlugin(kind: string): ConversionPlugin {
  const plugin = CONVERSION_PLUGINS.find((c) => c.kind === kind)
  if (!plugin) throw new Error(`Unknown conversion plugin: ${kind}`)
  return plugin
}

export function transformsForPlugin(type: MachineType): ConversionPlugin[] {
  return CONVERSION_PLUGINS.filter((c) => c.mode === 'transform' && c.appliesTo?.includes(type))
}

export function constructsPlugins(): ConversionPlugin[] {
  return CONVERSION_PLUGINS.filter((c) => c.mode === 'construct')
}

export function extractsPlugins(type: MachineType): ConversionPlugin[] {
  return CONVERSION_PLUGINS.filter((c) => c.mode === 'extract' && c.appliesTo?.includes(type))
}
