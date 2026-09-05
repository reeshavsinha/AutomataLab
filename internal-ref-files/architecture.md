# AutomataLab Architecture Document
This document outlines the high-level architecture, design philosophy, core abstractions, and technical roadmap for AutomataLab. It acts as a living document to guide future development and help contributors orient themselves.

> **Current-state addendum (2026-09-05):** The historical detail below is
> intentionally preserved. Current manifests report version **5.0.0**. The
> current working tree passes **58 test files / 645 tests**, and both standard
> and `VITE_SIMULATOR_MODE=true` production builds pass. Where an older
> dated statement conflicts with this addendum, treat the dated statement as
> historical.

## 1. Design Philosophy
AutomataLab is built on the core principle of **strict separation of concerns**. 
- **Engines are Pure:** The theoretical logic of automata (simulators, parsers, converters) resides in pure TypeScript, entirely agnostic of the UI, DOM, or React. 
- **UI is Presentation:** The React frontend handles rendering, state hydration, and user interactions. 
- **Algorithms over Abstractions:** We prefer explicit algorithm implementations (e.g., explicit subset construction, Moore's minimization) over deep object-oriented hierarchies or "magic" generic frameworks.
- **Explicit Type-Gating:** Instead of loose duck typing, we rely on discriminated unions (`MachineType`) and specific interfaces to define boundaries between different classes of automata (e.g., DFA vs. Pushdown Automata vs. Turing Machines).
*(See `principles.md` for a complete list of project principles).*

## 2. Current Architecture

### A. Shell and workspace routing

`src/App.tsx` uses native hash routing:

- `#/` → `WorkspaceHub`
- `#/machine` → `MachineWorkspace`
- `#/grammar` → `GrammarWorkspace`
- `#/parser` → `ParserWorkspace`

`src/engines/machine/core/capabilities.ts` maps each `MachineType` to its
workspace and feature gates. `TabSyncListener` synchronizes the active tab into
the grammar/parser stores. The anti-trap effect prevents a document from being
rendered in an incompatible workspace.

### B. Engine tier (`src/engines/`)

- `engines/machine/core/`: shared contracts, capabilities, computation trees,
  analysis, engine factory, and headless runner.
- Machine engines: DFA, NFA, ε-NFA, Mealy/Moore, DPDA, NPDA, TM,
  multi-track TM (`MTM`), LBA, NLBA, and compiled grammar recognizers.
  Hierarchical execution is an advanced `TM` path selected when submachine-call
  transitions exist; it is not a separate `MachineType`.
- `engines/grammar/`: Type 0–3 production parsing/classification, CFG analysis
  and transformations, bounded derivation search, and its worker.
- `engines/parser/`: LL(1), LR(0), SLR(1), CLR(1), LALR(1), CYK, Earley, and
  backtracking engines plus LR graph layout.
- `engines/machine/conversions/`: ε-elimination, subset construction, DFA
  minimization, Thompson Regex→NFA, CFG→PDA, Mealy↔Moore,
  Regex/Type-3 grammar conversion, and bounded grammar-recognizer generation.

There is currently no implemented PDA→CFG or DFA/NFA→Regex conversion module;
older references to those conversions describe prior plans, not current code.

### Current machine invariants

- PDA stack top is the last array element. Push text `aZ` leaves `a` above `Z`.
- TM tapes are sparse; missing cells, `''`, and the configured blank are blank.
- TM moves support `L`, `R`, and stay (`S`).
- Multi-tape TM has independent heads; `MTM` has one head over vector cells.
- Watchers are transient per-tab debugger state and pause automatic execution
  before the next step; manual Step Forward bypasses watchers.
- General-grammar search is bounded and distinguishes `FOUND`,
  `NOT_FOUND_WITHIN_LIMIT`, `RESOURCE_LIMIT`, and `CANCELLED`.

- **Parser Engine (`engines/parser/`):** Predictive and shift-reduce parsing,
  CYK, Earley, and backtracking produce tables, execution states, and parse
  artifacts.
- **Web Workers:** Heavy analysis uses
  `engines/machine/workers/analysis.worker.ts`; general derivation uses
  `engines/grammar/derivationWorker.ts`; parser graph layout uses
  `engines/parser/layout/worker.ts`.
### C. The State Management Tier (`src/store/`)
Uses `zustand` to bridge the Engine Tier and the UI Tier. The data model is compartmentalized across multiple stores:
- **`workspaceStore`:** Manages transient UI interaction states (e.g., active tools, hover highlights).
- **`machineStore`:** Owns the shared multi-tab document system for machine,
  grammar, and parser tabs, including routes, dirty state, and machine topology.
- **`grammarStore`:** Owns Regex and Type 0–3 grammar text/format state,
  classification, and the derived CFG model when the selected format is
  context-free.
- **`parserStore`:** Manages the parsing algorithms, parse tables (LL/LR), and real-time execution states for the Parser Studio.
- **`historyStore`:** Maintains bounded full-snapshot `past` and `future`
  stacks under a nominal `workspace:tabId` key. Current grammar/parser/machine
  callers all use the `machine` workspace key. Global shortcuts call
  `machineStore.undo()` / `redo()`, which delegate to this store.
- **`simulationStore`:** Manages the active execution state for machines (e.g., stepping through an input string, tracking the computation tree, current active nodes).
- **`uiStore`:** Owns global presentation state including theme, selection,
  active panel/modal, clipboard, editor/rename state, fit requests, and analysis
  highlights.
- **`commandStore`:** Acts as a lightweight command bus to pass imperative commands (like zooming or specific canvas manipulations) from the menu bar to the active workspace.
- **`toastStore`:** Manages transient, non-blocking UI notifications and error messages.
- **`traceabilityStore`:** Manages metadata for tracking derivations and highlighting rules/AST nodes during parsing.
- **`tmDebugStore`:** Holds transient per-tab TM watchers; watcher state is
  removed with its tab and is not serialized.
### D. The UI Tier (`src/components/`, `src/hooks/`, `src/utils/`)
A React-based presentation layer.
- **Canvas (`components/canvas/`)**: Uses `xyflow` (React Flow) for interactive graph visualization. Interactions are extracted into modular hooks.
- **Export utilities (`src/utils/`):** `exportProvider.ts`, `exporters.ts`,
  `diagramSvg.ts`, and `diagramExport.ts` provide serialization and rendering;
  there is no current `src/services/` directory.
- **Editors (`components/canvas/editors/`)**: Type-specific transition forms (e.g., `FiniteAutomataEditor`, `TMEditor`) dispatched by a central `TransitionEditor` modal.
- **Conversions (`components/conversions/`)**: A registry (`conversionsRegistry.tsx`) powers the conversions modal.
- **Analysis (`components/analysis/`)**: Houses `AnalysisModal.tsx`, which manages asynchronous communication with the background Web Worker.

## 3. Core contracts

```typescript
interface MachineDefinition {
  id: string;
  name: string;
  type: MachineType;
  language: string;
  alphabet: string[];
  states: AutomataState[];
  transitions: Transition[];
  // Extensible fields depending on the type:
  outputAlphabet?: string[];
  initialOutput?: string;
  tapeCount?: number;
  blankSymbol?: string;
}
```
### `Transition`
A flat, flexible object representing an edge in the graph. It relies on optional properties that are strictly validated based on the `MachineType`.
- **FA:** Uses `symbols` array.
- **Mealy:** Uses `symbols` plus `output`; Moore state outputs live on `State`.
- **Moore:** Uses `symbols`; each `State` carries its emitted `output`.
- **PDA:** Uses `read`, `pop`, `push`.
- **TM:** Uses arrays `reads`, `writes`, `directions` mapped by tape index.
### `ComputationTree`
NFA, ε-NFA, NPDA, and NLBA engines retain configuration lineage for branching
runs. The UI can transform that flat lineage into a tree; NLBA currently has a
known type-helper drift that can suppress its Tree tab and tree export.

## 4. Performance and interoperability notes

- **React Flow Render Thrashing:** While custom hooks have organized the logic, the canvas still triggers frequent re-renders when dragging nodes. *Optimization achieved:* `StateNode.tsx` uses targeted Zustand store selectors (`s => s.analysisHighlights[id]`) instead of destructuring the whole store, preventing massive O(N^2) render cascades.
- **Graph Layout Performance:** The `applyAutoLayout` utility (using ELK.js) handles initial arrangements well but struggles to maintain "mental map" stability during live conversions.
- **Serialization Formats:** The app natively supports both our custom `.autolab.json` format and standard JFLAP 7.1 `.jff` XML files, improving interoperability across educational tools.
- **Ergonomics Audit Pending:** A full human ergonomics audit (Headless Chrome / Playwright) was initiated on 2026-06-24 but blocked by sandbox network isolation. Must be re-run interactively or with `--host` flag. Workflows pending: Grammar → FIRST/FOLLOW → Parser → Parse, Regex → NFA → DFA → Minimize, Machine → Simulate → Convert → Export.
## 5. Future Plans
- **Regex & Grammar Integration:** Regex→NFA and Regex→Type-3 grammar are
  implemented. Parser Studio includes CYK; the separate Phase B interactive CYK
  exercise was intentionally skipped.
- **Advanced Machine Types:** Phase C (Type 0/1 grammar support, TM watchers,
  MTM, and hierarchical TM submachines) is implemented in the current working
  tree. Phases B and D remain intentionally skipped.
## 6. Landing Page
The marketing landing page is built as a self-contained static site inside the `page/` directory.
- **Pure Web Standards**: Built entirely with Vanilla HTML, CSS, and JS. It avoids React and Tailwind to maintain total control over design tokens and motion.
- **Unified Motion System**: CSS transitions and animations are controlled by strict variables (`--lp-ease`, `--lp-duration`) for fluid, hardware-accelerated animations.
- **Scroll Handling & Scroll Spy**: Uses `Lenis` (via `script.js`) to provide an ultra-smooth, inertial scrolling experience. An `IntersectionObserver` handles scroll spy tracking to highlight the active section link in the navigation header.
- **Scroll Entrance Animations**: A secondary `IntersectionObserver` tracks elements (e.g. features, downloads, stats) as they cross into the viewport and adds `.in-view` classes to trigger smooth fade-and-slide CSS animations.
- **Dynamic Release Asset Fetching & Integrity Verification**: Queries the public GitHub Releases API (`/releases/latest`) on page load to dynamically parse version tags, lookup file sizes, bind direct download URLs, and extract platform-specific SHA-256 checksums from the release body description. If hashes are found in the release description, they dynamically override the default static HTML placeholders.
- **Micro-Interactions & Parallax**: 
  - **Spotlight Grid Hover**: A JavaScript pointer tracker calculates mouse offsets relative to bento grid cards and sets `--mouse-x` and `--mouse-y` variables, allowing a responsive CSS radial gradient spotlight to follow the cursor.
  - **Ambient Parallax**: A background listener shifts the backdrop glow element (`.lp-ambient-glow`) by 5% towards the cursor coordinates to give a premium, organic depth.
- **Wiki-Driven Documentation**: The landing page documentation cards no longer duplicate markdown into the web bundle. Instead, they route users directly to the official GitHub Wiki repository pages (`Architecture.md`, `File-Format.md`, `Decision-Log.md`, `Contributing-Guide.md`), ensuring there is a single source of truth.
- **Dual Vercel Deployment**: The web presence is split across two distinct Vercel domains for clean separation of concerns:
  - `automata-lab-one.vercel.app`: Hosts the public marketing landing page.
  - `automata-lab-sim.vercel.app`: Hosts the React/TypeScript simulator; landing links target `/simulator?demo=true`.


## Security & Deployment Architecture
- **Vercel Static Deployment:** The landing page enforces a strict
  Content-Security-Policy via `page/vercel.json`, restricting inline scripts
  and limiting connections to the GitHub API.
- **Simulator Demo Architecture:** Demo mode is enabled by build-time
  `VITE_SIMULATOR_MODE=true` or an exact `demo=true` query parameter. UI gates
  keep the hosted subset to DFA/NFA/ε-NFA/DPDA/NPDA/TM/LBA and four examples.
## Current implementation status (2026-08-26)
- Phases A1–A4 are implemented. The shared suite contract supports BOM-safe text/CSV/JSON loading, version validation, verdict/output/tape/trace expectations, visible/hidden/random/boundary cases, cooperative execution, stale-result invalidation, and deterministic reports.
- Machine traces are model-aware: retained-history metadata is explicit; TM/LBA exports preserve head coordinates and bounds; transducer exports include initialization output and output traces; ZIP bundles include applicable artifacts plus a manifest across Machine, Grammar, and Parser workspaces.
- Keyboard editing is routed through the command registry with input/dialog suppression, context-sensitive `S`, cursor-positioned state creation, keyboard target cycling, and self-loop support. Parser Batch and Transition Editor use the shared accessible dialog shell.
- Mealy/Moore are strictly output-producing machines. They have no final-state UI or accept/reject semantics; a fully consumed input reports `completed` and `isAccepted()` returns `null`. Legacy final-state flags are cleared during type changes and file loading.
- Historical verification at that date: 42 Vitest files / 530 tests. The
  current verified baseline is 58 files / 645 tests. Existing Vite chunk-size
  and mixed static/dynamic-import warnings remain non-blocking.
- Phases B and D are intentionally skipped. Phase C (Type-0/Type-1 grammar
  support, TM debugging, multi-track tapes, and hierarchical TM submachines)
  is implemented in the current working tree.

## 7. Phase 3 and Phase 4 Architectural Extensions
- **Phase 3 (Grammar and CFG):** Built text-based parsers mapping string definitions to `Grammar` ASTs. Added exhaustive bounded search logic for ambiguity detection and sequential deterministic IDs for parse forest components.
- **Phase 4 (Parsing Studio):** Parser Studio uses parser-specific models and
  simulations under `engines/parser/`; it does not extend the machine
  `Automaton` interface. LL(1) uses a predictive table, while LR algorithms use
  generated item-set automata and action/goto tables.
  
### Recent Architectural Adjustments
- **Workspace-Agnostic History (Release 7.1):** `historyStore.ts` currently
  stores bounded full snapshots (`past`/`future`, maximum 100) keyed by
  `workspace:tabId`; it does not currently use Immer patches.
- **JFLAP Interoperability (Release 7.1):** `.jff` XML parsing and serialization
  are implemented by `utils/jflap.ts` (`parseJFLAP` / `exportJFLAP`).
- **State Integrity Hardening Sprint (2026-06-24):** Resolved five P0/P1 bugs: history memory leak on tab close (D109), stale UI selection across tab switches (D110–D112), JFLAP import crash on malformed transition references (D113), and Parser Studio silent crash on unexpected grammar parse errors (D114).
- **UI/UX Resizability & Collision Standardisation (2026-06-25):** Current
  workspace resizing uses `react-resizable-panels`; no generic `Splitter`
  component exists in the current tree. LR conflict handling and per-tab route
  mapping remain part of the implementation history.
- **Parser Studio Finalization (2026-06-25):** Fully decoupled Parser state generation, upgraded AST rendering to `mrtree` for rigorous left-to-right sibling ordering, implemented Maximal Munch for string tokenization in the Lexer, implemented standardized parsing table & automaton serialization capabilities, and permanently resolved the App.tsx hash-routing race condition that previously hijacked navigation flows.
- **Edge Routing Engine (2026-06-26):** Implemented a `GlobalRoutingEngine` (`engines/parser/layout/GlobalRoutingEngine.ts`) using A* pathfinding with obstacle inflation for the LR automaton visualization. Routes travel around state nodes instead of through them. Parallel lane separation prevents overlapping edges. Two-mode architecture: interactive mode (reroute only connected edges during drag) and final mode (global reroute on drop) to prevent O(n²) sluggishness (D125). Fixed cross-edge toggle in `engines/parser/layout/LRLayoutStrategy.ts` to filter by `edgeClass === 'tree'` (D129).

- **Grammar tokenization semantics (2026-08-13, superseded by 2026-08-15):** Compact/no-space RHS alternatives were tokenized character-by-character; whitespace-separated tokens were preserved as individual symbols. This removed the greedy lowercase-run behavior but still coupled boundaries to heuristics.
- **Deterministic grammar tokenizer (2026-08-15, v5.0.1):** Grammar-production tokenization (`tokenizeGrammarString`) resolves symbol boundaries purely from source text — whitespace is the hard boundary, `[A-Za-z0-9_']` runs form one symbol, quoted strings (`"..."`/`'...'`) form one symbol, epsilon commands and multi-char operators stay grouped. Boundaries never depend on declared symbols, so FIRST/FOLLOW and every parser generator operate on unambiguous symbols. A separate `tokenizeInputString(str, terminals)` does longest-terminal-match for parse-input sentences. Quoted terminals (and literal `"`/`'`/`\`) round-trip safely through `formatSymbol` (try/catch probe + escaping). `→` is accepted as arrow and `∣` (U+2223) as an alternative separator (editor normalizes to `|`). See D141–D144.
- **Parser Studio graph controls (2026-08-13):** `ParseTablePanel` keeps the `Parse Table` / `Automaton Graph` controls visible under constrained widths and shows `Automaton Graph` whenever an LR table exists, independent of conflict state.
- **LR automaton self-loops (2026-08-13):** `LRStateNode` displays GOTO transitions that return to the same state as a compact self-loop indicator outside the node's upper-right border.
- **Automaton graph default view (2026-08-13):** Extended transitions are opt-in; shortened transitions are the default and identify targets as `State N`.
- **Theme consistency (2026-08-13):** Parser simulation controls use the existing theme token `--trace-ring` rather than a hardcoded dark color.
- **Educational Architecture & Documentation Ecosystem (2026-08-24, historical v5.0.2 sprint label):** Standardized a multi-tier educational documentation system: (1) in-editor contextual grammar syntax guides (`GrammarEditorPanel.tsx`, `GrammarEmptyState.tsx`); (2) categorized pedagogical examples via `ExamplePicker.tsx` (16 at that milestone; the current registry contains 32 grammar examples); (3) interactive 9-module User Manual (`ManualModal.tsx`, `F1`); and (4) an extensive multi-section Theory of Computation & Compiler Design Handbook (`TheoryModal.tsx`, `F2`) containing 2500+ lines of mathematically rigorous content bridging Automata theory directly to production compiler engineering (SSA, dominators, graph-coloring register allocation, and verification). Connected through a unified `ModalKind` router in `uiStore.ts` with cross-modal 1-click header navigation.

## Phase 0 Parity Foundation (2026-08-25)
- **Capability registry:** `engines/machine/core/capabilities.ts` is the single source of truth for current machine-type families, workspace routing (`machine`, `grammar`, `parser`), graph/simulation/batch/stack/tape capabilities, and serializable machine-type validation. `App.tsx`, `WorkspaceHub.tsx`, and `Toolbar.tsx` use these predicates instead of maintaining their own workspace type lists.
- **Project-file contract:** `utils/fileFormat.ts` defines the current numeric project-file major version. The loader accepts both numeric versions and the historical `1.0.0` representation, while serializers write stable version and workspace metadata. Grammar/parser fields are preserved through `.autolab.json` round trips.
- **Educational exercise contract:** `engines/education/types.ts` defines bounded, serializable exercise sessions and attempts independently from authoritative machine/parser simulation state. The contract is retained as infrastructure, but the Phase B exercise modules are intentionally skipped.
## Phase A1 — Mealy and Moore Transducers (2026-08-25)
- **Machine model:** `MachineType` now includes `MEALY` and `MOORE`. `MachineDefinition.outputAlphabet` declares Γ, `Transition.output` stores Mealy outputs, and `AutomataState.output` stores Moore outputs.
- **Simulation:** `engines/machine/transducer/TransducerEngine.ts` is a pure deterministic output-only engine. Full input consumption reports `completed` with no acceptance verdict; `StepResult`, `HistoryEntry`, `Configuration`, and `RunOutcome` carry output data. Moore's initial state output is emitted before the first input symbol.
- **Machine Studio:** Toolbar type/alphabet controls, inline δ-table/canvas editors, Moore state-output fields, clipboard preservation, and the dedicated Output trace panel are wired into the existing Machine workspace.
- **Conversions:** `mooreToMealy` preserves the initial output explicitly; `mealyToMoore` splits destination states when incoming outputs differ. Both are available through the existing conversion registry and have bounded behavior tests.
- **Persistence/interoperability:** `.autolab.json` preserves transducer fields. JFLAP export is explicitly disabled for transducers because JFLAP's FA XML format has no portable output field.

## Phase A2–A4 — Shared test oracles, academic traces, and keyboard editing (2026-08-25)
- **Unified batch contract:** `utils/testSuite.ts` owns suite parsing (`.txt`, validated CSV/JSON), visible/hidden/random/boundary categories, machine/parser adapters, expected verdict/output/tape/trace comparisons, resource-limit classification, deterministic reports, and first-counterexample selection. `batch.ts` remains a compatibility entry point.
- **Parser isolation:** `engines/parser/runner.ts` constructs a fresh parser engine for every case, so Parser Studio batch execution never changes the interactive input, simulation, or history.
- **Configuration matrix:** `utils/exporters.ts` derives model-aware CSV/Markdown/LaTeX rows from enriched `HistoryEntry` data. PDA stack, TM/LBA independent tapes, and transducer output columns are included only where applicable; multi-tape columns are explicitly not multi-track cells.
- **Keyboard command bus:** `store/commandStore.ts` publishes a metadata registry and conflict checker. Canvas commands use the current flow cursor and selected states; `S` remains simulation-step outside an active transition and completes a canvas transition inside it. Dialogs, editors, inputs, and content-editable targets suppress canvas editing commands.
### Validation and residual risk (2026-08-26)
- **Automated gates:** the complete Vitest suite passed (42 files / 530 tests), `npx tsc --noEmit` passed, and the production build passed. Existing Vite chunk-size and mixed static/dynamic-import warnings remain non-blocking.
- **Bounded data:** interactive simulation retains `MAX_HISTORY` entries, so configuration exports describe the retained history window rather than an unbounded run. This is deliberate memory protection and should remain visible in future long-run export UX.
- **Batch throughput:** bounded cooperative UI chunks are implemented; a Worker remains optional if future suite limits grow substantially.
- **Batch correctness:** canonical tokenizer use, stale-result invalidation, BOM/version validation, trace-aware scoring, and deterministic reports are implemented.
- **Export fidelity:** retained-history annotations, TM/LBA coordinates and bounds, transducer initialization output, and coherent failed-transition rows are implemented.
- **Dialog and keyboard safety:** shared accessible dialogs, global shortcut suppression, transition-mode transport ownership, keyboard target cycling, and self-loop support are implemented.
- **Residual coverage:** browser-level interaction tests for focus, shortcut precedence, and replay remain a future enhancement.

### Stabilization follow-up (2026-08-25)
- Parser and batch execution now share grammar-aware tokenization, BOM/version validation, stale-report invalidation, trace-aware scoring, and cooperative UI yielding.
- Configuration exports label retained history, preserve tape coordinates/bounds, and include transducer initialization output. The Export dialog now creates a manifest-backed ZIP bundle for every workspace.
- Shared dialogs suppress background shortcuts; Parser Batch and Transition Editor use the accessible shell; transition drawing owns transport keys and supports keyboard target cycling/self-loops.