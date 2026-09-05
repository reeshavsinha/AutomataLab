// ============================================================
// TheoryModal — Theory of Computation & Compiler Design Handbook
// Comprehensive, mathematically rigorous reference guide covering:
// - Part I-V: Theory of Computation (Chomsky, Regular, Context-Free,
//   Decidability, Reductions, Turing Machines, Complexity)
// - Part VI-XI: Compiler Engineering (Lexical, Top-Down & LL(1),
//   LR Family in Depth, Semantic Analysis, SDD/SDT, SSA Form,
//   Data-Flow & Loop Optimization, Code Gen, Register Allocation,
//   Garbage Collection, Compiler Verification, and the TOC-CD Bridge)
// ============================================================

import React, { useState, useMemo, CSSProperties, ReactNode } from 'react'
import Dialog from '@/components/common/Dialog'
import {
  BookOpen,
  Search,
  Cpu,
  Layers,
  GitFork,
  Binary,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Workflow,
  Hash,
  ShieldAlert,
  Sliders,
  Terminal,
  Activity,
  Code,
  Database,
  Box,
  FastForward,
  Zap,
  CheckSquare,
  FileText,
  ListTree,
  RefreshCw,
  Split,
} from 'lucide-react'

// ------------------------------------------------------------
// Semantic Helper Components for Formatted Theory Content
// ------------------------------------------------------------

const codeBoxStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  padding: '10px 14px',
  fontFamily: 'var(--font-mono, monospace)',
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
  fontFamily: 'var(--font-mono, monospace)',
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
        fontSize: '13.5px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: '22px 0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {children}
    </div>
  )
}

function H4({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '14px 0 6px',
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
  type?: 'info' | 'tip' | 'warning' | 'theorem' | 'proof'
  title?: string
  children: ReactNode
}) {
  const isWarn = type === 'warning'
  const isTip = type === 'tip'
  const isTheorem = type === 'theorem'
  const isProof = type === 'proof'

  const borderColor = isWarn
    ? 'rgba(239, 68, 68, 0.4)'
    : isTip
    ? 'rgba(34, 197, 94, 0.4)'
    : isTheorem
    ? 'rgba(168, 85, 247, 0.4)'
    : isProof
    ? 'rgba(234, 179, 8, 0.4)'
    : 'rgba(59, 130, 246, 0.4)'

  const bgColor = isWarn
    ? 'rgba(239, 68, 68, 0.06)'
    : isTip
    ? 'rgba(34, 197, 94, 0.06)'
    : isTheorem
    ? 'rgba(168, 85, 247, 0.06)'
    : isProof
    ? 'rgba(234, 179, 8, 0.06)'
    : 'rgba(59, 130, 246, 0.06)'

  const textColor = isWarn
    ? 'var(--status-reject, #ef4444)'
    : isTip
    ? 'var(--status-accept, #22c55e)'
    : isTheorem
    ? '#a855f7'
    : isProof
    ? '#eab308'
    : 'var(--chrome-active-border, #3b82f6)'

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
        <div
          style={{
            fontWeight: 700,
            fontSize: '12.5px',
            color: textColor,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isWarn ? (
            <AlertTriangle size={14} />
          ) : isTip ? (
            <Sparkles size={14} />
          ) : isTheorem ? (
            <Hash size={14} />
          ) : isProof ? (
            <Workflow size={14} />
          ) : (
            <CheckCircle size={14} />
          )}
          {title}
        </div>
      )}
      <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        overflow: 'hidden',
        margin: '12px 0 18px',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <thead>
          <tr
            style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 12px', fontWeight: 600 }}>
                {h}
              </th>
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
                <td
                  key={cIdx}
                  style={{
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    verticalAlign: 'top',
                    lineHeight: 1.5,
                  }}
                >
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

function MathBox({ formula, label }: { formula: string; label?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '10px 16px',
        margin: '10px 0 14px',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '13px',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflowX: 'auto',
      }}
    >
      <span>{formula}</span>
      {label && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '12px', flexShrink: 0 }}>({label})</span>}
    </div>
  )
}

// ------------------------------------------------------------
// Section Interfaces
// ------------------------------------------------------------

interface SectionItem {
  id: string
  title: string
  category: string
  icon: React.ComponentType<{ size?: number; style?: CSSProperties }>
  keywords: string[]
  content: ReactNode
}

interface TheoryModalProps {
  onClose: () => void
}

export default function TheoryModal({ onClose }: TheoryModalProps) {
  const [selectedId, setSelectedId] = useState('chomsky-hierarchy')
  const [searchQuery, setSearchQuery] = useState('')

  const sections: SectionItem[] = useMemo(
    () => [
      // =========================================================================
      // PART I: TOC - FOUNDATIONS & REGULAR LANGUAGES
      // =========================================================================
      {
        id: 'chomsky-hierarchy',
        title: 'Chomsky Hierarchy & Foundations',
        category: 'TOC: Foundations & Regular',
        icon: Layers,
        keywords: [
          'chomsky',
          'hierarchy',
          'alphabet',
          'string',
          'language',
          'kleene star',
          'positive closure',
          'type-3',
          'type-2',
          'type-1',
          'type-0',
          'regular',
          'context-free',
          'context-sensitive',
          'recursively enumerable',
        ],
        content: (
          <>
            <H2>The Chomsky Hierarchy &amp; Formal Language Foundations</H2>
            <P>
              Introduced by linguist Noam Chomsky, the <Strong>Chomsky Hierarchy</Strong> classifies formal grammars
              and languages based on their generative power and computational complexity. Each language class is generated
              by a specific grammar form and recognized by an abstract automata class.
            </P>

            <H3>Language Type Containment Hierarchy</H3>
            <P>
              The formal language families form a strict containment hierarchy, where each level is a proper subset of
              the class above it:
            </P>
            <MathBox formula="L(Regular) ⊂ L(Deterministic CFL) ⊂ L(Context-Free) ⊂ L(Context-Sensitive) ⊂ L(Decidable) ⊂ L(Turing-Recognizable)" />

            <Table
              headers={['Type', 'Grammar Class', 'Production Rule Constraints', 'Recognizing Automaton', 'Primary Applications']}
              rows={[
                [
                  <Strong>Type-3</Strong>,
                  'Regular Grammar (RG)',
                  'A → aB or A → a (Right-Linear) | A → Ba or A → a (Left-Linear)',
                  'Finite Automata (DFA, NFA, ε-NFA)',
                  'Lexical analyzers (Flex), regex engines, protocol state machines',
                ],
                [
                  <Strong>Type-2</Strong>,
                  'Context-Free Grammar (CFG)',
                  'A → α where A ∈ V and α ∈ (V ∪ T)* (Single variable on LHS)',
                  'Pushdown Automata (DPDA, NPDA)',
                  'Programming language syntax parsers (Yacc/Bison), XML/JSON trees',
                ],
                [
                  <Strong>Type-1</Strong>,
                  'Context-Sensitive Grammar (CSG)',
                  'α A β → α γ β (γ ≠ ε, |LHS| ≤ |RHS| non-contracting)',
                  'Linear Bounded Automata (LBA)',
                  'Declaration-before-use validation, natural language semantics, type systems',
                ],
                [
                  <Strong>Type-0</Strong>,
                  'Unrestricted Grammar (UG)',
                  'α → β where α ∈ (V ∪ T)+ and β ∈ (V ∪ T)* (No length constraints)',
                  'Turing Machines (Standard TM, Multitape, NTM)',
                  'Universal general-purpose computation, programming language computability',
                ],
              ]}
            />

            <H3>Core Formal Language Primitives</H3>
            <P>
              1. <Strong>Alphabet (Σ)</Strong>: A finite, nonempty set of discrete symbols (e.g., <C>Σ = &#123;0, 1&#125;</C>).
              <br />
              2. <Strong>String (Word, w)</Strong>: A finite sequence of symbols chosen from Σ. <C>|w|</C> denotes length; <C>ε</C> (or <C>λ</C>) is the unique string of length 0.
              <br />
              3. <Strong>Language (L)</Strong>: Any subset <C>L ⊆ Σ*</C>. Note that <C>∅</C> (empty set, size 0) is distinct from <C>&#123;ε&#125;</C> (set containing 1 string of length 0).
            </P>

            <H3>Fundamental Operations on Languages</H3>
            <P>
              • <Strong>Union</Strong>: <C>L ∪ M = &#123; s | s ∈ L or s ∈ M &#125;</C>
              <br />
              • <Strong>Concatenation</Strong>: <C>LM = &#123; st | s ∈ L and t ∈ M &#125;</C>
              <br />
              • <Strong>Kleene Closure (L*)</Strong>: <C>L* = ⋃ (i=0 to ∞) L^i</C>, where <C>L^0 = &#123;ε&#125;</C>
              <br />
              • <Strong>Positive Closure (L+)</Strong>: <C>L+ = ⋃ (i=1 to ∞) L^i = L* \ &#123;ε&#125;</C> (unless <C>ε ∈ L</C>)
              <br />
              • <Strong>Reversal (L^R)</Strong>: <C>L^R = &#123; w^R | w ∈ L &#125;</C>
            </P>
          </>
        ),
      },

      {
        id: 'regular-expressions',
        title: 'Regular Expressions & Algebra',
        category: 'TOC: Foundations & Regular',
        icon: Code,
        keywords: [
          'regular expressions',
          'regex',
          'algebraic laws',
          'identities',
          'annihilator',
          'idempotence',
          'state elimination',
          'inductive path formula',
          'arden theorem',
        ],
        content: (
          <>
            <H2>Regular Expressions &amp; Algebraic Foundations</H2>
            <P>
              A <Strong>Regular Expression (RE)</Strong> is a declarative algebraic notation specifying strings in a
              regular language. By Kleene's Theorem, regular expressions, DFAs, NFAs, and ε-NFAs possess identical
              expressive power.
            </P>

            <H3>Algebraic Laws of Regular Expressions</H3>
            <Table
              headers={['Property', 'Union (+)', 'Concatenation (·)']}
              rows={[
                ['Commutativity', 'R + S = S + R', 'RS ≠ SR (Non-commutative in general)'],
                ['Associativity', '(R + S) + T = R + (S + T)', '(RS)T = R(ST)'],
                ['Distributivity', 'R(S + T) = RS + RT', '(S + T)R = SR + TR'],
                ['Identity Element', 'R + ∅ = R', 'εR = Rε = R'],
                ['Annihilator', '—', '∅R = R∅ = ∅'],
                ['Idempotence', 'R + R = R', 'R · R ≠ R (in general)'],
                ['Kleene Star Laws', '(R*)* = R*,  ∅* = {ε},  ε* = {ε}', 'R* = ε + RR* = (ε + R)*'],
              ]}
            />

            <H3>Conversion: DFA to Regular Expression (State Elimination)</H3>
            <P>
              1. Add unified start state <C>q_start</C> with an ε-transition to <C>q_0</C>.
              <br />
              2. Add unified accepting state <C>q_final</C> with ε-transitions from all <C>f ∈ F</C>.
              <br />
              3. Systematically eliminate intermediate states <C>s</C>. For every predecessor <C>q_i</C> and successor <C>p_j</C>, update the direct transition label:
            </P>
            <MathBox formula="R'_{ij} = R_{ij} + Q_i · (S)* · P_j" label="State Elimination Formula" />
            <P>
              where <C>Q_i</C> is <C>q_i → s</C>, <C>S</C> is self-loop <C>s → s</C>, and <C>P_j</C> is <C>s → p_j</C>.
            </P>

            <H3>Arden's Theorem</H3>
            <Callout type="theorem" title="Arden's Theorem">
              If <C>P</C> and <C>Q</C> are regular expressions over Σ, and <C>P</C> does not contain <C>ε</C> (<C>ε ∉ L(P)</C>), then the recursive equation:
              <br />
              <C>R = Q + RP</C> has a <Strong>unique solution</Strong> given by <C>R = QP*</C>.
            </Callout>
          </>
        ),
      },

      {
        id: 'finite-automata',
        title: 'Finite Automata (DFA, NFA, ε-NFA)',
        category: 'TOC: Foundations & Regular',
        icon: Cpu,
        keywords: [
          'dfa',
          'nfa',
          'enfa',
          'epsilon',
          'subset construction',
          'thompson',
          'table filling',
          'minimization',
          'product construction',
        ],
        content: (
          <>
            <H2>Finite Automata Models &amp; Conversions</H2>
            <P>
              A <Strong>Finite Automaton (FA)</Strong> is an abstract computing machine that transitions between a finite set
              of states based on input symbols, maintaining finite historical memory.
            </P>

            <H3>1. Deterministic Finite Automata (DFA)</H3>
            <MathBox formula="M = (Q, Σ, δ, q_0, F)" />
            <P>
              • <C>Q</C>: Finite set of states; <C>Σ</C>: Finite input alphabet.
              <br />
              • <C>δ: Q × Σ → Q</C>: Deterministic transition function.
              <br />
              • <C>q_0 ∈ Q</C>: Start state; <C>F ⊆ Q</C>: Set of final accepting states.
              <br />
              • <Strong>Language</Strong>: <C>L(M) = &#123; w ∈ Σ* | δ̂(q_0, w) ∈ F &#125;</C>.
            </P>

            <H3>2. Thompson's Construction (RE → ε-NFA)</H3>
            <CodeBlock
              code={`Base Cases:
  r = ε:    start ---> ( i ) -- ε --> (( f ))
  r = a:    start ---> ( i ) -- a --> (( f ))

Inductive Steps:
  Union (s | t):
                +---> [ N(s) ] ---+
                | ε             ε |
    start ---> (i)               v
                | ε             ((f))
                +---> [ N(t) ] ---+

  Concatenation (s · t):
    start ---> [ N(s) ] ===(merged)=== [ N(t) ] ---> ((f_t))

  Kleene Star (s*):
                  +------------- ε ------------+
                  |                            v
    start ---> ( i ) -- ε --> [ N(s) ] -- ε --> (( f ))
                  ^              |
                  +------ ε -----+`}
            />

            <H3>3. Subset Construction (NFA → DFA)</H3>
            <P>
              Given NFA <C>N = (Q_N, Σ, δ_N, q_0, F_N)</C>, the equivalent DFA <C>D = (Q_D, Σ, δ_D, q_D, F_D)</C> has:
              <br />
              • <C>Q_D = P(Q_N)</C> (subsets of <C>Q_N</C>)
              <br />
              • <C>q_D = ECLOSE(&#123;q_0&#125;)</C>
              <br />
              • <C>F_D = &#123; S ⊆ Q_N | S ∩ F_N ≠ ∅ &#125;</C>
              <br />
              • <C>δ_D(S, a) = ECLOSE(⋃ (p ∈ S) δ_N(p, a))</C>
            </P>
            <Callout type="warning" title="Worst-Case State Explosion">
              An NFA with <C>n</C> states can produce a minimal DFA with up to <C>2^n</C> states (e.g., recognizing strings where the <C>n</C>-th symbol from the right is '1').
            </Callout>

            <H3>4. DFA Minimization (Table-Filling Algorithm)</H3>
            <P>
              Two states <C>p, q</C> are equivalent (<C>p ≈ q</C>) iff for all <C>w ∈ Σ*</C>, <C>δ̂(p, w) ∈ F ⇔ δ̂(q, w) ∈ F</C>.
              <br />
              1. Mark all pairs <C>&#123;p, q&#125;</C> with <C>p ∈ F, q ∉ F</C> as distinguishable.
              <br />
              2. For each unmarked pair and symbol <C>a ∈ Σ</C>, if <C>&#123;δ(p, a), δ(q, a)&#125;</C> is marked, mark <C>&#123;p, q&#125;</C>.
              <br />
              3. Repeat until fixpoint; merge remaining unmarked pairs into equivalence classes.
            </P>
          </>
        ),
      },

      {
        id: 'myhill-nerode',
        title: 'Myhill–Nerode Theorem & Non-Regularity',
        category: 'TOC: Foundations & Regular',
        icon: Workflow,
        keywords: [
          'myhill',
          'nerode',
          'equivalence relation',
          'indistinguishability',
          'index',
          'minimal dfa',
          'non-regularity proof',
          'right invariance',
        ],
        content: (
          <>
            <H2>The Myhill–Nerode Theorem</H2>
            <P>
              The <Strong>Myhill–Nerode Theorem</Strong> establishes a necessary and sufficient algebraic characterization
              of regular languages, linking equivalence relations over strings directly to the state space of minimal DFAs.
            </P>

            <H3>The Indistinguishability Relation (≡_L)</H3>
            <MathBox formula="x ≡_L y ⇔ ∀ z ∈ Σ* : (xz ∈ L ⇔ yz ∈ L)" />
            <Callout type="theorem" title="Properties of ≡_L">
              1. <Strong>Equivalence Relation</Strong>: Reflexive, symmetric, and transitive partition over <C>Σ*</C>.
              <br />
              2. <Strong>Right Invariance</Strong>: If <C>x ≡_L y</C>, then <C>∀ a ∈ Σ : xa ≡_L ya</C>.
              <br />
              3. <Strong>Theorem Statement</Strong>: <C>L</C> is regular <Strong>iff</Strong> the index (number of equivalence classes) of <C>≡_L</C> is finite. The minimum DFA state count equals the index of <C>≡_L</C>.
            </Callout>

            <H3>Worked Proof: Non-Regularity of L = &#123;a^n b^n | n ≥ 0&#125;</H3>
            <Callout type="proof" title="Myhill-Nerode Non-Regularity Proof">
              1. Consider the infinite string family <C>S = &#123;a^i | i ≥ 0&#125; = &#123;ε, a, aa, aaa, ...&#125;</C>.
              <br />
              2. Let <C>a^i, a^j ∈ S</C> with <C>i ≠ j</C>. Choose distinguishing extension <C>z = b^i</C>.
              <br />
              3. Concatenating gives: <C>a^i b^i ∈ L</C>, but <C>a^j b^i ∉ L</C> (since <C>i ≠ j</C>).
              <br />
              4. Thus <C>a^i ≢_L a^j</C> for all <C>i ≠ j</C>. Every element of <C>S</C> belongs to a distinct equivalence class.
              <br />
              5. The index of <C>≡_L</C> is infinite; by Myhill-Nerode, <C>L</C> is <Strong>not regular</Strong>.
            </Callout>
          </>
        ),
      },

      {
        id: 'regular-decision-algorithms',
        title: 'Regular Language Decision Algorithms',
        category: 'TOC: Foundations & Regular',
        icon: Activity,
        keywords: [
          'decision algorithms',
          'dfa equivalence',
          'emptiness',
          'finiteness',
          'universality',
          'inclusion',
          'shortest accepted string',
          'shortest distinguishing string',
          'reachability',
          'complexity',
        ],
        content: (
          <>
            <H2>Regular Language Decision Algorithms &amp; Complexity</H2>
            <P>
              Every fundamental decision question for Regular Languages is <Strong>decidable</Strong>. Below are the
              exact graph-theoretic algorithms and their computational complexities.
            </P>

            <Table
              headers={['Decision Problem', 'Formal Question', 'Algorithmic Procedure', 'Time Complexity']}
              rows={[
                [
                  <Strong>Membership</Strong>,
                  'w ∈ L(A)?',
                  'Simulate DFA transitions on w symbol by symbol; test if δ̂(q0, w) ∈ F.',
                  'O(|w|) on DFA / O(|Q|²·|w|) on NFA',
                ],
                [
                  <Strong>Emptiness</Strong>,
                  'L(A) = ∅?',
                  'Run BFS/DFS from start state q0. Test if any final state f ∈ F is reachable.',
                  'O(|Q| + |δ|)',
                ],
                [
                  <Strong>Universality</Strong>,
                  'L(A) = Σ*?',
                  'Complement the DFA (swap accepting and non-accepting states: F\' = Q \\ F); test for Emptiness.',
                  'O(|Q|) on DFA / PSPACE-complete on NFA',
                ],
                [
                  <Strong>Inclusion</Strong>,
                  'L(A) ⊆ L(B)?',
                  'Test if L(A) ∩ L(B̄) = ∅. Construct product DFA A × B̄ and test for Emptiness.',
                  'O(|QA| · |QB|)',
                ],
                [
                  <Strong>Equivalence</Strong>,
                  'L(A) = L(B)?',
                  'Test symmetric difference: (L(A) ∩ L(B̄)) ∪ (L(Ā) ∩ L(B)) = ∅ via product automaton or minimization.',
                  'O(|Σ|·|Q| log |Q|) via Hopcroft Minimization',
                ],
                [
                  <Strong>Finiteness</Strong>,
                  'Is L(A) finite?',
                  '1. Prune unreachable and dead states (co-reachability). 2. Run cycle detection (DFS/Tarjan). Finite iff acyclic.',
                  'O(|Q| + |δ|)',
                ],
                [
                  <Strong>Shortest Accepted String</Strong>,
                  'min_{w ∈ L} |w|',
                  'Run BFS from start state q0 in the unweighted transition graph; record shortest path to any f ∈ F.',
                  'O(|Q| + |δ|)',
                ],
                [
                  <Strong>Shortest Distinguishing String</Strong>,
                  'min |w| : w ∈ L(A) ⊕ L(B)',
                  'Construct product DFA A × B with F_sym = (FA × (QB\\FB)) ∪ ((QA\\FA) × FB). Run BFS from (q0_A, q0_B).',
                  'O(|QA| · |QB| · |Σ|)',
                ],
              ]}
            />

            <H3>State Pruning: Reachability and Co-Reachability</H3>
            <P>
              • <Strong>Reachable States</Strong>: States reachable from <C>q_0</C> via forward BFS/DFS.
              <br />
              • <Strong>Co-Reachable (Live) States</Strong>: States from which at least one accepting state <C>f ∈ F</C> can be reached (computed via BFS/DFS on the reversed transition graph starting from <C>F</C>).
              <br />
              • <Strong>Useful States</Strong>: <C>Q_useful = Reachable ∩ Co-Reachable</C>. Deleting non-useful states preserves <C>L(M)</C> and guarantees cycle-free finiteness analysis.
            </P>
          </>
        ),
      },

      {
        id: 'closure-constructions',
        title: 'Closure Properties: Proofs & Counterexamples',
        category: 'TOC: Foundations & Regular',
        icon: ShieldAlert,
        keywords: [
          'closure properties',
          'product construction',
          'homomorphism',
          'inverse homomorphism',
          'counterexamples',
          'non-closure',
          'dcfl closure',
          'de morgan',
        ],
        content: (
          <>
            <H2>Closure Properties, Formal Proofs &amp; Counterexamples</H2>
            <P>
              Understanding why a language class is closed under an operation requires explicit machine constructions;
              understanding why it fails requires sharp mathematical counterexamples.
            </P>

            <H3>1. Regular Language Closure Constructions</H3>
            <P>
              • <Strong>Product DFA Construction (Union, Intersection, Difference)</Strong>:
              <br />
              Let <C>M_1 = (Q_1, Σ, δ_1, q_1, F_1)</C> and <C>M_2 = (Q_2, Σ, δ_2, q_2, F_2)</C>.
              <br />
              Construct <C>M_prod = (Q_1 × Q_2, Σ, δ_prod, (q_1, q_2), F_prod)</C> with <C>δ_prod((p, q), a) = (δ_1(p, a), δ_2(q, a))</C>:
              <br />
              &nbsp;&nbsp;• Intersection: <C>F_prod = F_1 × F_2</C>
              <br />
              &nbsp;&nbsp;• Union: <C>F_prod = (F_1 × Q_2) ∪ (Q_1 × F_2)</C>
              <br />
              &nbsp;&nbsp;• Set Difference (<C>L_1 \ L_2</C>): <C>F_prod = F_1 × (Q_2 \ F_2)</C>
            </P>
            <P>
              • <Strong>Homomorphism ($h: \Sigma \to \Delta^*$)</Strong>: Replace every transition label <C>a</C> with string <C>h(a)</C>.
              <br />
              • <Strong>Inverse Homomorphism ($h^{-1}(L)$)</Strong>: Construct DFA <C>M'</C> with <C>δ'(q, a) = δ̂(q, h(a))</C>.
            </P>

            <H3>2. CFL Non-Closure Proofs &amp; Counterexamples</H3>
            <Callout type="proof" title="Why CFL is NOT Closed Under Intersection">
              Consider two valid Context-Free Languages:
              <br />
              <C>L_1 = &#123;a^n b^n c^m | n, m ≥ 1&#125;</C> (CFL: PDA counts a's and b's, ignores c's)
              <br />
              <C>L_2 = &#123;a^m b^n c^n | m, n ≥ 1&#125;</C> (CFL: PDA ignores a's, counts b's and c's)
              <br />
              Their intersection is:
              <br />
              <C>L_1 ∩ L_2 = &#123;a^n b^n c^n | n ≥ 1&#125;</C>
              <br />
              By the CFL Pumping Lemma, <C>&#123;a^n b^n c^n&#125;</C> is <Strong>not context-free</Strong>. Thus, CFLs are <Strong>not closed under intersection</Strong>.
            </Callout>

            <Callout type="proof" title="Why CFL is NOT Closed Under Complement">
              Suppose CFLs were closed under complement. By De Morgan's Law:
              <br />
              <C>L_1 ∩ L_2 = Complement(Complement(L_1) ∪ Complement(L_2))</C>
              <br />
              Since CFLs are closed under union, closure under complement would imply closure under intersection, which is false. Hence, CFLs are <Strong>not closed under complement</Strong>.
            </Callout>

            <H3>3. CFL Intersection with Regular Languages</H3>
            <Callout type="theorem" title="Theorem: CFL ∩ Regular is Context-Free">
              Let PDA <C>P = (Q_P, Σ, Γ, δ_P, q_P, Z_0, F_P)</C> and DFA <C>A = (Q_A, Σ, δ_A, q_A, F_A)</C>.
              <br />
              Construct product PDA <C>P' = (Q_P × Q_A, Σ, Γ, δ', (q_P, q_A), Z_0, F_P × F_A)</C> where:
              <br />
              • For <C>a ∈ Σ</C>: <C>((p', δ_A(q, a)), γ) ∈ δ'((p, q), a, X)</C> whenever <C>(p', γ) ∈ δ_P(p, a, X)</C>.
              <br />
              • For <C>ε</C>: <C>((p', q), γ) ∈ δ'((p, q), ε, X)</C> whenever <C>(p', γ) ∈ δ_P(p, ε, X)</C> (DFA state remains unchanged).
              <br />
              This product PDA accepts <C>L(P) ∩ L(A)</C>.
            </Callout>

            <H3>4. DCFL Closure Summary</H3>
            <P>
              <Strong>Deterministic Context-Free Languages (DCFL)</Strong> behave fundamentally differently from general CFLs:
              <br />
              • <Strong>Complement</Strong>: <Strong>Closed</Strong> (swap accepting and dead states in DPDA).
              <br />
              • <Strong>Intersection with Regular</Strong>: <Strong>Closed</Strong>.
              <br />
              • <Strong>Union &amp; Intersection</Strong>: <Strong>Not Closed</Strong>. (e.g., <C>L_1 = &#123;a^n b^n c^m&#125;</C> and <C>L_2 = &#123;a^m b^n c^n&#125;</C> are both DCFL, but their union/intersection are not DCFL).
            </P>
          </>
        ),
      },

      // =========================================================================
      // PART II: TOC - CONTEXT-FREE & PUSHDOWN AUTOMATA
      // =========================================================================
      {
        id: 'cfg-normal-forms',
        title: 'CFGs, Normal Forms (CNF, GNF) & Simplification',
        category: 'TOC: Context-Free & PDA',
        icon: GitFork,
        keywords: [
          'cfg',
          'grammar',
          'derivation',
          'cnf',
          'chomsky normal form',
          'gnf',
          'greibach normal form',
          'simplification',
          'nullable',
          'unit productions',
          'useless symbols',
        ],
        content: (
          <>
            <H2>Context-Free Grammars, Simplification &amp; Normal Forms</H2>
            <P>
              A <Strong>Context-Free Grammar (CFG)</Strong> is a 4-tuple <C>G = (V, T, P, S)</C>. Normal forms standardize
              grammars to enable deterministic polynomial parsing (such as CYK).
            </P>

            <H3>1. Grammar Simplification Pipeline</H3>
            <P>Must be applied in strict sequence:</P>
            <P>
              1. <Strong>Eliminate ε-Productions</Strong>: Compute nullable nonterminals (<C>A ⇒* ε</C>). For each production containing nullable symbols, add combinations with those symbols omitted.
              <br />
              2. <Strong>Eliminate Unit Productions (A → B)</Strong>: Compute unit pairs <C>(A, B)</C> where <C>A ⇒* B</C>. For every non-unit rule <C>B → α</C>, add <C>A → α</C>, then delete all unit rules.
              <br />
              3. <Strong>Eliminate Useless Symbols</Strong>:
              <br />
              &nbsp;&nbsp;a. Keep only <Strong>Generating</Strong> symbols (<C>A ⇒* w ∈ T*</C>).
              <br />
              &nbsp;&nbsp;b. Keep only <Strong>Reachable</Strong> symbols (<C>S ⇒* α X β</C>).
            </P>

            <H3>2. Chomsky Normal Form (CNF)</H3>
            <MathBox formula="A → BC   \text{ or }   A → a   (A, B, C ∈ V,  a ∈ T)" label="CNF Canonical Form" />
            <P>
              • <Strong>Derivation Length Theorem</Strong>: If <C>G</C> is in CNF, any string <C>w ∈ L(G)</C> of length <C>n = |w| ≥ 1</C> requires <Strong>exactly 2n - 1 derivation steps</Strong> and a parse tree with <C>2n - 1</C> interior nodes.
            </P>

            <H3>3. Greibach Normal Form (GNF)</H3>
            <MathBox formula="A → a α   (a ∈ T,  α ∈ V*)" label="GNF Canonical Form" />
            <P>
              In GNF, every production starts with exactly one terminal symbol followed by zero or more variables. This guarantees that every derivation step consumes exactly one input terminal, giving a direct 1-to-1 correspondence with PDA transitions.
            </P>
          </>
        ),
      },

      {
        id: 'cfl-algorithms',
        title: 'CFL Algorithms: CYK, Earley & Parse Trees',
        category: 'TOC: Context-Free & PDA',
        icon: ListTree,
        keywords: [
          'cyk algorithm',
          'earley parser',
          'dynamic programming',
          'parse forest',
          'cfl membership',
          'cfg emptiness',
          'cfg finiteness',
          'predictor',
          'scanner',
          'completer',
        ],
        content: (
          <>
            <H2>CFL Algorithms: CYK, Earley Parsing &amp; Analysis</H2>
            <P>
              While general CFG membership is in <C>P</C>, parsing algorithms differ significantly in constraints and complexity.
            </P>

            <H3>1. The CYK (Cocke–Younger–Kasami) Algorithm</H3>
            <P>
              A dynamic programming algorithm for testing membership of string <C>w = a_1 a_2 ... a_n</C> in grammar <C>G</C> (must be in CNF).
            </P>
            <CodeBlock
              code={`Algorithm CYK(G in CNF, string w = a_1...a_n):
  Let P[n, n] be a 2D table of nonterminal sets (all initially empty).

  // Base Case: Substrings of length 1
  for i = 1 to n:
      for each rule A -> a_i in P:
          add A to P[1, i]

  // Inductive Step: Substrings of length l = 2 to n
  for l = 2 to n:          // length of span
      for i = 1 to n - l + 1: // start index
          for k = 1 to l - 1:  // partition split point
              for each rule A -> B C in P:
                  if B in P[k, i] and C in P[l - k, i + k]:
                      add A to P[l, i]

  if S in P[n, 1] then return ACCEPT else return REJECT`}
            />
            <P>
              • <Strong>Complexity</Strong>: <C>O(n^3 · |G|)</C> time, <C>O(n^2 · |G|)</C> space.
            </P>

            <H3>2. The Earley Parser (Universal Chart Parsing)</H3>
            <P>
              Parses <Strong>any</Strong> CFG without requiring CNF conversion. Uses dotted state items <C>[A → α · β, k]</C> where <C>k</C> is the starting origin index in the input:
            </P>
            <Table
              headers={['Operation', 'Trigger Condition', 'Action / Item Generated']}
              rows={[
                [
                  <Strong>PREDICTOR</Strong>,
                  '[A → α · B β, k] in S[i] (Dot before nonterminal B)',
                  'For all B → γ, add [B → · γ, i] to S[i].',
                ],
                [
                  <Strong>SCANNER</Strong>,
                  '[A → α · a β, k] in S[i] and input a_(i+1) == a',
                  'Add [A → α a · β, k] to S[i+1].',
                ],
                [
                  <Strong>COMPLETER</Strong>,
                  '[B → γ ·, j] in S[i] (Completed production)',
                  'For all [A → α · B β, k] in S[j], add [A → α B · β, k] to S[i].',
                ],
              ]}
            />
            <P>
              • <Strong>Complexity</Strong>: <C>O(n^3)</C> worst-case (ambiguous grammars), <C>O(n^2)</C> (unambiguous), <C>O(n)</C> for deterministic LR grammars.
            </P>

            <H3>3. CFG Emptiness &amp; Finiteness Algorithms</H3>
            <P>
              • <Strong>CFG Emptiness</Strong>: Find generating symbols. <C>L(G) ≠ ∅ ⇔ S is generating</C>. Time: <C>O(|G|)</C>.
              <br />
              • <Strong>CFG Finiteness</Strong>: Convert <C>G</C> to CNF, construct nonterminal dependency graph (<C>A \to B</C> if <C>A \to BC</C> or <C>A \to CB</C> where other variable derives terminal string). <C>L(G)</C> is infinite iff there is a reachable, generating cycle. Time: <C>O(|G|)</C>.
            </P>
          </>
        ),
      },

      {
        id: 'pushdown-automata',
        title: 'Pushdown Automata (PDA & DPDA)',
        category: 'TOC: Context-Free & PDA',
        icon: Binary,
        keywords: [
          'pda',
          'dpda',
          'pushdown',
          'stack',
          'empty stack',
          'final state',
          'instantaneous description',
          'prefix property',
          'palindromes',
          'cfg to pda',
        ],
        content: (
          <>
            <H2>Pushdown Automata (PDA) Formalisms</H2>
            <P>
              A <Strong>Pushdown Automaton (PDA)</Strong> is a finite-state machine augmented with an unbounded LIFO stack memory.
            </P>

            <H3>Formal 7-Tuple Definition</H3>
            <MathBox formula="P = (Q, Σ, Γ, δ, q_0, Z_0, F)" />
            <P>
              • <C>Q</C>: States; <C>Σ</C>: Input alphabet; <C>Γ</C>: Stack alphabet.
              <br />
              • <C>δ: Q × (Σ ∪ &#123;ε&#125;) × Γ → P(Q × Γ*)</C>: Transition function.
              <br />
              • <C>q_0</C>: Start state; <C>Z_0 ∈ Γ</C>: Initial bottom marker; <C>F ⊆ Q</C>: Accepting states.
            </P>

            <H3>Instantaneous Description (ID)</H3>
            <MathBox formula="(q, aw, Xβ) ⊢ (p, w, αβ)    \text{where } (p, α) ∈ δ(q, a, X)" />

            <H3>Acceptance Modes &amp; Equivalence</H3>
            <P>
              1. <Strong>Acceptance by Final State (L(P))</Strong>: Reaches <C>p ∈ F</C> after consuming input.
              <br />
              2. <Strong>Acceptance by Empty Stack (N(P))</Strong>: Stack becomes empty (<C>ε</C>) after consuming input.
              <br />
              • <Strong>Theorem</Strong>: For NPDA, <C>L(P)</C> and <C>N(P)</C> accept the exact same language class (CFL).
            </P>

            <H3>CFG to 1-State PDA Top-Down Construction</H3>
            <P>
              Given CFG <C>G = (V, T, P, S)</C>, construct PDA accepting by empty stack:
              <br />
              1. For each production <C>A → β</C>: Add <C>δ(q, ε, A) = &#123;(q, β)&#125;</C>
              <br />
              2. For each terminal <C>a ∈ T</C>: Add <C>δ(q, a, a) = &#123;(q, ε)&#125;</C> (match and pop)
            </P>
          </>
        ),
      },

      {
        id: 'dcfl-vs-cfl',
        title: 'DCFL vs. CFL & Bridge to Deterministic Parsing',
        category: 'TOC: Context-Free & PDA',
        icon: Split,
        keywords: [
          'dcfl',
          'dpda',
          'prefix property',
          'unmarked palindromes',
          'lr parsing bridge',
          'inherent ambiguity',
        ],
        content: (
          <>
            <H2>Deterministic CFLs (DCFL) vs. General CFLs</H2>
            <P>
              While general CFLs require nondeterministic PDAs, real-world compiler parsers require deterministic execution.
              This division creates the subclass of <Strong>Deterministic Context-Free Languages (DCFL)</Strong>.
            </P>

            <H3>DPDA Determinism Constraints</H3>
            <Callout type="theorem" title="DPDA Formal Constraints">
              1. For all <C>q ∈ Q, a ∈ Σ ∪ &#123;ε&#125;, X ∈ Γ</C>, <C>|δ(q, a, X)| ≤ 1</C>.
              <br />
              2. If <C>δ(q, a, X) ≠ ∅</C> for some <C>a ∈ Σ</C>, then <C>δ(q, ε, X) = ∅</C> (cannot have simultaneous ε and non-ε choices).
            </Callout>

            <H3>The Prefix Property &amp; Acceptance Modes</H3>
            <P>
              • <Strong>Prefix Property</Strong>: A language <C>L</C> has the prefix property if no string in <C>L</C> is a proper prefix of another string in <C>L</C>.
              <br />
              • <Strong>Theorem</Strong>: A DPDA accepts <C>L</C> by <Strong>empty stack</Strong> iff <C>L</C> is a DCFL and satisfies the prefix property.
              <br />
              • By final state, DPDA can accept any DCFL regardless of the prefix property (by appending an explicit endmarker <C>$</C>).
            </P>

            <H3>Comparing Language Capabilities</H3>
            <Table
              headers={['Language', 'Class', 'Recognizing Machine', 'Theoretical Reason']}
              rows={[
                [
                  'L = {w c w^R}',
                  'DCFL',
                  'DPDA (Deterministic)',
                  'Marker "c" uniquely identifies the center point; stack pushes before c, pops after c deterministically.',
                ],
                [
                  'L = {w w^R}',
                  'CFL (Non-DCFL)',
                  'NPDA (Nondeterministic)',
                  'No center marker; machine must nondeterministically guess when the first half ends.',
                ],
                [
                  'L = {a^n b^n} ∪ {a^n b^{2n}}',
                  'CFL (Non-DCFL)',
                  'NPDA',
                  'Machine cannot know in advance whether to match 1 b or 2 b\'s per a without backtracking/nondeterminism.',
                ],
                [
                  'L = {a^n b^n c^m d^m} ∪ {a^n b^m c^m d^n}',
                  'Inherently Ambiguous CFL',
                  'NPDA',
                  'Every CFG for this language is ambiguous; not DCFL.',
                ],
              ]}
            />

            <H3>The Bridge: DCFLs $\equiv$ LR(k) Grammars</H3>
            <Callout type="theorem" title="Knuth's Equivalence Theorem">
              A language <C>L</C> is a <Strong>Deterministic Context-Free Language (DCFL)</Strong> if and only if it can be generated by an <Strong>LR(k)</Strong> grammar (and with endmarker <C>$</C>, an LR(1) grammar).
              <br />
              This theorem bridges abstract automata theory directly to practical industrial parser generators (Yacc/Bison).
            </Callout>
          </>
        ),
      },

      {
        id: 'csl-lba',
        title: 'Context-Sensitive Languages & LBA',
        category: 'TOC: Context-Free & PDA',
        icon: Sliders,
        keywords: ['context sensitive', 'csg', 'csl', 'lba', 'linear bounded automata', 'type-1', 'nspace'],
        content: (
          <>
            <H2>Context-Sensitive Grammars &amp; Linear Bounded Automata</H2>
            <P>
              <Strong>Context-Sensitive Languages (Type-1)</Strong> model language features requiring non-local context checks
              (such as variable declaration before use).
            </P>

            <H3>Context-Sensitive Grammars (CSG)</H3>
            <MathBox formula="α A β → α γ β    (A ∈ V,  γ ∈ (V ∪ T)+,  α, β ∈ (V ∪ T)*)" />
            <P>
              • <Strong>Non-Contracting Rule</Strong>: <C>|LHS| ≤ |RHS|</C> for all productions.
              <br />
              • Classic Non-CFL languages like <C>L = &#123;a^n b^n c^n | n ≥ 1&#125;</C> and <C>L = &#123;ww | w ∈ &#123;a, b&#125;*&#125;</C> are context-sensitive.
            </P>

            <H3>Recognizing Automaton: Linear Bounded Automata (LBA)</H3>
            <P>
              An LBA is a nondeterministic Turing Machine whose tape head is strictly confined to the initial <C>n</C> cells between left and right endmarkers <C>⊢</C> and <C>⊣</C>.
              <br />
              • <C>CSL = NSPACE(n)</C>. Membership is <Strong>decidable</Strong> (finite configuration space: <C>|Q| · n · |Γ|^n</C>).
            </P>
          </>
        ),
      },

      {
        id: 'pumping-lemmas',
        title: 'Pumping Lemmas & Adversarial Games',
        category: 'TOC: Context-Free & PDA',
        icon: ShieldAlert,
        keywords: ['pumping lemma', 'regular pumping lemma', 'cfl pumping lemma', 'adversary game', 'non-regularity'],
        content: (
          <>
            <H2>Pumping Lemmas: Adversarial Proof Systems</H2>
            <P>
              Pumping lemmas formalize the pigeonhole principle over infinite languages with finite memory.
            </P>

            <H3>1. Pumping Lemma for Regular Languages</H3>
            <Callout type="theorem" title="Regular Pumping Lemma">
              If <C>L</C> is regular, <C>∃ p ≥ 1</C> such that <C>∀ z ∈ L</C> with <C>|z| ≥ p</C>, <C>z = xyz</C> where:
              <br />
              1. <C>|y| ≥ 1</C>
              <br />
              2. <C>|xy| ≤ p</C>
              <br />
              3. <C>∀ i ≥ 0 : x y^i z ∈ L</C>
            </Callout>

            <H3>2. Pumping Lemma for Context-Free Languages</H3>
            <Callout type="theorem" title="CFL Pumping Lemma">
              If <C>L</C> is context-free, <C>∃ n ≥ 1</C> such that <C>∀ z ∈ L</C> with <C>|z| ≥ n</C>, <C>z = uvwxy</C> where:
              <br />
              1. <C>|vx| ≥ 1</C>
              <br />
              2. <C>|vwx| ≤ n</C>
              <br />
              3. <C>∀ i ≥ 0 : u v^i w x^i y ∈ L</C>
            </Callout>
            <P>
              <Strong>Proof Game for Non-CFL ($L = &#123;a^n b^n c^n&#125;$)</Strong>:
              <br />
              Pick <C>z = a^n b^n c^n</C>. Since <C>|vwx| ≤ n</C>, the substring <C>vwx</C> can span at most two adjacent symbol types (e.g., only a's and b's). Pumping <C>i = 2</C> increases those symbol counts without increasing the third symbol count, violating the 1:1:1 equality constraint.
            </P>
          </>
        ),
      },

      // =========================================================================
      // PART III: TOC - COMPUTABILITY, TMS & REDUCTIONS
      // =========================================================================
      {
        id: 'turing-machines',
        title: 'Turing Machines & Architectural Models',
        category: 'TOC: Computability & TMs',
        icon: Terminal,
        keywords: ['turing machine', 'tm', 'multitape', 'ntm', '2-stack', '2-counter', 'instantaneous description'],
        content: (
          <>
            <H2>Turing Machines &amp; Computational Models</H2>
            <P>
              A <Strong>Turing Machine (TM)</Strong> is the standard mathematical model of general digital computers.
            </P>

            <H3>Formal 7-Tuple Definition</H3>
            <MathBox formula="M = (Q, Σ, Γ, δ, q_0, B, F)" />
            <P>
              • <C>Q</C>: Finite states; <C>Σ</C>: Input alphabet (<C>B ∉ Σ</C>); <C>Γ</C>: Tape alphabet (<C>Σ ⊂ Γ</C>).
              <br />
              • <C>B ∈ Γ \ Σ</C>: Blank symbol; <C>δ: Q × Γ → Q × Γ × &#123;L, R&#125;</C>: Transition function.
              <br />
              • <C>q_0</C>: Start state; <C>F ⊆ Q</C>: Set of final accepting states.
            </P>

            <H3>Equivalent Architectural Variants</H3>
            <Table
              headers={['Machine Variant', 'Architectural Feature', 'Simulation on Standard Single-Tape TM']}
              rows={[
                ['Multitape TM', 'k independent tapes & heads', '1 tape with 2k tracks (k data, k head position markers). Time: O(T²).'],
                ['Nondeterministic TM (NTM)', 'δ returns multiple choices', '3-tape deterministic TM running Breadth-First Search over computation tree.'],
                ['Semi-Infinite Tape TM', 'Tape cannot move left of cell 0', '2-track tape folding negative and positive infinite directions together.'],
                ['2-Stack Machine', 'Deterministic PDA with 2 stacks', 'Stack 1 stores tape left of head; Stack 2 stores tape right of head. Turing-Complete.'],
                ['2-Counter Machine', 'Registers storing integer values', 'Encodes multiple counter integers via prime factorization m = 2^i · 3^j · 5^k.'],
              ]}
            />
          </>
        ),
      },

      {
        id: 'tm-design-patterns',
        title: 'TM Design Patterns & Subroutine Engineering',
        category: 'TOC: Computability & TMs',
        icon: Cpu,
        keywords: [
          'tm design',
          'mark and scan',
          'crossing off',
          'sweeps',
          'subroutines',
          'palindromes',
          'arithmetic',
          'ww',
          'anbncn',
        ],
        content: (
          <>
            <H2>Turing Machine Design Patterns &amp; Subroutines</H2>
            <P>
              Constructing Turing Machines is software engineering in an elementary low-level language. Real TMs rely on standard design patterns.
            </P>

            <H3>Core Design Patterns</H3>
            <P>
              1. <Strong>Mark-and-Scan (Crossing Off Symbols)</Strong>: Replace processed characters with markers (<C>X, Y</C>) to track progress across sweeps (e.g., verifying <C>0^n 1^n</C>).
              <br />
              2. <Strong>Left-Right Sweeping</Strong>: Scan from left endmarker to blank <C>B</C>, execute one atomic comparison, then sweep back to the leftmost remaining marker.
              <br />
              3. <Strong>Midpoint Finding (Two-Head Speed Simulation)</Strong>: To recognize <C>ww</C>, mark alternate characters (fast pointer at 2x speed) to locate the exact center before comparing halves.
              <br />
              4. <Strong>Tape Shifting Subroutine</Strong>: Shift entire tape contents right by 1 cell to insert a symbol: read character into state register, write previous, move right, repeat until <C>B</C>.
            </P>

            <H3>Execution Trace: Palindrome Recognition on $a b b a$</H3>
            <CodeBlock
              code={`1. (q0, [a]bba)  --> Mark 'X', remember 'a' in state -> (q_scan_a, X[b]ba)
2. (q_scan_a, Xbb[a]) --> Reach right end, verify matching 'a', replace with Blank -> (q_left, Xb[b]B)
3. (q_left, [X]bbB)  --> Sweep left to marker 'X', move right -> (q0, X[b]bB)
4. (q0, X[b]bB)      --> Mark 'Y', remember 'b' in state -> (q_scan_b, XY[b]B)
5. (q_scan_b, XY[b]B)--> Reach right end, verify matching 'b', replace with Blank -> (q_left, X[Y]BB)
6. (q_left, [X]YBB)  --> Sweep left to marker, no more unmarked symbols -> (q_accept, XYBB)`}
            />
          </>
        ),
      },

      {
        id: 'enumerators-dovetailing',
        title: 'Enumerators, Dovetailing & Church–Turing',
        category: 'TOC: Computability & TMs',
        icon: RefreshCw,
        keywords: [
          'enumerator',
          'dovetailing',
          'church turing thesis',
          'lexicographic order',
          'ram machine',
          'lambda calculus',
          'recursively enumerable',
        ],
        content: (
          <>
            <H2>Enumerators, Dovetailing &amp; The Church–Turing Thesis</H2>
            <P>
              Computability can be characterized either by <Strong>recognition</Strong> (testing membership) or <Strong>generation</Strong> (enumerating elements).
            </P>

            <H3>1. Turing Enumerators</H3>
            <P>
              An <Strong>Enumerator</Strong> is a Turing Machine with a printer tape that outputs a stream of strings.
            </P>
            <Callout type="theorem" title="Equivalence Theorems">
              • <Strong>Theorem 1</Strong>: A language <C>L</C> is <Strong>Recursively Enumerable (Turing-Recognizable)</Strong> if and only if there exists an enumerator that prints <C>L</C>.
              <br />
              • <Strong>Theorem 2</Strong>: A language <C>L</C> is <Strong>Decidable (Recursive)</Strong> if and only if there exists an enumerator that prints <C>L</C> in <Strong>lexicographic order</Strong> (strings ordered by length, then alphabetically).
            </Callout>

            <H3>2. The Dovetailing Technique</H3>
            <P>
              When simulating infinitely many search branches (or evaluating multiple TMs that may loop forever), running them sequentially causes infinite hangs. <Strong>Dovetailing</Strong> interleaves computation steps across all tasks:
            </P>
            <CodeBlock
              code={`Dovetailing Schedule (Step Budget s = 1, 2, 3, ...):
  For step budget s = 1, 2, 3, ...:
      For each pair (i, j) where i + j <= s:
          Simulate Machine M_i on input w_j for s steps.
          If M_i accepts w_j, output <M_i, w_j>.`}
            />
            <P>
              Guarantees that if any pair <C>(M_i, w_j)</C> halts in <C>K</C> steps, it will be discovered in finite time when <C>s = i + j + K</C>.
            </P>

            <H3>3. The Church–Turing Thesis</H3>
            <P>
              All reasonable computational models (Turing Machines, $\lambda$-Calculus, RAM Machines, Register Machines, Post Tag Systems, $\mu$-Recursive Functions) define the <Strong>exact same boundary of computable functions</Strong>.
            </P>
          </>
        ),
      },

      {
        id: 'decidability-undecidability',
        title: 'Decidability, Undecidability & Canonical Limits',
        category: 'TOC: Computability & TMs',
        icon: Activity,
        keywords: [
          'decidability',
          'undecidability',
          'diagonalization',
          'halting problem',
          'universal tm',
          'rices theorem',
          'pcp',
        ],
        content: (
          <>
            <H2>Decidability, Undecidability &amp; Semantic Limits</H2>
            <P>
              Computability theory classifies mathematical problems into decidable (solvable by an algorithm that always halts) and undecidable.
            </P>

            <H3>1. Diagonalization Language ($L_d$) — Non-RE Proof</H3>
            <MathBox formula="L_d = &#123; w_i | w_i ∉ L(M_i) &#125;" label="Diagonalization Language" />
            <Callout type="proof" title="Proof that L_d is Non-RE">
              Suppose TM <C>M_k</C> recognizes <C>L_d</C>. Test <C>w_k ∈ L(M_k)</C>:
              <br />
              • If <C>w_k ∈ L(M_k) ⇒ w_k ∉ L_d ⇒ w_k ∉ L(M_k)</C> (Contradiction!)
              <br />
              • If <C>w_k ∉ L(M_k) ⇒ w_k ∈ L_d ⇒ w_k ∈ L(M_k)</C> (Contradiction!)
              <br />
              Hence no such <C>M_k</C> exists; <C>L_d</C> is provably <Strong>Not Recursively Enumerable</Strong>.
            </Callout>

            <H3>2. The Halting Problem ($H_M$) &amp; Universal Language ($L_u$)</H3>
            <P>
              • <C>L_u = &#123; ⟨M, w⟩ | M accepts w &#125;</C> (RE, but Undecidable).
              <br />
              • <C>H_M = &#123; ⟨M, w⟩ | M halts on w &#125;</C> (RE, but Undecidable).
            </P>

            <H3>3. Rice's Theorem</H3>
            <Callout type="theorem" title="Rice's Theorem">
              Any <Strong>nontrivial semantic property</Strong> of the languages accepted by Turing Machines is <Strong>undecidable</Strong>.
              <br />
              • Nontrivial: Holds for some, but not all, RE languages.
              <br />
              • Semantic: Depends only on the language recognized (<C>L(M_1) = L(M_2) \implies P(M_1) = P(M_2)</C>).
            </Callout>
          </>
        ),
      },

      {
        id: 'reductions-proof-techniques',
        title: 'Reductions & Formal Proof Techniques',
        category: 'TOC: Computability & TMs',
        icon: Workflow,
        keywords: [
          'reductions',
          'mapping reduction',
          'polynomial reduction',
          'turing reduction',
          'direction of reduction',
          'undecidability proof',
        ],
        content: (
          <>
            <H2>Reductions &amp; Formal Proof Techniques</H2>
            <P>
              Reduction is the primary mathematical technique for transferring computational difficulty between problems.
            </P>

            <H3>1. Mapping Reduction ($A \le_m B$)</H3>
            <P>
              A language <C>A</C> is mapping reducible to <C>B</C> (<C>A \le_m B</C>) if there exists a computable function <C>f: Σ* \to Σ*</C> such that:
            </P>
            <MathBox formula="w ∈ A \iff f(w) ∈ B" label="Mapping Reduction Condition" />

            <Callout type="warning" title="Crucial Rules on Direction of Reduction">
              If <C>A \le_m B</C>:
              <br />
              • <Strong>Decidability flows backwards</Strong>: If <C>B</C> is Decidable $\implies A$ is Decidable.
              <br />
              • <Strong>Undecidability flows forwards</Strong>: If <C>A</C> is Undecidable $\implies B$ is Undecidable.
              <br />
              • <Strong>Common Error</Strong>: Reducing an unknown problem <C>B</C> to a known problem <C>A</C> proves NOTHING about <C>B</C>! You must always reduce <Strong>KNOWN $\le_m$ UNKNOWN</Strong>.
            </Callout>

            <H3>2. Step-by-Step Recipe: Proving Undecidability of $L_X$</H3>
            <CodeBlock
              code={`Step 1: Choose a known undecidable problem (usually A_TM or HALT_TM).
Step 2: Define reduction function f(⟨M, w⟩) that constructs a new machine M'.
Step 3: Program M' such that M' has the property of L_X iff M accepts w.
Step 4: Prove bidirectional correctness:
        (a) If ⟨M, w⟩ ∈ A_TM  ==>  ⟨M'⟩ ∈ L_X
        (b) If ⟨M, w⟩ ∉ A_TM  ==>  ⟨M'⟩ ∉ L_X
Step 5: Conclude that since A_TM is undecidable, L_X is undecidable.`}
            />
          </>
        ),
      },

      // =========================================================================
      // PART IV: TOC - COMPLEXITY THEORY
      // =========================================================================
      {
        id: 'complexity-theory',
        title: 'Complexity Theory & NP-Completeness',
        category: 'TOC: Complexity Theory',
        icon: Hash,
        keywords: [
          'complexity',
          'p',
          'np',
          'np-complete',
          'cook levin',
          '3-sat',
          'clique',
          'vertex cover',
          'pspace',
          'savitch',
          'reductions',
        ],
        content: (
          <>
            <H2>Complexity Theory &amp; Intractability</H2>
            <P>
              Complexity theory classifies decidable problems by the asymptotic time and memory space required to solve them.
            </P>

            <H3>Complexity Hierarchy &amp; Inclusions</H3>
            <MathBox formula="P ⊆ NP ⊆ PSPACE = NPSPACE ⊆ EXPTIME" />

            <Table
              headers={['Class', 'Definition / Machine Model', 'Canonical Benchmark Problems']}
              rows={[
                ['P', 'Decidable in O(n^k) deterministic time', 'Shortest Path (Dijkstra), 2-SAT, CFG CYK Parsing, Linear Programming'],
                ['NP', 'Verifiable in O(n^k) deterministic time (or O(n^k) NTM)', '3-SAT, Traveling Salesperson, Graph Coloring, Knapsack, Subset Sum'],
                ['co-NP', 'Complement of languages in NP', 'TAUTOLOGY (Is boolean formula valid under all assignments?)'],
                ['NP-Complete', 'In NP and every NP problem poly-time reduces to it', 'Cook-Levin SAT, 3-SAT, Clique, Vertex Cover, Hamiltonian Cycle'],
                ['PSPACE', 'Decidable in O(n^k) tape space (Savitch: PSPACE = NPSPACE)', 'Quantified Boolean Formulas (QBF), Generalized Geography, Game Strategies'],
              ]}
            />

            <H3>Worked NP-Completeness Reduction: 3-SAT $\le_p$ Vertex Cover</H3>
            <Callout type="proof" title="3-SAT to Vertex Cover Reduction">
              Given 3-CNF formula with <C>m</C> clauses and <C>n</C> variables:
              <br />
              1. For each variable <C>x_i</C>, construct a 2-vertex "variable gadget" connected by edge <C>(x_i, \bar&#123;x&#125;_i)</C>.
              <br />
              2. For each clause <C>(l_1 \lor l_2 \lor l_3)</C>, construct a 3-vertex "clause triangle".
              <br />
              3. Connect each clause literal node to its corresponding variable gadget node.
              <br />
              4. Set vertex cover target <C>k = n + 2m</C>.
              <br />
              5. The formula is satisfiable <Strong>if and only if</Strong> the graph has a vertex cover of size <C>k</C>.
            </Callout>
          </>
        ),
      },

      // =========================================================================
      // PART V: COMPILER DESIGN - FRONT END & PARSING
      // =========================================================================
      {
        id: 'cd-lexical-analysis',
        title: '1. Lexical Analysis & Scanner Design',
        category: 'Compiler: Front-End',
        icon: Code,
        keywords: [
          'lexical analysis',
          'scanner',
          'pipeline',
          'symbol table',
          'tokens',
          'lexemes',
          'buffering',
          'maximal munch',
          'rollback',
          'flex',
        ],
        content: (
          <>
            <H2>Lexical Analysis &amp; Scanner Architecture</H2>
            <P>
              The scanner converts raw source code characters into classified tokens while managing symbol tables and buffers.
            </P>

            <H3>1. The Compiler Pipeline Architecture</H3>
            <CodeBlock
              code={`Source Code ──► [ Scanner ] ──► [ Parser ] ──► [ Semantic Analyzer ] ──► [ ICG ] ──► [ Optimizer ] ──► [ Target Code Gen ] ──► Target Code
                    │              │                   │                 │             │                  │
                    └──────────────┴───────────────────┴─────────────────┴─────────────┴──────────────────┴──► [ Unified Symbol Table ]`}
            />

            <H3>2. Input Buffering with Buffer Pairs &amp; Sentinels</H3>
            <CodeBlock
              code={`       First Buffer (N=4096 bytes)         Second Buffer (N=4096 bytes)
     ┌─────────────────────────────────┐┌─────────────────────────────────┐
     │ p │ o │ s │ i │ t │ i │ o │ n │*││ r │ a │ t │ e │   │ 6 │ 0 │ ; │eof│
     └─────────────────────────────────┘└─────────────────────────────────┘
       ▲                             ▲
  lexemeBegin                     forward`}
            />
            <P>
              Sentinels (<C>EOF</C>) eliminate double-boundary checking on every character read, boosting scanner throughput.
            </P>

            <H3>3. Longest Match (Maximal Munch) &amp; Rollback</H3>
            <P>
              • <Strong>Maximal Munch</Strong>: Scanner consumes characters until hitting a dead state, then rolls back to the <Strong>last accepting state</Strong>.
              <br />
              • <Strong>First-Match Priority</Strong>: Keyword rules precede generic identifier regexes in scanner specification files.
            </P>
          </>
        ),
      },

      {
        id: 'cd-top-down-parsing',
        title: '2. Top-Down Parsing, FIRST/FOLLOW & LL(1)',
        category: 'Compiler: Parsing',
        icon: GitFork,
        keywords: [
          'top-down parsing',
          'll1',
          'first',
          'follow',
          'predictive parsing table',
          'pairwise disjointness',
          'left recursion',
          'left factoring',
        ],
        content: (
          <>
            <H2>Top-Down Parsing &amp; Predictive LL(1) Analyzers</H2>
            <P>
              Top-down parsing constructs the parse tree starting at the root start symbol <C>S</C> and produces a
              <Strong>Leftmost Derivation</Strong>.
            </P>

            <H3>1. Algorithmic FIRST and FOLLOW Calculations</H3>
            <Callout type="theorem" title="Rules for FIRST(α) and FOLLOW(A)">
              <Strong>FIRST(α)</Strong>:
              <br />
              1. If <C>X</C> is terminal, <C>FIRST(X) = &#123;X&#125;</C>.
              <br />
              2. If <C>X → ε</C>, add <C>ε</C> to <C>FIRST(X)</C>.
              <br />
              3. For <C>X → Y_1 Y_2 ... Y_k</C>, add <C>FIRST(Y_i) \ &#123;ε&#125;</C> to <C>FIRST(X)</C> if all preceding <C>Y_1...Y_(i-1)</C> are nullable. Add <C>ε</C> iff all <C>Y_j</C> are nullable.
              <br />
              <br />
              <Strong>FOLLOW(A)</Strong>:
              <br />
              1. Add <C>$</C> to <C>FOLLOW(S)</C>.
              <br />
              2. For <C>A → α B β</C>, add <C>FIRST(β) \ &#123;ε&#125;</C> to <C>FOLLOW(B)</C>.
              <br />
              3. For <C>A → α B</C> or <C>A → α B β</C> where <C>ε ∈ FIRST(β)</C>, add <C>FOLLOW(A)</C> to <C>FOLLOW(B)</C>.
            </Callout>

            <H3>2. Complete LL(1) Parsing Table &amp; Trace Example</H3>
            <P>Grammar after left recursion elimination:</P>
            <CodeBlock
              code={`E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id`}
            />
            <Table
              headers={['Nonterminal', 'id', '+', '*', '(', ')', '$']}
              rows={[
                ['E', 'E -> T E\'', '', '', 'E -> T E\'', '', ''],
                ['E\'', '', 'E\' -> + T E\'', '', '', 'E\' -> ε', 'E\' -> ε'],
                ['T', 'T -> F T\'', '', '', 'T -> F T\'', '', ''],
                ['T\'', '', 'T\' -> ε', 'T\' -> * F T\'', '', 'T\' -> ε', 'T\' -> ε'],
                ['F', 'F -> id', '', '', 'F -> ( E )', '', ''],
              ]}
            />
          </>
        ),
      },

      {
        id: 'cd-bottom-up-opg',
        title: '3. Bottom-Up & Operator-Precedence (OPG)',
        category: 'Compiler: Parsing',
        icon: FastForward,
        keywords: ['bottom-up', 'shift-reduce', 'handles', 'operator precedence', 'opg', 'precedence functions'],
        content: (
          <>
            <H2>Bottom-Up Parsing &amp; Operator-Precedence (OPG)</H2>
            <P>
              Bottom-up parsers construct derivations in reverse (rightmost derivation in reverse) by identifying and reducing
              <Strong>handles</Strong>.
            </P>

            <H3>1. Shift-Reduce Operations</H3>
            <P>
              • <Strong>Shift</Strong>: Push current input token to stack.
              <br />
              • <Strong>Reduce</Strong>: Match body of production rule on stack and replace with head nonterminal.
              <br />
              • <Strong>Accept / Error</Strong>: Terminate parsing successfully or invoke error recovery.
            </P>

            <H3>2. Operator-Precedence Parsing (OPG)</H3>
            <Callout type="theorem" title="Operator Grammar Constraints">
              1. No ε-productions (<C>A → ε ∉ P</C>).
              <br />
              2. No two adjacent nonterminals on RHS (no <C>A → α B C β</C>).
            </Callout>
            <P>
              • Relations: <C>a ⋖ b</C> (yields precedence / shift), <C>a ≐ b</C> (same handle), <C>a ⋗ b</C> (takes precedence / reduce).
              <br />
              • Precedence functions <C>f(x)</C> and <C>g(x)</C> compress <C>O(n^2)</C> matrices into <C>O(n)</C> space.
            </P>
          </>
        ),
      },

      {
        id: 'cd-lr-parsing-depth',
        title: '4. The LR Family in Depth: LR(0), SLR, LALR, CLR',
        category: 'Compiler: Parsing',
        icon: Binary,
        keywords: [
          'lr0',
          'slr1',
          'lalr1',
          'clr1',
          'canonical collection',
          'action table',
          'goto table',
          'worked trace',
          'shift-reduce conflict',
          'reduce-reduce conflict',
        ],
        content: (
          <>
            <H2>The LR Parsing Family: Comprehensive Theory &amp; Worked Trace</H2>
            <P>
              <Strong>LR(k)</Strong> parsers (Left-to-right scan, Rightmost derivation in reverse, <C>k</C> lookaheads) represent
              the industry standard for programming language compilers.
            </P>

            <H3>1. LR Parser Hierarchy &amp; State Counts</H3>
            <MathBox formula="LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1)" label="Language Recognition Power" />
            <MathBox formula="States(LR(0)) = States(SLR(1)) = States(LALR(1)) \le States(CLR(1))" label="State Space" />

            <H3>2. LR(0) Items, Closure &amp; Canonical Collection</H3>
            <P>Consider the augmented expression grammar:</P>
            <CodeBlock
              code={`(0) E' -> E
(1) E  -> E + T
(2) E  -> T
(3) T  -> T * F
(4) T  -> F
(5) F  -> ( E )
(6) F  -> id`}
            />

            <H3>3. Full Step-by-Step Parse Trace for: id + id * id$</H3>
            <CodeBlock
              code={`Stack                Input             Action
───────────────────────────────────────────────────────────────────────────
$ 0                  id + id * id $    Shift 5
$ 0 id 5               + id * id $    Reduce F -> id (r6), Goto(0, F) = 3
$ 0 F 3                + id * id $    Reduce T -> F (r4), Goto(0, T) = 2
$ 0 T 2                + id * id $    Reduce E -> T (r2), Goto(0, E) = 1
$ 0 E 1                + id * id $    Shift 6 (on '+')
$ 0 E 1 + 6              id * id $    Shift 5
$ 0 E 1 + 6 id 5           * id $    Reduce F -> id (r6), Goto(6, F) = 3
$ 0 E 1 + 6 F 3            * id $    Reduce T -> F (r4), Goto(6, T) = 9
$ 0 E 1 + 6 T 9            * id $    Shift 7 (on '*')
$ 0 E 1 + 6 T 9 * 7          id $    Shift 5
$ 0 E 1 + 6 T 9 * 7 id 5        $    Reduce F -> id (r6), Goto(7, F) = 10
$ 0 E 1 + 6 T 9 * 7 F 10        $    Reduce T -> T * F (r3), Goto(6, T) = 9
$ 0 E 1 + 6 T 9                 $    Reduce E -> E + T (r1), Goto(0, E) = 1
$ 0 E 1                         $    Accept! (on '$')`}
            />

            <H3>4. LALR(1) Conflict Theorems</H3>
            <Callout type="theorem" title="Shift-Reduce Conflict Invariance">
              Merging CLR(1) states with identical LR(0) cores <Strong>never introduces new Shift-Reduce conflicts</Strong>.
            </Callout>
            <Callout type="warning" title="Reduce-Reduce Conflict Vulnerability">
              Merging CLR(1) states with identical cores <Strong>can introduce new Reduce-Reduce conflicts</Strong> if lookahead sets overlap upon union.
            </Callout>
          </>
        ),
      },

      {
        id: 'cd-semantic-analysis',
        title: '5. Semantic Analysis, Symbol Tables & Type Systems',
        category: 'Compiler: Semantics',
        icon: FileText,
        keywords: [
          'semantic analysis',
          'symbol table',
          'scope',
          'lexical scope',
          'dynamic scope',
          'type system',
          'type equivalence',
          'structural equivalence',
          'name equivalence',
          'coercion',
          'type inference',
        ],
        content: (
          <>
            <H2>Semantic Analysis, Symbol Tables &amp; Type Systems</H2>
            <P>
              Semantic analysis verifies that the parse tree obeys language semantic rules (types, scopes, declarations).
            </P>

            <H3>1. Symbol Table Architectures</H3>
            <P>
              • <Strong>Chained Hash Table with Scope Stack</Strong>: Entering a block pushes a new local hashtable; exiting pops it.
              <br />
              • <Strong>Static vs. Dynamic Scoping</Strong>:
              <br />
              &nbsp;&nbsp;• <Strong>Static (Lexical) Scope</Strong>: Names resolve according to the textual nesting of code at compile time.
              <br />
              &nbsp;&nbsp;• <Strong>Dynamic Scope</Strong>: Names resolve according to the runtime call stack of executing functions.
            </P>

            <H3>2. Type Systems &amp; Type Equivalence</H3>
            <Table
              headers={['Concept', 'Formal Definition', 'Compiler Behavior']}
              rows={[
                ['Name Equivalence', 'Types are equivalent iff they have the exact same declared type name.', 'type T1 = int; type T2 = int; T1 and T2 are distinct types.'],
                ['Structural Equivalence', 'Types are equivalent iff they have identical internal field structures.', 'Records {int a; float b} match across different typedef names.'],
                ['Type Coercion', 'Implicit compiler-inserted conversion of values.', 'int + float automatically coerces int to float.'],
                ['Type Inference', 'Reconstruction of types without explicit annotations (Hindley-Milner).', 'val f = fn x => x + 1 infers f: int -> int.'],
              ]}
            />
          </>
        ),
      },

      {
        id: 'cd-syntax-directed-translation',
        title: '6. Syntax-Directed Translation (SDD & SDT)',
        category: 'Compiler: Semantics',
        icon: Workflow,
        keywords: [
          'sdd',
          'sdt',
          'synthesized attributes',
          'inherited attributes',
          's-attributed',
          'l-attributed',
          'dependency graphs',
        ],
        content: (
          <>
            <H2>Syntax-Directed Translation (SDD &amp; SDT)</H2>
            <P>
              Augments context-free grammars with semantic attributes and executable actions.
            </P>

            <H3>1. S-Attributed vs. L-Attributed SDD Comparison</H3>
            <Table
              headers={['Feature', 'S-Attributed SDT', 'L-Attributed SDT']}
              rows={[
                ['Attribute Types', 'Synthesized attributes strictly', 'Synthesized and Inherited attributes'],
                ['Dependency Flow', 'Bottom-up (children to parent node)', 'Left-to-right (parent and left siblings only)'],
                ['Action Placement', 'At the very end of production RHS', 'Anywhere within production RHS'],
                ['Evaluation Engine', 'Bottom-up LR parser on reduction', 'Top-down LL predictive parser (depth-first)'],
              ]}
            />
            <P>
              <Strong>Theorem</Strong>: Every S-attributed SDD is an L-attributed SDD, but not vice versa.
            </P>
          </>
        ),
      },

      // =========================================================================
      // PART VI: COMPILER DESIGN - IR & SSA FORM
      // =========================================================================
      {
        id: 'cd-intermediate-code',
        title: '7. Intermediate Code (AST, DAG, TAC & Backpatching)',
        category: 'Compiler: Intermediate Code',
        icon: Terminal,
        keywords: [
          'intermediate code',
          'tac',
          'three address code',
          'ast',
          'dag',
          'quadruples',
          'triples',
          'indirect triples',
          'short circuit',
          'backpatching',
        ],
        content: (
          <>
            <H2>Intermediate Code Generation (ICG)</H2>
            <P>
              Intermediate representations (IR) provide machine-independent abstractions for optimization and retargeting.
            </P>

            <H3>1. AST vs. Directed Acyclic Graph (DAG)</H3>
            <CodeBlock
              code={`        AST for: a + a * (b - c)                  DAG for: a + a * (b - c)
                  +                                         +
                 / \\                                       / \\
                a   *                                     ┌───►a  *
                   / \\                                    │     / \\
                  a   -                                   └────┼─── -
                     / \\                                       │  / \\
                    b   c                                      b     c`}
            />

            <H3>2. Three-Address Code (TAC) Representations</H3>
            <Table
              headers={['Representation', 'Structure', 'Properties']}
              rows={[
                ['Quadruples', 'op, arg1, arg2, result', 'Explicit result variable; easy to optimize and reorder.'],
                ['Triples', 'op, arg1, arg2', 'Result referenced by array index; compact, but code motion requires reference updates.'],
                ['Indirect Triples', 'Pointers -> Triples table', 'Array of pointers to triples; reordering pointer array reorders code without touching triples.'],
              ]}
            />

            <H3>3. One-Pass Backpatching</H3>
            <P>
              • <C>makelist(i)</C>: Creates new list containing jump instruction index <C>i</C>.
              <br />
              • <C>merge(p1, p2)</C>: Concatenates two jump target lists.
              <br />
              • <C>backpatch(p, target)</C>: Inserts resolved jump target into all instructions in list <C>p</C>.
            </P>
          </>
        ),
      },

      {
        id: 'cd-ssa-form',
        title: '8. Static Single Assignment (SSA Form & Dominators)',
        category: 'Compiler: Intermediate Code',
        icon: Split,
        keywords: [
          'ssa',
          'static single assignment',
          'phi function',
          'dominators',
          'dominance frontier',
          'idom',
          'cytron',
          'sccp',
          'gvn',
        ],
        content: (
          <>
            <H2>Static Single Assignment (SSA Form) &amp; Dominators</H2>
            <P>
              <Strong>Static Single Assignment (SSA)</Strong> is the standard intermediate representation used in modern
              production compilers (LLVM, GCC). In SSA form, <Strong>every variable is assigned exactly once</Strong>,
              and every variable use is dominated by its unique definition.
            </P>

            <H3>1. SSA Transformation &amp; $\phi$-Functions</H3>
            <P>Linear code renaming:</P>
            <CodeBlock
              code={`Non-SSA Form:
  x = a + b
  x = x * c

SSA Form:
  x_1 = a_0 + b_0
  x_2 = x_1 * c_0`}
            />
            <P>At control-flow merge points, SSA introduces <Strong>$\phi$-functions</Strong>:</P>
            <CodeBlock
              code={`if (condition) {
    x_1 = 10;
} else {
    x_2 = 20;
}
x_3 = φ(x_1, x_2);  // Selects x_1 if coming from then-branch, x_2 if from else-branch`}
            />

            <H3>2. Dominator Trees &amp; Dominance Frontier</H3>
            <P>
              • <Strong>Dominance (d dom n)</Strong>: Node <C>d</C> dominates node <C>n</C> if every execution path from entry to <C>n</C> must pass through <C>d</C>.
              <br />
              • <Strong>Immediate Dominator ($idom(n)$)</Strong>: The unique closest strict dominator of <C>n</C>.
              <br />
              • <Strong>Dominance Frontier ($DF(X)$)</Strong>: The set of nodes <C>Y</C> such that <C>X</C> dominates a predecessor of <C>Y</C>, but does <Strong>not strictly dominate</Strong> <C>Y</C> itself.
            </P>
            <Callout type="theorem" title="Optimal φ-Placement Criterion">
              If a basic block <C>B</C> contains a definition of variable <C>x</C>, a $\phi$-function for <C>x</C> must be inserted in the <Strong>Iterated Dominance Frontier</Strong> <C>IDF(B)</C>.
            </Callout>

            <H3>3. SSA-Based Optimization Highlights</H3>
            <P>
              • <Strong>Sparse Conditional Constant Propagation (SCCP)</Strong>: Simultaneously evaluates constant expressions and dead branches in <C>O(|E|)</C> time.
              <br />
              • <Strong>Global Value Numbering (GVN)</Strong>: Assigns algebraic equivalence classes directly to SSA names across entire functions.
            </P>
          </>
        ),
      },

      // =========================================================================
      // PART VII: COMPILER DESIGN - OPTIMIZATION & BACKEND
      // =========================================================================
      {
        id: 'cd-code-optimization',
        title: '9. Code Optimization & Data-Flow Analysis',
        category: 'Compiler: Optimization',
        icon: Database,
        keywords: [
          'code optimization',
          'basic blocks',
          'leaders',
          'data-flow analysis',
          'liveness',
          'available expressions',
          'reaching definitions',
          'fixed point',
        ],
        content: (
          <>
            <H2>Code Optimization &amp; Data-Flow Frameworks</H2>
            <P>
              Optimization transforms code into a semantically equivalent program that executes faster and consumes less memory.
            </P>

            <H3>1. Basic Block Leaders (Algorithm 8.5)</H3>
            <P>
              1. First instruction is a Leader.
              <br />
              2. Target of any jump is a Leader.
              <br />
              3. Instruction immediately following any jump is a Leader.
            </P>

            <H3>2. Data-Flow Analysis Frameworks $(D, V, \wedge, F)$</H3>
            <Table
              headers={['Analysis', 'Direction', 'Domain', 'Transfer Equation', 'Meet Operator (Confluence)']}
              rows={[
                [
                  'Liveness Analysis',
                  'Backwards',
                  'Variables',
                  'IN[B] = use_B ∪ (OUT[B] \\ def_B)',
                  'OUT[B] = ⋃ (S ∈ succ(B)) IN[S] (Union)',
                ],
                [
                  'Available Expressions',
                  'Forwards',
                  'Expressions',
                  'OUT[B] = e_gen_B ∪ (IN[B] \\ e_kill_B)',
                  'IN[B] = ⋂ (P ∈ pred(B)) OUT[P] (Intersection)',
                ],
                [
                  'Reaching Definitions',
                  'Forwards',
                  'Definitions',
                  'OUT[B] = gen_B ∪ (IN[B] \\ kill_B)',
                  'IN[B] = ⋃ (P ∈ pred(B)) OUT[P] (Union)',
                ],
              ]}
            />
          </>
        ),
      },

      {
        id: 'cd-loop-advanced-opt',
        title: '10. Loop Optimization & Advanced Transforms',
        category: 'Compiler: Optimization',
        icon: Zap,
        keywords: [
          'loop optimization',
          'licm',
          'loop invariant code motion',
          'induction variables',
          'strength reduction',
          'loop unrolling',
          'loop fusion',
          'pre',
          'partial redundancy elimination',
        ],
        content: (
          <>
            <H2>Loop Optimization &amp; Advanced Transforms</H2>
            <P>
              Because programs spend ~90% of execution time in ~10% of code (inner loops), loop optimizations yield the greatest performance gains.
            </P>

            <H3>1. Loop-Invariant Code Motion (LICM)</H3>
            <P>
              Hoists statements whose operands do not change during loop iterations out of the loop body into a loop pre-header block.
            </P>

            <H3>2. Induction Variable Elimination &amp; Strength Reduction</H3>
            <P>
              Replaces expensive multiplication operations inside loops with cheap addition operations:
            </P>
            <CodeBlock
              code={`Before:
  for (i = 0; i < 100; i++) {
      t1 = i * 4;       // Multiplication in loop
      a[t1] = 0;
  }

After Strength Reduction:
  t1 = 0;
  for (i = 0; i < 100; i++) {
      a[t1] = 0;
      t1 = t1 + 4;     // Cheap addition replaces multiplication
  }`}
            />

            <H3>3. Loop Transformations</H3>
            <P>
              • <Strong>Loop Unrolling</Strong>: Duplicates loop body <C>k</C> times to reduce branch test overhead and enable instruction parallelism.
              <br />
              • <Strong>Loop Fusion</Strong>: Merges adjacent loops over the same bounds to increase cache locality.
              <br />
              • <Strong>Loop Interchange</Strong>: Swaps nested loop order (e.g., <C>i, j \to j, i</C>) to achieve stride-1 sequential memory access matching cache line layout.
            </P>
          </>
        ),
      },

      {
        id: 'cd-target-codegen',
        title: '11. Target Code Generation & Scheduling',
        category: 'Compiler: Backend',
        icon: Terminal,
        keywords: [
          'code generation',
          'instruction selection',
          'tree covering',
          'maximal munch',
          'instruction scheduling',
          'pipeline hazards',
          'dependency dag',
        ],
        content: (
          <>
            <H2>Target Code Generation &amp; Instruction Scheduling</H2>
            <P>
              The compiler backend maps machine-independent IR to target machine instructions while maximizing pipeline throughput.
            </P>

            <H3>1. Instruction Selection: Tree-Covering with Maximal Munch</H3>
            <P>
              The IR is represented as expression trees. The code generator matches subtrees against target machine instruction tile patterns, choosing largest tiles to minimize total instruction count.
            </P>

            <H3>2. Instruction Scheduling &amp; Pipeline Hazards</H3>
            <P>
              • <Strong>Dependency DAG</Strong>: Nodes represent instructions; edges represent RAW (Read-After-Write), WAR, or WAW hazards with latency weights.
              <br />
              • <Strong>Critical Path Scheduling</Strong>: Prioritizes scheduling instructions along the longest latency path to avoid CPU pipeline stalls.
            </P>
          </>
        ),
      },

      {
        id: 'cd-register-allocation',
        title: '12. Register Allocation (Graph Coloring)',
        category: 'Compiler: Backend',
        icon: Cpu,
        keywords: [
          'register allocation',
          'graph coloring',
          'chaitin',
          'briggs',
          'interference graph',
          'live ranges',
          'kempe',
          'spill',
          'linear scan',
        ],
        content: (
          <>
            <H2>Register Allocation via Graph Coloring</H2>
            <P>
              Register allocation assigns an unbounded number of IR temporary variables to a finite set of <C>K</C> physical CPU registers.
            </P>

            <H3>1. Register Interference Graph (RIG)</H3>
            <P>
              • <Strong>Nodes</Strong>: Variable live ranges.
              <br />
              • <Strong>Edges</Strong>: An edge connects two variables if their live ranges overlap at any program point (they cannot share the same register).
            </P>

            <H3>2. Chaitin–Briggs Graph Coloring Heuristic</H3>
            <CodeBlock
              code={`1. SIMPLIFY: Find node v with degree < K. Push v to stack, remove v from RIG.
2. SPILL: If all nodes have degree >= K, pick a spill candidate based on cost, mark for memory spill.
3. SELECT: Pop nodes from stack one by one, assign a color (register) distinct from colored neighbors.
4. If a spilled node cannot be colored, insert memory load/store instructions and repeat.`}
            />
            <P>
              • <Strong>Linear Scan Allocation</Strong>: Fast <C>O(n \log n)</C> interval scan alternative used in JIT compilers (V8, JVM HotSpot).
            </P>
          </>
        ),
      },

      {
        id: 'cd-runtime-gc',
        title: '13. Runtime Environments & Garbage Collection',
        category: 'Compiler: Runtime',
        icon: Box,
        keywords: [
          'runtime environment',
          'activation record',
          'stack frame',
          'garbage collection',
          'reference counting',
          'mark and sweep',
          'copying gc',
          'generational gc',
          'card table',
        ],
        content: (
          <>
            <H2>Runtime Environments &amp; Garbage Collection</H2>
            <P>
              Runtime systems manage the physical memory layout, function stack linkages, and automated dynamic memory recycling.
            </P>

            <H3>1. Runtime Memory Layout &amp; Activation Records</H3>
            <CodeBlock
              code={`       Low Memory   ┌─────────────────────────────────────┐
                    │               Code                  │  ──► Static, read-only
                    ├─────────────────────────────────────┤
                    │              Static                 │  ──► Global variables, constants
                    ├─────────────────────────────────────┤
                    │               Heap                  │  ──► Grows downward (malloc/new)
                    │                  │                  │
                    │                  ▼                  │
                    │                  ▲                  │
                    │                  │                  │
                    │               Stack                 │  ──► Grows upward (function frames)
       High Memory  └─────────────────────────────────────┘`}
            />

            <H3>2. Modern Garbage Collection Algorithms</H3>
            <Table
              headers={['GC Algorithm', 'Mechanism', 'Advantages', 'Disadvantages']}
              rows={[
                ['Reference Counting', 'Each object tracks incoming reference count; freed when count == 0.', 'Immediate recycling; no stop-the-world pauses.', 'Cannot collect cyclical pointer structures; reference count overhead.'],
                ['Mark-and-Sweep', 'Trace reachability from root set; mark live objects; sweep unreachable to free-list.', 'Reclaims cyclic graphs; zero memory overhead on dead objects.', 'Causes memory fragmentation; stop-the-world pause.'],
                ['Mark-and-Compact', 'Mark live objects; slide live objects to contiguous low memory; update pointers.', 'Eliminates fragmentation completely.', 'High execution overhead (multi-pass pointer adjustment).'],
                ['Copying GC (Cheney)', 'Split heap into From-Space and To-Space. Copy live objects contiguously to To-Space.', 'Allocation is bump-pointer O(1); automatic compaction.', 'Halves usable memory capacity.'],
                ['Generational GC', 'Partition heap by age (Eden, Young, Old). Minor GC collects Young; Major GC collects Old.', 'Exploits Weak Generational Hypothesis (most objects die young).', 'Requires write-barriers and card tables for cross-generational pointers.'],
              ]}
            />
          </>
        ),
      },

      {
        id: 'cd-compiler-correctness',
        title: '14. Compiler Correctness, UB & Verification',
        category: 'Compiler: Verification',
        icon: ShieldAlert,
        keywords: [
          'compiler correctness',
          'semantic preservation',
          'translation validation',
          'compcert',
          'undefined behavior',
          'ub',
          'floating point',
        ],
        content: (
          <>
            <H2>Compiler Correctness, Undefined Behavior &amp; Verification</H2>
            <P>
              A compiler is correct if the executable semantics of the compiled target program match the formal source semantics.
            </P>

            <H3>1. Semantic Preservation &amp; Formally Verified Compilers</H3>
            <P>
              • <Strong>Semantic Preservation</Strong>: <C>\text&#123;Sem&#125;(\text&#123;Target&#125;) \equiv \text&#123;Sem&#125;(\text&#123;Source&#125;)</C>.
              <br />
              • <Strong>Formally Verified Compilers (CompCert)</Strong>: Written in Coq with machine-checked mathematical proofs that no compiler bugs or miscompilations can ever occur.
            </P>

            <H3>2. Undefined Behavior (UB) &amp; Optimization Traps</H3>
            <P>
              Optimizers assume UB cannot happen, enabling transformations like dead branch elimination:
              <br />
              • Signed Integer Overflow (<C>x + 1 &gt; x</C> simplified to <C>true</C>).
              <br />
              • Null Pointer Dereference assumptions hoisting reads before null checks.
              <br />
              • Floating-Point Non-Associativity: <C>(a + b) + c \neq a + (b + c)</C> in IEEE-754 due to rounding, preventing reassociation without fast-math flags.
            </P>
          </>
        ),
      },

      // =========================================================================
      // PART VIII: GRAND SYNTHESIS - TOC <-> COMPILER BRIDGE
      // =========================================================================
      {
        id: 'toc-cd-bridge',
        title: '15. The Grand Synthesis: TOC ↔ Compiler Design Bridge',
        category: 'TOC ↔ Compiler Synthesis',
        icon: Sparkles,
        keywords: [
          'synthesis',
          'bridge',
          'automata to compiler',
          'theory to practice',
          'grammars to parsers',
          'turing to optimization',
        ],
        content: (
          <>
            <H2>The Grand Synthesis: Why Theory of Computation Matters to Compilers</H2>
            <P>
              Compiler engineering is the direct industrial realization of formal automata theory. Every compiler phase
              corresponds to an exact stratum of the Chomsky Hierarchy.
            </P>

            <H3>The Theoretical Correspondence Matrix</H3>
            <Table
              headers={['Theory of Computation Concept', 'Compiler Engineering Implementation', 'Industrial Tool / Component']}
              rows={[
                ['Regular Expressions & DFAs (Type-3)', 'Lexical Analysis & Token Scanning', 'Flex, Lex, Regex engines'],
                ['Context-Free Grammars (Type-2)', 'Syntax Specifications & Parse Trees', 'EBNF grammars, AST specifications'],
                ['Deterministic Pushdown Automata (DPDA)', 'Shift-Reduce & Table-Driven LR Parsers', 'Yacc, Bison, Tree-sitter, ANTLR'],
                ['Attribute Grammars & Context-Sensitivity', 'Semantic Analysis, Type Checking & Scopes', 'Symbol Tables, AST type-checkers'],
                ['Turing Machines (Type-0 Computability)', 'Intermediate Code Execution & Control Flow', 'LLVM IR, Bytecode Virtual Machines'],
                ['Rice\'s Theorem & Undecidability', 'Theoretical Limits of Program Optimization', 'Proves perfect optimization/dead-code detection is uncomputable!'],
              ]}
            />

            <H3>The Grand Architectural Pipeline</H3>
            <CodeBlock
              code={`Regular Languages (Type-3)       ──► Lexical Scanner (DFA / Thompson / Maximal Munch)
          │
          ▼
Context-Free Languages (Type-2)   ──► Deterministic Parser (DPDA / LR(1) / LALR / CYK)
          │
          ▼
Context-Sensitive Logic (Type-1)  ──► Semantic Analysis (Attribute Grammars / Type Systems)
          │
          ▼
Turing-Complete IR (Type-0)       ──► Optimization Engine (SSA / Data-Flow / Fixed-Point)
          │
          ▼
Target Machine Instructions       ──► Code Generation (Tree-Covering / Graph-Coloring Registers)`}
            />

            <Callout type="tip" title="The Fundamental Takeaway">
              Theory of Computation is not merely abstract mathematics; it provides the rigorous structural blueprints
              that make constructing reliable, high-performance compiler software engines possible.
            </Callout>
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
      labelledBy="theory-title"
      zIndex={3600}
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '1020px',
        maxWidth: '96vw',
        height: '92vh',
        maxHeight: '940px',
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
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--chrome-active-border, #3b82f6)',
            }}
          >
            <BookOpen size={18} />
          </div>
          <div>
            <div id="theory-title" style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
              Theory of Computation &amp; Compiler Design Handbook
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Comprehensive Theoretical Foundations, Algorithmic Decision Systems, Parsers, SSA &amp; Optimization
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close Theory Handbook (Esc)"
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

      {/* Main Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '310px',
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
                placeholder="Search theory, algorithms &amp; SSA..."
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
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
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
                            border: 'none',
                            background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                            color: isSelected ? 'var(--chrome-active-border, #3b82f6)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            fontSize: '12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background 0.1s ease',
                          }}
                        >
                          <Icon
                            size={14}
                            style={{
                              flexShrink: 0,
                              color: isSelected ? 'var(--chrome-active-border, #3b82f6)' : 'var(--text-muted)',
                            }}
                          />
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

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 30px',
            background: 'var(--bg-card)',
          }}
        >
          {activeSection ? (
            activeSection.content
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a topic from the sidebar.</div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
