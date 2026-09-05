// ============================================================
// ManualModal — Comprehensive AutomataLab User Manual & Guide
// Consolidates all workspace documentation, input/output specifications,
// algorithmic details, file formats, and application navigation.
// ============================================================

import { useState, useMemo, type CSSProperties, type ReactNode } from 'react'
import Dialog from '@/components/common/Dialog'
import { useUIStore } from '@/store/uiStore'
import {
  BookOpen,
  Layers,
  Cpu,
  FileCode,
  Compass,
  FileText,
  Keyboard,
  HelpCircle,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Code,
  Sparkles,
} from 'lucide-react'

interface ManualModalProps {
  onClose: () => void
  initialSection?: string
}

interface SectionItem {
  id: string
  title: string
  icon: typeof BookOpen
  category: string
  keywords: string[]
  content: ReactNode
}

const codeBoxStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '10px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
  color: 'var(--text-primary)',
  lineHeight: 1.5,
  overflowX: 'auto',
  margin: '8px 0 14px',
}

const inlineCodeStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '3px',
  padding: '2px 5px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11.5px',
  color: 'var(--text-primary)',
}

function C({ children }: { children: ReactNode }) {
  return <code style={inlineCodeStyle}>{children}</code>
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre style={codeBoxStyle}>
      <code>{code}</code>
    </pre>
  )
}

function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>
}

function H2({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
      {children}
    </div>
  )
}

function H3({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '13px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: '20px 0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {children}
    </div>
  )
}

function P({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '13px', lineHeight: 1.68, color: 'var(--text-secondary)', marginBottom: '12px' }}>
      {children}
    </div>
  )
}

function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'tip' | 'warning'
  title?: string
  children: ReactNode
}) {
  const isWarn = type === 'warning'
  const isTip = type === 'tip'
  const borderColor = isWarn ? 'rgba(239, 68, 68, 0.4)' : isTip ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)'
  const bgColor = isWarn ? 'rgba(239, 68, 68, 0.06)' : isTip ? 'rgba(34, 197, 94, 0.06)' : 'rgba(59, 130, 246, 0.06)'
  const textColor = isWarn ? 'var(--status-reject, #ef4444)' : isTip ? 'var(--status-accept, #22c55e)' : 'var(--chrome-active-border, #3b82f6)'

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        borderRadius: '6px',
        padding: '12px 14px',
        margin: '12px 0 16px',
      }}
    >
      {title && (
        <div style={{ fontWeight: 700, fontSize: '12.5px', color: textColor, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isWarn ? <AlertTriangle size={14} /> : isTip ? <Sparkles size={14} /> : <CheckCircle size={14} />}
          {title}
        </div>
      )}
      <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden', margin: '12px 0 18px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 12px', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ManualModal({ onClose, initialSection = 'getting-started' }: ManualModalProps) {
  const [selectedId, setSelectedId] = useState<string>(initialSection)
  const [searchQuery, setSearchQuery] = useState('')

  const sections: SectionItem[] = useMemo(
    () => [
      {
        id: 'getting-started',
        title: 'Overview & Architecture',
        category: 'Core Concepts',
        icon: BookOpen,
        keywords: ['overview', 'architecture', 'introduction', 'welcome', 'theory', 'automatalab', 'workspaces'],
        content: (
          <>
            <H2>AutomataLab — Interactive Formal Language Studio</H2>
            <P>
              <Strong>AutomataLab</Strong> is a unified computer science environment designed for studying, building, simulating, and verifying formal language models and parsing algorithms. It provides three interconnected, dedicated workspaces:
            </P>
            <Table
              headers={['Workspace', 'Primary Models', 'Key Capabilities']}
              rows={[
                [
                  'Automata Designer',
                  'DFA, NFA, ε-NFA, Mealy, Moore, DPDA, NPDA, TM, LBA',
                  'Infinite canvas visual graph editor, step-by-step simulation, multi-branch exploration, multi-tape Turing machines, conversions, and batch test suites.',
                ],
                [
                  'Grammar Laboratory',
                  'CFG (Context-Free) & CSG (Context-Sensitive)',
                  'Live grammar analysis, FIRST/FOLLOW set derivation, CNF/GNF transformations, left-recursion elimination, left-factoring, ambiguity detection, and language sampling.',
                ],
                [
                  'Parser Studio',
                  'LL(1), LR(0), SLR(1), LALR(1), CLR(1), Earley, CYK, Backtracking',
                  'Interactive parsing tables, LR automaton state graph visualization, conflict inspectors, stack/closure step-by-step debuggers, and parse tree derivation visualizers.',
                ],
              ]}
            />
            <Callout type="tip" title="Inter-Workspace Synergy">
              You can effortlessly transfer models between workspaces using the toolbar buttons: synthesize an NPDA in Automata Designer from a grammar in Grammar Lab, or send a grammar directly into Parser Studio for table-driven simulation!
            </Callout>
          </>
        ),
      },
      {
        id: 'navigation',
        title: 'Navigation & App Controls',
        category: 'Core Concepts',
        icon: Compass,
        keywords: ['navigation', 'tabs', 'menubar', 'toolbar', 'theme', 'hub', 'dashboard', 'recent', 'shortcuts'],
        content: (
          <>
            <H2>Application Navigation & Workflow</H2>
            <P>
              AutomataLab features a multi-tab desktop workflow with state persistence, theme customization, and rapid keyboard-centric controls.
            </P>

            <H3>The Hub & Tab System</H3>
            <P>
              • <Strong>Workspace Hub (#/)</Strong> — The launchpad for starting new automata, grammars, or parser projects, reviewing recent files, and testing quick regex conversions.<br />
              • <Strong>Multi-Tab Management</Strong> — Work on several machines or grammars concurrently. Use <C>Ctrl+T</C> to open a new tab and <C>Ctrl+W</C> to close the current tab. Tab order is preserved, and unsaved changes are guarded with confirmation prompts.<br />
              • <Strong>Dirty-State Tracking</Strong> — Tabs with unsaved edits display a subtle indicator bullet dot.
            </P>

            <H3>Top Menu Bar & Toolbars</H3>
            <P>
              • <Strong>File Menu</Strong> — New, Open (<C>Ctrl+O</C>), Save (<C>Ctrl+S</C>), Save As (<C>Ctrl+Shift+S</C>), Export Bundle (<C>Ctrl+E</C>), Load Example gallery, and Recent Files.<br />
              • <Strong>Edit Menu</Strong> — Full Undo/Redo (<C>Ctrl+Z</C> / <C>Ctrl+Y</C>), Cut/Copy/Paste (<C>Ctrl+X</C> / <C>Ctrl+C</C> / <C>Ctrl+V</C>), Select All (<C>Ctrl+A</C>), and Delete selection.<br />
              • <Strong>Simulate / Tools</Strong> — Quick triggers for Play/Pause, Single Step, Reset, and Batch Execution dialogs.<br />
              • <Strong>Theme Toggle</Strong> — Seamlessly toggle between dark mode and light mode via the menu bar or the theme icon on the bottom right.
            </P>
          </>
        ),
      },
      {
        id: 'automata-designer',
        title: 'Automata Designer',
        category: 'Workspaces',
        icon: Cpu,
        keywords: ['automata', 'dfa', 'nfa', 'enfa', 'mealy', 'moore', 'dpda', 'npda', 'tm', 'lba', 'turing', 'canvas', 'states', 'transitions'],
        content: (
          <>
            <H2>Automata Designer & Simulation</H2>
            <P>
              The Automata workspace provides an infinite, interactive canvas for constructing and executing state machines across the entire Chomsky hierarchy.
            </P>

            <H3>Supported Machine Formalisms</H3>
            <Table
              headers={['Type', 'Transition Format', 'Special Attributes']}
              rows={[
                ['DFA', 'a', 'Deterministic. Exactly one transition per alphabet symbol.'],
                ['NFA', 'a', 'Nondeterministic. Multiple branches explored in parallel.'],
                ['ε-NFA', 'a, ε, eps', 'Supports empty epsilon transitions without consuming input.'],
                ['Mealy', 'input / output', 'Emits an output on each consumed transition.'],
                ['Moore', 'input', 'Emits the destination state output; the initial state output is emitted first.'],
                ['DPDA / NPDA', 'read, pop → push', 'Pushdown automata with stack operations. Use eps for empty.'],
                ['Single-Tape TM', 'read → write, dir', 'Turing Machine with directions L (left), R (right), S (stay). Blank is _.'],
                ['Multi-Tape TM', 't1_r → t1_w, d1 | t2_r → t2_w, d2', 'Synchronized multi-tape transitions with configurable tape count (1-9).'],
                ['LBA', 'read → write, dir', 'Linear Bounded Automaton bounded between endmarkers ⊢ and ⊣.'],
              ]}
            />

            <H3>Canvas Operations & Editing</H3>
            <P>
              • <Strong>Add States</Strong> — Click the <C>◯</C> tool, right-click canvas ▸ Add State, or press <C>N</C> to drop a state at the viewport center.<br />
              • <Strong>Draw Transitions</Strong> — Hover over any state and drag from its outer rim connection dot directly to a target state (or to itself for self-loops). Alternatively, use the <C>↗</C> transition tool.<br />
              • <Strong>State Roles</Strong> — Select a state and press <C>I</C> to toggle Initial / Start status, or <C>F</C> to toggle Final / Accept status for recognizers. Mealy and Moore machines have no final states; their completed output sequence is the result. In TM/LBA, reject states can be marked via right-click.<br />
              • <Strong>Graph Layout</Strong> — Click the auto-layout icon in the toolbar for automatic force-directed or layered placement.<br />
              • <Strong>Annotations</Strong> — Use the <C>T</C> tool to place resizable text descriptions and markdown comments on the canvas.
            </P>

            <H3>Simulation Controls & Non-Determinism</H3>
            <P>
              Type input into the bottom bar and click <Strong>Play</Strong> or <Strong>Step</Strong>. In nondeterministic machines (NFA/NPDA), every active computational branch is explored simultaneously. The right-hand <Strong>Computation Tree</Strong> panel shows the active tree paths and lets you click any node to inspect its specific instantaneous configuration.
              For Mealy and Moore machines, open the <Strong>Output</Strong> panel to inspect the replayable output trace. Moore emits its initial state output before the first input symbol.
            </P>

            <H3>Batch Test Suite Runner</H3>
            <P>
              Click <Strong>Batch…</Strong> in the input bar or <Strong>Simulate ▸ Batch test…</Strong> to run test inputs at once. The shared suite format accepts <C>accept:</C>/<C>reject:</C>, optional <C>input =&gt; output</C> expectations, and <C>visible</C>, <C>hidden</C>, <C>random</C>, or <C>boundary</C> categories. Load <C>.txt</C>, validated <C>.csv</C>, or <C>.json</C> suites with <Strong>Load suite</Strong>; parser batches run on fresh adapters and do not overwrite the interactive session. Reports are available as CSV, JSON, Markdown, or LaTeX, with the first counterexample identified.
            </P>
          </>
        ),
      },
      {
        id: 'conversions-analysis',
        title: 'Conversions & Verification',
        category: 'Workspaces',
        icon: Layers,
        keywords: ['conversions', 'thompson', 'subset', 'minimization', 'hopcroft', 'cfg to pda', 'equivalence', 'emptiness'],
        content: (
          <>
            <H2>Machine Conversions & Formal Verification</H2>
            <P>
              AutomataLab includes comprehensive step-by-step algorithmic transformers and formal property verifiers.
            </P>

            <H3>Step-by-Step Conversions</H3>
            <P>
              Open <Strong>Convert ▸ Conversions…</Strong> to execute standard theoretical transformations:
            </P>
            <Table
              headers={['Algorithm', 'Input → Output', 'Theoretical Properties']}
              rows={[
                ['Thompson Construction', 'Regular Expression → ε-NFA', 'Supports union |, concat, Kleene star *, plus +, optional ?, and grouped sub-expressions.'],
                ['ε-Removal', 'ε-NFA → NFA', 'Computes ε-closures for all states and computes direct transitions.'],
                ['Subset Construction', 'NFA → DFA', 'Constructs power-set states. Hover over any generated state in AutomataLab to view its source subset!'],
                ['DFA Minimization', 'DFA → Minimal DFA', 'Hopcroft & Myhill-Nerode table filling algorithm with unreachable state elimination.'],
                ['CFG to PDA', 'Context-Free Grammar → PDA', 'Constructs the standard top-down single-state PDA simulating leftmost derivations.'],
              ]}
            />

            <H3>Formal Language Analysis</H3>
            <P>
              Under the <Strong>Analysis</Strong> modal, AutomataLab performs:
            </P>
            <P>
              • <Strong>Reachability &amp; Dead States</Strong> — Identifies unreachable states from the start state and dead states that cannot reach an accept state.<br />
              • <Strong>Emptiness Check</Strong> — Determines if \(L(M) = \emptyset\). If not empty, generates the shortest accepting witness string.<br />
              • <Strong>DFA Equivalence</Strong> — Verifies if \(L(M_1) = L(M_2)\) using synchronous product automaton search.<br />
              • <Strong>Language Inclusion</Strong> — Checks whether \(L(M_1) \subseteq L(M_2)\) via complementation and intersection.
            </P>
          </>
        ),
      },
      {
        id: 'grammar-lab',
        title: 'Grammar Laboratory',
        category: 'Workspaces',
        icon: FileCode,
        keywords: ['grammar', 'cfg', 'csg', 'chomsky', 'first', 'follow', 'cnf', 'gnf', 'left recursion', 'left factoring', 'ambiguity'],
        content: (
          <>
            <H2>Grammar Laboratory</H2>
            <P>
              The Grammar Laboratory lets you author, analyze, transform, and debug Context-Free (CFG) and Context-Sensitive (CSG) grammars in real time.
            </P>

            <H3>Production Syntax Rules</H3>
            <P>
              • <Strong>Production Arrow</Strong> — Written as <C>-&gt;</C>, <C>::=</C>, <C>→</C>, or <C>:</C>.<br />
              • <Strong>Nonterminals</Strong> — Must start with an uppercase letter: <C>S</C>, <C>Expr</C>, <C>Term_1</C>, <C>T'</C>.<br />
              • <Strong>Terminals</Strong> — Lowercase identifiers or punctuation: <C>id</C>, <C>num</C>, <C>a</C>, <C>b</C>, <C>+</C>, <C>*</C>.<br />
              • <Strong>Quoted Terminals</Strong> — Use double or single quotes for multi-word or operator symbols: <C>"if"</C>, <C>"=="</C>, <C>";"</C>.<br />
              • <Strong>Epsilon (Empty String)</Strong> — Use <C>ε</C>, <C>eps</C>, <C>epsilon</C>, <C>\epsilon</C>, or <C>λ</C>.<br />
              • <Strong>Start Symbol</Strong> — The left-hand side of the first declared production rule.
            </P>

            <H3>Token Boundaries &amp; Terminal Distinction (Crucial)</H3>
            <P>
              Grammar symbols are tokenized deterministically according to strict lexical rules:
            </P>
            <Table
              headers={['Grammar Rule Example', 'Parsed Symbols', 'Tokenization Rule']}
              rows={[
                [
                  'S -> num + num',
                  'NT: {S}, T: {num, +}',
                  'A contiguous unquoted word like "num" is parsed as ONE terminal token, not separate n, u, m.',
                ],
                [
                  'S -> n u m',
                  'NT: {S}, T: {n, u, m}',
                  'Whitespace acts as a hard symbol delimiter, producing THREE individual single-char terminals.',
                ],
                [
                  'S -> "num" | \'num\'',
                  'NT: {S}, T: {num}',
                  'Quotes explicitly treat the enclosed text as a single terminal symbol.',
                ],
                [
                  'S -> "==" | "<=" | "if"',
                  'NT: {S}, T: {==, <=, if}',
                  'Quoting guarantees multi-character and operator tokens are preserved cleanly.',
                ],
                [
                  'E -> Expr + Term',
                  'NT: {E, Expr, Term}, T: {+}',
                  'Words starting with an uppercase letter (A–Z) are always recognized as nonterminals.',
                ],
                [
                  'S -> eps | ε',
                  'NT: {S}, Epsilon',
                  'Recognized epsilon keywords represent the empty string (no terminal generated).',
                ],
              ]}
            />
            <CodeBlock code={`# Classic Expression Grammar with 'id' and 'num'\nE -> E + T | T\nT -> T * F | F\nF -> ( E ) | id | num`} />

            <H3>Analysis & Properties</H3>
            <P>
              • <Strong>FIRST &amp; FOLLOW Sets</Strong> — Real-time computation of FIRST, FOLLOW, and Nullable sets for every nonterminal.<br />
              • <Strong>Transformations</Strong> — One-click transformations into Chomsky Normal Form (CNF) and Greibach Normal Form (GNF), direct &amp; indirect left-recursion elimination, and left-factoring.<br />
              • <Strong>Derivations &amp; Syntax Tree</Strong> — Test input strings to generate leftmost and rightmost derivation step traces using the built-in Earley recognizer.<br />
              • <Strong>Ambiguity Detector</Strong> — Bounded breadth-first exploration to search for counterexample strings that produce multiple valid parse trees.
            </P>
          </>
        ),
      },
      {
        id: 'parser-studio',
        title: 'Parser Studio',
        category: 'Workspaces',
        icon: Code,
        keywords: ['parser', 'll1', 'lr0', 'slr1', 'lalr1', 'clr1', 'earley', 'cyk', 'backtracking', 'table', 'automaton', 'shift reduce'],
        content: (
          <>
            <H2>Parser Studio</H2>
            <P>
              Parser Studio is an interactive visual parsing workbench and debugger, supporting 8 top-down and bottom-up parsing algorithms.
            </P>

            <H3>Supported Parsing Algorithms</H3>
            <Table
              headers={['Algorithm', 'Class', 'Strategy & Characteristics']}
              rows={[
                ['LL(1)', 'Top-Down', 'Deterministic predictive parsing using 1 symbol of lookahead. Requires disjoint FIRST sets and no left recursion.'],
                ['LR(0)', 'Bottom-Up', 'Shift-reduce parsing with canonical LR(0) item sets without lookahead.'],
                ['SLR(1)', 'Bottom-Up', 'Simple LR using FOLLOW sets to resolve reduce actions in conflict states.'],
                ['LALR(1)', 'Bottom-Up', 'Look-Ahead LR parser merging LR(1) states with identical LR(0) cores. Powers tools like Yacc/Bison.'],
                ['CLR(1)', 'Bottom-Up', 'Canonical LR(1) parser with full item lookahead propagation across closures.'],
                ['Earley', 'Chart Parser', 'General dynamic programming parser (Predict, Scan, Complete). Handles all CFGs, including ambiguous grammars, in O(n³) time.'],
                ['CYK', 'Chart Parser', 'Bottom-up dynamic programming triangular matrix parser for Chomsky Normal Form grammars.'],
                ['Recursive Descent', 'Top-Down', 'Interactive backtracking depth-first rule expansion simulator.'],
              ]}
            />

            <H3>Grammar Format &amp; Tokenization Rules</H3>
            <P>
              • <Strong>Distinguishing Tokens (<C>num</C> vs <C>n u m</C>)</Strong> — An unquoted sequence like <C>num</C> is parsed as <Strong>ONE terminal token</Strong> (<C>num</C>). If you want three separate single-character terminals, separate them with spaces: <C>n u m</C>.<br />
              • <Strong>Quoted Literals</Strong> — Enclose in quotes (<C>"num"</C>, <C>'if'</C>, <C>"=="</C>) to explicitly treat symbols as a single terminal token.<br />
              • <Strong>Nonterminals</Strong> — Must start with an uppercase letter (<C>S</C>, <C>Expr</C>, <C>Term</C>, <C>T2</C>).<br />
              • <Strong>Input Buffer Longest-Match Scanning</Strong> — When parsing a test string in the input buffer, tokens are matched greedily against the grammar’s declared terminal alphabet. If <C>id</C> and <C>num</C> are terminals, <C>id+num</C> is scanned as <C>id</C>, <C>+</C>, <C>num</C>.
            </P>

            <H3>Visualization &amp; Debugging Tools</H3>
            <P>
              • <Strong>Interactive Parse Table</Strong> — Inspect generated Action &amp; Goto tables with highlighted conflict cells (Shift/Reduce and Reduce/Reduce).<br />
              • <Strong>LR Automaton Graph</Strong> — Interactive graph showing LR state nodes, item-set closures, and GOTO transitions.<br />
              • <Strong>Conflict Inspector</Strong> — Click on any conflicting table cell to inspect the competing production items and lookaheads.<br />
              • <Strong>Transport Timeline</Strong> — Step forward, step backward, seek to start, or seek to end. Click any past step on the timeline to preview past parse stack states.
            </P>
          </>
        ),
      },
      {
        id: 'file-formats',
        title: 'File Formats & Data Exchange',
        category: 'Reference',
        icon: FileText,
        keywords: ['file formats', 'json', 'jflap', 'jff', 'export', 'import', 'csv', 'latex', 'tikz', 'png', 'svg', 'zip'],
        content: (
          <>
            <H2>File Formats &amp; Data Specifications</H2>
            <P>
              AutomataLab supports comprehensive open JSON, JFLAP XML, vector graphics, and LaTeX TikZ formats.
            </P>

            <H3>1. AutomataLab Machine JSON (.autolab.json / .json)</H3>
            <P>
              The native format storing complete machine state, coordinates, transitions, and tape configurations:
            </P>
            <CodeBlock
              code={`{
  "id": "machine_example_1",
  "name": "Ends with 'ab'",
  "type": "DFA",
  "alphabet": ["a", "b"],
  "states": [
    { "id": "s0", "label": "q0", "x": 120, "y": 180, "isStart": true, "isAccept": false },
    { "id": "s1", "label": "q1", "x": 280, "y": 180, "isStart": false, "isAccept": false },
    { "id": "s2", "label": "q2", "x": 440, "y": 180, "isStart": false, "isAccept": true }
  ],
  "transitions": [
    { "id": "t0", "from": "s0", "to": "s1", "read": "a" },
    { "id": "t1", "from": "s0", "to": "s0", "read": "b" },
    { "id": "t2", "from": "s1", "to": "s2", "read": "b" },
    { "id": "t3", "from": "s1", "to": "s1", "read": "a" },
    { "id": "t4", "from": "s2", "to": "s1", "read": "a" },
    { "id": "t5", "from": "s2", "to": "s0", "read": "b" }
  ]
}`}
            />

            <H3>2. JFLAP Compatibility (.jff)</H3>
            <P>
              Import and export standard JFLAP 7.x XML files (<C>.jff</C>). AutomataLab supports FA, PDA, and TM structures. Note that AutomataLab evaluates PDA acceptance by Final State (consistent with standard textbook semantics).
            </P>

            <H3>3. Grammar Text Format (.txt)</H3>
            <P>
              Plain text grammar files with one production group per line. Blank lines and lines starting with <C>#</C> are treated as comments.
            </P>
            <P>
              • <Strong>Symbol Tokenization</Strong> — Contiguous unquoted characters (<C>num</C>, <C>id</C>) form a single terminal token. Separate with spaces (<C>n u m</C>) for multiple single-character terminals.<br />
              • <Strong>Quoting</Strong> — Wrap in quotes (<C>"num"</C>, <C>'if'</C>, <C>"=="</C>) to preserve multi-character or punctuation tokens.<br />
              • <Strong>Nonterminals</Strong> — Identifiers beginning with an uppercase letter (<C>S</C>, <C>Expr</C>, <C>Term</C>).<br />
              • <Strong>Epsilon</Strong> — Expressed as <C>ε</C>, <C>eps</C>, <C>epsilon</C>, or <C>\epsilon</C>.
            </P>

            <H3>4. Batch Test Case Files (.txt / .csv)</H3>
            <P>
              Batch input files allow testing multiple strings with optional expected verdicts:
            </P>
            <CodeBlock code={`# Sample Test Suite\naabb\nabab\naccept: aabb\nreject: aab\nε`} />

            <H3>5. Graphical &amp; LaTeX Exports</H3>
            <P>
              • <Strong>PNG / SVG</Strong> — High-resolution raster and vector graphics with transparent or theme background.<br />
              • <Strong>LaTeX Table (.tex)</Strong> — Ready-to-compile LaTeX tabular code exporting state transition (\(\delta\)) tables for problem sets and academic papers.<br />
              • <Strong>Configuration Matrix</Strong> — CSV, Markdown, and LaTeX exports of step, state, input position, consumed/remaining input, and only the applicable stack, independent tape, output, and status columns.<br />
              • <Strong>Export Bundle (.zip)</Strong> — One-click download containing the JSON definition, diagram exports, grammar text, and analysis tables.
            </P>
          </>
        ),
      },
      {
        id: 'keyboard-reference',
        title: 'Keyboard & Mouse Shortcuts',
        category: 'Reference',
        icon: Keyboard,
        keywords: ['shortcuts', 'hotkeys', 'keyboard', 'mouse', 'accelerators', 'quick'],
        content: (
          <>
            <H2>Keyboard & Mouse Shortcuts Reference</H2>
            <P>Comprehensive list of hotkeys across all application workspaces.</P>

            <H3>Global Application Shortcuts</H3>
            <Table
              headers={['Shortcut', 'Action']}
              rows={[
                ['F1', 'Open User Manual & Quick Help'],
                ['Ctrl+N', 'Create a new machine / tab'],
                ['Ctrl+O', 'Open a file (.autolab.json, .jff, .txt)'],
                ['Ctrl+S', 'Save current machine / grammar'],
                ['Ctrl+Shift+S', 'Save As…'],
                ['Ctrl+E', 'Open Export Bundle modal'],
                ['Ctrl+T', 'Open new workspace tab'],
                ['Ctrl+W', 'Close active tab'],
                ['Ctrl+Z / Ctrl+Y', 'Global Undo / Redo'],
                ['Ctrl+C / X / V', 'Copy / Cut / Paste selection'],
                ['Ctrl+A', 'Select all elements in active canvas'],
                ['Esc', 'Cancel current tool / close modal dialog'],
              ]}
            />

            <H3>Automata Canvas Shortcuts</H3>
            <Table
              headers={['Shortcut / Gesture', 'Action']}
              rows={[
                ['N  or  ◯ tool', 'Add state at the current canvas cursor (or viewport center before the first move)'],
                ['T', 'Start a transition from the one selected state'],
                ['Enter', 'Complete the active transition to the one selected target state'],
                ['↗ tool', 'Add transition (click source, then target)'],
                ['Hover rim dot + drag', 'Directly draw transition from state'],
                ['Double-click state/edge', 'Rename state or edit transition symbol'],
                ['I', 'Toggle Initial / Start state on selected state'],
                ['F', 'Toggle Final / Accept state on selected recognizer state (not Mealy/Moore)'],
                ['T tool', 'Drop text annotation note (the keyboard T command starts transitions)'],
                ['Shift + Drag', 'Box / marquee select region'],
                ['Delete / Backspace', 'Delete selected states and transitions'],
                ['Mouse Wheel', 'Pan & Zoom canvas (or View ▸ Fit to frame all)'],
                ['Space / P', 'Play / Pause simulation'],
                ['→  or  S', 'Step simulation forward one symbol; S completes an active canvas transition instead'],
                ['←', 'Step simulation backward'],
                ['R', 'Reset simulation to initial configuration'],
              ]}
            />

            <H3>Parser Studio & Grammar Shortcuts</H3>
            <Table
              headers={['Shortcut', 'Action']}
              rows={[
                ['Tab (Editor)', 'Accept ghost completion (insert -> or |)'],
                ['Enter (Input Buffer)', 'Load sentence and initialize simulation'],
                ['Space (Parser)', 'Play / Pause parsing simulation'],
                ['|<<  /  <  /  >  /  >>|', 'Seek start / step back / step / seek end'],
                ['⟲', 'Reset parse simulation'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'faq-troubleshooting',
        title: 'FAQ & Troubleshooting',
        category: 'Reference',
        icon: HelpCircle,
        keywords: ['faq', 'troubleshooting', 'conflict', 'shift reduce', 'reduce reduce', 'step limit', 'error', 'pda final state'],
        content: (
          <>
            <H2>Frequently Asked Questions & Troubleshooting</H2>

            <H3>Why does my LR parse table have red conflict cells?</H3>
            <P>
              A red cell in an LR table indicates a <Strong>Shift/Reduce</Strong> or <Strong>Reduce/Reduce</Strong> conflict:
              <br />
              • <Strong>Shift/Reduce</Strong> means the parser cannot decide whether to consume the next token or reduce the current handle (common in ambiguous grammars like dangling-else).
              <br />
              • <Strong>Reduce/Reduce</Strong> means two different rules can be reduced on the same lookahead.
              <br />
              Try upgrading the algorithm hierarchy: <C>LR(0) → SLR(1) → LALR(1) → CLR(1)</C>, or use the <Strong>Earley</Strong> parser for general CFGs.
            </P>

            <H3>Why did LL(1) reject my expression grammar?</H3>
            <P>
              LL(1) top-down parsers cannot parse grammars with <Strong>left recursion</Strong> (e.g., \(E \to E + T\)) or grammars requiring <Strong>left factoring</Strong>. Use Grammar Lab's one-click transformations to eliminate left recursion and left-factor the rules into \(E \to T E'\).
            </P>

            <H3>Why did my Turing machine simulation get stuck?</H3>
            <P>
              If a TM run enters an infinite loop, it halts when it reaches the safety step limit (default 1,000 steps). You can adjust the <Strong>LIMIT</Strong> field in the toolbar for longer runs.
            </P>

            <H3>How are PDA acceptance conditions evaluated?</H3>
            <P>
              AutomataLab evaluates PDA acceptance by <Strong>Final State</Strong> (the machine accepts if any branch reaches an accept state upon consuming the entire input). If you have an Empty Stack PDA, simply add an ε-transition on empty stack to an accept state.
            </P>
          </>
        ),
      },
    ],
    []
  )

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sections
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }, [sections, searchQuery])

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedId) || sections[0]
  }, [sections, selectedId])

  const categories = useMemo(() => {
    const cats: Record<string, SectionItem[]> = {}
    for (const sec of filteredSections) {
      if (!cats[sec.category]) cats[sec.category] = []
      cats[sec.category].push(sec)
    }
    return cats
  }, [filteredSections])

  return (
    <Dialog
      onClose={onClose}
      labelledBy="manual-title"
      zIndex={3600}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '920px',
        maxWidth: '96vw',
        height: '88vh',
        maxHeight: '900px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, inherit)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-xl, var(--shadow-lg))',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default)',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--chrome-active-border, #3b82f6)',
            }}
          >
            <BookOpen size={17} />
          </div>
          <div>
            <div id="manual-title" style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
              AutomataLab Manual
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Comprehensive Guide, Specification &amp; Reference
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              padding: '4px 10px',
              color: 'var(--chrome-active-border, #3b82f6)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={12} />
            Theory Handbook (F2)
          </button>
          <button
            onClick={onClose}
            title="Close Manual (Esc)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-default)',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search bar */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '6px 10px',
              }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Nav List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            {Object.keys(categories).length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No topics match "{searchQuery}"
              </div>
            ) : (
              Object.entries(categories).map(([category, items]) => (
                <div key={category} style={{ marginBottom: '14px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '4px 8px 6px',
                    }}
                  >
                    {category}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {items.map((sec) => {
                      const Icon = sec.icon
                      const isSelected = sec.id === selectedId
                      return (
                        <button
                          key={sec.id}
                          onClick={() => setSelectedId(sec.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 10px',
                            borderRadius: '5px',
                            background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                            border: isSelected ? '1px solid var(--border-default)' : '1px solid transparent',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 500,
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.12s ease',
                          }}
                        >
                          <Icon size={14} style={{ color: isSelected ? 'var(--chrome-active-border, #3b82f6)' : 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sec.title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Pane */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: 'var(--bg-card)' }}>
          {activeSection.content}
        </div>
      </div>
    </Dialog>
  )
}
