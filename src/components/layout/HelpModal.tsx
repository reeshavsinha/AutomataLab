// ============================================================
// HelpModal — Quick-start guide + keyboard shortcut cheat sheet.
// Opened from Help ▸ Help & Keyboard Shortcuts (or F1). First-run learnability.
// ============================================================

import Dialog from '@/components/common/Dialog'

interface HelpModalProps {
  onClose: () => void
}

const codeStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '3px',
  padding: '1px 4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-primary)',
}

const MACHINE_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + N', action: 'New machine (new tab)' },
  { keys: 'Ctrl + O', action: 'Open a machine file' },
  { keys: 'Ctrl + S', action: 'Save' },
  { keys: 'Ctrl + Shift + S', action: 'Save As…' },
  { keys: 'Ctrl + T / Ctrl + W', action: 'New tab / Close tab' },
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Right-click / N / ◯ tool', action: 'Add a state' },
  { keys: 'Drag the connection dot', action: 'Create a transition (hover a state, drag its rim dot)' },
  { keys: '↗ tool', action: 'Create a transition (click source, then target)' },
  { keys: 'Double-click', action: 'Rename a state / edit a transition label' },
  { keys: 'I / F', action: 'Set selected state as start / toggle accept (final)' },
  { keys: 'Shift + drag', action: 'Marquee-select a region of the canvas' },
  { keys: 'Shift / Ctrl + click', action: 'Add or remove a node from the selection' },
  { keys: 'Delete / Backspace', action: 'Delete selection' },
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Y / Ctrl + Shift + Z', action: 'Redo' },
  { keys: 'Ctrl + C / X / V', action: 'Copy / Cut / Paste' },
  { keys: 'Ctrl + A', action: 'Select all' },
  { keys: 'Mouse wheel / View menu', action: 'Zoom; the ⤢ button (or View ▸ Fit) frames all' },
  { keys: 'Space / P (or Alt+P)', action: 'Play / Pause simulation' },
  { keys: '→ / S (or Alt+S)', action: 'Step forward' },
  { keys: '←', action: 'Step back' },
  { keys: 'R (or Alt+R)', action: 'Reset simulation' },
  { keys: 'Esc', action: 'Close a dialog / cancel the current action' },
]

const GRAMMAR_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + S', action: 'Save Grammar' },
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Y / Ctrl + Shift + Z', action: 'Redo' },
  { keys: 'Esc', action: 'Close a dialog' },
]

const PARSER_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + S', action: 'Save Parser' },
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Space / P', action: 'Play / Pause simulation' },
  { keys: '→ / S', action: 'Step forward' },
  { keys: '←', action: 'Step back' },
  { keys: 'R', action: 'Reset simulation' },
  { keys: 'Esc', action: 'Close a dialog' },
]

const REGEX_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + S', action: 'Save Regex' },
  { keys: 'F1', action: 'Open this help' },
  { keys: 'Esc', action: 'Close a dialog' },
]

export default function HelpModal({ onClose }: HelpModalProps) {
  const hash = typeof window !== 'undefined' ? window.location.hash : '#/'
  const isGrammar = hash.includes('grammar')
  const isParser = hash.includes('parser')
  const isRegex = hash.includes('regex')
  const isMachine = !isGrammar && !isParser && !isRegex

  let shortcuts = MACHINE_SHORTCUTS
  if (isGrammar) shortcuts = GRAMMAR_SHORTCUTS
  else if (isParser) shortcuts = PARSER_SHORTCUTS
  else if (isRegex) shortcuts = REGEX_SHORTCUTS

  return (
    <Dialog
      onClose={onClose}
      label="Getting started and keyboard shortcuts"
      zIndex={3500}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '520px',
        maxWidth: '92vw',
        maxHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
        {/* Fixed header — stays put while the body scrolls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>Getting Started</div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '18px 24px 24px', overflowY: 'auto' }}>
          
          {isMachine && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>State Machine & Automata Basics</div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                1. <strong style={{ color: 'var(--text-primary)' }}>Add a state</strong>: Right-click the canvas and select "Add State", press <strong style={{ color: 'var(--text-primary)' }}>N</strong>, or pick the <strong style={{ color: 'var(--text-primary)' }}>◯</strong> tool from the left palette and click on the canvas.<br />
                2. <strong style={{ color: 'var(--text-primary)' }}>Create a transition</strong>: Hover over a state and drag the <strong style={{ color: 'var(--text-primary)' }}>connection dot</strong> on its rim onto another state (or use the <strong style={{ color: 'var(--text-primary)' }}>↗</strong> tool, then click source then target), then type its symbol(s). On an <strong style={{ color: 'var(--text-primary)' }}>ε-NFA</strong>, leave the label empty (or type <strong style={{ color: 'var(--text-primary)' }}>eps</strong>) for an <strong style={{ color: 'var(--text-primary)' }}>ε</strong>-move.<br />
                3. <strong style={{ color: 'var(--text-primary)' }}>Set Properties</strong>: Set the <strong style={{ color: 'var(--text-primary)' }}>start</strong> / <strong style={{ color: 'var(--text-primary)' }}>final</strong> states via right-click, or select a state and press <strong style={{ color: 'var(--text-primary)' }}>I</strong> (initial/start) / <strong style={{ color: 'var(--text-primary)' }}>F</strong> (final/accept).<br />
                4. <strong style={{ color: 'var(--text-primary)' }}>Selection & Canvas</strong>: Use the <strong style={{ color: 'var(--text-primary)' }}>↖ Select</strong> tool (or right-click -&gt; Selection Mode, or Shift-drag) to marquee-select regions. Use the <strong style={{ color: 'var(--text-primary)' }}>T</strong> tool to drop text annotations.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Simulation & Batch Testing
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                Type an input string into the top input bar and press <strong style={{ color: 'var(--text-primary)' }}>▶ (Play)</strong> or <strong style={{ color: 'var(--text-primary)' }}>Step</strong> to simulate execution. The active states are highlighted as tokens are consumed.<br/>
                <strong style={{ color: 'var(--text-primary)' }}>Batch Test</strong>: Open "Simulate ▸ Batch test…" (or use the bottom panel) to run multiple strings at once and immediately see which are accepted vs. rejected. The UI will pinpoint exact rejection reasons (e.g., trapped, incomplete DFA, stack mismatch).
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Machine Types & Capabilities
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                Pick a machine type from the right toolbar dropdown: <strong style={{ color: 'var(--text-primary)' }}>DFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>NFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>ε-NFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>DPDA</strong>, <strong style={{ color: 'var(--text-primary)' }}>NPDA</strong>, <strong style={{ color: 'var(--text-primary)' }}>TM</strong>, and <strong style={{ color: 'var(--text-primary)' }}>LBA</strong>.<br/>
                • <strong style={{ color: 'var(--text-primary)' }}>PDAs (Pushdown Automata)</strong>: Transitions involve reading a symbol, popping a symbol from the stack, and pushing new symbols. Use format: <code style={codeStyle}>read, pop → push</code>.<br/>
                • <strong style={{ color: 'var(--text-primary)' }}>Nondeterminism</strong>: For NFA/NPDA, the engine automatically branches and explores all possible execution paths simultaneously. You can view the full computation tree in the bottom panels.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Turing Machines & Linear Bounded Automata
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>Transitions</strong> use the form <code style={codeStyle}>read → write, dir</code>, where <code style={codeStyle}>dir</code> is <strong style={{ color: 'var(--text-primary)' }}>L</strong>, <strong style={{ color: 'var(--text-primary)' }}>R</strong>, or <strong style={{ color: 'var(--text-primary)' }}>S</strong> (stay). A blank read/write means the blank symbol. Double-click a state or edge to open the transition editor.<br />
                • The <strong style={{ color: 'var(--text-primary)' }}>Tape</strong> tab shows the tape, the head (▲), the current state, and the instantaneous description. The <strong style={{ color: 'var(--text-primary)' }}>Input</strong> bar seeds the initial tape.<br />
                • TM/LBA are <strong style={{ color: 'var(--text-primary)' }}>deterministic</strong>: a run <strong style={{ color: 'var(--text-primary)' }}>accepts</strong> on an accept state, <strong style={{ color: 'var(--text-primary)' }}>rejects</strong> on a reject state or when no move applies. Mark a <strong style={{ color: 'var(--text-primary)' }}>reject state</strong> via right-click (TM/LBA only).<br />
                • <strong style={{ color: 'var(--text-primary)' }}>BLANK</strong> and <strong style={{ color: 'var(--text-primary)' }}>LIMIT</strong> (toolbar) set the blank symbol and the step limit. Exceeding the limit halts the run as <strong style={{ color: 'var(--text-primary)' }}>stuck</strong> (infinite-loop guard).<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Multi-tape</strong> (TM only): set <strong style={{ color: 'var(--text-primary)' }}>TAPES</strong> in the toolbar. Each transition then reads/writes one symbol per tape (<code style={codeStyle}>a → b, R | _ → c, L</code>) and fires only when every tape matches. The input seeds tape 1; the Tape tab shows one row per tape.<br />
                • An <strong style={{ color: 'var(--text-primary)' }}>LBA</strong> confines the head to the input cells (between the <code style={codeStyle}>⊢ ⊣</code> markers); moving past either end halts and rejects.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Conversions & Transformations
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • Open <strong style={{ color: 'var(--text-primary)' }}>Convert ▸ Conversions…</strong> (or the toolbar CONVERT button) to transform the current machine or build a new one from text. The chosen construction plays back <strong style={{ color: 'var(--text-primary)' }}>step by step</strong> on a live preview — use ▶ / ◀ or the slider, and toggle <strong style={{ color: 'var(--text-primary)' }}>Source ⇄ Result</strong>.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Algorithms</strong>: Supports <code style={codeStyle}>NFA → DFA</code>, <code style={codeStyle}>ε-NFA → DFA</code> (Subset Construction), <code style={codeStyle}>ε-NFA → NFA</code> (ε-elimination), and <code style={codeStyle}>DFA minimization</code>.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>From Text</strong>: <code style={codeStyle}>Regex → NFA</code> (Thompson's construction supporting operators <code style={codeStyle}>| * + ?</code>, grouping, <code style={codeStyle}>ε</code>) and <code style={codeStyle}>CFG → PDA</code>.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Readable labels</strong>: Converted subsets are named <code style={codeStyle}>q0, q1, …</code>. <strong style={{ color: 'var(--text-primary)' }}>Hover</strong> a state (or switch the preview to full labels) to trace its origin sets.
              </div>
            </>
          )}

          {isGrammar && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Grammar Laboratory Guide</div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>Syntax</strong>: Write rules as <code style={codeStyle}>S -&gt; a S b | ε</code>. <br />
                • <strong style={{ color: 'var(--text-primary)' }}>Nonterminals</strong>: Must be uppercase letters (e.g., <code style={codeStyle}>S</code>, <code style={codeStyle}>A</code>, <code style={codeStyle}>EXPR</code>). Avoid using the reserved word <code style={codeStyle}>START</code>.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Terminals</strong>: Lowercase letters, numbers, or symbols (e.g., <code style={codeStyle}>a</code>, <code style={codeStyle}>0</code>, <code style={codeStyle}>+</code>).<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Epsilon (Empty)</strong>: Represented by <code style={codeStyle}>ε</code>, <code style={codeStyle}>eps</code>, or simply leaving the right side empty.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Start Symbol</strong>: The left-hand side of the very first rule is automatically the start symbol.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Properties & Set Analysis
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>FIRST & FOLLOW Sets</strong>: The system computes these sets in real-time. FIRST sets show the terminals that can begin strings derived from a nonterminal. FOLLOW sets show the terminals that can appear immediately to the right. Essential for debugging parsing conflicts.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>LL(1) Validation</strong>: Instantly checks if your grammar can be parsed top-down deterministically without backtracking. A grammar is LL(1) if its FIRST sets for alternating productions are disjoint.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Nullability</strong>: Identifies exactly which non-terminals can evaluate to an empty string (epsilon).
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Transformations & Normal Forms
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>Chomsky Normal Form (CNF)</strong>: Programmatically converts your grammar so all rules are exactly of the form <code style={codeStyle}>A -&gt; BC</code> (two nonterminals) or <code style={codeStyle}>A -&gt; a</code> (one terminal). Removes epsilons and unit rules automatically.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Left Recursion Elimination</strong>: Automatically removes direct and indirect left recursion (e.g. <code style={codeStyle}>A -&gt; A a</code>) by introducing right-recursive prime rules (<code style={codeStyle}>A'</code>) so the grammar can be used with predictive top-down parsers.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Left Factoring</strong>: Extracts common prefixes from rules to resolve predictive parsing conflicts, delaying branching until necessary.
              </div>
            </>
          )}

          {isParser && (
            <>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Parser Studio Engine</div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>Defining Grammars</strong>: Define your Context-Free Grammar in the left editor using standard notation (e.g., <code style={codeStyle}>E -&gt; E + T | T</code>).<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Input String</strong>: Enter the string you want to parse in the buffer at the top of the screen. Spaces are ignored unless they are explicitly defined as valid tokens.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Algorithms</strong>: Select from a comprehensive suite of top-down and bottom-up parsers: <strong style={{ color: 'var(--text-primary)' }}>LL(1)</strong>, <strong style={{ color: 'var(--text-primary)' }}>LR(0)</strong>, <strong style={{ color: 'var(--text-primary)' }}>SLR(1)</strong>, <strong style={{ color: 'var(--text-primary)' }}>LALR(1)</strong>, <strong style={{ color: 'var(--text-primary)' }}>CLR(1)</strong>, <strong style={{ color: 'var(--text-primary)' }}>Earley</strong>, or <strong style={{ color: 'var(--text-primary)' }}>CYK</strong>.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Parse Tables & Automata
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>ACTION & GOTO Tables</strong>: The main view constructs the full ACTION (Shift, Reduce, Accept, Error) and GOTO tables for your grammar algorithm.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Conflict Highlighting</strong>: If your grammar is not suitable for the selected algorithm (e.g., Shift/Reduce or Reduce/Reduce conflicts in LR parsers), the table will highlight the conflicting cells in bright red.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Automaton Graph</strong>: For bottom-up parsers, view the interactive state machine diagram containing the LR Item Sets (Closures). This maps directly to the parse table rows.
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Interactive Simulation
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                • <strong style={{ color: 'var(--text-primary)' }}>Playback Controls</strong>: Use the timeline bar at the bottom to play, pause, step forward/backward, and adjust playback speed. <code style={codeStyle}>Space</code> toggles playback, while arrow keys step.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Live Stack & Buffer Viewer</strong>: Watch the push/pop operations of the parser's internal stack (symbols & states) matching up with the unconsumed input buffer tokens.<br />
                • <strong style={{ color: 'var(--text-primary)' }}>Syntax Tree & Derivation</strong>: If accepted, view the dynamically constructed concrete syntax tree and the step-by-step mathematical derivation trace (Rightmost-reverse for LR, Leftmost for LL).
              </div>
            </>
          )}

          {isRegex && (
            <>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                Regex Laboratory is currently under construction. Check back soon for advanced regular expression parsing, equivalence testing, and NFA generation!
              </div>
            </>
          )}

          <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Keyboard &amp; Mouse
          </div>
          <div>
            {shortcuts.map((s) => (
              <div
                key={s.action}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
                <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.keys}</span>
              </div>
            ))}
          </div>
        </div>
    </Dialog>
  )
}
