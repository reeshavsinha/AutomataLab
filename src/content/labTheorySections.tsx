// Beginner-oriented theory sections for the Theory Handbook (F2).
// Kept separate from TheoryModal.tsx so lab-specific pedagogy can evolve on its own.

import type { CSSProperties, ReactNode } from 'react'
import { BookOpen, Compass, GitFork, Map } from 'lucide-react'

export interface TheorySectionItem {
  id: string
  title: string
  category: string
  icon: React.ComponentType<{ size?: number; style?: CSSProperties }>
  keywords: string[]
  content: ReactNode
}

function P({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '13px', lineHeight: 1.68, color: 'var(--text-secondary)', marginBottom: '12px' }}>
      {children}
    </div>
  )
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
    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: '22px 0 8px' }}>
      {children}
    </div>
  )
}

function Strong({ children }: { children: ReactNode }) {
  return <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{children}</strong>
}

function C({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '3px',
        padding: '2px 5px',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '11.5px',
      }}
    >
      {children}
    </code>
  )
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(34, 197, 94, 0.4)',
        background: 'rgba(34, 197, 94, 0.06)',
        borderRadius: '6px',
        padding: '12px 14px',
        margin: '12px 0 16px',
        fontSize: '12.5px',
        lineHeight: 1.6,
        color: 'var(--text-secondary)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--status-accept, #22c55e)', marginBottom: '4px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden', margin: '12px 0 18px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: '8px 12px', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              style={{
                borderBottom: rIdx < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                background: rIdx % 2 === 0 ? 'transparent' : 'var(--bg-primary)',
              }}
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-primary)', verticalAlign: 'top', lineHeight: 1.5 }}>
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

/** Sections shown at the top of the handbook — map theory to the three workspaces. */
export const labTheorySections: TheorySectionItem[] = [
  {
    id: 'automata-lab-primer',
    title: 'Start here: Automata Lab',
    category: 'Automata Lab: Start here',
    icon: Compass,
    keywords: [
      'beginner',
      'tutorial',
      'workspace',
      'machine studio',
      'grammar lab',
      'parser studio',
      'getting started',
    ],
    content: (
      <>
        <H2>Start here: how this app teaches theory</H2>
        <Callout title="Who this is for">
          If you are learning automata for the first time, use this page to see <Strong>where to click</Strong> before
          diving into formal definitions. Press <Strong>F2</Strong> any time to return to this handbook; press{' '}
          <Strong>F1</Strong> for the user manual, or <Strong>Help ▸ Help &amp; keyboard shortcuts</Strong> for a quick workspace cheat sheet.
        </Callout>
        <P>
          Automata Lab has three workspaces. They show the <Strong>same ideas</Strong> in different forms: drawing
          machines, writing grammars, and building parse tables.
        </P>
        <Table
          headers={['Workspace', 'You work with…', 'Good first question']}
          rows={[
            [
              'Machine Studio',
              'States and transitions (DFA, NFA, PDA, TM, …)',
              'Does this machine accept the string I typed?',
            ],
            [
              'Grammar Lab',
              'Production rules (regex or Chomsky Types 0–3)',
              'What language does this grammar generate?',
            ],
            [
              'Parser Studio',
              'The same grammars, plus parsing algorithms',
              'How does a compiler read this input step by step?',
            ],
          ]}
        />
        <H3>Suggested learning path</H3>
        <P>
          1. <Strong>Regular languages</Strong> — Regex or Type 3 grammar in Grammar Lab → convert to a DFA in Machine
          Studio → simulate strings.<br />
          2. <Strong>Context-free languages</Strong> — Type 2 grammar → CFG → PDA conversion → Parser Studio (LL or
          LR table).<br />
          3. <Strong>Power limits</Strong> — Try Type 0/1 grammars in Derivations; notice when search hits a{' '}
          <Strong>resource limit</Strong> (that is not the same as “reject”).
        </P>
        <H3>Symbols the whole app shares</H3>
        <P>
          • <Strong>Alphabet</Strong> — the characters you may use in inputs.<br />
          • <Strong>ε</Strong> (epsilon) — the empty string (length 0). Do not confuse it with the empty language{' '}
          <C>∅</C>.<br />
          • <Strong>Accept / reject</Strong> — on a finite machine, the run ends in a final or non-final state. On a
          PDA/TM, follow the workspace help for stack and tape rules.
        </P>
      </>
    ),
  },
  {
    id: 'grammar-formats-in-app',
    title: 'Grammar formats (Regex & Types 0–3)',
    category: 'Automata Lab: Start here',
    icon: Map,
    keywords: [
      'regex',
      'type 0',
      'type 1',
      'type 2',
      'type 3',
      'chomsky',
      'grammar lab',
      'format',
    ],
    content: (
      <>
        <H2>Grammar formats in Grammar Lab</H2>
        <P>
          Pick a format from the toolbar. The app checks whether your rules <Strong>match that format</Strong> and
          enables only the tabs that make sense. Open the <Strong>Properties</Strong> tab for a plain-language summary
          of the current grammar.
        </P>
        <Table
          headers={['Format', 'In one sentence', 'Main tabs in this app']}
          rows={[
            [
              'Regex',
              'A compact notation for regular (Type 3) languages; uses | * + ? and parentheses.',
              'Properties, Sampler. No derivation trees on raw regex.',
            ],
            [
              'Type 3 (regular grammar)',
              'Productions are all “linear” (right-linear or left-linear). Same languages as regex and DFAs.',
              'Properties, Sampler, Derivations; Parser Studio after conversion.',
            ],
            [
              'Type 2 (context-free)',
              'One nonterminal on the left of each rule — typical programming-language syntax.',
              'Full CFG toolkit: FIRST/FOLLOW, CNF, ambiguity, Derivations, CFG → PDA.',
            ],
            [
              'Type 1 (context-sensitive)',
              'Rules do not shrink the sentential form (except optional S → ε). May have context on the left.',
              'Properties, bounded Derivations, Problems; compile to NLBA/TM in Machine Studio.',
            ],
            [
              'Type 0 (unrestricted)',
              'Any production shape — full computational power in theory.',
              'Same as Type 1 for tools; membership is semi-decidable only in the lab.',
            ],
          ]}
        />
        <Callout title="Regex syntax in this app">
          In the <Strong>Regex</Strong> format, <C>|</C> is alternation and <C>+</C> after a group often means
          alternation too (classroom <C>a+b</C> style). For “one or more” of an atom, write <C>(a+)b</C> with
          parentheses. There are no <C>[a-z]</C> character classes — each symbol is a literal unless it is{' '}
          <C>| * + ? ( )</C>.
        </Callout>
        <H3>Terminals vs nonterminals (writing rules)</H3>
        <P>
          Nonterminals start with an <Strong>uppercase</Strong> letter (<C>S</C>, <C>Expr</C>). Unquoted words starting
          with lowercase are terminals. Contiguous letters like <C>num</C> are <Strong>one</Strong> terminal; use spaces{' '}
          <C>n u m</C> for three separate terminals, or quotes <C>&quot;num&quot;</C> to be explicit.
        </P>
      </>
    ),
  },
  {
    id: 'app-conversions-recognizers',
    title: 'Conversions & recognizers in the app',
    category: 'Automata Lab: Start here',
    icon: GitFork,
    keywords: [
      'conversion',
      'thompson',
      'subset',
      'minimize',
      'cfg to pda',
      'grammar to machine',
      'semi-decision',
      'bounded',
    ],
    content: (
      <>
        <H2>What “convert grammar to machine” actually does</H2>
        <P>
          The toolbar machine icon (Grammar Lab / Parser Studio) builds a <Strong>recognizer</Strong> you can simulate in
          Machine Studio. The construction depends on the grammar format — the app only offers pairs that are
          implemented and checked in tests.
        </P>
        <Table
          headers={['From', 'To', 'Idea']}
          rows={[
            ['Regex or Type 3', 'DFA, NFA, PDA, TM, …', 'Build an NFA from linear rules (or regex → NFA → DFA), then lift to the target model.'],
            ['Type 2 (CFG)', 'NPDA', 'Classic single-state-loop PDA: expand productions on the stack, match terminals.'],
            ['Type 0 / 1 / 2', 'NLBA or TM (shell)', 'Embeds your grammar; simulation runs bounded derivation search — not a tiny universal TM diagram.'],
          ]}
        />
        <Callout title="Semi-decision (Types 0 and 1)">
          For unrestricted and context-sensitive grammars, <Strong>Derivations</Strong> search only up to a limit. If you
          see <Strong>resource limit</Strong>, the app ran out of time or memory — it does <Strong>not</Strong> prove the
          string is outside the language. Click <Strong>Find derivation</Strong> explicitly; search does not start on
          its own when you open the tab.
        </Callout>
        <H3>Machine Studio conversions (on a drawn machine)</H3>
        <P>
          <Strong>Convert</Strong> on an existing machine includes ε-removal, subset construction, DFA minimization,{' '}
          <Strong>Regex → NFA</Strong> (Thompson), and <Strong>CFG → PDA</Strong>. Use <Strong>Extract to text</Strong>{' '}
          in the same dialog for <Strong>FA → regex</Strong> (GNFA elimination) and <Strong>PDA → CFG</Strong> (triplet
          grammar after automatic PDA normalization). PDAs built from <Strong>CFG → PDA</Strong> may return the original
          grammar text instead of a fresh triplet — that preserves the language for round-trip exercises.
        </P>
      </>
    ),
  },
  {
    id: 'parser-studio-compiler-path',
    title: 'Parser Studio & the compiler front end',
    category: 'Automata Lab: Start here',
    icon: BookOpen,
    keywords: [
      'parser studio',
      'lexer',
      'compiler',
      'front end',
      'll',
      'lr',
      'pipeline',
    ],
    content: (
      <>
        <H2>Parser Studio and the compiler front end</H2>
        <P>
          A real compiler runs many phases; Automata Lab lets you <Strong>see and debug</Strong> the pieces that come straight
          from automata theory:
        </P>
        <Table
          headers={['Compiler phase', 'Theory', 'In this app']}
          rows={[
            ['Lexical analysis', 'Regular languages / DFA', 'Grammar token rules; regex → NFA in Machine Studio'],
            ['Syntax analysis', 'CFG + PDA / LR', 'Parser Studio tables, stack, timeline, syntax tree'],
            ['Limited semantics', 'Attributes, types (textbook)', 'Parse tree structure; full type-checking not simulated'],
          ]}
        />
        <P>
          Middle and back end topics in the handbook (SSA, register allocation, GC) are <Strong>reference only</Strong> here —
          read them after you are comfortable with LL/LR and Earley in Parser Studio.
        </P>
        <Callout title="Suggested lab order">
          Load a Type 2 example → FIRST/FOLLOW in Grammar Lab → Parser Studio LL(1) or LALR → step conflicts → compare with
          handbook chapters 1–4 under Compiler: Parsing.
        </Callout>
      </>
    ),
  },
  {
    id: 'cfg-tools-in-app',
    title: 'CFG tools: Transformations & parsing',
    category: 'Automata Lab: Start here',
    icon: GitFork,
    keywords: [
      'cnf',
      'gnf',
      'transformations',
      'cyk',
      'earley',
      'll',
      'lr',
      'parser studio',
      'first follow',
    ],
    content: (
      <>
        <H2>CFG tools in Grammar Lab and Parser Studio</H2>
        <P>
          For <Strong>Type 2</Strong> (and many Type 3) grammars, the app implements the same pipeline you see in a
          compilers course — in a fixed order where it matters.
        </P>
        <Table
          headers={['Goal', 'Where in the app', 'Theory handbook']}
          rows={[
            [
              'Clean up grammar (ε, units, useless symbols)',
              'Grammar Lab → Transformations',
              'CFGs, normal forms (CNF, GNF)',
            ],
            [
              'Chomsky or Greibach normal form',
              'Transformations → copy result to editor',
              'Same chapter; CYK needs CNF',
            ],
            [
              'LL(1) table / conflicts',
              'FIRST/FOLLOW tab, then Parser Studio → LL(1)',
              'Top-down parsing (compiler section)',
            ],
            [
              'LR family tables',
              'Parser Studio → LR(0), SLR, LALR, CLR',
              'LR parsing in depth',
            ],
            [
              'Any CFG, short inputs',
              'Parser Studio → Earley or CYK',
              'CFL algorithms: CYK, Earley',
            ],
            [
              'See a parse tree / derivation',
              'Grammar Lab → Derivations (Type 2)',
              'CFG chapter + CFL algorithms',
            ],
          ]}
        />
        <Callout title="When tools are disabled">
          Regex and Type 0/1 formats hide CFG-only tabs on purpose. Convert regex to Type 3, or accept that Type 0/1
          membership is searched with limits — see Conversions &amp; recognizers.
        </Callout>
      </>
    ),
  },
  {
    id: 'reading-order',
    title: 'Handbook reading order',
    category: 'Automata Lab: Start here',
    icon: BookOpen,
    keywords: ['reading order', 'syllabus', 'course', 'topics'],
    content: (
      <>
        <H2>Suggested order for the rest of this handbook</H2>
        <P>
          After the three “Automata Lab” pages above, follow the sidebar top to bottom for a standard undergraduate
          course:
        </P>
        <P>
          1. <Strong>Chomsky hierarchy</Strong> — formal definitions of each grammar type.<br />
          2. <Strong>Regular languages</Strong> — regex, finite automata, Myhill–Nerode, closure properties.<br />
          3. <Strong>Context-free languages</Strong> — CFG normal forms, CFL algorithms, PDA, pumping lemma (use CFG tools page above with the app).<br />
          4. <Strong>Computability</Strong> — Turing machines, enumerators, decidability, reductions (each has an &quot;In plain terms&quot; box).<br />
          5. <Strong>Complexity</Strong> — P, NP, NP-completeness (overview; plain-terms box).<br />
          6. <Strong>Compiler sections</Strong> — start with Lexical + LL/LR (Parser Studio path page), then semantics/IR/backend as reference.<br />
          7. <Strong>Grand synthesis</Strong> — one-page map from Chomsky classes to compiler phases.
        </P>
        <Callout title="Depth vs exams">
          Purple “theorem” boxes and long proof sketches are for reference. For exams, prioritize the tables and the
          “in plain terms” tips in the early TOC chapters.
        </Callout>
      </>
    ),
  },
]
