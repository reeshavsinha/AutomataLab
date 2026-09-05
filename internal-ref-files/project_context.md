A modern cross-platform desktop app to **design, simulate, and visually understand** acceptor automata, Mealy/Moore transducers, and models across the Chomsky hierarchy (DFA → NFA → ε-NFA → PDA → TM/MTM/LBA/NLBA). Key differentiators: computation-tree visualization for nondeterminism, full hierarchy coverage, deterministic output traces, and modern drag-and-drop UI. Engines are UI-decoupled; both Tauri desktop and Vite web builds exist.

> **Current-state addendum (2026-09-05):** Existing historical detail is
> intentionally preserved below. Current package and Tauri manifests report
> **5.0.0**. The working tree includes Phase C and passes **58 test files /
> 645 tests**; standard and simulator-mode production builds pass.

Historical release roadmap: **v1.0** DFA/NFA/ε-NFA (shipped) → **v2.0** PDA — DPDA + NPDA + computation-tree viewer (**shipped**) → **v2.1** UX overhaul (**shipped**) → **v3.0** TM/LBA + **multi-tape TM** (**released `3.0.0`**) → **v4.0** conversions/tools + diagram image export, **+ a classic-desktop UI redesign + UX/scientific audit pass + a stress/robustness hardening pass** (**released `v4.0.1`**) → **v4.1.0** Analysis Tools, Hardening & JFLAP Compatibility (**released `v4.1.0`**) → **v5.0** Phase 3: Grammar and CFG Laboratory (**completed**) → **v6.0** Phase 4: Parsing Studio (**completed**) → **v7.0** Phase 5: Workspace Hub Architecture (**completed**) → **v8.0** Phase 6: The Professional Polish (**completed**) → **v9.0** Release 7.1: Adoption & Interoperability (**completed**) → **Hardening Sprint (2026-06-24):** State Integrity & Stability — P0/P1 bug fixes across tabStore, uiStore, machineStore, jflap.ts, ParsingStudio.tsx (**completed**) → **v5.0.1 (2026-08-15):** Deterministic Grammar Tokenization & Unicode Operators (**completed**) → **v5.0.2 (2026-08-24):** Educational Completion & Theory Handbook Sprint (ManualModal F1, TheoryModal F2 with 15 TOC & Compiler chapters, 16 Pedagogical Examples, Batch .txt loader) (**completed**).
---
## Tech stack (historical v5.0.2 label; current manifests 5.0.0)
| Layer | Tech |
|---|---|
| Language | TypeScript 5.8 |
| UI | React 19.1 |
| Graph editor | React Flow `@xyflow/react` 12.6 |
| State | Zustand 5.0 |
| Animation | Framer Motion 12.18 + CSS |
| Auto-layout | ELK `elkjs` 0.11 — compact `stress` layout (lazy-loaded), deterministic ring seed + overlap-removal + start-left (D42; replaced dagre/d3-force) |
| Desktop shell | Tauri 2 (Rust core + system WebView) |
| Tauri plugins | dialog, fs, shell, updater (minisign-signed OTA) |
| Build/Test | Vite 6.x (with Web Workers via `?worker`), Vitest 4.x + React Testing Library |
| Styling | Inline styles + CSS custom-property design tokens (`var(--...)`). Tailwind 4.1 installed via `@tailwindcss/vite` but barely used. B&W aesthetic; **light default + persisted dark toggle** (`.dark` class on `<html>`, D29 — supersedes the old "dark-only"). v4 adds a classic-desktop **`--chrome-*`** palette (menu bar + chromed toolbar, light+dark) and **`--trace`/`--trace-ring`** tokens (witness-path highlight). See D66/D67. |
Scripts: `npm run dev` (vite), `npm test` (`vitest run`), `npm run build` (`tsc && vite build`), `npm run tauri:dev`, `npm run tauri:build`.
---

## Architecture

```text
React / React Flow UI → Zustand stores and hooks → pure TypeScript engines
```

`App.tsx` routes `#/`, `#/machine`, `#/grammar`, and `#/parser`.
`engines/machine/core/capabilities.ts` is the intended type/workspace
capability registry, and `engines/machine/core/engineFactory.ts` selects the
machine engine for interactive and headless execution.

### Directory map (`src/`)

> This long map preserves historical implementation detail. Some paths use
> older shortened names; current machine core files are under
> `engines/machine/core/`, current parser files are under `engines/parser/`,
> and current grammar files are under `engines/grammar/`.

```
engines/
  core/types.ts     ← MachineType (including MEALY/MOORE), AutomataState, Transition, MachineDefinition,
                       Configuration, StepResult, HistoryEntry, Automaton, ValidationError
  core/capabilities.ts ← single source of truth for machine-type capabilities,
                       workspace routing, graph/simulation/batch/stack/tape gates,
                       and serializable machine-type validation (Phase 0)
      core/utils.ts     ← isEpsilon, EPSILON, PDA_TYPES, isPDAType, TRANSDUCER_TYPES,
                       isTransducerType, formatPdaLabel,
                       NONDETERMINISTIC_TYPES, supportsComputationTree (PR-4),
                       BLANK, isBlank, TM_TYPES, isTMType, formatTmLabel (v3),
                       tmTapeOps, normalizeDir, formatTmTransition (v3 multi-tape),
                       IO_WINDOW, consumedWindow, remainingWindow (v3 perf — bounded I/O),
                       epsilonClosure, move, getStartState, buildConfig, generateId, isFAType (v4.1), ...
  core/computationTree.ts (+ .test.ts) ← PR-4: TreeProvider capability + supportsTree
                       guard + pure buildComputationTree() (flat lineage → nested tree,
                       depth/branch counts, 🟢/🔴/🟡/⚪ status). NOT on the Automaton
                       interface. + MAX_TREE_NODES (v3 perf — caps treeNodes accumulation).
  core/analysis.ts (+ .test.ts) ← v4.1 (D77): Reachability, Emptiness, Equivalence, Inclusion (gated by isFAType).

 dfa/DFAEngine.ts        (+ .test.ts)   single current state
  transducer/TransducerEngine.ts (+ .test.ts) Mealy/Moore deterministic output-only traces
  nfa/NFAEngine.ts        (+ .test.ts)   powerset of active states (no ε); + PR-4 lineage
  enfa/ENFAEngine.ts      (+ .test.ts)   extends/uses NFA + ε-closure; + PR-4 lineage
  dpda/DPDAEngine.ts      (+ .test.ts)   single config + stack, deterministic
  npda/NPDAEngine.ts      (+ .test.ts)   multi-branch BFS + stack (PR-3); + PR-4 tree nodes
  tm/TMEngine.ts          (+ .test.ts)   v3: deterministic TM, single- OR multi-tape
                       (tapes:Map[]/heads:number[], two-way infinite, _setupBounds
                       hook); a move fires only when every tape's read matches.
                       _snapshotTape clamps to a moving window (WINDOW_MAX_HALF=150)
                       around the head; lastDirections[] → TapeSnapshot.lastMove (perf+UX)
  lba/LBAEngine.ts        (+ .test.ts)   v3: TMEngine subclass, head bounded to [0,n]
                       (scalar bounds apply to all heads; LBA stays single-tape in UI)
  parser/earley.ts        (+ tests)      Earley parser implementation.
  parser/runner.ts                        fresh bounded parser adapters for batch suites (A2).
  grammar/derivationSearch.ts (+ tests)  Bounded derivation search.
  grammar/gnf.ts          (+ tests)      Greibach Normal Form conversion.
  parser/ll1.ts           (+ tests)      Predictive Parsing Table Generation.
  parser/model.ts + session.ts           Parser models and execution sessions.
  education/types.ts      ← shared bounded, serializable exercise-session contracts (Phase 0)
  workers/

   analysis.worker.ts  ← v4.1 (D76): Background Web Worker running heavy analysis computations asynchronously.
  conversions/            ← v4 (D61): pure-TS transforms, each → ConversionResult
                       {result:MachineDefinition, steps[], summary[]}. types.ts,
                       helpers.ts (MachineBuilder: deterministic ids + addState{description}),
                       epsilonElimination (ε-NFA→NFA), subsetConstruction (NFA/ε-NFA→DFA),
                       minimizeDfa (Moore), regexToNfa (Thompson), cfgToPda (1-state NPDA),
                       historical plans also named pdaToCfg and dfaToRegex,
                       but neither conversion is implemented in the current tree,
                       index.ts (CONVERSIONS meta + runTransform/runConstruct), conversions.test.ts
hooks/useSimulation.ts    ← play/pause/step/reset; createEngine() factory by type;
                             pulls tree data from engine via supportsTree() (PR-4);
                             resets sim on machine.id change (tab switch, v3 perf);
                             stepBack via silent replay → applyReplay (v3 perf);
                             surfaceBlocking() toasts 1st validation error + opens Validate (v4 D67)
hooks/useFileActions.ts   ← v4 (D66): shared New/Open/Save/Save-As/Recent + the global
                             Ctrl/Cmd+N/O/S/Shift+S shortcuts ({bindKeys:true} in one caller);
                             used by MenuBar (File menu) + Toolbar (replaces deleted FileControls)
hooks/useCanvasClipboard.ts, useCanvasContextMenu.ts, useCanvasKeyboard.ts, useCanvasSelection.ts, useTransitionDrawing.ts, useViewportManagement.ts ← modular canvas hooks refactored from AutomataCanvas (v4.0.1)

                       openMachine (pristine-tab reuse, D44); sync() flags dirty
  simulationStore.ts← inputString, status, active state/transition ids, consumed/
                       remaining/currentSymbol, history (capped MAX_HISTORY=1000), stepCount,
                       speed, configurations[], outputTrace[], activeStack[], treeNodes[]/liveBranchIds[] (PR-4),
                       activeTapes[] (v3 TM/LBA), applyReplay() (single-shot stepBack, v3 perf)
  uiStore.ts        ← theme (light default + dark toggle, persisted), selection,
                       activePanel ('history'|'validation'|'info'|'stack'|'tree'|'tape'|'delta'|'output'|'watchers'|'submachines';
                       persisted, defaults to 'delta' v4 D67), panelCollapsed/togglePanel (v4 D67),
                       activeModal/openModal/closeModal ('help'|'export'|'convert'|'batch'|'manual'|'theory', v4/v5),
                       transitionEditorStateId, renamingStateId (also drives text-node auto-edit),
                       clipboard, fitViewNonce/requestFitView (canvas re-fit signal, D39),
                       analysisHighlights (v4.1)
  commandStore.ts   ← v4 (D66): command bus + A4 shortcut registry/conflict checker. CanvasApi/SimApi registered on mount by
                       AutomataCanvas + SimulationControls; read by MenuBar/Toolbar so the
                       chrome can drive edit + sim actions w/o prop-drilling (keeps single engine)

  canvas/   AutomataCanvas (RF wrapper, CRUD, copy/cut/paste, transition-draw mode;
            O(n) Map-based node/edge sync, v3 perf; passes state.description into node data, v4;
            uses topologyKey to ignore cosmetic node drags from clearing analysis highlights, v4.1),
            StateNode (+ .reject ring v3; transducers hide final-state roles; hover title shows description provenance, v4;
            uses targeted Zustand selectors to prevent O(N^2) render cascades, v4.1),
            TransitionEdge (auto-route gated > 80 states v3; endpoints from live useInternalNode
            so edges follow a node while dragging — D64 v4),
            TransitionEditor (modal; FA symbols, PDA r,p→u, TM r→w,dir v3 — one cluster
            per tape if multi-tape), TextNode, ContextMenu (+reject, v3),
            EpsilonInserter (v4: accepts input OR textarea — D63)
  conversions/ ConversionsModal.tsx, conversionsRegistry.tsx (v4 — CONVERT button: plugin-style registry + step player + live SVG preview +
            Source⇄Result + short⇄full labels toggle + Open-in-new-tab; D61/D65)
  analysis/ AnalysisModal.tsx (v4.1 — modal to run Reachability, Emptiness, Equivalence, Inclusion;
            offloads computations to background Web Worker)
  controls/ InputBar (tape; seeds initial TM tape, FA preview gated off for TM v3),
            SimulationControls (play/step/reset/speed/status; +stuck toast v3)
  panels/   SidePanel (tabs: History/Validate/[Stack if PDA]/[Tape if TM-family]/[Tree if supported]/[Output if transducer]/[Watch and Calls for full TM mode]/Info),
            StackPanel, TapePanel (v3 TM/LBA tape + ⊢/⊣ markers; one row per tape if multi-tape;
            live idle input preview + grey last-move arrow, v3), ComputationTreePanel (PR-4),
            OutputTracePanel (Mealy/Moore output sequence), HistoryLog (renders ≤ MAX_VISIBLE=500 rows, v3 perf), ValidationPanel

 common/   Dialog (v4 D67 — shared accessible modal shell: role/aria-modal, capture-phase
            Esc, Tab focus-trap, focus restore, backdrop close; wraps Help/Export/Convert/Batch)
  layout/   AppLayout (renders MenuBar + Toolbar + dialogs by uiStore.activeModal),
            MenuBar (v4 D66/D73 — classic menu bar with custom window controls for frameless Tauri windows;
            includes Analysis trigger under Simulate menu, v4.1; F1/F2 global shortcuts for Manual/Theory, v5.0.2),
            TabBar, UnsavedChangesGuard (quit guard + ● dirty title, D44),
            HelpModal (rewritten v4 D67; cross-navigation to Manual and Theory modals),
            ManualModal (v5.0.2 D148 — comprehensive 9-module interactive User Manual with F1 accelerator),
            TheoryModal (D149 — extensive multi-section TOC & Compiler Design Handbook with F2 accelerator),
            ExportModal (+Diagram v4), ToastContainer,
            UpdateBanner (v4.0.1 — sliding update notification with dev mocking)
  toolbar/  Toolbar (chromed v4 D66: compact SVG icons + --chrome-* tokens; reads isPlaying
            via the command bus; name, alphabet Σ, TYPE selector, +BLANK/LIMIT & TAPES for TM, Auto Layout;
            ExamplePicker for the current 32 categorized grammar examples),
            icons.tsx (v4 D66 — compact toolbar SVGs). [FileControls REMOVED v4 D66 → useFileActions]
utils/      validator.ts (+ .test.ts), fileManager.ts (.autolab.json; +saveMachineToPath D44;
            v4: persists optional state.description), layout.ts (+ .test.ts; compact ELK-stress
            auto-layout), exporters.ts/batch.ts/testSuite.ts;
            engine factory is engines/machine/core/engineFactory.ts
                       (A2 unified suites; A3 configuration matrix; v3 audit data-out, D58),
            fileFormat.ts (+ .test.ts; numeric project-file version contract, Phase 0),
            diagramSvg.ts (v4 — dependency-free machineToSVG; verboseLabels + frameStateIds; D62),
            diagramExport.ts (v4 — SVG + SVG→canvas PNG; D62)
__stress__/ stress.test.ts ← v3 perf harness (node env): TM tape-window clamp,
            DFA linear-scaling guard, NFA tree-node cap, history cap (D54)
```

- `MEALY` and `MOORE` are graph-backed machine types with declared output alphabets, Mealy transition outputs, and Moore state outputs.
- `TransducerEngine` emits deterministic output traces. Moore emits the initial state output before destination-state outputs; Mealy emits transition outputs.
- Transducers are output-only: final-state controls and accept/reject language semantics are disabled. Full input consumption reports `completed` and `isAccepted()` returns `null`; missing transitions report an execution error.
- Native JSON persistence, output-aware history/configurations, Output panel, batch expectations, conversions, and focused regression tests are implemented. JFLAP export remains disabled because standard JFLAP FA XML cannot preserve transducer outputs.
## Phase A2–A4 (2026-08-25/26)
- `utils/testSuite.ts` is the shared bounded suite model for machine and parser batches, with text/CSV/JSON input, expected verdict/output/tape/trace fields, categories, result classifications, deterministic reports, and counterexamples.
- `engines/parser/runner.ts` creates fresh parser engines per case, avoiding mutation of the interactive Parser Studio session.
- `HistoryEntry` carries export snapshots and `utils/exporters.ts` emits model-aware configuration matrices in CSV, Markdown, and LaTeX. Independent TM tapes receive separate columns.
- `commandStore.ts`, `useCanvasKeyboard.ts`, and `useTransitionDrawing.ts` provide discoverable keyboard commands: cursor-positioned `N`, transition `T`/`Enter`, context-sensitive `S`, and dialog/editor suppression.
### A2–A4 validation audit (2026-08-25)
- Validation gates passed: 42 Vitest files / 530 tests, TypeScript no-emit, production build, and clean diagnostics for all edited files. Existing Vite warnings concern chunk size and pre-existing mixed static/dynamic imports.
- `simulationStore` intentionally caps exported run history at `MAX_HISTORY`; configuration matrices are therefore retained-window exports.
- Suite execution uses bounded cooperative chunks in the UI; a Worker remains optional if future limits grow substantially.
- Parser Batch and Transition Editor use the shared accessible `Dialog`; global shortcuts are suppressed in modal/editor/input contexts, and transition mode owns transport keys with keyboard target cycling and self-loop support.
- Configuration exports make retained-history truncation explicit, preserve TM/LBA head coordinates and bounds, include transducer initialization output, and keep failed-transition rows coherent.
- BOM normalization, trace-only expectation counting, stale-result invalidation, unsupported-version rejection, and parser tokenizer parity are implemented. Browser-level interaction coverage remains a future testing enhancement.

### A2–A4 stabilization (2026-08-25/26)
- Shared tokenizer/import/report contracts, bounded-history export annotations, accessible shortcut suppression, keyboard transition target cycling, and ZIP bundles across all export contexts are implemented.
v4 test additions (D68): `engines/machine/fuzz.test.ts` — property/fuzz suite (node env, seeded PRNG):
no-throw / always-halt over random machines of every type, conversion language-equivalence,
regex→NFA ⟷ JS `RegExp`. `utils/fileManager.test.ts` — loader hardening (malformed JSON,
`__proto__` pollution, field coercion) + export↔parse round-trip.
v4.1 test additions (D77): `engines/machine/core/analysis.test.ts` — verifies that reachability, emptiness,
equivalence, and inclusion checks throw appropriate errors on unsupported PDA/TM machine types.
`src-tauri/` = Rust shell (`main.rs`, `lib.rs`, `build.rs`, `tauri.conf.json`, `capabilities/default.json`, `Cargo.toml`). `.github/workflows/release.yml` = tag-triggered 3-platform signed release + updater manifest.
### Core contracts (`engines/machine/core/types.ts`)
```ts
type MachineType =
  | 'DFA' | 'NFA' | 'ENFA' | 'MEALY' | 'MOORE'
  | 'DPDA' | 'NPDA' | 'TM' | 'MTM' | 'LBA' | 'NLBA'
  | 'CFG' | 'CSG' | 'UG' | 'CFG_PARSER'
interface Automaton {            // every engine implements this
  initialize(input: string): void
  step(): StepResult
  reset(): void
  getCurrentConfigurations(): Configuration[]
  getExecutionHistory(): HistoryEntry[]
  isAccepted(): boolean | null   // null = running/idle or transducer (no verdict)
  getStatus(): SimulationStatus
}

// Per-branch unit — powers PDA stacks AND the (PR-4) computation tree:
interface Configuration { id; parentId|null; stateId; stack[]; inputIndex;
                          status; consumedInput; remainingInput }
interface AutomataState { id; label; x; y; isStart; isAccept
                       isReject?; isText?; width?; height?
                       description? }             // v4 (D65): provenance for converted
                       // states (e.g. the NFA subset a DFA state stands for); kept short
                       // label + this on hover / "full labels". Additive, persisted.
interface Transition { id; from; to; symbols[]   // FA: comma symbols
                       read?; pop?; push?         // PDA: ε if blank
                       write?; direction?         // TM single-tape: read→write,dir (v3)
                       reads?; writes?; directions? } // TM multi-tape arrays (v3, D53)
// PR-4 capability (engines/machine/core/computationTree.ts), NOT on Automaton:
interface TreeProvider { getTreeNodes(): Configuration[]; getLiveBranchIds(): string[] }
// NFA/ENFA/NPDA/NLBA implement it; supportsTree(engine) guards. A separate
// type-based UI helper currently omits NLBA (known drift). buildComputationTree(nodes, liveIds)
// nests the flat lineage → tree + per-node status (accepted/rejected/running/internal).
```

- **v4.1.0 Landing Page Redesign & Analysis Tools (2026-06-20, released):** Shipped a major landing page aesthetic redesign, including dynamic SHA-256 release integrity verification via the GitHub API. Additionally added structural analysis tools (Reachability, Emptiness, Equivalence, Inclusion) with a Web Worker to offload O(2^n) equivalence computations (`analysis.worker.ts`), gated operations by `isFAType` for theoretical correctness, decoupled canvas structure from highlights via `topologyKey`, optimized `StateNode` rendering to prevent thrashing, and implemented native `.jff` XML parsing and exporting for all 7 machine types via browser `DOMParser`/`XMLSerializer` (D76–D80). Includes dynamic alphabet inference and an automated PDA empty-stack warning. All 254 tests across 19 suites are passing.
- **v4.0.1 desktop redesign + UX audit + robustness hardening + UX polish (2026-06-15, released):** five passes on top of the v4.0.0 conversions. **(1) Classic-desktop chrome (D66):** a top **File/Edit/View/Simulate/Convert/Help** `MenuBar.tsx` over a rewritten chromed `Toolbar` (compact `icons.tsx`, `--chrome-*` tokens); a **command bus** `store/commandStore.ts` lets the chrome drive the edit + sim actions owned by `AutomataCanvas`/`SimulationControls` (single-engine invariant preserved); file logic extracted from the deleted `FileControls` into `hooks/useFileActions.ts`; `uiStore.activeModal` opens shared dialogs. **(2) UX/theoretical-CS audit (D67):** delivered as a Cursor Canvas (`canvases/automatalab-UX-audit.canvas.tsx`) then implemented in priority slices — shared accessible **`Dialog`** (role/aria, capture-Esc, focus trap+restore) on every modal, blocked-run toast + auto-Validate, ε normalization, reject-vs-stuck cues, **Shift-marquee** + `multiSelectionKeyCode` and **`I`**=set-start/**`F`**=toggle-accept, side panel **defaults to δ** + collapsible (persisted), **witness/trace highlight** on halt (`--trace` tokens, `.on-path`/`stuck-final`), set-valued history (`{q0,q1}`), Help rewrite, Batch in Simulate menu, Conversions **Replace current**. Three low/medium items deferred → `TODO.md` (DISC-5/WFL-2/THY-5). **All render/interaction only — accept/reject unchanged.** **(3) Stress/robustness hardening (D68):** `MAX_FRONTIER=5_000` guard stops NPDA frontier explosion → OOM (decide accepted/stuck on overflow, sound); `parseMachineJson` rejects malformed JSON cleanly + coerces `name`/`language` (exported + tested); `TM`/`DPDA`/`NPDA` constructors clamp a bad step limit; new property suite `engines/fuzz.test.ts` (no-throw/always-halt, conversion equivalence, regex⟷RegExp) + `utils/fileManager.test.ts`. **(4) UX audit follow-up polish (D69–D72):** click-outside dropdown collapse via capture-phase listeners on `MenuBar` + separators; SidePanel tab abbreviation (e.g. 'δ', 'H', 'V', 'T', 'I' when compressed) + separators; clickable `ε` buttons on `InputBar` and `BatchRunnerModal`, with persistent `empty=ε` box; and right-click / double-click in-place tab renaming on `TabBar` synced to store. **(5) Tauri update banner, frameless window layout, logo finalization, bundle restoration & binary relocation (D73–D75):** auto-update notification sliding banner and frameless window integration (`decorations: false` in `tauri.conf.json`, custom WindowControls in `MenuBar.tsx`, draggable title bar region). Restored the final 4-state transition diagram logo (`media__1781552328692.jpg`) as `src/assets/logo.png` and regenerated all native platform icons. Rebuilt the Tauri project to generate the installer bundles (`nsis/` and `msi/` subfolders containing the installers) under `src-tauri/target/release/bundle/`, and relocated the final standalone binary `AutomataLab_Final.exe` into the build release folder `src-tauri/target/release/`. See `decisions.md` **D66–D75**. installers) under `src-tauri/target/release/bundle/`, and relocated the final standalone binary `AutomataLab_Final.exe` into the build release folder `src-tauri/target/release/`. See `decisions.md` **D66–D75**.
- **v4.0.0 conversions, image export, ε-inserter, readable labels (2026-06-14, uncommitted):** new `engines/conversions/` (pure TS) — **ε-NFA→NFA, NFA/ε-NFA→DFA (subset), DFA minimization, Regex→NFA (Thompson), CFG→PDA, PDA→CFG, and DFA/NFA→Regex (state elimination)** — each returning `{result, steps[], summary[]}`; surfaced by `components/conversions/ConversionsModal.tsx` (a **CONVERT** toolbar button) as a **step player** over a live SVG preview with `Source⇄Result` + **Open-in-new-tab**. **Diagram PNG/SVG export** via a dependency-free `utils/diagramSvg.ts` (`machineToSVG`, reused by the preview) + `utils/diagramExport.ts`, wired into `ExportModal` (completes the D58 deferral; needs `fs:allow-write-file`). A clickable **ε/λ inserter** now works in input *or* textarea (regex/CFG inputs + ε-NFA δ-table). **Edges follow a node live while dragging** (`TransitionEdge` → `useInternalNode`). **Converted states get short `q0,q1,…` labels** with the subset/closure kept as the new optional **`AutomataState.description`** (additive, persisted), shown on hover, via a **short⇄full labels** toggle, and in step text. Old `.autolab.json` files load unchanged. Version **3.0.0 → 4.0.0**; CHANGELOG v4.0.0 (incl. the ε-inserter / edge-drag-fix / readable-labels items) + README + HelpModal all updated. See `decisions.md` **D61–D65**.
- **v3.0 Turing Machines & LBA (2026-06-13, uncommitted on `main`):** new `TM` (deterministic) + `LBA` (bounded TM) engine family, type-gated via `isTMType()`/`TM_TYPES` (mirrors `isPDAType`, D8). New `engines/tm/TMEngine.ts` + `engines/lba/LBAEngine.ts` (subclass overriding `_setupBounds` → head ∈ `[0,n]`), `panels/TapePanel.tsx` (live head, ID, `⊢`/`⊣` markers). Reject states (`toggleRejectState`, `.reject` ring, context menu), TM transition row (`read → write, dir`), toolbar **BLANK**/**LIMIT** controls, `stuck` step-limit toast (NFR-8). `tapes?: TapeSnapshot[]` is additive on `Configuration`/`StepResult`. Old `.autolab.json` files load unchanged. Docs: `fsm_format.md` TM/LBA spec + examples, HelpModal, README, CHANGELOG v3.0.0. Version bumped **2.1.1 → 3.0.0**. See `decisions.md` **D46–D52**.
- **v3.0 Phase 3D — multi-tape TM (2026-06-13, uncommitted on `main`):** completes v3 scope. `MachineDefinition.tapeCount` + `Transition.reads`/`writes`/`directions` arrays, normalized through one `tmTapeOps(t, n)` helper (single-tape ≤1 keeps scalar fields → byte-identical). `TMEngine` generalized to N tapes (`tapes:Map[]`/`heads:number[]`); a move fires only when **every** tape's read matches; scalar LBA bounds apply to all heads (so `LBAEngine` is unchanged). Validator: `TM_TAPE_COUNT_MISMATCH` + read-tuple determinism. Toolbar **TAPES** control (`setTapeCount`, plain TM only); `TransitionEditor` one cluster per tape; `TapePanel` one row per tape; edge labels via `formatTmTransition` (`a → b, R | c → d, L`); copy/paste carries the arrays + `write`/`direction`/`isReject`. Docs: `fsm_format.md` multi-tape schema + 2-tape `aⁿbⁿ` example, HelpModal, README, CHANGELOG. Version stays **3.0.0** (folds into the unreleased v3.0). See `decisions.md` **D53**.
- **v3.0 hardening — performance pass + Tape UX (2026-06-13, uncommitted on `main`):** a stress sweep (large inputs, multiple tabs) reproduced the "UI hangs with multiple tabs" report; fixed several **O(n²)-over-a-run** hotspots by bounding only the *rendered/per-step* data (engine logic stays exact): **windowed engine I/O** (`IO_WINDOW`=256 + `consumedWindow`/`remainingWindow`; FA per-step cost now constant), **bounded TM tape window** (`WINDOW_MAX_HALF`=150 around the head), **capped buffers** (`MAX_HISTORY`=1000, `MAX_TREE_NODES`=20 000, HistoryLog renders ≤500 rows), **single-shot Step Back** (silent replay → one `applyReplay`), **O(n) canvas sync** (Map, not `find`) + **auto-route gated** above 80 states, and **tab-switch reset** (`useSimulation` resets the sim on `machine.id` change, killing the dangling interval + stale tape/tree/history — the direct multi-tab-hang fix). New headless `src/__stress__/stress.test.ts` asserts the invariants. Tape UX (user follow-up): `TapeSnapshot.lastMove` (runtime-only) drives a **grey last-move arrow** under the tape, and `TapePanel` **live-previews the input while idle** (no more blank panel). **No file-format change** (`fsm_format.md` unchanged — `lastMove`/windows are render-only). See `decisions.md` **D54** (perf) + **D55** (tape UX).
- **v2.1.0 bundled two UX layers (now committed):**
  1. **v2.1 UX pass** — all 14 items from `v2_improvements.md` (undo/redo, dark mode, toasts, resizable panel, accept/reject colours, recent files, top tab bar, …). See `decisions.md` **D28–D33**.
  2. **v2.1.1 polish & bug fixes** — context-menu viewport clamping, single-open external links, sticky modal header, text-box **drag/resize/placeholder-auto-clear/scroll**, transition **auto-routing around intermediate states**, and a **deterministic auto-layout + canvas re-fit**. See `decisions.md` **D34–D39**.
- **Auto-layout reworked (2026-06-10, uncommitted on `main`):** after a layered (dagre) attempt came out "much messier" on a cyclic DFA, the layout is now a **compact `stress` layout via `elkjs`** — short edges, roughly symmetric, start-on-left, deterministic (ring seed) with a post-pass guaranteeing **no node overlaps**. `applyAutoLayout` is **async**; `elkjs` is lazy-loaded (separate chunk). `utils/layout.test.ts` (9 async tests); `@dagrejs/dagre` removed. See `decisions.md` **D42** (supersedes D39).
- **Canvas + simulation UX batch (2026-06-10, uncommitted on `main`):** interactive **minimap** (pan / scroll-zoom / click-to-recenter), a **bordered machine-name field** (now visibly editable), a fix so the zoom **+/- buttons no longer arm selection mode**, an **edge-aware fit-view** (frames self-loops + long/curved edges, not just node boxes — `fitBounds` over node + edge-path `getBBox()`), and a simulation **Step Back** (⏮ / Left-Arrow; deterministic engine replay to step − 1). No new deps/files. See `decisions.md` **D43**. *[canvas/AutomataCanvas.tsx, toolbar/Toolbar.tsx, hooks/useSimulation.ts, controls/SimulationControls.tsx]*
- **File-operations UX overhaul (2026-06-10/11, uncommitted on `main`):** app-like new/open/save built around data-loss prevention — an **unsaved-changes quit guard** (`UnsavedChangesGuard`: Tauri `onCloseRequested`/web `beforeunload` → Save-All/Discard/Cancel modal + a **"●"** dirty marker in the OS window title; new caps `core:window:allow-destroy`/`allow-set-title`), **smart open** (`machineStore.openMachine` reuses a *pristine* tab else opens a new one — never clobbers work), **contextual save** (per-tab `tabPaths` + `fileManager.saveMachineToPath` → in-place save vs Save As), and the `FILE ▼` dropdown replaced by **icon-only New/Open/Save buttons** (`FileControls`, hover tooltips with name+shortcut, Recent submenu, dirty-fill Save). Standard shortcuts `Ctrl/Cmd+N/O/S/Shift+S` + `Ctrl+T/W`. New: `FileControls.tsx`, `UnsavedChangesGuard.tsx`, `machineStore.test.ts`. See `decisions.md` **D44**.
- **Code review & bug-fix pass (2026-06-11, uncommitted on `main`):** reviewed the whole project (engines/validator/computation-tree = sound) and fixed the canvas **"merged-edge" family** — a single visual edge bundles many transitions, but delete/cut/edit/select touched only the first, so **deleting a bundled edge left a ghost** (esp. PDAs) and inline edits only changed one symbol set. Now member-aware. Also: **`play()` first step is synchronous** (no input-editable startup window) and returns a bool; **copy/paste carries PDA `read/pop/push`**; **delete/cut/paste gated to idle**; orphan transitions filtered; + low-severity edge cases (Escape clears edit, tree reset on new run, `pointercancel` drag cleanup, toast NaN guard, paste label de-dupe, rename-input width, ε/λ outside-click). See `decisions.md` **D45**.
- New files (shipped in v2.1.0): `store/toastStore.ts` + `layout/ToastContainer.tsx`, `layout/HelpModal.tsx`, `utils/recentFiles.ts`. In the current tree, `historyStore.ts` carries bounded undo/redo snapshots and `machineStore.ts` delegates to it; `AutomataState` gained optional `width`/`height` (resizable text boxes). `examples/*.autolab.json` (sample machines) are kept **local-only / git-ignored**.
- **Verification (current working tree, v4.0):** `tsc --noEmit` clean · ESLint clean · **`npm test` green at 254/254 (19 suites)** (the v3.0 + conversions suites + the two new v4 suites: `engines/fuzz.test.ts` property/fuzz and `utils/fileManager.test.ts` loader-hardening — D68) · `npm run build` clean (pre-existing >500 kB chunk warning only). **`npm run tauri:dev` was eyeballed this session** — the redesigned menu bar / chromed toolbar (D66) and the UX-audit items (D67: accessible dialogs, blocked-run feedback, ε normalization, Shift-marquee + `I`/`F`, δ-default + collapsible panel, witness-trace highlight) were verified live via HMR. CHANGELOG/README parity for the redesign + `I`/`F`/Shift-select shortcuts is done. Optional open items: a `diagramSvg.test.ts`; a small `MenuBar`/`commandStore` interaction test; the three deferred audit items (DISC-5/WFL-2/THY-5) in `TODO.md`. `npx tsc --noEmit` works fine here for type-checks.
- `fsm_format.md` (machine-file JSON spec) at repo root. These 3 internal context docs exist and are git-ignored.
- See `handoff.md` for the current session entry, follow-ups, installer paths, and the git divergence note.

## Landing Page
The app is accompanied by a landing page located at `/page`. It is designed as a professional academic and research software showcase, utilizing a clean layout, grouped Chomsky Hierarchy feature categories, an asymmetrical Bento Box feature structure, and Javascript-driven cursor-tracking spotlight effects. It dynamically fetches release assets and checksums from the GitHub API and serves as the public entry point to the application.
### Structure & Key Files
- **`index.html`**: Structure for the landing page containing sections for features, a live app screenshot/demo preview, technology stack, documentation links, and platform downloads (Windows, macOS, Linux).
- **`styles.css`**: Defines custom HSL design variables, bento box grid layouts, and glassmorphic card effects. Includes cursor-tracking spotlight grid hover highlights.
- **`script.js`**: Orchestrates high-fidelity micro-interactions and scroll handling:
  - **Lenis Scroll**: Smooth inertial scroll initialization and anchor scroll navigation.
  - **GitHub Releases Integration**: Dynamically queries the GitHub API to fetch the latest release versions and download link assets (with file size calculations), and extracts SHA-256 integrity verification hashes from the release notes text to dynamically verify download files.
  - **Scroll Spy**: Highlights top header links as sections intersect the viewport.
  - **Scroll Entrance Animations**: Intersection observer lazy-triggers entrance transitions on feature cards.
  - **Ambient Glow Parallax**: Follows cursor movements with a 5% offset to animate background lighting.
- **Wiki-Driven Documentation**: Instead of serving static markdown subsets out of the `page/` directory, documentation cards now route traffic externally to the official `AutomataLab.wiki` GitHub repository, unifying the source of truth for Architecture, Decision Logs, and File Formats.
- **Dual Vercel Deployments**: The project runs across two separate web endpoints:
  - `automata-lab-one.vercel.app` serves the marketing landing page structure.
  - `automata-lab-sim.vercel.app` serves the restricted interactive Machine
    Studio demo selected by simulator build mode or exact `demo=true` query.


### Recent Updates (Landing Page & Security)
- Implemented security headers in `page/vercel.json`. There is no current
  `security_guidelines.md` file in the repository.
- Polished landing page CSS (baseline alignments, unified monospace typography).
- Secured the Simulator Demo mode by binding UI restrictions to VITE_SIMULATOR_MODE, closing a URL manipulation loophole.
## Recent UI & Simulation Overhaul (2026-06-21 / 2026-06-22)
- **UX Polish:** Heatmap functionality was completely removed. The simulation tape layout was inverted (input string on top, tape on bottom). We added jump-to-start, jump-to-end, and hold-to-fast-forward playback controls. Hover states and transition edges strictly use black/grey colors with all blue highlights/outlines removed. 
- **Animation Strategy:** Replaced physical moving animations with subtle color "flicker" pulses when states/edges process input symbols.
- **Edge Routing & Transitions:** We are currently abandoning single/double-control-point Bezier curves for transition edges in favor of an MS Paint style multi-point spline. A transition is now being refactored to support an arbitrary array of `waypoints`.
- **Phase 5 Workspace Hub Architecture:** Replaced the monolithic `AppLayout` with a hash-based router (`#/`, `#/machine`, `#/grammar`, `#/parser`) that explicitly separates workspaces by academic domain. Introduced the Wireshark-inspired `WorkspaceHub` landing page and specialized split-view layouts for the Grammar Laboratory and Parser Studio. Fixed global flex layout bugs and implemented an anti-trap observer to force correct layout rendering based on the active machine type.
- **Phase 6 Professional Polish (historical design claim):** Earlier notes named
  `useSelectionStore` and `DependencyGraphCanvas`; neither exists in the
  current tree. Current cross-panel synchronization uses
  `traceabilityStore.ts`.
- **Release 7.1 Adoption & Interoperability (corrected as-built state):**
  `historyStore.ts` uses bounded full snapshots keyed by `workspace:tabId`, not
  Immer patches. JFLAP import/export is implemented in `utils/jflap.ts`.
  Export behavior is implemented under `src/utils/` and `ExportModal.tsx`; no
  current `ExportService` exists.
- **UI/UX Resizability & Collision Standardisation (2026-06-25):** Current
  workspace resizing uses `react-resizable-panels`, and route ownership is in
  `machineStore.tabRoutes`; no generic `Splitter` or `tabStore` exists in the
  current tree. The LR conflict and panel-hitbox history is retained.
- **State Integrity & Stability Hardening Sprint (2026-06-24):** A targeted
  stabilization pass addressed tab-history cleanup, stale selection state,
  malformed JFLAP transition references, and parser error containment. In the
  current API, tab close calls `historyStore.clear('machine', tabId)`;
  `utils/jflap.ts` validates transition `from`/`to` IDs. The historical
  `ParsingStudio.tsx` filename is not present in the current tree; parser
  error handling lives in Parser Workspace panels. See decisions D109–D114.
- **UI/UX Resizability & Collision Standardisation (2026-06-25):** Historical
  summary; current resizing uses `react-resizable-panels` and current tab routes
  are stored by `machineStore`.
- **Parser Studio Finalization (2026-06-25):** Fully decoupled Parser state generation, upgraded AST rendering to mrtree for rigorous left-to-right sibling ordering, implemented Maximal Munch for string tokenization in the Lexer, and permanently resolved the App.tsx hash-routing race condition (D124).
- **Edge Routing Engine (2026-06-26):** Implemented a GlobalRoutingEngine for the LR automaton visualization using A* pathfinding with obstacle inflation. Edges now route around states instead of through them. Parallel lane separation prevents overlapping routes. Two-mode architecture (D125): interactive mode reroutes only connected edges during drag; final mode reroutes all edges on drop. Fixed the "Show/Hide Extended Transitions" toggle button (D129). Files: engines/parser/layout/GlobalRoutingEngine.ts, engines/parser/layout/LRLayeredStrategy.ts.
### Parser Studio & Grammar Fixes — 2026-08-13



  - Fixed `ParseTablePanel` so the `Automaton Graph` view is available whenever an LR parse table exists, including conflict-free and conflicting grammars. Header layout prioritizes the view buttons over metadata chips when the panel is narrow/minimized.
  - Added compact self-loop indicators to `LRStateNode` for GOTO transitions that return to the same state; symbols render outside the node's upper-right border.
  - Automaton graphs now default to shortened transition stubs; labels use the explicit `State N` target form, with extended transitions still available through the existing toggle.
  - Replaced the hardcoded active play-button color with the theme token `--trace-ring`.
  - Overhauled grammar RHS tokenization: compact alternatives such as `aaAb` are tokenized as `a`, `a`, `A`, `b`; whitespace-separated tokens remain single symbols, preserving multi-character terminals such as `id`. This fixes the FIRST/FOLLOW tokenization issue caused by the previous greedy lowercase-run regex.
  - Verification after the fixes: **302/302 tests passing** and `npx tsc --noEmit` clean.
### Grammar Tokenizer v5.0.1 — 2026-08-15
  - **Deterministic grammar tokenizer.** Replaced the whitespace/greedy-run heuristic with a source-only lexer: whitespace is the hard symbol boundary, an `[A-Za-z0-9_']` run is one symbol, quoted strings (`"..."`/`'...'`) are one symbol, and epsilon commands + multi-char operators (`<= >= == != && ||`) stay grouped. Symbol boundaries no longer depend on which symbols are declared elsewhere, so `A -> a a A b` can never be mis-tokenized as `aa A b`. `tokenizeGrammarString(str)` no longer takes declared sets (internal breaking change). **Supersedes the 2026-08-13 char-by-char behavior.** See D141.
  - **Input tokenization split out.** Added `tokenizeInputString(str, terminals)` (longest-terminal-match) for parse-input sentences; used by the derivation and ambiguity tabs. See D142.
  - **Quoted terminals + round-trip safety.** Literal `"`, `'`, and `\` terminals now round-trip: `formatSymbol` probes re-tokenization under try/catch and emits an escaped quoted form when needed (`"` → `"\""`, `\` → `"\\"`), fixing a latent crash in CNF/GNF transforms and grouped/flat editor sync. See D143.
  - **Unicode operators.** `→` recognized as arrow; alternatives split on `/[|∣]/`; the grammar editor normalizes `∣` (U+2223) → `|`. Removed tokenization-guessing diagnostics. See D144.
  - **Tests.** Added tokenizer/FIRST-FOLLOW/arrow-separator/quote regression tests plus a new 27-test `engines/parser/integration.test.ts` full-pipeline suite. Grammar + parser suites green; `npx tsc --noEmit` clean; `npm run tauri:dev` builds and launches.
## Current session update — 2026-08-26
- A2–A4 stabilization is complete: canonical parser/batch tokenization, BOM-safe and version-validated suite imports, stale-result invalidation, trace-aware scoring, cooperative UI yielding, accurate retained-history/tape exports, and manifest-backed ZIP bundles across all workspaces.
- Parser Studio now has hover/click information popovers for algorithm statistics and augmented root, Play initializes fresh runs after input edits, and the right-side tab bar has stable spacing with horizontal overflow and dark-mode scrollbar styling.
- Mealy labels parse `input / output` pairs correctly. Moore output fields update reactively while typing. Mealy/Moore are output-only: final-state controls, final-state styling, and accept/reject language logic are disabled; full input consumption reports `completed` and no acceptance verdict.
- Verification baseline: 42 Vitest files / 530 tests passing, clean `npx tsc --noEmit`, and successful `npm run build` with only existing non-blocking Vite warnings.
- Product direction at that date: Phases B and D were skipped and Phase C was
  pending. Phase C is now implemented in the current working tree.

## Current working-tree update — 2026-09-05

### Phase C

- Type 0/1 grammar representation, Chomsky classification, and format
  validation are implemented without passing non-CFG grammars into CFG-only
  algorithms.
- Bounded derivation search returns `FOUND`, `NOT_FOUND_WITHIN_LIMIT`,
  `RESOURCE_LIMIT`, or `CANCELLED`; the interactive path uses
  `engines/grammar/derivationWorker.ts`.
- TM watchers cover state, head symbol/position, step, tape window, and AND/OR
  groups. They are transient per-tab and gate automatic play, not manual Step.
- `MTM` implements one physical tape, vector cells, and one shared head.
- Hierarchical TM calls use embedded child snapshots, shared tapes, explicit
  call/return frames, and depth/step guards.
- NLBA uses a bounded nondeterministic frontier and implements `TreeProvider`.

### Grammar and machine conversion

- Regex→Type-3 grammar follows Thompson ε-NFA → DFA subset construction →
  DFA minimization → right-linear grammar emission.
- Current ordinary conversions include ε-elimination, subset construction,
  minimization, Regex→NFA, CFG→PDA, Mealy↔Moore, and regular-grammar
  conversions. PDA→CFG and DFA/NFA→Regex are not implemented in the current
  tree.
- Type 2 can target NPDA directly and bounded NLBA/TM recognizers; Type 1 can
  target NLBA/TM; Type 0 can target TM.

### Correctness invariants confirmed by tests

- PDA stack top is the last array element; pushing `aZ` leaves `a` on top.
- TM sparse missing cells are blank and `S` writes without moving.
- TM-family loop identity includes tape content.
- Unicode validation counts code points.
- Deterministic terminal engine results remain stable after halting.
- NPDA/NLBA frontier overflow is `stuck` unless an accepting branch has already
  been found.

### Hosted demo

- Demo mode is selected by `VITE_SIMULATOR_MODE=true` or exact query parameter
  `demo=true`.
- The public boundary remains DFA, NFA, ε-NFA, DPDA, NPDA, TM, LBA and four
  examples. Full-workspace transducers, MTM, NLBA, watcher, and submachine
  controls are hidden.
- Landing links target `/simulator?demo=true`.
- Tape head centering now scrolls only its row, toolbar overflow is contained,
  and demo mode omits the unsaved-exit prompt.
- These fixes remain local until Vercel is redeployed.

### Verification

- `npm test`: **58 test files / 645 tests passed**.
- Standard production build: passed.
- `VITE_SIMULATOR_MODE=true` production build: passed.
- Existing Vite chunk-size and mixed-import warnings remain non-blocking.

### Known discrepancy

`capabilities.ts` and `NLBAEngine` support computation-tree lineage, but
`core/utils.ts::supportsComputationTree()` omits NLBA. SidePanel and
ExportModal use that older helper, so the NLBA Tree tab and tree export can be
absent.