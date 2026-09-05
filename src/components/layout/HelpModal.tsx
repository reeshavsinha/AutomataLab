// ============================================================
// HelpModal — Workspace-specific guides + keyboard shortcuts.
// Opens from Help ▸ Help & Keyboard Shortcuts (or F1). The active
// tab follows the current workspace; the user can switch freely.
// ============================================================

import { useState, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import Dialog from '@/components/common/Dialog'
import { useUIStore } from '@/store/uiStore'
import { BookOpen } from 'lucide-react'

interface HelpModalProps {
  onClose: () => void
}

type HelpTab = 'machine' | 'grammar' | 'parser'

const codeStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '3px',
  padding: '1px 4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-primary)',
}

function C({ children }: { children: ReactNode }) {
  return <code style={codeStyle}>{children}</code>
}

function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>
}

function H2({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
      {children}
    </div>
  )
}

function H3({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: '10px',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      margin: '16px 0 8px',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function P({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '12.5px', lineHeight: 1.65, color: 'var(--text-secondary)', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

function Shortcuts({ rows }: { rows: { keys: string; action: string }[] }) {
  return (
    <div>
      {rows.map((s, i) => (
        <div
          key={`${s.keys}-${i}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '6px 0',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
          <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{s.keys}</span>
        </div>
      ))}
    </div>
  )
}

function tabFromHash(): HelpTab {
  const hash = typeof window !== 'undefined' ? window.location.hash : ''
  if (hash.includes('grammar')) return 'grammar'
  if (hash.includes('parser')) return 'parser'
  return 'machine'
}

const MACHINE_SHORTCUTS = [
  { keys: 'Ctrl+N', action: 'New machine (new tab)' },
  { keys: 'Ctrl+O', action: 'Open a .json or JFLAP .jff file' },
  { keys: 'Ctrl+S / Ctrl+Shift+S', action: 'Save / Save As…' },
  { keys: 'Ctrl+T / Ctrl+W', action: 'New tab / Close tab' },
  { keys: 'F1', action: 'Open the User Manual' },
  { keys: 'N  or  ◯ tool', action: 'Add a state (N uses the last canvas cursor, or viewport centre)' },
  { keys: '↗ tool', action: 'Add a transition — click source, then target' },
  { keys: 'Hover rim dot + drag', action: 'Draw a transition from a state' },
  { keys: 'Double-click', action: 'Rename a state / edit a transition' },
  { keys: 'I / F', action: 'Selected state: set start / toggle accept' },
  { keys: 'T', action: 'Start a transition from the selected state; use ←/→ to choose a target, then Enter or S to complete' },
  { keys: 'T tool', action: 'Drop a text annotation on the canvas' },
  { keys: 'Shift+drag', action: 'Marquee-select a region' },
  { keys: 'Shift / Ctrl+click', action: 'Add or remove a node from the selection' },
  { keys: 'Delete / Backspace', action: 'Delete the selection' },
  { keys: 'Ctrl+Z / Ctrl+Y', action: 'Undo / Redo' },
  { keys: 'Ctrl+C / X / V / A', action: 'Copy / Cut / Paste / Select all' },
  { keys: 'Mouse wheel', action: 'Zoom; View ▸ Fit (or ⤢) frames the whole machine' },
  { keys: 'Esc', action: 'Cancel the current tool / close a dialog' },
  { keys: 'Space / P', action: 'Play / Pause simulation' },
  { keys: '→ / S', action: 'Step forward one input symbol (except while drawing a transition)' },
  { keys: '←', action: 'Step back' },
  { keys: 'R', action: 'Reset simulation' },
]

const GRAMMAR_SHORTCUTS = [
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Tab', action: 'Accept ghost completion (insert -> or | )' },
  { keys: 'Enter (grouped)', action: 'Continue an alternative on the next indented line' },
  { keys: 'Ctrl+T / Ctrl+W', action: 'New tab / Close tab' },
  { keys: 'Esc', action: 'Close a dialog' },
]

const PARSER_SHORTCUTS = [
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Enter (input buffer)', action: 'Load the input string and (re)build the parse' },
  { keys: 'Space', action: 'Play / Pause the parse simulation' },
  { keys: 'Enter (canvas idle)', action: 'Restart the parse from the beginning and play' },
  { keys: 'Timeline |<<  <  >  >>|', action: 'Seek to start / step back / step / seek to end' },
  { keys: '⟲', action: 'Reset the simulation' },
  { keys: 'Esc', action: 'Leave timeline preview / close a dialog' },
  { keys: 'Tab (editor)', action: 'Accept ghost completion in the grammar editor' },
  { keys: 'Ctrl+T / Ctrl+W', action: 'New tab / Close tab' },
]

function MachineGuide() {
  return (
    <>
      <H2>Automata workspace</H2>
      <P>
        Design and simulate machines on an infinite canvas: <Strong>DFA</Strong>, <Strong>NFA</Strong>,{' '}
        <Strong>ε-NFA</Strong>, <Strong>DPDA</Strong>, <Strong>NPDA</Strong>, <Strong>TM</Strong>, and{' '}
        <Strong>LBA</Strong>. Pick the type from the toolbar. Load a textbook or real-world specimen from{' '}
        <Strong>Load Example</Strong> (toolbar) or <Strong>File ▸ Load Example</Strong>.
      </P>

      <H3>Build a machine</H3>
      <P>
        1. <Strong>Add a state</Strong> — right-click ▸ Add State, press <Strong>N</Strong>, or pick the{' '}
        <Strong>◯</Strong> tool and click the canvas.<br />
        2. <Strong>Draw a transition</Strong> — hover a state and drag the rim connection dot, or use the{' '}
        <Strong>↗</Strong> tool (source, then target). Double-click the edge to edit its label.<br />
        3. <Strong>Start / accept</Strong> — right-click, or select a state and press <Strong>I</Strong> (initial)
        / <Strong>F</Strong> (final). TM/LBA can also mark a <Strong>reject</Strong> state from the context menu.<br />
        4. <Strong>Select &amp; annotate</Strong> — <Strong>✥</Strong> to move, Shift-drag to marquee,{' '}
        <Strong>T</Strong> to drop a text note.
      </P>

      <H3>Simulate</H3>
      <P>
        Type a string in the input bar and press <Strong>▶ Play</Strong> or <Strong>Step</Strong>. Active states
        highlight as symbols are consumed. Nondeterministic machines (NFA, ε-NFA, NPDA) explore every branch;
        the computation tree lives in the side panel.<br />
        <Strong>Batch test</Strong> — Simulate ▸ Batch test… (or the bottom panel) runs many strings at once and
        reports accept / reject with a reason (missing transition, stack mismatch, and so on).
      </P>

      <H3>Finite automata &amp; PDAs</H3>
      <P>
        • On an <Strong>ε-NFA</Strong>, leave a label empty or type <C>eps</C> / <C>ε</C> for an ε-move.<br />
        • <Strong>PDA</Strong> transitions are <C>read, pop → push</C>. Use <C>eps</C> for “don’t read / don’t pop / don’t push”.
        Declare Γ in the toolbar’s stack-alphabet field if you want validation warnings.
      </P>

      <H3>Turing machines &amp; LBAs</H3>
      <P>
        • Transitions are <C>read → write, dir</C> with <C>L</C> / <C>R</C> / <C>S</C> (stay). A blank cell is{' '}
        <C>_</C> by default (toolbar <Strong>BLANK</Strong>).<br />
        • The Tape tab shows the tape, the head, and the instantaneous description. A run{' '}
        <Strong>accepts</Strong> on an accept state, <Strong>rejects</Strong> on a reject state or when no move
        applies, and is <Strong>stuck</Strong> if it exceeds the step <Strong>LIMIT</Strong>.<br />
        • <Strong>Multi-tape TM</Strong> — set <Strong>TAPES</Strong> in the toolbar. Each transition lists one
        action per tape (<C>a → b, R | _ → c, L</C>) and fires only when every tape matches. Input seeds tape 1.<br />
        • An <Strong>LBA</Strong> keeps the head on the input (between <C>⊢ ⊣</C>); stepping past either end rejects.
      </P>

      <H3>Conversions &amp; analysis</H3>
      <P>
        • <Strong>Convert</Strong> (toolbar or Convert ▸ Conversions…) plays a construction step by step:
        <C>ε-NFA → NFA</C>, <C>NFA → DFA</C> (subset construction), <C>Minimize DFA</C>,{' '}
        <C>Regex → NFA</C> (Thompson: <C>| * + ?</C>, grouping, ε), and <C>CFG → PDA</C>. Hover a converted
        state to see the subset it came from.<br />
        • <Strong>Analyze</Strong> — reachability / dead states, emptiness (with a witness string), DFA
        equivalence, and language inclusion. Heavy checks run in a background worker so the UI stays live.
      </P>

      <H3>Keyboard &amp; mouse</H3>
      <Shortcuts rows={MACHINE_SHORTCUTS} />
    </>
  )
}

function GrammarGuide() {
  return (
    <>
      <H2>Grammar Laboratory</H2>
      <P>
        Write a context-free (or context-sensitive) grammar on the left; the right-hand tabs analyse it live.
        Open a specimen from <Strong>Load Example</Strong> or <Strong>File ▸ Load Example</Strong>. Use the
        toolbar transfer buttons to send the grammar to Parser Studio, or to build the standard NPDA in the
        Automata workspace.
      </P>

      <H3>How to write a production</H3>
      <P>
        One rule per line, in any of <C>S -&gt; …</C>, <C>S → …</C>, <C>S ::= …</C>, or <C>S : …</C>.
        Alternatives are separated by <C>|</C> or the Unicode divides sign <C>∣</C> (the editor normalises it
        to <C>|</C>). The left-hand side of the first production is the start symbol.
      </P>

      <H3>Token Boundaries &amp; Terminal Distinction (Crucial)</H3>
      <P>
        Symbol boundaries are determined deterministically from the production text:
      </P>
      <P>
        • <Strong>Single Multi-Character Terminal (<C>num</C>, <C>id</C>)</Strong> — An unquoted sequence of alphanumeric characters (<C>[A-Za-z0-9_']</C>) is parsed as <Strong>ONE terminal token</Strong>. For example, <C>E -&gt; num</C> creates a single terminal symbol <C>num</C>, <Strong>not</Strong> separate <C>n</C>, <C>u</C>, and <C>m</C>.<br />
        • <Strong>Separate Single-Character Terminals (<C>n u m</C>)</Strong> — To specify individual characters as separate terminals, separate them with <Strong>whitespace</Strong>: <C>S -&gt; n u m</C> creates three distinct terminal symbols (<C>n</C>, <C>u</C>, <C>m</C>).<br />
        • <Strong>Quoted Terminals (<C>"num"</C>, <C>'if'</C>, <C>"=="</C>)</Strong> — Enclose in quotes to explicitly force the enclosed text to be treated as a single terminal symbol, including tokens containing punctuation (<C>"=="</C>, <C>"if"</C>, <C>";"</C>).<br />
        • <Strong>Nonterminals (<C>S</C>, <C>Expr</C>, <C>T'</C>)</Strong> — Must start with an <Strong>uppercase letter</Strong> (<C>A–Z</C>). Any unquoted word starting with a lowercase letter is treated as a terminal.<br />
        • <Strong>Operators &amp; Punctuation</Strong> — Single characters (<C>+</C>, <C>*</C>, <C>(</C>, <C>)</C>) are single terminals. Multi-character operators (<C>&lt;=</C>, <C>&gt;=</C>, <C>==</C>, <C>!=</C>, <C>&amp;&amp;</C>, <C>||</C>) stay as single tokens automatically.<br />
        • <Strong>Epsilon</Strong> — Written as <C>ε</C>, <C>eps</C>, <C>epsilon</C>, <C>\epsilon</C>, or <C>λ</C>.
      </P>
      <P>
        The editor has <Strong>grouped</Strong> and <Strong>flat</Strong> views of the same grammar. In grouped
        mode, Tab accepts the ghost <C>-&gt;</C> / <C>|</C>, and Enter after a trailing <C>|</C> continues the
        alternative on the next indented line.
      </P>

      <H3>Laboratory tabs</H3>
      <P>
        • <Strong>Derivations</Strong> — type a sentence and build a leftmost derivation / parse tree (Earley).
        Input tokens are matched against the terminal alphabet (longest match), so <C>id</C> stays one token.<br />
        • <Strong>Transformations</Strong> — Chomsky Normal Form (<C>A → BC | a</C>), Greibach Normal Form
        (<C>A → aα</C>), eliminate direct left recursion, and left-factor. The result is re-parseable text you
        can copy back into the editor.<br />
        • <Strong>Ambiguity</Strong> — bounded search for a string with two distinct parse trees.<br />
        • <Strong>Sampler</Strong> — breadth-first generation of short strings in the language.<br />
        • <Strong>Properties</Strong> — terminal / nonterminal / production counts and the start symbol.<br />
        • <Strong>FIRST / FOLLOW</Strong> — live FIRST, FOLLOW, and nullable sets. Needed for LL(1) and for
        reading SLR/LALR conflicts in Parser Studio.<br />
        • <Strong>Problems</Strong> — left recursion, missing left-factoring, unreachable symbols, undefined
        nonterminals. One-click fixes apply the matching transformation.
      </P>

      <H3>CSG notes</H3>
      <P>
        Context-sensitive examples (e.g. <C>aⁿbⁿcⁿ</C>, copy language <C>ww</C>) are loaded as type{' '}
        <Strong>CSG</Strong>. The editor still tokenises the same way; unrestricted left-hand sides are allowed.
        CFG-only tools (FIRST/FOLLOW, CNF, LL(1) checks) apply to CFG tabs.
      </P>

      <H3>Keyboard</H3>
      <Shortcuts rows={GRAMMAR_SHORTCUTS} />
    </>
  )
}

function ParserGuide() {
  return (
    <>
      <H2>Parser Studio</H2>
      <P>
        A debugger-style workspace: grammar on the left, parse table / automaton in the centre, stack, tree,
        and derivation around it. Load a grammar from <Strong>Load Example</Strong> or{' '}
        <Strong>File ▸ Load Example</Strong>, or transfer one from Grammar Lab.
      </P>

      <H3>Grammar &amp; Token Format</H3>
      <P>
        The editor uses the exact same deterministic tokenization rules as Grammar Lab:
      </P>
      <P>
        • <Strong>Distinguishing Tokens (<C>num</C> vs <C>n u m</C>)</Strong> — Writing <C>num</C> creates <Strong>ONE terminal token</Strong> (<C>num</C>). To define three separate single-character terminals, use whitespace: <C>n u m</C>.<br />
        • <Strong>Quoted Terminals</Strong> — Wrap in quotes (<C>"num"</C>, <C>'if'</C>, <C>"=="</C>) to explicitly treat the contents as one terminal symbol.<br />
        • <Strong>Nonterminals</Strong> — Must begin with an uppercase letter (<C>S</C>, <C>Expr</C>, <C>Term</C>, <C>T2</C>).<br />
        • <Strong>Input Buffer Tokenization</Strong> — The input buffer scans input against the grammar’s declared terminal alphabet using <Strong>longest match</Strong>. For example, if <C>id</C> is in your grammar's terminals, typing <C>id+id</C> automatically matches <C>id</C>, <C>+</C>, <C>id</C>. If <C>num</C> is a terminal, typing <C>num</C> matches the single token <C>num</C>.
      </P>
      <P>
        <Strong>Batch test</Strong> in the input panel runs many lines (skip blanks and <C>#</C> comments) and
        reports accept / reject for the current algorithm.
      </P>

      <H3>Pick an algorithm</H3>
      <P>
        The dropdown above the table selects the engine. Tables and the automaton rebuild immediately:
      </P>
      <P>
        • <Strong>LL(1)</Strong> — predictive top-down. Needs disjoint FIRST sets (and FOLLOW on ε-productions).
        Use Grammar Lab’s left-recursion / left-factoring fixes if the table conflicts.<br />
        • <Strong>LR(0) / SLR(1) / LALR(1) / CLR(1)</Strong> — bottom-up. SLR uses FOLLOW to resolve reduces;
        CLR keeps full lookaheads; LALR merges CLR states. Shift/reduce and reduce/reduce cells highlight in
        red; open the conflict inspector for the items involved.<br />
        • <Strong>Earley</Strong> — general CFG. The Earley-sets panel shows items per input position; a tree
        is recovered if the start symbol completes.<br />
        • <Strong>CYK</Strong> — converts internally to CNF, then fills the triangular recognition table.
        Best on short strings.<br />
        • <Strong>Recursive descent (backtracking)</Strong> — no table; watch the syntax tree and input buffer
        as the search tries productions.
      </P>

      <H3>Tables, automaton, and simulation</H3>
      <P>
        • <Strong>Parse Table / Automaton Graph</Strong> — for LR algorithms, toggle the centre view. The graph
        shows LR item-set states, GOTO edges, and a badge on self-loops. Shortened stubs are the default;
        turn on extended transitions to see full paths. Drag a state; routing avoids overlaps on drop.<br />
        • <Strong>Stack &amp; buffer</Strong> — LL shows the remaining input and the symbol stack; LR shows
        state numbers plus shifted symbols.<br />
        • <Strong>Closure / GOTO</Strong> — the item set of the current LR state.<br />
        • <Strong>Syntax tree &amp; derivation</Strong> — built as the parse accepts (leftmost for LL/Earley,
        reverse-rightmost for LR).<br />
        • <Strong>FIRST / FOLLOW</Strong> — the same sets as Grammar Lab, beside the simulation so you can
        relate a conflict cell to the lookahead that caused it.
      </P>
      <P>
        The bottom timeline is the transport bar: play, step, seek, speed. Clicking a past step previews that
        configuration; Esc (or clicking outside) leaves preview.
      </P>

      <H3>Keyboard &amp; transport</H3>
      <Shortcuts rows={PARSER_SHORTCUTS} />
    </>
  )
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const [tab, setTab] = useState<HelpTab>(tabFromHash)

  const tabs: { id: HelpTab; label: string }[] = [
    { id: 'machine', label: 'Automata' },
    { id: 'grammar', label: 'Grammar Lab' },
    { id: 'parser', label: 'Parser Studio' },
  ]
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    setTab(tabs[next].id)
    document.getElementById(`help-tab-${tabs[next].id}`)?.focus()
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="help-title"
      zIndex={3500}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '680px',
        maxWidth: '94vw',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, inherit)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px 0',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div id="help-title" style={{ fontSize: 16, fontWeight: 700 }}>Quick Help &amp; Shortcuts</div>
          <button
            onClick={() => useUIStore.getState().openModal('manual')}
            title="Open Full User Manual"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '3px 8px',
              color: 'var(--chrome-active-border, #3b82f6)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={12} />
            User Manual (F1)
          </button>
          <button
            onClick={() => useUIStore.getState().openModal('theory')}
            title="Open Theory of Computation Handbook"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '3px 8px',
              color: 'var(--chrome-active-border, #3b82f6)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={12} />
            Theory Handbook (F2)
          </button>
        </div>
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Workspace help"
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 20px 0',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {tabs.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              id={`help-tab-${t.id}`}
              aria-controls={`help-panel-${t.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(event) => onTabKeyDown(event, tabs.indexOf(t))}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: on ? '2px solid var(--chrome-active-border, #3b82f6)' : '2px solid transparent',
                color: on ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: on ? 700 : 600,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`help-panel-${tab}`} aria-labelledby={`help-tab-${tab}`} style={{ padding: '16px 22px 24px', overflowY: 'auto' }}>
        {tab === 'machine' && <MachineGuide />}
        {tab === 'grammar' && <GrammarGuide />}
        {tab === 'parser' && <ParserGuide />}
      </div>
    </Dialog>
  )
}
