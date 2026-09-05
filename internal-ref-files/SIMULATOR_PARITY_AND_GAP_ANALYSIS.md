# AutomataLab Simulator Parity & Gap Analysis

> **INTERNAL / DO NOT COMMIT.** Git-ignored. Technical specification and actionable roadmap to achieve 100% functional, pedagogical, and scientific parity with historical and modern automata/formal language tools: **JFLAP**, **Turing's World**, **VAS**, **TAGS**, and **SimStudio**.
>
> **Historical baseline:** 2026-08-24. This analysis predates the current
> Phase C implementation. Use `project_context.md` and `architecture.md` for
> current capabilities; retain this file for original gap rationale only.

---

## 1. Executive Summary & Objective

AutomataLab has achieved industry-leading coverage in several foundational areas:
* Complete core Chomsky hierarchy simulation (DFA, NFA, $\varepsilon$-NFA, DPDA, NPDA, deterministic single- and multi-tape TM, LBA).
* Real-time computation tree generation for nondeterministic branching.
* Modern Grammar Lab (CNF, GNF, Left-Recursion Elimination, Left-Factoring, FIRST/FOLLOW, Ambiguity search).
* Comprehensive Parsing Studio with the complete LR family (LR(0), SLR(1), LALR(1), CLR(1)), general chart parsers (CYK, Earley), and AST visualization.
* Vector graphics (SVG/PNG), LaTeX TikZ generation, bidirectional JFLAP `.jff` XML file compatibility, and an embedded 15-chapter reference handbook.

However, specific specialized features, pedagogical games, transducer models, and sub-machine abstractions present in legacy or niche academic tools are not yet fully implemented in AutomataLab.

This document establishes the exact delta between AutomataLab and each reference tool, followed by rigorous engineering work packages to eliminate every gap while preserving AutomataLab's core principles (offline-first, zero-cloud, TypeScript engine decoupling, deterministic reproducibility).

---

## 2. Tool-by-Tool Deficit Breakdown

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PARITY DEFICIT MATRIX                                    │
├─────────────────────────┬──────────────┬──────────────┬──────────────┬─────────┬───────┤
│ Domain / Capability     │ JFLAP        │ Turing's Wld │ VAS          │ TAGS    │ SimSt │
├─────────────────────────┼──────────────┼──────────────┼──────────────┼─────────┼───────┤
│ Transducers (Mealy/Moo) │ Deficit (P0) │ N/A          │ N/A          │ N/A     │ N/A   │
│ Hierarchical TM Submchs │ Partial (P1) │ Deficit (P0) │ N/A          │ N/A     │ N/A   │
│ Interactive Pumping Lem │ Deficit (P1) │ N/A          │ N/A          │ N/A     │ N/A   │
│ L-Systems & Fractals    │ Deficit (P2) │ N/A          │ N/A          │ N/A     │ N/A   │
│ Unrestricted Grammars   │ Deficit (P2) │ N/A          │ N/A          │ N/A     │ N/A   │
│ Interactive Tutor Modes │ Deficit (P1) │ N/A          │ Deficit (P2) │ Def (P1)│ N/A   │
│ Batch Grading / Oracle  │ Deficit (P1) │ N/A          │ N/A          │ N/A     │ N/A   │
│ Breakpoints & Tracing   │ N/A          │ Deficit (P1) │ N/A          │ N/A     │ N/A   │
│ Multi-track Tapes       │ N/A          │ Deficit (P2) │ N/A          │ N/A     │ N/A   │
│ Particle/Pulse Canvas   │ N/A          │ N/A          │ N/A          │ N/A     │ Def P3│
└─────────────────────────┴──────────────┴──────────────┴──────────────┴─────────┴───────┘
```

---

### 2.1. Gap Analysis: JFLAP (Duke University)

| JFLAP Feature | AutomataLab Current State | Gap / Shortcoming | Action Needed for Parity |
| :--- | :--- | :--- | :--- |
| **Mealy & Moore Machines** | Not supported (FA only recognizes languages, no output tape/alphabet $\Delta$). | Cannot model sequential circuits, parity generators, or lexical transducers. | Implement `MealyEngine` and `MooreEngine`, add output tape/console to UI, and add bidirectional Moore $\leftrightarrow$ Mealy conversion. |
| **Interactive Pumping Lemma Tutor** | Handbook covers theoretical proofs, but no interactive game exists. | Missing the 2-player adversarial game ($L$ vs. Adversary) for Regular and Context-Free languages. | Build `PumpingLemmaSandbox` with preset languages, computer vs. user step negotiation, and decomposition visualizer ($w = xyz$ or $uvwxy$). |
| **L-Systems (Lindenmayer Systems)** | Not supported. | Cannot model fractal curves, botanical growth, or parallel rewriting systems. | Add `LSystemEngine` with Turtle Graphics 2D Canvas renderer (step, angle, recursion depth, stochastic rules). |
| **Interactive CYK Grid Filler** | Automated CYK parse tree generated, but no student manual grid-filling game. | Students cannot practice dynamic programming table construction cell-by-cell. | Add interactive triangular matrix UI where students manually enter nonterminal sets $V_{i,j}$ with automated error checking. |
| **Unrestricted / CSG Parsing** | CFG only ($Type\text{-}2$). | Cannot derive sentences in Context-Sensitive ($Type\text{-}1$) or Unrestricted ($Type\text{-}0$) Grammars ($\alpha \to \beta$). | Add bounded BFS derivation search engine for unrestricted productions $|\alpha| \le |\beta|$. |
| **Interactive Step-by-Step Conversion Quiz** | Conversions run as 1-click automated transforms with step replay. | Students cannot manually build NFA $\to$ DFA power-set states with guided validation. | Add "Interactive Construction" mode in `ConversionsModal` where users define DFA state subsets and transitions with hint validation. |
| **Batch Test Oracle with Expected Outputs** | Batch runner accepts input strings and shows Accept/Reject. | Cannot test string transducers (expected output vs actual output) or grade against an answer key. | Add expected-output column, CSV import/export of test suites, and batch grading score summary ($X/Y$ passed). |

---

### 2.2. Gap Analysis: Turing's World (Stanford / CSLI)

| Turing's World Feature | AutomataLab Current State | Gap / Shortcoming | Action Needed for Parity |
| :--- | :--- | :--- | :--- |
| **Hierarchical TM Subroutines (Macro Nodes)** | Monolithic flat TM states. | Cannot nest a reusable sub-machine (e.g., `ShiftRight`, `CopyTape`, `FindBlank`) as a single state node inside a larger machine. | Implement Sub-Machine Node abstraction (`SubMachineState`) with parameterizable tape head entry/exit contracts. |
| **Multi-Track Single-Tape Representation** | Multi-tape TM supported ($k$ physical tapes with independent heads), but no multi-track single tape ($1$ head reading composite $\Sigma^k$ tracks). | Multi-track tapes (used to prove TM simulation of LBAs and $k$-track equivalences) must be manually modeled via Cartesian product alphabets. | Add `tracks` property to `TMEngine` rendering tape cells divided into $k$ vertical sub-tracks with a unified tape head. |
| **Simulation Breakpoints & Watchers** | Step, play/pause, step-back, and speed controls. | Cannot set conditional breakpoints (e.g., "Pause when State = $q_5$ AND Tape Head $0$ reads $\Box$"). | Add conditional breakpoint predicates in `simulationStore` and trigger pause on condition match. |

---

### 2.3. Gap Analysis: VAS (Visual Automata Simulator)

| VAS Feature | AutomataLab Current State | Gap / Shortcoming | Action Needed for Parity |
| :--- | :--- | :--- | :--- |
| **Live Subset-Construction Interactive Split Canvas** | Subset construction is executed via modal transformation window. | No live side-by-side interactive canvas where dragging an NFA state simultaneously highlights the corresponding DFA power-set node. | Implement Dual-Canvas Live Sync view mode connecting NFA source states with DFA target states in real-time. |
| **Configuration Sequence Matrix Export** | History log lists linear steps. | No formatted step matrix export (State vs. Consumed Input vs. Stack/Tape content) for academic problem set submissions. | Add "Export Step Matrix" to `HistoryLog` outputting formatted ASCII / Markdown / CSV / LaTeX tabular traces. |

---

### 2.4. Gap Analysis: TAGS (Teaching Automata & Grammars)

| TAGS Feature | AutomataLab Current State | Gap / Shortcoming | Action Needed for Parity |
| :--- | :--- | :--- | :--- |
| **Manual Parse Tree Builder** | Automated parsing engines build trees top-down/bottom-up. | Students cannot manually construct a parse tree by expanding nonterminal nodes to test grammar understanding. | Add "Manual Derivation / Tree Construction Canvas" where users click nonterminals and pick productions to build derivation trees. |
| **Dual Parse Tree Ambiguity Diff Inspector** | Ambiguity engine finds ambiguous sentences and lists two derivations. | Derivations are shown as text lists rather than a visual side-by-side AST diff overlay. | Build dual-tree side-by-side visual AST comparison panel with diff highlighting of conflicting production applications. |

---

### 2.5. Gap Analysis: SimStudio & Modern Web Simulators

| SimStudio / Modern Feature | AutomataLab Current State | Gap / Shortcoming | Action Needed for Parity |
| :--- | :--- | :--- | :--- |
| **Auditory Simulation Stepping** | Fully visual simulation. | No subtle audio-sensory feedback for educational engagement or accessibility. | Add optional synthesized audio cues (Web Audio API: accept chime, reject thud, step tick, stack pop frequency shifts). |
| **Particle Simulation Flow on Edges** | States highlight during active simulation; edges highlight when traversed. | No animated particle/pulse travel along bezier edges during continuous play. | Implement Framer Motion SVG path particle animations tracing active transition paths during automatic playback. |
| **Rapid Keyboard-First Editing Canvas** | Mouse drag-and-drop and double-click state creation. | Lacks fast modal keyboard-only state/transition workflow (e.g., press `S` to drop state at cursor, press `T` to connect). | Add canvas keyboard accelerator layer for mouse-free machine construction. |

---

## 3. Engineering Work Packages

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATALAB PARITY WORK PACKAGES                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  WP1: Transducer Engine & Canvas (Mealy & Moore Machines)             [P0 - Core]     │
│  WP2: Hierarchical Turing Machine Subroutines & Multi-Track Tapes     [P1 - Core]     │
│  WP3: Interactive Pumping Lemma Game Sandbox                          [P1 - Edu]      │
│  WP4: Interactive Dynamic Programming Lab (CYK Grid & Manual Parsing) [P1 - Edu]      │
│  WP5: Batch Test Oracle & Homework Grading Subsystem                  [P1 - Academic] │
│  WP6: L-Systems & Turtle Graphics Engine                              [P2 - Frontier] │
│  WP7: Unrestricted & Context-Sensitive Grammar Engine (Type-0/Type-1) [P2 - Formal]   │
│  WP8: Sensory Simulation Polish (Audio Cues, Particles, Key Acceler)  [P3 - Polish]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### WP1: Transducer Engine & Canvas (Mealy & Moore Machines)

#### Objectives
1. Expand `MachineType` to include `'MEALY'` and `'MOORE'`.
2. Model output alphabets $\Delta$, transition output functions $\lambda_{Mealy}: Q \times \Sigma \to \Delta^*$, and state output functions $\lambda_{Moore}: Q \to \Delta^*$.
3. Provide live synchronous output tape emission during simulation.
4. Implement exact Moore $\leftrightarrow$ Mealy automated conversion algorithms.

#### Engine Specifications (`src/engines/mealy/MealyEngine.ts` & `src/engines/moore/MooreEngine.ts`)

```ts
export interface TransducerTransition extends Transition {
  output?: string; // For Mealy machines: symbol(s) emitted on transition
}

export interface TransducerState extends AutomataState {
  output?: string; // For Moore machines: symbol(s) emitted upon entering state
}

export interface TransducerConfiguration extends Configuration {
  outputTape: string[]; // Cumulative emitted output tokens
  lastEmitted?: string;
}
```

#### Moore $\leftrightarrow$ Mealy Conversion Math
* **Mealy to Moore:** For each state $q$, split into states $(q, b)$ for each distinct output $b \in \Delta$ on incoming transitions.
  $$Q' = \{ q_0 \} \cup \{ (q, b) \mid \exists p, a \text{ s.t. } \delta(p, a) = q \text{ and } \lambda_{Mealy}(p, a) = b \}$$
* **Moore to Mealy:** Retain state set $Q$, set transition output $\lambda_{Mealy}(q, a) = \lambda_{Moore}(\delta(q, a))$.

---

### WP2: Hierarchical Turing Machine Subroutines & Multi-Track Tapes

#### Objectives
1. Implement nested sub-machine invocation (Turing's World parity). A state node in a parent TM can encapsulate an entire child TM definition.
2. When the parent TM enters a sub-machine state $q_{sub}$, control transfers to $q_{sub}^{start}$. When the child TM halts in an accept state, control exits via dedicated parent transition ports.
3. Multi-track tape simulator: allow tape alphabet symbols to be structured vectors $\begin{pmatrix} s_1 \\ s_2 \\ \vdots \\ s_k \end{pmatrix} \in \Gamma^k$.

#### Architecture
```ts
export interface SubMachineState extends AutomataState {
  isSubMachine: true;
  subMachineId: string; // References a saved MachineDefinition in tabStore or library
  returnTransitions: {
    childAcceptStateId: string;
    parentTargetStateId: string;
  }[];
}
```

---

### WP3: Interactive Pumping Lemma Game Sandbox

#### Objectives
1. Build an interactive educational game for proving non-regularity and non-context-freeness via the Pumping Lemma (JFLAP parity).
2. Modes: **User as Prover** (Defeats Computer) or **Computer as Prover** (Demonstrates Contradiction).
3. Preset library of classical languages:
   * Regular: $L = \{ a^n b^n \mid n \ge 0 \}$, $L = \{ w w^R \}$, $L = \{ 0^{n^2} \}$, $L = \{ 0^p \mid p \text{ is prime} \}$.
   * CFL: $L = \{ a^n b^n c^n \mid n \ge 0 \}$, $L = \{ a^i b^j c^k \mid i < j < k \}$, $L = \{ w w \mid w \in \{0,1\}^* \}$.

#### Workflow State Machine
```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Opponent picks pumping length m                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Step 2: Prover selects witness string w in L (|w| >= m)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Step 3: Opponent chooses valid decomposition (w = xyz)       │
│         satisfying |y| >= 1 and |xy| <= m                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Step 4: Prover picks pump power i >= 0 s.t. x(y^i)z NOT in L│
│         ==> CONTRADICTION REACHED (Language is Non-Regular) │
└─────────────────────────────────────────────────────────────┘
```

---

### WP4: Interactive Dynamic Programming Lab (CYK Grid & Manual Parsing)

#### Objectives
1. Provide an interactive student exercise mode for the CYK algorithm.
2. Given grammar $G$ in CNF and input string $w = a_1 a_2 \dots a_n$, render an interactive lower-triangular dynamic programming grid.
3. Students click cell $V_{i,j}$ and toggle candidate nonterminals.
4. "Check Cell" button validates against:
   $$V_{i,j} = \bigcup_{k=1}^{j-1} \{ A \mid A \to B C \in P, B \in V_{i,k}, C \in V_{i+k, j-k} \}$$
   Providing instant feedback, hint derivation splits, and cell dependency highlighting.

---

### WP5: Batch Test Oracle & Homework Grading Subsystem

#### Objectives
1. Allow instructors and students to run test suites against expected oracle outputs.
2. Support CSV/JSON test suite import format:
   ```csv
   input,expected_verdict,expected_output,expected_tape
   "aabb",ACCEPT,"",""
   "ab",REJECT,"",""
   "101",ACCEPT,"110",""
   ```
3. Generate comprehensive grading reports: Accuracy percentage, false positive/negative identification, execution step counts, and printable PDF / LaTeX summary reports.

---

### WP6: L-Systems & Turtle Graphics Engine

#### Objectives
1. Add an L-System workspace tab for modeling developmental biological structures and fractals (JFLAP parity).
2. Grammatical specification:
   * Alphabet: $V = \{ F, +, -, [, ], X, Y \}$
   * Axiom (Start string): e.g., $X$
   * Production rules: e.g., $X \to F+[[X]-X]-F[-FX]+X$, $F \to FF$
   * Parameters: Recursion depth $n$, turning angle $\theta$, step length $d$.
3. 2D HTML5 Canvas renderer with pan/zoom and SVG export.

---

### WP7: Unrestricted & Context-Sensitive Grammar Engine (Type-0 / Type-1)

#### Objectives
1. Extend `engines/grammar/` to support unrestricted productions $\alpha \to \beta$ where $\alpha, \beta \in (V \cup \Sigma)^*$ and $|\alpha| \ge 1$.
2. Implement bounded iterative deepening / breadth-first search derivation engine for sentence generation and verification.
3. Detect Chomsky hierarchy type automatically:
   * $Type\text{-}3$: $A \to a B \mid a$ (Regular)
   * $Type\text{-}2$: $A \to \gamma$ (Context-Free)
   * $Type\text{-}1$: $|\alpha| \le |\beta|$ for all $\alpha \to \beta$ (Context-Sensitive / Non-contracting)
   * $Type\text{-}0$: Arbitrary $\alpha \to \beta$ (Recursively Enumerable / Turing Equivalent)

---

### WP8: Sensory Simulation Polish (Audio Cues, Particles & Key Accelerators)

#### Objectives
1. **Synthesized Web Audio Cues (Zero asset dependencies):**
   * Accept: Harmonious two-tone major third sine wave ($523.25\text{ Hz} \to 659.25\text{ Hz}$).
   * Reject / Stuck: Low sawtooth pulse ($130.81\text{ Hz}$).
   * Step / Pop: Short $20\text{ms}$ bandpass white noise pulse.
2. **Particle Flow Visualization:**
   * Overlay animated CSS/SVG particle pulses along active transition edges during continuous simulation playback.
3. **Canvas Keyboard Navigation:**
   * Press `S` $\to$ Create state at cursor.
   * Press `T` $\to$ Connect selected state to target under cursor.
   * Press `Space` $\to$ Step simulation.
   * Press `R` $\to$ Reset simulation.

---

## 4. Implementation Phasing & Timeline

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               PHASED ROLLOUT                                      │
├─────────────┬──────────────────────────────────────────┬──────────────────────────┤
│ Phase       │ Work Packages Included                   │ Target Release           │
├─────────────┼──────────────────────────────────────────┼──────────────────────────┤
│ **Phase 1** │ WP1 (Mealy/Moore) + WP5 (Batch Oracle)   │ **v5.1.0** (Transducers) │
│ **Phase 2** │ WP3 (Pumping Lemma) + WP4 (CYK DP Lab)   │ **v5.2.0** (Pedagogy)    │
│ **Phase 3** │ WP2 (TM Subroutines) + WP7 (Type-0/1)    │ **v5.3.0** (Computation) │
│ **Phase 4** │ WP6 (L-Systems) + WP8 (Audio/Particles)  │ **v6.0.0** (Grand Parity)│
└─────────────┴──────────────────────────────────────────┴──────────────────────────┘
```

---

## Phase 0 Status — Compatibility Foundation

Completed on 2026-08-25:

- Added `src/engines/machine/core/capabilities.ts` as the central registry for current machine types, workspace routing, graph/simulation/batch/stack/tape capabilities, and persisted-type validation.
- Updated `App.tsx`, `WorkspaceHub.tsx`, and `Toolbar.tsx` to consume the capability predicates instead of maintaining independent workspace type lists.
- Added `src/utils/fileFormat.ts` for the project-file major-version contract. The loader accepts the historical `1.0.0` version string, serializers write numeric version metadata and workspace metadata, and grammar/parser fields now survive JSON round trips.
- Added `src/engines/education/types.ts` for bounded, serializable exercise sessions and attempts that remain separate from authoritative simulation state.
- Added regression coverage for the capability registry, file-version handling, grammar/parser persistence, and existing performance-heavy tests. Verification completed with `npx tsc --noEmit`, `npm run build`, and `npm test` — 37 test files and 503 tests passed.

The next implementation phase is **WP1 — Mealy/Moore machines**, followed by the generalized batch oracle in WP5.

---

## 5. Verification & Parity Assessment Checklist

To formally certify parity against JFLAP, Turing's World, VAS, TAGS, and SimStudio, each milestone must satisfy the following automated criteria:

- [ ] **Mealy/Moore Engine Verification:** 100% round-trip conversion equivalence between Moore and Mealy models with zero discrepancy on random input string fuzz tests.
- [ ] **TM Subroutine Recursion Depth:** Sub-machine calls must execute with bounded call stack memory, cleanly serializing to and from `.autolab.json`.
- [ ] **JFLAP File Compatibility:** Bidirectional import/export of JFLAP `.jff` files containing Moore, Mealy, and multi-tape TMs without data loss.
- [ ] **Pumping Lemma Adversary Completeness:** Game algorithm guarantees contradiction discovery on all non-regular and non-CFL library presets under optimal prover play.
- [ ] **Performance Ceiling:** All new engines (L-Systems, CSG BFS derivations, and Batch Oracle grading) must execute within Web Worker threads without blocking the 60fps UI render thread.
