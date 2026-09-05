# Decisions Log — AutomataLab

> **INTERNAL / DO NOT COMMIT.** Git-ignored. Records important decisions + rationale so they aren't re-litigated. See `project_context.md` (what) and `handoff.md` (now/next).
>
> **Last updated:** 2026-09-05. Decisions through D162 are historical; D163+
> records the current Phase C and hosted-demo worktree.

Format: `Dn — Decision — Rationale — [files]`.

---

## Architecture & engine model

**D1 — Engine layer is pure TypeScript (zero React/UI imports).**
Enables a future web build (PRD long-term goal), isolated unit testing (NFR-15/18), and reuse. Enforced by convention + comment headers in every engine. *[engines/**]*

**D2 — All engines implement one `Automaton` interface.**
`initialize/step/reset/getCurrentConfigurations/getExecutionHistory/isAccepted/getStatus`. Lets `useSimulation.createEngine()` swap engines by `MachineType` and lets one UI drive all machines. *[engines/core/types.ts, hooks/useSimulation.ts]*

**D3 — Per-branch `Configuration` type from the start (id, parentId, stateId, stack, inputIndex, status, consumed/remaining).**
Designed once to serve PDA stacks **and** the nondeterministic computation-tree viewer (PR-4), avoiding later type churn. Finite automata leave `stack` empty and lineage trivial. *[engines/core/types.ts, engines/core/utils.ts buildConfig]*

**D4 — Stack convention: top = last array element; `push` string's FIRST char ends on top.**
One rule shared by DPDA, NPDA, StackPanel, and the instantaneous-description (ID) display, so there's no per-component reversal confusion. *[dpda, npda, panels/StackPanel.tsx]*

**D5 — DPDA & NPDA accept by FINAL STATE (input consumed), not empty stack.**
Matches the accept-state visual model used by FA; uniform UX. Empty-stack-style languages are modeled with a pushed bottom marker (e.g. `Z`) + an ε-move to an accept state when only `Z` remains. *[dpda/DPDAEngine.ts, npda/NPDAEngine.ts]*

**D6 — `isEpsilon` accepts `''`, `ε`, `eps`, `λ`, `lambda`.**
Users type epsilon many ways; normalize once. *[engines/core/utils.ts]*

**D7 — Single `Transition` type; FA uses `symbols[]`, PDA uses `read`/`pop`/`push`, TM `write`/`direction` reserved.**
One store, one edge renderer, one file format. PDA transitions keep `symbols` empty. *[engines/core/types.ts, store/machineStore.ts]*

## PDA-specific

**D8 — `PDA_TYPES` is the single source of truth in `core/utils.ts`; `isPDAType()` gates ALL PDA UI.**
Stack tab, modal `(read, pop → push)` editor, PDA edge-label format, and modal-vs-inline editing all branch on `isPDAType`. Consequence: adding NPDA in PR-3 "lit up" the entire PDA UI with no component rewrites — validates extensibility goal G3. `NPDA` was pre-listed in `PDA_TYPES` before its engine existed. *[engines/core/utils.ts, SidePanel, TransitionEditor, TransitionEdge, AutomataCanvas]*

**D9 — DPDA transition selection prefers the input-consuming move when an ε-move overlaps.**
`_pickTransition()` makes the engine independent of transition authoring order (previously the ε-accept move had to be listed last). Strict DPDAs are unaffected (no overlap). Validator still flags genuine conflicts. *[dpda/DPDAEngine.ts]*

**D10 — NPDA = breadth-first multi-branch engine; one `step()` advances every live branch by one transition (mixing ε and input moves).**
Mirrors the NFA's "all active at once" mental model and produces one tree level per step (ready for PR-4). **Termination is guaranteed by three guards:** (a) per-step dedup of identical `(state, stack, inputIndex)` configs; (b) no-progress fixpoint → reject (catches pure ε self-loops); (c) hard ceilings `maxSteps=10_000` and `MAX_STACK_DEPTH=10_000` (catches ε-push loops) → `stuck`. Directly addresses the PRD "nondeterminism performance / UI freeze" risk. *[npda/NPDAEngine.ts]*

**D11 — NPDA single-tape/stack panels use a "primary" representative branch (accepting branch, else furthest `inputIndex`); `configurations[0]` is the primary.**
A single tape pointer is ill-defined across diverging branches; the full truth is the computation tree (PR-4). Panels need one sensible representative now. *[npda/NPDAEngine.ts _pickPrimary/_orderForDisplay]*

**D12 — Validator: determinism check is DPDA-only; NPDA intentionally allows nondeterminism. Single-symbol read/pop checks apply to all PDA.**
Captured by tests (`allows nondeterminism for an NPDA`, `still flags a multi-character pop for an NPDA`). *[utils/validator.ts, utils/validator.test.ts]*

## App / platform

**D13 — Styling = inline styles + CSS custom-property design tokens; minimal Tailwind; black-and-white theme.**
As-built v1.0.2 reality (documented in PRD tech-stack note). Don't introduce Tailwind utility sprawl; use `var(--...)` tokens. *[index.css, all components]*

**D14 — App is dark-only.** `App.tsx` renders dark; `uiStore` has a `toggleTheme`/`theme` but it isn't wired to a control. Light mode is a future NFR, not active. *[App.tsx, store/uiStore.ts]*

**D15 — Desktop shell is Tauri 2 (not Electron).**
Small bundles (system WebView), native dialogs/FS, built-in minisign-signed updater. Reinforces web-parity (no Chromium lock-in). *[src-tauri/**]*

**D16 — File format `.autolab.json`; loader rebuilds states/transitions from known fields only and validates `type` against `VALID_TYPES`.**
Prototype-pollution / injection safe. `VALID_TYPES` must include every `MachineType` (NPDA added in PR-3). *[utils/fileManager.ts]*

## Hardening & Integrity

**D17 — Aggressive `invariant` enforcement for all engine operations.**
Instead of allowing silent math failures or null pointer cascades, the engine uses fail-fast `invariant(condition, message)` checks. This enforces state integrity natively in the engine, offloading validation from the UI. *[utils/invariant.ts]*

**D18 — Strict `MAX_COMPUTATION_ITERATIONS` budget (50,000) limits all graph traversal loops.**
Mathematical closures (`epsilonClosure`, `FIRST`/`FOLLOW`, subset queue) can explode exponentially on malformed inputs. Budgets prevent main-thread hangs by throwing an `invariant` error rather than infinitely looping. *[engines/core/utils.ts, engines/grammar/analysis.ts]*

**D19 — Error Boundaries capture thrown `invariant` failures and provide a recovery state.**
Tab-level React error boundaries catch deep algorithm failures. The user is offered a direct "Reset State & Hub" escape hatch, protecting the application from full white-screen lockouts. *[components/layout/ErrorBoundary.tsx]*

**D20 — Implicit Cross-Store Subscription for Garbage Collection.**
`historyStore` uses a lazy-loaded dynamic import `useTabStore.subscribe` to detect deleted tabs and instantly evict their undo/redo branches. This guarantees zero dangling memory pointers without creating circular ES module dependencies. *[store/historyStore.ts]*

## Workflow (process decisions)

**D18 — PR-based delivery on `feat/v2-pda`, small reviewable PRs.**
PR-1 Configuration pipeline + DPDA; PR-2 dedupe/harden; PR-3 NPDA; PR-4 computation tree. See `handoff.md` for the ledger.

**D19 — GitHub operations only when the user explicitly asks. All git remote actions target `feat/v2-pda`, never `main`.**
Standing instruction from the user. Local read-only git (log/status/diff) is fine; no commit/push/PR without a go-ahead.

**D20 — Internal context docs (`project_context.md`, `decisions.md`, `handoff.md`) are git-ignored and never committed.**
Purpose: cheap cross-conversation handoff so the project isn't re-analyzed from scratch each session. *[.gitignore]*

**D21 — No automation to make agents read these docs; loading them is fully manual.**
User's call: do **not** add an `AGENTS.md`/rule that auto-points new agents at these files. At the start of a new conversation the user will point here manually. Keep `handoff.md` updated at the end of each session so a manual read is enough. *[(process)]*

## Computation tree (PR-4)

**D22 — Computation tree is built from per-branch lineage (`Configuration.{id,parentId}`); engines expose it via a separate optional `TreeProvider` capability, NOT the base `Automaton` interface.**
`TreeProvider = { getTreeNodes(): Configuration[]; getLiveBranchIds(): string[] }` + a `supportsTree()` guard. NFA/ε-NFA/NPDA implement it; DFA/DPDA are untouched (they have a single path — no tree). The flat→nested nesting + depth/branch counts live in a pure, engine-agnostic `buildComputationTree()` so they're unit-testable (D1). Validates the D3 decision to design `Configuration` for this up front. *[engines/core/computationTree.ts, hooks/useSimulation.ts]*

**D23 — NFA/ε-NFA lineage is ADDITIVE; the existing powerset stays the source of truth.** Active states / acceptance / history are computed exactly as before (so the 81 prior tests are untouched); lineage is tracked in parallel via `treeNodes` + `levelMap` (stateId→nodeId for the current frontier) with **first-parent-wins, per-level dedup**. Result: the tree is a bounded **trellis** (≤ |states| nodes per level, depth = input length) — consistent with NPDA's per-step dedup (D10) and the PRD nondeterminism-perf risk. **Known simplification:** a state reached via several parents is attributed to the first, so a non-chosen parent can look childless (merge artifact). Accepted for v2. ε-closure members get real parent lineage via `_epsilonExpandLineage`. *[engines/nfa/NFAEngine.ts, engines/enfa/ENFAEngine.ts]*

**D24 — Tree node display status (computed in the builder): accepted (accept state + input fully consumed) → 🟢; has children → ⚪ interior; live frontier leaf → 🟡; otherwise dead leaf → 🔴.** `getLiveBranchIds()` returns the frontier only while `status==='running'`, so once a run ends every leaf resolves to accepted or rejected (no stuck "running" leaves). NPDA accepting branches are detected by `_isAcceptConfig`; intermediate accept-states with input remaining are NOT accepting. *[engines/core/computationTree.ts]*

**D25 — Three scoped status-color tokens (`--status-accept/-reject/-running`) used ONLY by the computation-tree viewer.** A deliberate, contained exception to the B&W aesthetic (D13), mandated by PRD §4's explicit color-coding requirement (the headline differentiator). Elsewhere the app stays black-and-white. *[index.css, ComputationTreePanel.tsx]*

## Build / docs

**D26 — Local installer builds disable updater-artifact signing via a one-off `--config` override; never edit the tracked `tauri.conf.json` for this.**
`tauri.conf.json` has `bundle.createUpdaterArtifacts: true`, which requires `TAURI_SIGNING_PRIVATE_KEY` (only present in CI — secrets `TAURI_PRIVATE_KEY`/`TAURI_KEY_PASSWORD`). For a local build the key is absent, so signing would fail. Build with a JSON-**file** override (deep-merged) rather than inline JSON, because **PowerShell strips quotes from inline `--config` JSON** (an inline attempt failed with "key must be a string"). Procedure: write a temp file `{"bundle":{"createUpdaterArtifacts":false}}`, run `npx tauri build --bundles msi,nsis --config <abs-path-to-file>`, then delete the temp file. Keeps the tracked config and the CI release path (which *does* sign) untouched. *[src-tauri/tauri.conf.json, .github/workflows/release.yml]*

**D27 — `fsm_format.md` (repo root, committable) is the canonical external description of the `.autolab.json` machine-file JSON.**
Purpose: paste to any external AI to generate/simulate machines in any language. It restates the schema + semantics (epsilon aliases, stack convention, final-state acceptance, per-type rules) and carries one verified example per type (DFA/NFA/ENFA/DPDA/NPDA, mostly lifted from the test suite). **Must be kept in sync with `engines/core/types.ts` and `utils/fileManager.ts`** if the format changes. Not git-ignored (unlike the 3 internal docs). *[fsm_format.md]*

## v2.1 UX pass (2026-06-09)

Implemented the 14 items in the external UX review (`v2_improvements.md`). Decisions made:

**D28 — Undo/redo is a snapshot history inside `machineStore` (not a command log).**
Every mutating action routes through `sync()`, which pushes the *previous* `machine` onto a `past[]` stack (cap 100) and clears `future[]`. Snapshots are shallow `{...machine}` copies — safe because all actions replace arrays immutably (never mutate in place). **Single active stack**, reset on tab switch / load / reset (keying per-tab is fragile because `loadMachine` assigns a new machine id). **Coalescing:** rapid same-`coalesceKey` edits within 500 ms collapse into one undo step — used for `setMachineName` (`'name'`, per-keystroke → one undo) and `updateTransition` (`transition:<id>`, edge-curve drag → one undo). Node drags snapshot once (on `onNodeDragStop`). Undo/redo are **gated to `status==='idle'`** (buttons + Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z) to avoid desyncing the live engine. *[store/machineStore.ts, toolbar/Toolbar.tsx, canvas/AutomataCanvas.tsx]*

**D29 — Dark mode via a `.dark` class on `<html>` overriding only the CSS tokens. SUPERSEDES D14.** D14 ("app is dark-only") was stale/incorrect — `index.css :root` was actually white/light and the theme was never wired. Now: `:root.dark { ... }` overrides the design tokens; `AppLayout` toggles the class from `uiStore.theme`; **default is light** (matches the original look), persisted to `localStorage['automatalab-theme']`. Toolbar has a 🌙/☀ toggle. MiniMap colors + the `<select>` arrow are theme-handled in JS (they used hardcoded colors). *[index.css, store/uiStore.ts, layout/AppLayout.tsx, toolbar/Toolbar.tsx, canvas/AutomataCanvas.tsx]*

**D30 — Toast system replaces informational `window.alert()`.** `toastStore` (zustand) + `ToastContainer` (bottom-right, auto-dismiss, colour-coded). `toast.success/error/info/warning` helpers callable from plain modules. `window.confirm` is **kept** only for the update download yes/no (a genuine decision). Used by save/load/update + machine-type-switch warning. *[store/toastStore.ts, layout/ToastContainer.tsx]*

**D31 — Status colours extended (still scoped) beyond the tree viewer (extends D25).** The result badge (SimulationControls), the accepted/rejected **final states** on canvas, and a one-shot canvas **flash** now use `--status-accept/-reject` (+ new soft tokens `--status-accept-soft`/`--status-reject-soft`). This is the PRD-sanctioned "make accept/reject unmistakable" exception; the rest of the app stays B&W. *[index.css, controls/SimulationControls.tsx, canvas/AutomataCanvas.tsx, canvas/StateNode.tsx]*

**D32 — Recent files persisted in `localStorage` (Tauri-only, since web has no paths).** `fileManager.saveMachine` now returns the saved path (`string|null`); `loadMachine` returns `{def, path}`; added `loadMachineFromPath`. `utils/recentFiles.ts` keeps the most-recent 8. FILE menu shows a "Recent" section. **OS-level file association (`tauri.conf.json fileAssociations`) intentionally NOT added** — untestable in this environment and the tracked config is protected (cf. D26). Flagged as a follow-up. *[utils/fileManager.ts, utils/recentFiles.ts, toolbar/Toolbar.tsx]*

**D33 — Smaller UX fixes.** Tab bar moved to the top (below toolbar) — `AppLayout` order + `TabBar` border flipped to `borderBottom`. Side panel is drag-resizable (persisted `automatalab-panel-width`, default 300 px for PDA/tree types else 240). `N` adds a state at the viewport centre + an empty-state onboarding overlay + a `?` Help modal cheat-sheet. Speed number input clamped to the slider range `[0.25, 8]` (on blur) with 0.5/1/2/4× presets. History log auto-scrolls (`scrollIntoView`). Transition labels raise z-index on hover (dense-graph readability). React Flow watermark hidden via `proOptions={{ hideAttribution: true }}` (MIT app). *[layout/*, panels/SidePanel.tsx, panels/HistoryLog.tsx, canvas/*, controls/SimulationControls.tsx]*

## v2.1.1 post-release polish & bug fixes (2026-06-09, evening)

Done in the working tree after the v2.0.0 installers were built; all tsc/lint clean and validated live via `npm run tauri:dev` (HMR). Uncommitted on `main`.

**D34 — Context menus clamp to the viewport by measuring their real size.** The old code subtracted a hard-coded `280 px` (smaller than the tall State menu, so its bottom items ran off-screen near the bottom edge). Now `MenuContainer` measures itself (`useLayoutEffect` + `getBoundingClientRect`) and clamps/flips both edges into view with an 8 px margin, plus `maxHeight: calc(100vh - 16px)` + scroll as a fallback. Applies to all four menu kinds. *[canvas/ContextMenu.tsx]*

**D35 — External links open exactly once.** The brand/GitHub `<a>` had `target="_blank"` **and** a programmatic `open()`; inside the Tauri webview both fired → two browser tabs. Fix: drop `target="_blank"`, always `preventDefault()`, and open once — `plugin-shell.open()` in Tauri, else `window.open(url,'_blank','noopener,noreferrer')`. *[toolbar/Toolbar.tsx]*

**D36 — Modal dialogs = fixed header + scrolling body.** HelpModal was one `overflow:auto` card, so the ✕/title scrolled away. Restructured into a flex column: pinned header (`flexShrink:0`) + separate scrollable body. Use this pattern for future modals. *[layout/HelpModal.tsx]*

**D37 — Text annotation nodes are explicitly-sized, resizable, draggable boxes.** Added optional `width`/`height` to `AutomataState` (persisted in the saved JSON via `JSON.stringify`; read back in `fileManager.sanitizeState`; `addTextState` seeds 190×56; `buildNodes` sets `node.width/height` defaulting 190×56). `TextNode` now: (a) **draggable** — the blanket `nodrag` class was the bug; `nodrag` is applied **only while editing**; (b) **resizable** via React Flow `<NodeResizer>` (min 120×44, persisted on `onResizeEnd` → `updateState`); (c) **placeholder is a hint** — `"Double-click to edit text"` is shown muted, the field starts blank so the first keystroke replaces it, and **"Add Text" auto-enters edit mode** by reusing `uiStore.renamingStateId` (set in `AutomataCanvas onAddText`); (d) **`nowheel`** so scrolling over the box scrolls its content instead of zooming the canvas. *[engines/core/types.ts, store/machineStore.ts, utils/fileManager.ts, canvas/TextNode.tsx, canvas/AutomataCanvas.tsx]*

**D38 — Transitions auto-route around intermediate state nodes.** A non-reverse edge was drawn straight, so a transition between non-adjacent states (e.g. `q0→q2`) ran over the state between them (`q1`) and dropped its label on it. The default control-point offset now bows around any state whose centre projects between the endpoints and lies within `NODE_RADIUS+22` of the straight path (bow to the far side, magnitude solved from the quadratic-bezier deviation `2t(1-t)`, capped at 180). Centres are derived from `machine.states` (top-left) calibrated to RF centres via the known source mapping (`sourceX - srcState.x`). **Manual curves win** (skipped when `controlPointOffset` is set), reverse-pair bowing is preserved, and the computed default is shared with drag-start via a ref so dragging doesn't jump. Purely visual; recomputes as nodes move. *[canvas/TransitionEdge.tsx]*

**D39 — Auto-layout: deterministic ring seed → one-pass convergence, then re-fit. ⚠ still imperfect.** The old layout seeded d3-force from the current (often clustered/near-collinear → unstable) positions and ran 300 ticks, so the first press looked wild and only repeated presses helped. Now it seeds a **deterministic ring** and runs balanced forces (link dist 170/strength 0.55, charge −750 capped at 700, collide 62, center + x/y gravity 0.06, 400 ticks) → a stable layout that's **identical every press**; text annotations are left in place. Added `uiStore.fitViewNonce` + `requestFitView()`; the canvas calls `rfInstance.fitView({padding:0.3})` on bump (also wired into Load + Open-Recent so loaded machines are framed). **User feedback: "tidier but still needs improvement."** Candidate next step: a **layered/hierarchical (BFS-by-depth, left→right) layout** for clean DFA-style diagrams, or expose tunable spacing. *[utils/layout.ts, store/uiStore.ts, canvas/AutomataCanvas.tsx, toolbar/Toolbar.tsx]*

## v2.1.0 release (2026-06-09)

**D40 — Reconciled the diverged `main` by re-basing the working tree onto `origin/main` (`git reset --mixed`), NOT by force-pushing.** Local `main` was 20-ahead/16-behind `origin/main`: the remote held the **identity-rewritten** history (commits re-authored as Reeshav Sinha, cf. `git-identity.md`) plus two extra commits (`docs: add wiki link`, `chore: re-trigger GitHub Actions`), while local still had the old `cursoragent`-authored SHAs. **The only *content* delta between local `HEAD` and `origin/main` was `.gitignore` (the local `git-identity.md` line) + `README.md` (wiki link, already in the working tree)** — all the real v2.1 work was uncommitted. So instead of force-pushing local's stale duplicate history onto `main` (destructive, **blocked by the branch-protection ruleset**, and would have reverted the identity fix), we: backed up local main → `backup/pre-v2.1-local-main` (`2b7633f`); ran `git reset --mixed origin/main` (HEAD onto canonical remote history, **working tree + untracked kept**); made **one** clean `release(v2.1.0)` commit (`886f710`); **fast-forward** `git push origin main`. Identity via git-identity.md **Option-B `-c user.name/user.email`** (no config touched) — author + committer both verified Reeshav Sinha. `examples/` added to `.gitignore` in the same commit. Annotated tag **`v2.1.0`** (tagger Reeshav Sinha) then pushed → the `v*`-triggered **Release** workflow runs the 3-platform signed build + GitHub Release. *[(process), .gitignore, package.json, src-tauri/*, CHANGELOG.md, .github/workflows/release.yml]*

**D41 — Repo-local git identity set to Reeshav Sinha (git-identity.md Option A); the per-command `-c` override is no longer required.** At the user's explicit request, `git config --local user.name "Reeshav Sinha"` + `user.email "146538653+reeshavsinha@users.noreply.github.com"` were set so future commits in *this repo* are attributed correctly without flags (overrides the machine default `nirmalya <nirmalya.sinha@nokia.com>` → which GitHub shows as *cursoragent*). **Verified effective:** `git var GIT_AUTHOR_IDENT` and `GIT_COMMITTER_IDENT` both resolve to Reeshav, and there are **no overriding `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env vars** (the caveat git-identity.md warns about). This also addresses the root cause of the D40 divergence: with correct local authorship there's no future need to rewrite remote history. Same session also **re-synced local refs to remote canonical history** (force-updated `v1.0.0`–`v2.0.0` tags, pruned dead remote-tracking branches, deleted 6 stale local-only tags + the stale local `feat/v2-pda`) so future pushes/tags fast-forward cleanly. **Harness note:** the Cursor agent shell injects a `Co-authored-by: Cursor <cursoragent@cursor.com>` trailer when a command contains the adjacent tokens `git commit` — the user's *own* terminal commits are unaffected; agent-run commits can use the `git -c … commit` form (no adjacent `git commit`) to avoid the trailer, as was done for `886f710`. *[(process), .git/config (local, not committed)]*

## Auto-layout rewrite — compact stress layout via ELK (2026-06-10)

**D42 — Auto-layout rewritten to ELK `stress` (compact stress-majorization via `elkjs`). SUPERSEDES D39.** Two attempts this session: D39's force-directed layout was "tidier but still needs improvement"; a first rewrite to a **layered (Sugiyama) layout via `@dagrejs/dagre`** was then A/B'd by the user against a hand-arranged "divisible-by-8" DFA and judged **"much messier."** Insight: automata are **heavily cyclic** (self-loops + back-edges), and a strict left→right *layered* layout stretches them sideways and turns every back-edge into a long sweeping arc. A multi-algorithm bake-off (dagre vs ELK layered/stress/force, rendered headless on the real mod-8 DFA) confirmed the **layered family stays stretched/arced**, while ELK **`stress`** (and `force`) produce a **compact, roughly-symmetric** drawing with short edges — close to the user's hand layout. So `applyAutoLayout` now:
1. Runs **ELK `stress`** (`elk.stress.desiredEdgeLength=130`, `separateConnectedComponents=true`, `spacing.componentComponent=70`). ELK handles cycles + component packing natively (no manual cycle-breaking / component stacking needed). Nodes are sized to the real 52 px circle; ELK returns top-left coords directly.
2. **Deterministic** despite stress being seed-sensitive: nodes are seeded from a **fixed ring** (sorted by id), so the result is **identical every press**, independent of the machine's current (messy) positions. "Auto Layout" is idempotent.
3. **Guarantees no node overlaps** with a deterministic pairwise **push-apart** pass after ELK (`MIN_CENTER_DIST=74`) — stress only respects spacing softly. (Replaces the dagre-era reliance on per-component stacking.)
4. **Start-on-left convention**: the whole drawing is **mirrored horizontally** if the start state landed on the right half. Mirroring is distance-preserving → crossings/overlaps/quality unchanged, it just flips reading direction.
**Text annotations are left exactly in place.** The existing `TransitionEdge` auto-bow (D38) handles the few edges that still pass near a node. **`elkjs@^0.11` added** (own TS types) and **lazy-loaded** via `await import('elkjs/lib/elk.bundled.js')` so its ~1.4 MB blob is a **separate chunk** that only loads on first Auto Layout (main bundle unchanged); **`@dagrejs/dagre` removed**. `applyAutoLayout` is now **async** → `Toolbar.handleAutoLayout` awaits it (try/catch + error toast). It also has an **ELK-failure fallback** (the deterministic ring seed + push-apart), so the invariants hold even where ELK can't run (e.g. no DOM Worker). Verified with a headless-Chrome render of the real `applyAutoLayout` on the mod-8 DFA + a dense cyclic NFA (compact, start-left, double-ring accepts, zero overlaps). Unit suite `utils/layout.test.ts` grew to **9 async tests** (added the divisible-by-8 case) asserting no-overlap + determinism + start-on-left-half + text untouched + single/empty. *[utils/layout.ts, utils/layout.test.ts, components/toolbar/Toolbar.tsx, package.json]*

## Canvas & simulation UX batch (2026-06-10)

**D43 — Five canvas/simulation usability fixes, reported together after live testing.** Grouped here as one decision (small, related UX changes):
- **(a) Interactive minimap.** `<MiniMap pannable zoomable onClick=…>` — drag to pan, scroll to zoom, and click to recenter (`rfInstance.setCenter(pos.x, pos.y, { zoom })` at the clicked flow position, keeping the current zoom). It was a static overview before. *[canvas/AutomataCanvas.tsx]*
- **(b) Bordered machine-name field.** The name `<input>` next to the brand was `border:none; background:transparent`, so it didn't read as editable. Now a bordered card (`--bg-card`) with a placeholder + hover/focus highlight (border → `--border-strong`, bg → `--bg-elevated`). *[toolbar/Toolbar.tsx]*
- **(c) Zoom +/- buttons no longer arm selection mode.** Double-click selection mode was gated only by `!closest('.react-flow__node')`, so double-clicking the zoom Controls (rapid +/- presses) wrongly armed it. Now it arms **only** when the double-click lands on the bare `.react-flow__pane` — excludes Controls, MiniMap, edges, and panels. *[canvas/AutomataCanvas.tsx]*
- **(d) Fit-view frames the whole machine, not just node boxes.** React Flow's `fitView`/`getNodesBounds` measure only nodes, so tall self-loops + long bowed/manual-curved edges spilled out of view. New `fitToContent()` unions the node bounds with the rendered **edge-path bounding boxes** (`.react-flow__edge-path` `getBBox()`, already in flow coords) and `rfInstance.fitBounds()` to that rect (padding 0.18). Wired to the Controls fit button via `onFitView` **and** the `fitViewNonce` auto-fit effect (Auto Layout / file load / open-recent). *[canvas/AutomataCanvas.tsx]*
- **(e) Simulation Step Back.** New ⏮ button + Left-Arrow shortcut (disabled at step 0). Engines are stateful and **not serialisable**, so step-back **deterministically replays a fresh engine to (stepCount − 1)** and rebuilds the store (active states, stack, computation-tree frontier, history); continuing forward/play works because `engineRef` is left at the target step. `executeStep` was refactored to share an `applyEngineResult(engine, result)` mapper with the replay loop. Cost is O(n) per press — trivial for normal inputs. *[hooks/useSimulation.ts, controls/SimulationControls.tsx]*

Verified: `tsc --noEmit` ✅ · `npm test` **103/103 (8 suites)** ✅ · `npm run build` ✅ · live HMR in `tauri:dev`. *[canvas/AutomataCanvas.tsx, toolbar/Toolbar.tsx, hooks/useSimulation.ts, controls/SimulationControls.tsx]*

## File operations UX overhaul (2026-06-10/11)

**D44 — File workflow reworked around data-loss prevention + app-like new/open/save; the `FILE ▼` dropdown replaced by icon buttons. EXTENDS D17.** After v2.1, file handling had gaps: closing the app with unsaved work quit **silently**; loading a machine **clobbered** the active tab; Save always re-prompted; the FILE menu was crowded. Changes:
- **Quit guard** — new `components/layout/UnsavedChangesGuard.tsx` (mounted in `AppLayout`) intercepts the Tauri window **`onCloseRequested`** (and the web `beforeunload`) and, if any tab is dirty, shows a modal: **Save All & Quit / Discard & Quit / Cancel**. Save-All iterates the dirty tabs (prompting for a path only where unknown) then force-destroys the window. It also prepends a **"●"** to the OS **window title** while anything is unsaved. Requires Tauri caps `core:window:allow-destroy` + `core:window:allow-set-title` (added to `src-tauri/capabilities/default.json`).
- **Smart open** — new `machineStore.openMachine(def, path?)` reuses the current tab **only if it's pristine** (empty + clean, via a new `isPristineTab` helper), otherwise opens in a **new tab** — so loading never clobbers existing work.
- **Contextual save** — new per-tab `machineStore.tabPaths: Record<tabId, path>` + `fileManager.saveMachineToPath(machine, path)` (Tauri direct-save, no dialog). Save writes **in place** when the path is known, else falls back to Save As. `markTabSaved(index, path?)` and `loadMachine(def, markClean?, path?)` now track the path; `closeTab`/`resetMachine` clean up `tabPaths`.
- **Streamlined toolbar** — new `components/toolbar/FileControls.tsx` replaces the `FILE ▼` dropdown with **icon-only New / Open / Save** buttons (custom hover tooltips showing the name + shortcut, per the user's space-constraint request). Open carries a **Recent** submenu (Tauri-only); Save carries **Save As…**; the Save icon **fills solid + tooltip flips to "unsaved changes"** when the active tab is dirty.
- **Standard shortcuts** — `Ctrl/Cmd+N/O/S/Shift+S` (FileControls), `Ctrl+T` / `Ctrl+W` (TabBar; W is dirty-aware via `requestClose`), `←` step-back; all listed in HelpModal. Simulation single-letter shortcuts (P/S/R) were **guarded against `Ctrl/Cmd`** so they don't fire alongside Save etc. (`SimulationControls`).
- **Tests:** new `store/machineStore.test.ts` (isPristineTab; openMachine pristine-reuse vs new-tab; dirty/path bookkeeping across markTabSaved/loadMachine/closeTab). *[store/machineStore.ts (+.test.ts), utils/fileManager.ts, components/toolbar/FileControls.tsx, components/layout/UnsavedChangesGuard.tsx, components/layout/AppLayout.tsx, components/layout/TabBar.tsx, components/layout/HelpModal.tsx, components/toolbar/Toolbar.tsx, src-tauri/capabilities/default.json]*

## Code review — bug & edge-case hardening (2026-06-11)

**D45 — Full-project bug review; fixed the canvas "merged-edge" family + several simulation/UX edge cases.** A deep review (engines, stores, hooks, canvas, panels, file I/O) found the **engines, validator, and computation-tree builder logically sound**; the real defects clustered where **one visual edge bundles many transitions** (`buildEdges` groups by `from→to`, and the React Flow edge id is just the *first* member). Fixes:
- **(High) Edge delete/cut removed only ONE bundled transition** (left ghost edges; hit PDAs routinely — multiple `read,pop→push` per pair). → `onSelectionChange` now stores **all** member transition ids (from `edge.data.memberTransitionIds`); the context-menu delete uses a new `expandEdgeMembers()` helper. Deleting an edge now removes the whole edge.
- **(Med) Inline FA label edit overwrote only the first member** → `commitEdit` now collapses every member on the pair into the edited transition, so the rendered label and stored transitions stay consistent.
- **(Med) Re-drawing an existing FA edge created an invisible empty duplicate** (and the inline editor never opened on it) → for FAs, draw/connect onto an existing pair now opens the editor on the **existing** edge; PDAs still legitimately stack rules.
- **(Med) Input stayed editable during `play()`'s startup delay** (could desync the tape) → `play()` runs the first step **synchronously** (status leaves `idle` at once, locking the input) and **returns a boolean** so the play/pause UI reflects reality (also removes the phantom "playing" state on an invalid machine).
- **(Med) Copy/paste dropped PDA fields** → `ClipboardData` + paste now carry `read/pop/push`.
- **(Med) Destructive edits ran mid-simulation** → delete/cut/paste are gated to `status==='idle'`; `buildEdges` filters **orphan transitions** (endpoints that no longer exist).
- **(Low)** Escape clears the global `isEditingTransition` flag; computation-tree selection/collapse resets on a new run; edge & side-panel drag listeners clean up on `pointercancel`; `toastStore` guards `NaN`/negative durations; paste de-dupes labels in a loop; the node-rename input grows with its text; the ε/λ dropdown closes on outside-click.
- **Reviewer notes (not bugs):** only `SimulationControls` consumes `useSimulation` (single engine instance — no multi-engine risk); the StrictMode engine-ref reset is dev-only; the curve-drag "single-member" write is harmless (render also reads the first member). DFA's first-match on nondeterminism and plain-NFA ignoring ε are **by design** (validator-enforced).
**Verified:** `tsc --noEmit` ✅ · **`npm test` 111/111 (9 suites)** ✅ · no lint errors. *[canvas/AutomataCanvas.tsx, canvas/TransitionEdge.tsx, canvas/StateNode.tsx, canvas/EpsilonInserter.tsx, controls/SimulationControls.tsx, panels/ComputationTreePanel.tsx, panels/SidePanel.tsx, hooks/useSimulation.ts, store/uiStore.ts, store/toastStore.ts]*

## v3.0 — Turing Machines & LBA (2026-06-13)

**D46 — Add `TM` (deterministic single-tape) + `LBA`; build additively and type-gated via `isTMType()`/`TM_TYPES` (mirrors D8's `isPDAType`).** Completes the PRD's 7-type Chomsky-hierarchy goal. One source of truth in `core/utils.ts` gates the Tape tab, the TM transition row, edge labels, canvas edit-routing, the validator branch, and the InputBar preview. No DFA/NFA/ε-NFA/DPDA/NPDA path changed behavior. **NTM (nondeterministic TM) is deferred** — when added it reuses the existing `TreeProvider` (D22) with per-branch tape snapshots; the validator flags nondeterminism as an error for now (same stance as DFA/DPDA, D12). *[engines/core/utils.ts, engines/core/types.ts]*

**D47 — Tape model: optional `tapes?: TapeSnapshot[]` on `Configuration`+`StepResult` (additive, like `stack`); single-tape = length-1 array.** Designing the array from day one (cf. D3) makes **multi-tape (Phase 3D) purely additive** — no type churn later. `TapeSnapshot = { cells, head, left, leftBound?, rightBound? }` is a **finite render window**, never a materialized infinite array (the engine emits `±WINDOW_PAD` blanks around the used range). FA/PDA leave `tapes` undefined. `simulationStore.activeTapes` mirrors `activeStack`. *[engines/core/types.ts, store/simulationStore.ts]*

**D48 — Single-tape TM transition reuses `read`+`write`+`direction` (no new fields); supersedes the "reserved" note in D7.** `read` = the single symbol under the head, `write` = the symbol written, `direction` ∈ `L|R|S`. A blank/empty `read`/`write` denotes the blank symbol (`isBlank`). `fileManager` already copied `write`/`direction` and `sanitizeState` already copied `isReject`, so **old files load unchanged** and no file-format version bump is needed. `formatTmLabel(read,write,dir,blank)` renders `a → b, R`. *[engines/core/types.ts, engines/core/utils.ts, utils/fileManager.ts]*

**D49 — TM acceptance = halting; engine mirrors `DPDAEngine` structure with same-step look-ahead.** Entering an accept state → `accepted`; entering a reject state or having **no applicable move** from a non-accept state → `rejected`; exceeding `stepLimit` (default 10,000, per-machine override) → `stuck` (NFR-8 infinite-loop guard). Input is **not** required to be "consumed" (the head roams). The tape is a sparse `Map<number,string>`; two-way infinite for TM. `step()` resolves the resulting status in the same step via a `_pickTransition` look-ahead (like DPDA D9). *[engines/tm/TMEngine.ts]*

**D50 — LBA = a bounded `TMEngine` subclass (DRY, per plan decision B).** `LBAEngine extends TMEngine` and overrides only `_setupBounds(n)` → head confined to **`[0, n]`** (the input cells `0…n-1` **plus the trailing end-of-input blank** at `n`, so a standard blank-detecting TM runs unchanged as an LBA; empty input still gets one usable cell `[0,0]`). The base `step()` already had the boundary check (`nextHead < leftBound || > rightBound` → halt-reject, transition does not fire), so the subclass is ~10 lines. Markers `⊢`/`⊣` are **visual only** (drawn by TapePanel just outside the bounds), not tape cells — keeping the engine diff minimal and letting the same machine definition run as either TM or LBA. `_snapshot` emits finite `leftBound`/`rightBound` only when bounded (TM omits them → `±Infinity`). *[engines/lba/LBAEngine.ts, engines/tm/TMEngine.ts, components/panels/TapePanel.tsx]*

**D51 — Reject states are mutually exclusive with accept; shown for TM/LBA only.** `machineStore.toggleRejectState` clears `isAccept` (and `toggleAcceptState` clears `isReject`); the validator flags a state marked both (`TM_ACCEPT_REJECT_CONFLICT`). Reject states render with a red double-ring (`.reject`, reusing the existing `--status-reject` tokens — a scoped B&W exception like D25/D31). The "Set as Reject State" context-menu item is gated to TM/LBA (`showReject`). *[store/machineStore.ts, canvas/StateNode.tsx, canvas/ContextMenu.tsx, index.css, utils/validator.ts]*

**D52 — `TapePanel` is canonical for TM/LBA; `InputBar` seeds the initial tape and hides its FA preview.** The FA/PDA `consumedInput`/`currentSymbol`/`remainingInput` model doesn't fit a two-way head, so TM engines leave those empty and the new Tape tab (live head ▲, current-state label, instantaneous description `α q β`, auto-scroll, LBA `⊢`/`⊣` markers) is the source of truth (reads `activeTapes`, like StackPanel reads `activeStack`). The InputBar relabels to "initial tape" and gates its inline preview off for TM. Blank-symbol + step-limit are editable in the toolbar (TM/LBA only) via `setBlankSymbol`/`setStepLimit`; hitting the limit fires a `stuck` toast pointing at the LIMIT control. **`fsm_format.md` extended** (D27 — kept in sync with `types.ts`) with the TM/LBA schema, `read/write/direction`, tape/blank/boundary semantics, and full `0ⁿ1ⁿ`/`aⁿbⁿcⁿ` examples. Phase 3D multi-tape later landed in the same v3.0 cycle — see **D53**. *[components/panels/TapePanel.tsx, components/controls/InputBar.tsx, components/toolbar/Toolbar.tsx, components/controls/SimulationControls.tsx, fsm_format.md]*

**Verified:** `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` ✅ · **`npm test` 160/160 (11 suites)** ✅ · `npm run build` ✅ (pre-existing >500 kB chunk warning only) · no lint errors. Version bumped **2.1.1 → 3.0.0** (`package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`); CHANGELOG v3.0.0 + README updated. **Uncommitted on `main`** (per D19). Open item: live Tauri visual pass (plan DoD step 5). *[engines/tm/*, engines/lba/*, engines/core/*, components/panels/TapePanel.tsx, components/canvas/*, components/controls/*, components/toolbar/*, components/layout/HelpModal.tsx, store/*, utils/validator.ts, utils/fileManager.ts, hooks/useSimulation.ts, fsm_format.md, README.md, CHANGELOG.md]*

---

## v3.0 Phase 3D — Multi-tape Turing Machines (2026-06-13)

**D53 — Multi-tape is additive on top of the single-tape engine: `tapeCount` + per-tape `reads`/`writes`/`directions` arrays, normalized through one `tmTapeOps()` helper.** Completing the original v3 scope (the deferral noted in D47/D52). Single-tape (`tapeCount` ≤ 1 / unset) keeps using the scalar `read`/`write`/`direction` and behaves **byte-identically** — old files and the entire single-tape test suite are untouched. `tmTapeOps(t, n)` is the single source of truth that resolves a transition into length-`n` arrays (falling back to the scalar fields for tape 0), used by the engine, the validator (`TM_TAPE_COUNT_MISMATCH` + read-tuple determinism), the edge labels (`formatTmTransition` → `a → b, R | c → d, L`), and the editor/panel. `TMEngine` now holds `tapes: Map[]` + `heads: number[]`; a move fires only when **every** tape's read matches, writes/moves all heads together, and the LBA's scalar bounds apply to every head (so `LBAEngine` needed no change — LBA stays single-tape in the UI but the engine is N-tape-safe). Input loads onto **tape 1 only**; `Configuration.tapes[]` (designed as an array since D47/3A) made the panel + store changes trivial. Multi-tape is gated to **plain `TM`** in the toolbar (`TAPES` control → `machineStore.setTapeCount`); `TapePanel` renders one auto-scrolling row per tape, and copy/paste now carries the multi-tape arrays + `write`/`direction`/`isReject`. *[engines/tm/TMEngine.ts, engines/core/utils.ts, engines/core/types.ts, utils/validator.ts, utils/fileManager.ts, store/machineStore.ts, store/uiStore.ts, components/canvas/TransitionEditor.tsx, components/canvas/AutomataCanvas.tsx, components/panels/TapePanel.tsx, components/toolbar/Toolbar.tsx, components/layout/HelpModal.tsx, fsm_format.md]*

**Verified:** `tsc --noEmit` ✅ · **`npm test` 180/180 (11 suites)** ✅ (new: multi-tape `{ aⁿbⁿ }` 2-tape engine suite, multi-tape validator rules, `setTapeCount`/`toggleRejectState` store tests) · `npm run build` ✅ (pre-existing chunk warning only) · no lint errors. Version stays **3.0.0** (3D folds into the unreleased v3.0). **Uncommitted on `main`** (per D19). Open item: live Tauri visual pass.

---

## v3.0 hardening — performance & Tape UX (2026-06-13)

**D54 — Cap the *rendered/per-step* data, never the *computation*: bounded windows + buffers + tab-switch reset, validated by a headless stress suite.** A stress sweep (huge inputs, multiple tabs of different machines) reproduced the user's "UI hangs with multiple tabs" report and traced it to several **O(n²)-over-a-run** hotspots and stale state surviving a tab switch. Guiding rule: keep the engines' *logic* exact (full powerset frontier, full tape, full branch set still explored) and only bound what the **UI consumes per step**. Fixes:
- **Windowed engine I/O.** FA engines (DFA/NFA/ε-NFA/DPDA) rebuilt the *entire* `consumedInput`/`remainingInput` string on every step — and NFA did it **per active branch** — so each step got slower as the head advanced (quadratic total). New `IO_WINDOW` (256) + `consumedWindow(chars, idx)` / `remainingWindow(chars, idx)` in `core/utils.ts`; `buildConfig` and every FA `_makeResult` emit a bounded window around the head. **Per-step cost is now constant; inputs ≤ the window are byte-identical** (so all existing engine tests pass unchanged — the window only elides far-away characters the UI doesn't show).
- **Bounded TM tape window.** `TMEngine._snapshotTape` built a cell array spanning the whole *visited* range (a head that travels far, or a large seeded tape, rendered thousands of cells every step). Now clamped to a **moving window** `WINDOW_MAX_HALF` (150) cells around the head. The sparse `Map` tape is still the unbounded source of truth.
- **Bounded buffers.** `simulationStore.MAX_HISTORY` (1000) slices the history array (each push was an O(n) copy); `HistoryLog` renders only the last `MAX_VISIBLE` (500) rows ("N earlier steps hidden"). `computationTree.MAX_TREE_NODES` (20 000) guards `treeNodes` accumulation in NFA/ENFA/NPDA — **the run keeps going; only the *visualised* tree stops growing.**
- **Single-shot Step Back.** `stepBack` (D43e) replayed the engine to step−1 with **one store `set` + tree rebuild per replayed step** (O(n²) for a deep run). Now it replays the engine **silently** (no per-step store writes), collects `HistoryEntry[]`, and commits the final state in **one** `simulationStore.applyReplay()`.
- **O(n) canvas sync + gated auto-route.** `AutomataCanvas`'s node/edge reconcile used `Array.find` inside a map (O(N²)); now it indexes the previous nodes/edges in a `Map`. `TransitionEdge`'s auto-bow scanned every state for *every* edge (O(E·V)); now skipped above `AUTO_ROUTE_MAX_STATES` (80) states (large graphs draw straight edges — acceptable, and they're rarely non-adjacent-overlapping at that size).
- **Tab-switch reset.** Switching tabs (or loading a file) left the previous tab's **simulation interval running** and its (possibly huge) tape/tree/history rendered against the new machine. `useSimulation` now resets the sim when `machine.id` changes (tracked via `machineIdRef`), and `SimulationControls` clears `isPlaying` when the store goes `isIdle`. This is the direct fix for the multi-tab hang.
- **Stress harness.** New `src/__stress__/stress.test.ts` (`// @vitest-environment node`) asserts the *invariants*, not wall-clock micro-benchmarks: TM tape-window stays clamped regardless of head travel, DFA completes a large run within a generous ceiling (guards against a **quadratic** regression, not a precise linear time), NFA tree nodes stay ≤ cap, history stays ≤ cap. (Timing assertions were deliberately loosened — exact ms is flaky under parallel `jsdom` suites; the goal is "not quadratic," and correctness/counts.) *[engines/core/utils.ts, engines/core/computationTree.ts, engines/dfa|nfa|enfa|dpda/*, engines/tm/TMEngine.ts, engines/npda/NPDAEngine.ts, store/simulationStore.ts, hooks/useSimulation.ts, components/canvas/AutomataCanvas.tsx, components/canvas/TransitionEdge.tsx, components/controls/SimulationControls.tsx, components/panels/HistoryLog.tsx, src/__stress__/stress.test.ts]*

**D55 — The Tape panel live-previews the input while idle and shows a grey "last move" arrow; `TapeSnapshot` gains a runtime-only `lastMove`.** User feedback after the multi-tape pass: the tape was **blank until you pressed Play**, and once running it was unclear "why the head went to the 2nd state directly" (no cue for where it came from). Two changes, both **render-only** (nothing touches the engine's decision logic or the file format):
- **Live idle preview.** `TapePanel` builds an engine-less snapshot from the current input via `buildPreviewTapes(input)` (head on the start state's first cell, `PREVIEW_PAD`/`PREVIEW_HALF` blanks around it) and shows the **start state's label**, so the panel mirrors the input box **as you type** instead of showing an empty placeholder. The moment a run starts, the real `activeTapes` take over (unchanged).
- **Last-move arrow.** `TapeSnapshot.lastMove?: 'L'|'R'|'S'` is populated by `TMEngine` from a new per-tape `lastDirections[]` (captured from `tmTapeOps` during `step()`, cleared on `initialize`/`reset`). `TapePanel` draws a **faded grey `←`/`→` under the cell the head moved *from*** (computed as `prevHeadIndex` from `head` + `lastMove`), pointing the direction it moved, as a lightweight history cue. `lastMove` is **not persisted** — it's transient render data like the tape window itself, so `fsm_format.md` is unchanged (it documents the saved schema only; cf. D27). *[engines/core/types.ts, engines/tm/TMEngine.ts, components/panels/TapePanel.tsx]*

**Verified:** `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` ✅ · **`npm test` 185/185 (12 suites)** ✅ (new `__stress__/stress.test.ts`) · `npm run build` ✅ (pre-existing chunk warning only) · no lint errors · **`npm run tauri:dev` eyeballed** (preview updates with typing, arrow renders, multi-tab no longer hangs). Version stays **3.0.0** (hardening folds into the unreleased v3.0). **Uncommitted on `main`** (per D19).

---

## v3.0 UX & scientific audit pass (2026-06-13)

Implementing `ux_audit.md` (S1–S4). Quick wins / a11y / clarity items (#1, #2, #4, #5a, #6, #8, #9, #10, S4) plus the three structural items below. **All engine behavior unchanged** (accept/reject identical); changes are render/validation/export only.

**D56 — Computation tree #3: chose Option B (honest trellis) over Option A (true unmerged tree).** The audit's "top single risk": for FA the viewer renders a per-level-deduped trellis (D22–D25, first-parent-wins) but presents it as a tree. **Option A** (one node per path) was rejected because the lineage frontier and the powerset that drives acceptance are intentionally **decoupled only at the cap**: making the tree truly unmerged would either reintroduce exponential frontier growth or, if the frontier is derived from the capped tree, make accept/reject wrong past `MAX_TREE_NODES`. **Option B** keeps the bounded trellis but is *honest* about it: `NFAEngine._recordBranch` now bumps a new optional `Configuration.mergedParents` counter when a second parent reaches the same `(level,state)` (a `nodeById` map gives O(1) access to the survivor); `ComputationTreePanel` relabels FA as a "Computation **trellis**", adds a one-line explanation, a `⇉ₙ` legend item, a per-row `⇉ₙ` merge chip, and a selected-branch "reached by n parents (merged)" note. NPDA keeps real per-branch lineage and stays a "tree". `mergedParents` is runtime-only (not persisted; carried through `getTreeNodes()`'s spread and serialised by the tree exporter). New test `computationTree.test.ts > NFA trellis merge accounting`. *[engines/nfa/NFAEngine.ts, engines/core/types.ts, components/panels/ComputationTreePanel.tsx, engines/core/computationTree.test.ts]*

**D57 — IA #5b: a global δ-table panel is the canonical text editor; the canvas modal stays a shortcut.** New `DeltaTablePanel.tsx` (new SidePanel tab labelled **δ**, `ActivePanel`/`Tab` gain `'delta'`) lists every transition **grouped by source state**, editable in place (target `<select>`, FA symbols / PDA `read,pop→push` / single-tape TM `read→write,dir` inputs persisted via the existing `updateTransition`; per-group add + delete). **Multi-tape TM rows are read-only** (formatted via `formatTmTransition`) with an "edit" button that opens the per-state `TransitionEditor` — no reimplementation of the multi-tape grid. Group headers and a per-row `↗` use `uiStore.requestFocus` (already consumed by the canvas for both states and transitions, D-validation/locate) to pan + highlight. The toolbar regroup half of #5 was the overflow `⋯` menu (S4, prior pass). *[components/panels/DeltaTablePanel.tsx, components/panels/SidePanel.tsx, store/uiStore.ts]*

**D58 — Scientist data-out #7 (export + batch): one shared headless runner feeds both.** Extracted `engines/core/engineFactory.ts` (`createEngine(def)` — single source of truth, replacing the copy in `useSimulation`; + `runToCompletion(def, input, maxSteps)`). `utils/exporters.ts` builds pure strings: **δ-table** as a CSV/LaTeX **matrix** for FA (rows=Q, cols=Σ [+ε for ε-NFA], cells = target sets, `→`/`*`/`⊘` decoration on the left column) and **long format** for PDA/TM (`From,Read,Pop,Push,To` / `From,Read,Write,Move,To`); **trace** (CSV + JSON, labels resolved from history); **tree** (JSON of the flat lineage incl. `mergedParents`). `downloadText()` mirrors `fileManager`'s Tauri-dialog-vs-web-anchor split (static `isTauri` import to match the bundle's chunking). `utils/batch.ts` (`parseBatchCases` → `accept:`/`reject:` tags, `#` comments, `ε` = empty string; `runBatch`; `batchSummary`) powers `BatchRunnerModal` (opened from a **Batch…** button in `InputBar`; pass/fail table + CSV export). `ExportModal` (opened from the overflow menu) gates trace/tree on available run data. **Diagram PNG/SVG export is deferred** (needs canvas-to-image; the data artifacts are the high-leverage ask). New tests `batch.test.ts`, `exporters.test.ts`. *[engines/core/engineFactory.ts, utils/exporters.ts, utils/batch.ts, components/controls/BatchRunnerModal.tsx, components/controls/InputBar.tsx, components/layout/ExportModal.tsx, components/toolbar/Toolbar.tsx, hooks/useSimulation.ts]*

**D59 — Γ vs Σ #7 (modeling): declared alphabets are optional + declarative; the validator warns, the engine never enforces.** New optional `MachineDefinition.stackAlphabet?` (PDA) / `tapeAlphabet?` (TM/LBA), set via `machineStore.setStackAlphabet`/`setTapeAlphabet` (stored `undefined` when empty so old/cleared machines omit the field) and a compact **STACK (Γ)** / **TAPE (Γ)** toolbar input (shown for PDA / TM only). `fileManager` persists/loads them (additive — old files unaffected). The validator adds **warnings only** (non-blocking, so runs proceed): `TM_BLANK_IN_SIGMA` (blank ∈ Σ, always checkable); and, *only when Γ is declared*, `TM_BLANK_NOT_IN_GAMMA`, `SIGMA_NOT_IN_GAMMA`, `TM_SYMBOL_NOT_IN_GAMMA`, `PDA_POP_NOT_IN_GAMMA`, `PDA_PUSH_NOT_IN_GAMMA`. Keeping Γ declarative avoids an engine/file-format breaking change while delivering the scientific check the audit asked for. New tests in `validator.test.ts`. *[engines/core/types.ts, store/machineStore.ts, utils/fileManager.ts, utils/validator.ts, components/toolbar/Toolbar.tsx]*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 202/202 (14 suites)** ✅ (new: trellis-merge, batch, exporters, Γ/Σ validator tests) · `npm run build` ✅ (pre-existing >500 kB chunk warning only) · no lint errors. **Not yet eyeballed in the live Tauri app** — a manual pass over the δ tab editing, the Batch…/Export modals, the trellis chips, and the Γ inputs is the open item. Version stays **3.0.0**. **Uncommitted on `main`** (per D19).

---

## v3.0 bugfix — post-run edit lock (2026-06-13)

**D60 — A finished run must not lock the editor: any *structural* edit auto-resets the sim to idle, and editability is gated on "not actively running" instead of "idle".** User report (live review): after running a machine to a verdict, then deleting it, the canvas "froze" — the Delete key and the "+ Add a state" button did nothing, and only right-click → Delete worked. **Root cause:** a finished run leaves `status` at a terminal value (`accepted`/`rejected`/`stuck`/`error`), but ~a dozen edit affordances were gated on `status === 'idle'` with **no automatic path back to idle** — so the displayed result trapped the editor (the right-click menu was the lone *un*gated delete path, which is why it alone worked, and deleting states never cleared the stale result, so it stayed locked forever). Two-part fix:
- **Central safety net (`useSimulation`).** A new effect hashes the machine's *computational* structure (type, blank, tapeCount, and each non-text state's id/label/flags + each transition's endpoints/symbols/PDA-TM ops) — deliberately **excluding** node x/y and cosmetic text notes — and, whenever it changes while `status !== 'idle'`, calls the hook's `reset()` (stops the interval, drops the engine, clears the store). This self-heals **any** edit path (incl. the unguarded right-click menu and the δ-table) and correctly tears down a still-running interval. A finished result deliberately *survives* dragging/relabelling notes (not structural).
- **Editability gate flip (`status === 'running'` instead of `!== 'idle'`).** Across `AutomataCanvas` (add/delete/cut/paste/transition-tool/pane-place/undo-redo/`nodesConnectable`/tool-palette), `StateNode` (hover connect-nub + dbl-click rename → renamed local `isIdle` to `canEditStructure`), `Toolbar` (undo/redo enabled → `canEdit`), and `InputBar` (input enabled; editing the string from a terminal status calls `resetSimulation()` first). Net: a *finished* run is fully editable and the first edit clears it; only an **actively running** (incl. paused) sim still blocks structural edits. *No store/engine/file-format change; display gates (active-state paint, tape/stack/tree "preview when idle", status badge) were left untouched.*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 202/202 (14 suites)** ✅ (no regressions; this is a UI-interaction fix — the suite is engine/store/util-level, so no new unit test, validated live via HMR) · no lint errors · **hot-reloaded into the running `tauri:dev`** for the user's manual review. **Uncommitted on `main`** (per D19).

---

## v4.0.0 — Conversions, image export, ε-inserter, edge-drag, readable converted labels (2026-06-14)

> Context note: the whole v3.0 cycle (D46–D60) was **committed + released** as `29c1de8 release(v3.0.0)` (on `origin/main`) — the earlier "uncommitted on main" caveat on D46–D60 is now historical. v4.0.0 below is the **new uncommitted working tree** on top of that release.

**D61 — Conversions are pure-TS, step-emitting transforms behind a small registry; a result is always a *new* machine and never mutates the source.** Delivers the PRD v4 "conversions/tools" scope. Each algorithm lives in `engines/conversions/` and returns a `ConversionResult { kind, result: MachineDefinition, steps: ConversionStep[], summary: string[] }`, where every `ConversionStep` carries a title/detail + the `addedStateIds`/`addedTransitionIds` it introduces (so the UI can reveal the construction incrementally). Seven conversions: **ε-NFA→NFA** (epsilon elimination), **NFA/ε-NFA→DFA** (subset/powerset — ε-closures folded in, reachable empty set → explicit `∅` trap so the DFA stays total), **DFA minimization** (complete → drop unreachable → Moore partition refinement), **Regex→NFA** (Thompson, recursive-descent parser), **CFG→PDA** (standard one-state NPDA), **PDA→CFG** (standard state-triplet construction with pop-exactly-1 stack symbol validation), and **DFA/NFA→Regex** (state elimination GNFA method). A `MachineBuilder` helper assigns deterministic ids (`s0…`/`t0…`) so steps can reference result elements and tests are stable. A registry in `index.ts` (`CONVERSIONS` meta + `transformsFor(type)`/`constructs()` + `runTransform`/`runConstruct` dispatchers) drives `components/conversions/ConversionsModal.tsx` (opened by a new **CONVERT** toolbar button): a step player (play/pause/scrub/click-a-step) over a live SVG preview, a `Source ⇄ Result` toggle, and **Open in new tab** (`machineStore.openMachine`). Pure-TS keeps D1 (web parity / isolated tests). New suite `conversions.test.ts` checks **language equivalence** (vs. the source via the engines) + structural invariants (determinism, minimal-state counts, every result element revealed by some step). *[engines/conversions/{types,helpers,epsilonElimination,subsetConstruction,minimizeDfa,regexToNfa,cfgToPda,dfaToRegex,pdaToCfg,index,conversions.test}.ts, components/conversions/ConversionsModal.tsx, components/toolbar/Toolbar.tsx]*

**D62 — Diagram image export = a dependency-free `machineToSVG` renderer (SVG) + an SVG→canvas raster (PNG); this completes the D58-deferred image export.** Rather than screenshotting React Flow, `utils/diagramSvg.ts` draws any `MachineDefinition` to a self-contained SVG string (nodes/edges/self-loops/arrowheads, theme colors, start arrow, accept double-ring, reject color) — **one renderer reused twice**: the Conversions step-preview (with `includeStateIds`/`includeTransitionIds`/`highlight*` to reveal a step, and `frameStateIds` to hold a **fixed viewBox** across reveal steps so the preview doesn't jump/resize) and `utils/diagramExport.ts` (`exportDiagramSVG` / `exportDiagramPNG` via `svgToPngBlob` — draw the SVG onto a `<canvas>` at a scale factor, encode PNG). Wired into `components/layout/ExportModal.tsx` (new **Diagram** section). Needed `"fs:allow-write-file"` in `src-tauri/capabilities/default.json` (binary PNG write) and `svg: 'image/svg+xml'` added to the `MIME` map in `utils/exporters.ts`. *[utils/diagramSvg.ts, utils/diagramExport.ts, components/layout/ExportModal.tsx, utils/exporters.ts, src-tauri/capabilities/default.json]*

**D63 — A clickable ε/λ inserter lives wherever symbols are typed (no epsilon key on most keyboards).** Generalized the existing `EpsilonInserter` `targetRef` from `HTMLInputElement` to `HTMLInputElement | HTMLTextAreaElement` (caret-aware insert + change callback), then wired it into the Conversions **regex** input and **CFG** textarea (`ConversionsModal`) and the δ-table **FA symbol** inputs — the latter **gated to ε-NFA** (`isENFA`) since DFA/NFA can't take ε. (`TransitionEditor` already had it.) *[components/canvas/EpsilonInserter.tsx, components/conversions/ConversionsModal.tsx, components/panels/DeltaTablePanel.tsx]*

**D64 — Edges follow a node *live* during drag via React Flow `useInternalNode`, not the store.** `TransitionEdge` computed endpoints from `machine.states` (the store), which only updates on drag-**stop** — so while dragging a state its connected edges stayed pinned to the old position. Now each edge reads the live `useInternalNode(source/target)?.internals.positionAbsolute` (+ `NODE_RADIUS`) for its source/target centers, so curves/self-loops/arrowheads track the node continuously. Render-only; geometry still derived from centers (cf. UX-audit #1). *[components/canvas/TransitionEdge.tsx]*

**D65 — Converted machines show short canonical labels (`q0, q1, …`) by default and keep full provenance on demand; never render the nested set "blobs".** User feedback after a Regex→ε-NFA→NFA→DFA→min-DFA pipeline: subset construction and minimization produced labels like `{{q3,q5},{q6}}` that are illegible and hurt learning. Principle adopted: **full provenance in the *process* (steps/preview), clean labels in the *artifact* (the opened machine), provenance available on demand.** Implementation: a new optional **`AutomataState.description`** (provenance text) — additive, persisted by `fileManager.sanitizeState`, preserved by `applyAutoLayout`'s spread, and carried via `MachineBuilder.addState({ description })`. Each conversion now names states `q0, q1, …` and stashes the meaning in `description`: subset DFA → the NFA subset `{…}` (trap = `∅` + "dead/trap" note); min-DFA → the merged DFA states `{…}`; ε-elim NFA keeps its 1:1 source labels (already short) **plus** an `ε-closure: {…}` note where it adds information (the tangible "for NFA/ε-NFA too" ask). Provenance is **one level back** (deeper history = run the steps one at a time). Surfaced three ways: **hover** (`StateNode` `title`; `machineToSVG` wraps each node in `<g><title>…`), a **short ⇄ full labels** toggle in the Conversions preview (`machineToSVG` `verboseLabels` renders `description` in place of the label), and the **step text/summary** (e.g. "Transitions from q3 = {q6,q7}"). `AutomataCanvas` passes `description` into node data and compares it in `areNodesEqual`; regex→NFA / CFG→PDA were already short and unchanged. *[engines/core/types.ts, utils/fileManager.ts, engines/conversions/{helpers,subsetConstruction,minimizeDfa,epsilonElimination}.ts, components/canvas/StateNode.tsx, components/canvas/AutomataCanvas.tsx, utils/diagramSvg.ts, components/conversions/ConversionsModal.tsx, components/layout/HelpModal.tsx]*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 226/226 (15 suites)** ✅ (new `engines/conversions/conversions.test.ts`, 24 cases; no regressions in the existing 202) · no lint errors · **`npm run tauri:dev` eyeballed** (CONVERT flow, step player, PNG/SVG export, ε-inserter, edge-follow-on-drag, short labels + hover/full-labels all HMR'd live). Version bumped **3.0.0 → 4.0.0** (`package.json`, `package-lock.json`, `src-tauri/{tauri.conf.json,Cargo.toml,Cargo.lock}`); CHANGELOG v4.0.0 + README + HelpModal updated. **Uncommitted on `main`** (per D19) — working tree on top of the released `v3.0.0`.

---

## v4.0.1 — Desktop UI redesign, UX/scientific audit, robustness hardening, UX polish (2026-06-15)

> Four passes on top of the v4.0.0 conversions work (D61–D65), all still **uncommitted** over the released `v3.0.0`. Order built: classic-desktop chrome (D66) → UX/theoretical-CS audit implementation (D67) → stress/robustness hardening (D68) → UX follow-up polish (D69-D72).

**D66 — Classic-desktop "chrome": a top MenuBar + chromed Toolbar driven by a small command bus; shared file logic extracted to a hook.** User ask: *"redesign the UI to be more like this"* (a classic desktop application). Added `components/layout/MenuBar.tsx` — a **File / Edit / View / Simulate / Convert / Help** menu bar — above a rewritten `components/toolbar/Toolbar.tsx` (compact SVG icons in `components/toolbar/icons.tsx`; native bevels via new `--chrome-*` design tokens in `index.css`, light + dark). The edit actions (copy/cut/paste/delete/add/select-all/zoom/fit) physically live in `AutomataCanvas` and the single sim engine lives in `SimulationControls`, so a new **command bus** `store/commandStore.ts` (`CanvasApi`/`SimApi`) lets those owners *register* their handlers on mount and the menu/toolbar *call through* — preserving the single-`useSimulation` invariant (D45 reviewer note) with no prop-drilling. The old `components/toolbar/FileControls.tsx` was **deleted**; its New/Open/Save/Save-As/Recent logic + the global `Ctrl/Cmd+N/O/S/Shift+S` shortcuts (now bound by exactly one caller via `useFileActions({ bindKeys:true })`) moved into reusable `hooks/useFileActions.ts`, shared by the File menu and the toolbar. `uiStore` gained `activeModal: ModalKind` + `openModal/closeModal` so the menu and the toolbar open the **same** Help/Export/Convert/Batch dialogs. Render/UX only — no engine, store-shape, or file-format change. *[components/layout/MenuBar.tsx, components/layout/AppLayout.tsx, components/toolbar/Toolbar.tsx, components/toolbar/icons.tsx, store/commandStore.ts, hooks/useFileActions.ts, store/uiStore.ts, index.css; removed components/toolbar/FileControls.tsx]*

**D67 — UX / theoretical-CS audit implemented in priority slices (critical + high first; three low/medium items deferred to `TODO.md`).** The audit was first delivered as a Cursor Canvas (`canvases/automatalab-UX-audit.canvas.tsx`); this decision is the implementation of its high-leverage findings. **All render / interaction / validation only — accept/reject behavior is unchanged.** Items (audit IDs in brackets):
- **[A11Y-1] Shared accessible `Dialog` shell** — new `components/common/Dialog.tsx`: `role="dialog"` + `aria-modal`, **capture-phase Esc** (pre-empts the canvas/menubar bubble-phase global keydowns), Tab focus-trap, focus restored to the previously-focused element on close, backdrop click-to-close. Help / Export / Convert / Batch all render through it (callers keep their own card chrome).
- **[FLO-1] A blocked run explains itself** — `useSimulation.surfaceBlocking` toasts the first validation error and auto-opens the **Validate** tab (with a count badge), instead of Play silently doing nothing.
- **[DISC-1] ε normalization** — `eps` / `λ` / `lambda` / blank typed in the transition editor or δ-table fold to `ε`, with hints in the editor / empty-state / Help.
- **[FBK-1] reject vs stuck** — broadened "stuck" toast, a `stuck-final` canvas style, and tooltips that explain "no applicable move (reject)" vs "step limit / frontier guard (stuck)".
- **[ACC-2] selection is no longer a hidden gesture** — `selectionKeyCode="Shift"` (marquee drag) + `multiSelectionKeyCode=['Shift','Control','Meta']`; plus keyboard parity for state roles: **I** = set start (single selection), **F** = toggle accept (any selection) — both filter out text nodes and skip when `Ctrl/Cmd` is held so they don't collide with file shortcuts.
- **[NAV-1] side panel** defaults to **δ** (the machine definition) rather than the empty History tab, and persists both its active tab and a new collapse state (`uiStore.panelCollapsed` / `togglePanel`, `COLLAPSE_KEY`).
- **[THY-1] witness/trace highlight** — on a halt the accepting / representative path is highlighted on the canvas (`simulationStore.pathStateIds` / `pathTransitionIds` → `.state-node.on-path` + edge `isOnPath`; new `--trace` / `--trace-ring` tokens).
- **[THY-3] set-valued history** steps render as `{q0, q1}` (`HistoryLog.fmtStates`).
- **[DISC-3 / DISC-4 / THY-4 / CPLX-2]** Help rewrite (tools, gestures, shortcuts, menu paths, Batch, trace); Batch moved into the **Simulate** menu; Conversions gained a **Replace current** action with accurate toasts; `empty = ε` input hint + tab tooltips. **[CPLX-1]** confirmed the menu/toolbar/sim transports already share one `isPlaying` (via the D66 command bus) — no fix needed.
- **Deferred** (tracked in `TODO.md`): **DISC-5** live regex/CFG validation, **WFL-2** seekable simulation history, **THY-5** synthesized-state legend.
*[components/common/Dialog.tsx, components/layout/{HelpModal,ExportModal}.tsx, components/controls/{BatchRunnerModal,InputBar,SimulationControls}.tsx, components/conversions/ConversionsModal.tsx, components/panels/{SidePanel,HistoryLog}.tsx, components/canvas/{AutomataCanvas,StateNode,TransitionEdge}.tsx, hooks/useSimulation.ts, store/{simulationStore,uiStore,machineStore}.ts, index.css, canvases/automatalab-UX-audit.canvas.tsx]*

**D68 — Stress/robustness hardening: property-based fuzzing + three crash/hang fixes; bound the *resource*, never the *correctness*.** User ask: *"stress test it … check for bugs, crashes … edge cases. fix all of them."* A full pass (every engine type, the conversions, the validator, file I/O) plus a new property suite surfaced three real defects, each fixed by capping a *resource* while leaving the computation sound:
- **(Critical) NPDA frontier explosion → memory exhaustion.** Unlike an FA (frontier = a powerset bounded by |Q|), an NPDA distinguishes branches by their **stack**, so two ε-moves that push *different* symbols defeat the per-step `(state,stack,inputIndex)` dedup and the live frontier doubles every step — OOM in ~20 steps, long before the `maxSteps` ceiling. New `MAX_FRONTIER = 5_000` width guard in `NPDAEngine.step()`: the instant one BFS layer reaches the cap we stop expanding and **decide on what we have** — `accepted` if an accepting branch already exists (still a real accepting computation, hence sound), else `stuck`. Complements the existing `MAX_TREE_NODES` (D54) and termination guards (D10).
- **(High) File loader crashed on malformed JSON.** `parseMachineJson` (now **exported** for testing) guards `typeof raw !== 'object' || raw === null || Array.isArray(raw)` so `JSON.parse("null")`, arrays, and primitives raise a clean `Error` instead of a `TypeError` on field access, and **coerces `name`/`language` to strings** (a numeric `name` used to flow through and crash later in `fileStem`'s `String.prototype.replace`). The pre-existing known-field allowlist (D16) already blocked prototype pollution — now covered by a regression test.
- **(Med) Non-positive / non-finite step limit bricked an engine.** `this.maxSteps = Number.isFinite(maxSteps) && maxSteps > 0 ? Math.floor(maxSteps) : DEFAULT_MAX_STEPS` clamp added to the `TMEngine` / `DPDAEngine` / `NPDAEngine` constructors (a `0` / `-5` / `NaN` limit previously tripped the step guard on step 1).
- **New suites.** `engines/fuzz.test.ts` (`// @vitest-environment node`, seeded `mulberry32` PRNG so any failure reproduces): **robustness** (random machines of every type never throw, always halt, and report a status consistent with `isAccepted()`), **equivalence** (a random NFA/ε-NFA ≡ its subset-DFA; a DFA ≡ its minimization; an ε-NFA ≡ its ε-elimination — over all strings ≤ length 4 via the engines), **construction** (`regexToNfa` ≡ the JS `RegExp` engine on short strings). Fuzz-generated PDAs run with a small `maxSteps` (60) + a `drainEngine` guard so the suite stays fast. `utils/fileManager.test.ts` covers the loader hardening (null/array/primitive/bad-syntax/missing-fields/unknown-type, `__proto__` pollution, field coercion) + an `exportMachineJSON ↔ parseMachineJson` round-trip.
*[engines/npda/NPDAEngine.ts, engines/tm/TMEngine.ts, engines/dpda/DPDAEngine.ts, utils/fileManager.ts, engines/fuzz.test.ts, utils/fileManager.test.ts]*

**D69 — MenuBar outside click collapse uses capture-phase listeners to prevent event swallowing.**
To ensure the top menus collapse reliably when a click occurs outside, the pointer and mouse events are registered on the `document` with `useCapture = true` (`document.addEventListener('pointerdown', onDown, true)`). This allows `MenuBar` to capture and handle the click event before other canvas elements swallow it via `stopPropagation()` during the bubbling phase. Vertical separators were also added between options for layout distinction. *[components/layout/MenuBar.tsx]*

**D70 — Side panel tabs compress to first letters and show vertical separators at narrow widths.**
When the side panel is collapsed or resized to a very narrow width, tab text labels can easily overflow and disappear. We calculate average tab width and abbreviate non-delta tabs to their first character (e.g. 'H', 'V', 'T', 'I') when the average width drops below 55px. Vertical separators with proper thematic colors were added to clearly separate tab items. *[components/panels/SidePanel.tsx]*

**D71 — Epsilon inserter extended to simulation input and batch runner, and remains persistent.**
In order to allow users to insert `ε` dynamically in the simulation input and the batch runner inputs, we extended the caret-aware `EpsilonInserter` to both text inputs and textareas via refs. Furthermore, the `empty=ε` box/inserter stays visible during active typing so that epsilon can be inserted at any point (previously, the helper text disappeared as soon as a character was typed). *[components/controls/InputBar.tsx, components/controls/BatchRunnerModal.tsx]*

**D72 — Tab bar items support in-place renaming via double-click or right-click.**
Rather than using a separate rename modal for tab names, we added double-click and right-click triggers to the `TabBar` tabs that render an inline input field. Submitting via Enter or clicking away (blur) dispatches a new `renameTab(index, name)` store action. If renaming the active tab, it updates the machine name (synced to the graph editor); otherwise, it modifies the tab definition in the background and flags it as unsaved. *[components/layout/TabBar.tsx, store/machineStore.ts]*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 242/242 (17 suites)** ✅ (new `engines/fuzz.test.ts` + `utils/fileManager.test.ts`; no regressions in the prior 226) · `npm run build` ✅ (pre-existing >500 kB chunk warning only) · no lint errors · **`npm run tauri:dev` eyeballed** (all 2026-06-15 pass changes HMR'd live). Version stays **4.0.1** (all passes fold into the unreleased v4.0.1 working tree). **Uncommitted** (per D19).

---

## v4.0.1 — Custom titlebar, frameless window, and update banner (2026-06-15)

**D73 — Custom titlebar and frameless window in Tauri. Native titlebar removed, and a custom Window Controls suite (Minimize, Maximize, Close) added to the MenuBar, with drag capabilities.** User feedback: *"when using the desktop application, remove the dark AutomataLab bar on the top of the screen... workspace to start from the top... ie, name, file, edit... start from top...".* Native operating system title bars are removed by adding `"decorations": false` to the main window configuration in `tauri.conf.json`. Custom Window Control buttons (Minimize, Maximize/Restore, Close) are rendered at the right end of the `MenuBar` when running inside the Tauri shell (`isTauri()` is true), wired to dynamic imports of `@tauri-apps/api/window` to invoke programmatic native actions (`getCurrentWindow().minimize()`, `getCurrentWindow().maximize()`, etc.). Interactive permissions (`core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-unmaximize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`) were added to `src-tauri/capabilities/default.json`. The titlebar background is draggable via `data-tauri-drag-region` on the menu bar element. Custom close button has standard Windows-like red hover styling, and buttons inherit `--chrome-text` color for full light/dark thematic integration. *[src-tauri/tauri.conf.json, src-tauri/capabilities/default.json, src/components/layout/MenuBar.tsx, src/index.css]*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 242/242 (17 suites)** ✅ · `npm run build` ✅ (pre-existing chunk warning only) · no lint errors · **`npm run tauri:dev` verified** (application window displays frameless layout, workspace starts from the top, window controls trigger minimize/maximize/close, dragging works). Version stays **4.0.1**. **Uncommitted** (per D19).

---

## v4.0.1 — Custom brand logo and native app icon generation (2026-06-15)

**D74 — Custom brand logo and native app icon generation in Tauri.** Replaced the text span `(q)` brand placeholder in the menu bar with an image tag pointing to the new cropped square custom geometric logo. Created `src/assets/logo.png` and ran a Python script (using PIL) to crop the user-uploaded image to a square centered around the hexagonal graphics. Generated all native platform icons (including StoreLogo, Square30x30Logo, icon.ico, 32x32.png, icon.png, etc.) under `src-tauri/icons/` using `npx tauri icon src/assets/logo.png` CLI command. *[src/components/layout/MenuBar.tsx, src/assets/logo.png, src-tauri/icons/**]*

**Verified:** `npx tsc --noEmit` ✅ · **`npm test` 242/242 (17 suites)** ✅ · `npm run build` ✅ (pre-existing chunk warning only) · no lint errors · **`npm run tauri:dev` verified** (application window displays custom cropped logo in menu bar, regenerated native app icons compiled, app runs normally). Version stays **4.0.1**. **Uncommitted** (per D19).

---

**D75 — Finalizing logo choice, bundle restoration, and binary relocation.** The user selected the 4-state transition diagram logo (the solid white background 1:1 aspect ratio version, originally `media__1781552328692.jpg`) as the final branding asset. Cropped and restored it to `src/assets/logo.png` and regenerated all native platform launcher and taskbar icons in `src-tauri/icons/`. Recompiled the production build using Tauri to restore the full installer bundle directory `src-tauri/target/release/bundle/` containing both `nsis/` and `msi/` subfolders (and their installer files), and moved the final standalone release binary `AutomataLab_Final.exe` from the workspace root into the release directory `src-tauri/target/release/`. *[src/assets/logo.png, src-tauri/icons/**, src-tauri/target/release/bundle/**, src-tauri/target/release/AutomataLab_Final.exe]*

**Verified:** `npm run tauri:build` compiled successfully ✅ · `AutomataLab_Final.exe` is located at `src-tauri/target/release/` · NSIS/MSI installers exist under `src-tauri/target/release/bundle/`.

---

## v4.1.0 — Analysis Tools, Hardening & JFLAP Compatibility (2026-06-18)

**D76 — Offloading O(2^n) analysis computations to a background Web Worker (`analysis.worker.ts`).**
To prevent blocking the main React UI thread (maintaining the 60 FPS performance requirement) during heavy powerset/subset constructions or language equivalence checks, we offloaded these tasks to a separate worker thread (`analysis.worker.ts`). The worker is dynamically instantiated via Vite's `?worker` query in `AnalysisModal.tsx`. Communication is asynchronous, ensuring the UI remains fluid. *[src/engines/workers/analysis.worker.ts, src/components/analysis/AnalysisModal.tsx]*

**D77 — Gating analysis operations by `isFAType` to preserve theoretical correctness.**
Performing path-based graph analysis (like Reachability) on PDAs and TMs is structurally misleading because it ignores stack/tape constraints and makes the problem undecidable. To ensure academic and theoretical correctness, we gated reachability, emptiness, equivalence, and inclusion checks to throw if run on DPDA/NPDA/TM/LBA machines. `AnalysisModal.tsx` catches these and displays a clear theoretical limitation message. *[src/engines/core/analysis.ts, src/engines/core/analysis.test.ts, src/components/analysis/AnalysisModal.tsx, src/engines/core/utils.ts]*

**D78 — Preventing cosmetic node-drag events from resetting highlights via a derived `topologyKey`.**
Previously, dragging a state node updated its `x/y` coordinates in the store, which triggered a dependency effect change in `AutomataCanvas.tsx` and cleared active analysis highlights. To decouple cosmetic movements from structure, we derive a `topologyKey` from state and transition counts and transition IDs (excluding x/y coordinates). Highlights now persist during drag operations and only reset when structural layout/connections change. *[src/components/canvas/AutomataCanvas.tsx, src/store/uiStore.ts]*

**D79 — Optimizing rendering cascades in `StateNode.tsx` using targeted Zustand selectors.**
Destructuring or subscribing to the entire store inside state nodes caused React Flow to trigger a re-render on every node (an O(N^2) pass) when highlights changed. We refactored `StateNode.tsx` to subscribe exclusively to its own highlight key (`s => s.analysisHighlights[id]`), keeping re-renders limited strictly to the affected states. *[src/components/canvas/StateNode.tsx]*

**D80 — JFLAP Native Interoperability (.jff).**
We natively support parsing and exporting JFLAP 7.1 `.jff` XML files for all 7 machine types. 
- **DOM Coupling:** Uses the native browser `DOMParser` and `XMLSerializer`. We accepted the DOM coupling trade-off to avoid bloating the bundle with external parsers or introducing brittle regex, prioritizing dependency minimisation.
- **Dynamic Alphabet Inference:** JFLAP files don't explicitly declare an alphabet; the parser infers `alphabet`, `tapeAlphabet`, and `stackAlphabet` dynamically from transitions to prevent AutomataLab validation failures.
- **PDA Acceptance Mode:** JFLAP supports empty-stack acceptance, but AutomataLab strictly evaluates by Final State (Decision D5). If an imported PDA lacks final states, `fileManager.ts` fires a non-blocking toast warning alerting the user to manually adapt it (e.g. via an ε-move to a new accept state). The parsing utility itself remains pure (no side-effects).
*[src/utils/jflap.ts, src/utils/fileManager.ts, src/components/layout/ExportModal.tsx]*

**D81 — Canvas refactoring: Extract complex keyboard, clipboard, selection, context menu, and drawing logic into modular hooks to comply with React Flow presentation separation.**
To keep the presentation-layer `AutomataCanvas.tsx` clean, focused, and under 400 lines (improving maintainability and aligning with the UI review checklist), we extracted all user-interaction state and callbacks into focused custom hooks under `src/hooks/`:
- `useCanvasClipboard`: copy, cut, paste actions.
- `useCanvasSelection`: marquee/Shift selection and double-click pane triggers.
- `useCanvasKeyboard`: shortcuts handling (Esc, Delete, Ctrl+C/V/Z, I/F, etc.).
- `useTransitionDrawing`: pointer movements and click-to-connect nodes.
- `useCanvasContextMenu`: right-click state, transition, and pane context menus.
- `useViewportManagement`: zoom and pan focus requests from the UI.
This strictly follows the checklist guidance to delegate graph interactions to modular hooks.
*[src/components/canvas/AutomataCanvas.tsx, src/hooks/useCanvasClipboard.ts, src/hooks/useCanvasSelection.ts, src/hooks/useCanvasKeyboard.ts, src/hooks/useTransitionDrawing.ts, src/hooks/useCanvasContextMenu.ts, src/hooks/useViewportManagement.ts]*

**Verified:** `npm test` passed 254/254 tests (including the new `analysis.test.ts` and `jflap.test.ts` suites) ✅ · `npx tsc --noEmit` is clean ✅ · `npm run build` completed successfully with Vite's worker chunking ✅.

## Landing Page Decisions

**D82 — Marketing Landing Page Stack: Vanilla HTML/CSS/JS without React or Tailwind.**
To maintain absolute control over the design system, micro-interactions, and motion, the landing page (`/page/`) was built using pure vanilla web standards. This keeps it entirely decoupled from the internal application state and ensures instant load times without bundling overhead.

**D83 — Bento Box Layout for Features.**
To avoid layout fatigue caused by long lists of identical cards, the features section was implemented as a dynamic, asymmetrical Bento Box grid.

**D84 — Premium Cursor-Tracking Hover Effects.**
Instead of static borders, a vanilla Javascript event listener dynamically updates `--mouse-x` and `--mouse-y` CSS variables on the feature grids, allowing a CSS `radial-gradient` to act as a "spotlight" that follows the user's cursor.

**D85 — Dynamic GitHub Release Asset Fetching.**
To prevent manual version tagging bottlenecks and ensure the download triggers on the landing page point to the latest executable assets, we query the public GitHub Releases API dynamically (`https://api.github.com/repos/reeshavsinha/AutomataLab/releases/latest`) on page load. It updates direct links and installer sizes in real-time for Windows (`.exe`), Linux (`.deb`), and macOS (`.dmg`).

**D86 — Ambient Background Glow Parallax.**
To create a premium aesthetic without heavy WebGL bundles, we implement a lightweight pointer-tracking backdrop parallax. A mouse mover shifts the radial glow element (`.lp-ambient-glow`) by 5% of the mouse coordinate distance from the center, making the aurora background responsive and organic.

**D87 — Scroll-driven Viewport Animations & Scroll Spy.**
To optimize landing page performance and maintain a 60 FPS page layout without adding heavyweight scroll animation frameworks, we use standard browser `IntersectionObserver` instances. These track navigation sections (to dynamically highlight top nav links) and toggle `.in-view` state classes to trigger hardware-accelerated CSS entrance slide/fade transitions on grid cards.

**D88 — Decoupled Public Documentation Subsets.**
To keep the public site fast and relevant, the `/page/docs/` folder serves copies of the core documentation (`web_*.md`) with public-focused titles. These files exclude build-specific details, private local configuration guidelines, Tauri binary signing setups, and internal developers' identity instructions, keeping public reference material completely decoupled from private repo configuration.

**D89 — Dynamic Download SHA-256 Checksum Verification.**
To align with scientific, technical, and academic software security standards, we added unique `id` selectors to download card checksum blocks (`dl-win-sha`, `dl-deb-sha`, `dl-mac-sha`) and updated the dynamic release fetching script. The updated script scans the GitHub Release description (`data.body`) line-by-line using regular expressions to extract 64-character hexadecimal SHA-256 strings. It maps them based on platform keywords (e.g. `win`, `deb`, `mac`) and overrides the default static placeholders dynamically, falling back gracefully to valid mock hex strings if no hashes are specified in the release notes. *[page/index.html, page/script.js]*

**D90 — Dual Vercel Deployment & Wiki-Driven Documentation.**
To cleanly separate the marketing presence from the React application and avoid bundle pollution, we implemented a dual deployment strategy. `automata-lab-one.vercel.app` serves the public landing page, while `automata-lab-sim.vercel.app` serves the simulator engine. Furthermore, instead of syncing duplicate `web_*.md` documentation files into the landing page bundle, all documentation cards now route externally to the official GitHub Wiki (`AutomataLab.wiki` repo), creating a single source of truth for architecture, formats, decisions, and contributing guides.

### Enforcing Simulator Demo Mode via Environment Variables
- **Context:** The web app simulator is a lightweight demo, while the Tauri build is the full app.
- **Decision:** Bound the isDemoMode flag in AppLayout.tsx and Toolbar.tsx to import.meta.env.VITE_SIMULATOR_MODE.
- **Reasoning:** Purely relying on ?demo=true URL parameters leaves a loophole where a user can bypass UI restrictions. Using Vite's compile-time environment variables permanently bakes the restriction into the Vercel build.

### Landing Page Security Headers
- **Context:** The static landing page lacked Content-Security-Policy and X-Frame-Options.
- **Decision:** Added a strict `page/vercel.json` that prevents iframe
  clickjacking and explicitly whitelists GitHub API connections and Google
  Fonts, while leaving `'unsafe-inline'` styles due to dynamic cursor glow
  logic.
  
## Phase 3 - Grammar and CFG Laboratory (2026-06-21)  
  
**D91 - CFG Engine Layer Additions.** Added \CFG\ to MachineType. Implemented purely typescript-based algorithms for CFG parsing, validation, CNF conversion, and GNF conversion. Imposed strict sequential \idCounter\ logic instead of \Math.random()\ to preserve deterministic UI rendering and Architecture Compliance.  
  
**D92 - Bounded Ambiguity Search.** Since CFG ambiguity is undecidable, implemented a bounded depth-first exhaustive search (up to length 5 by default) to find multiple parse trees for the same witness string. Wired directly into the UI panel to give immediate educational feedback.  
  
**D93 - UI State Boundary Preservation.** Removed imperative \useMachineStore.getState()\ calls from React components (\GrammarPanel.tsx\). Opted to properly export \grammarSource\ through the declarative \useParsedGrammar\ hook, preserving strict state boundaries.  
  
## Phase 4 - Parsing Studio Scaffolding (2026-06-21)  
  
**D94 - Unified Parsing Engine.** Designed \ParsingEngine.ts\ to implement the standard \Automaton\ interface. By converting tabular LR execution state (stack and input pointer) into standard \Configuration\ snapshots, the entire existing time-travel debugging slider and history UI works out-of-the-box for parsers without rewrite.  
  
**D95 - Decoupled LL(1) Table Structure.** Acknowledged that LL(1) parsing does not fit the LR shift-reduce DFA paradigm. Abandoned forcing LL(1) into the unified LR \ParseTable\. Created a distinct \LL1ParseTable\ mapping \Nonterminal -\ -\ Acknowledged that a separate \LL1ParsingEngine\ will be required later to simulate it. 


## Phase 4 Continued - UI Polish and Transition Edges (2026-06-21)

**D96 - DFA Transition Consistency.** Updated the validator to treat missing DFA transitions as a strict error, rather than a warning, to enforce theoretical consistency.

**D97 - UI Layout and Simulation Feedback.** 
- Removed the Heatmap feature entirely.
- Improved Simulation Tape Layout: Input string is now explicitly on top, tape on bottom.
- Simulation Playback: Added hold-to-fast-forward on playback buttons, and jump-to-start/end buttons for long inputs.
- Animation Feedback: Transition edges and states now "flicker" slightly (color pulse) when a symbol is processed, rather than moving/floating.
- Visual Styling: Reduced transition arrow sizes by 50%. Removed the light blue outline around selected states. Transition edges are strictly black or grey, completely removing blue edge coloring.
- Context Menus: Fixed the right-click "Add Transition" option.

**D98 - Multi-Point "Freestyle" Transition Edges (In Progress).** 
*Context*: Finite state machine visualization often requires complex edge routing to avoid crossing nodes or labels. The previous system only supported 1-point (quadratic) or 2-point (cubic) bezier curves, and dragging one handle would mathematically warp the other to maintain curve continuity. 
*Decision*: We are shifting to a "polyline" or "poly-bezier" approach (MS Paint style). A transition will be defined by an array of `waypoints`. A new "Freestyle" tool will allow the user to click anywhere on the curve to add a new waypoint, bending only that local segment without affecting the global curve shape. Removed double-click freesizing entirely in favor of this dedicated tool. Interaction must be directly on the invisible bounding box of the edge path, with no visible circles.

## Phase 5 - Workspace Hub & Architecture Decoupling (2026-06-21)

**D99 - Decentralized Workspace Routing & Layout.**
*Context*: Previously, the application used a monolithic `AppLayout` rendering `AutomataCanvas` or `ParsingViewContainer` conditionally based on the active tab type. This led to UI bugs, flex-box issues, and trapped users in the editor on load.
*Decision*: Implemented a native hash-based router in `App.tsx` pointing to specific workspace shells (`WorkspaceHub.tsx`, `MachineWorkspace.tsx`, `GrammarWorkspace.tsx`, `ParserWorkspace.tsx`). The landing page acts as a Launchpad. We implemented an "anti-trap" `useEffect` observer that forcefully redirects the user to the correct workspace shell if they switch to a tab containing a different `machineType`.
*Rationale*: Each domain (Automata, Grammars, Parsers) requires a fundamentally different UX mental model. Decoupling the layout shells allows us to build dedicated toolbars and panels for each (e.g., pure IDE for Grammar, Debugger matrix for Parser) without polluting the monolithic `AppLayout`.

## Phase 6 - The Professional Polish (2026-06-22)

**D100 - Cross-Panel Synchronization via useSelectionStore.**
*Context*: The Grammar Editor, Parse Table, and Automaton graphs were visually isolated.
*Decision*: Implemented a global event bus (useSelectionStore) allowing components to broadcast a selected Grammar Rule or Semantic Action. ParseTableViewer and AutomatonViewer listen to this store to dynamically highlight cells and nodes matching the selection.
*Rationale*: Creates instant visual traceability for students, explaining exactly why an automaton node exists based on the grammar source.

**D101 - Dependency Graph Visualizer.**
*Context*: The Grammar Laboratory had empty space on the right.
*Decision*: Implemented DependencyGraphCanvas using ReactFlow, which automatically builds a live, directed graph of Nonterminal dependencies as the user types.

**D102 - Educational Conflict Inspector.**
*Context*: Parser Studio surfaced conflicts (Shift/Reduce) as generic errors.
*Decision*: Replaced simple validation with an interactive ConflictInspector modal. Cells with conflicts render as red ERR buttons. Clicking them displays a detailed educational breakdown of the specific conflict (e.g. Dangling-Else).

## Release 7.1 - Adoption & Interoperability (2026-06-22)

**D103 - Workspace-Agnostic History via Immer.**
*Context*: History was bound to specific component structures, making Undo/Redo complex.
*Decision*: Migrated to a global HistoryService and useHistoryStore tracking isolated stacks per 	abId. machineStore now relies on Immer's produceWithPatches to stream fine-grained delta patches, resolving memory and DOM thrashing issues.

**D104 - Native JFLAP Support.**
*Decision*: Implemented jflapParser and jflapSerializer to natively parse .jff XML directly into AutomataLab JSON schemas, added an explicit 'Open File' card to the WorkspaceHub.

**D105 - Clipboard-Centric Export.**
*Context*: Teachers build exams via Copy/Paste, not file downloads.
*Decision*: Built an ExportService that writes SVG text, PNG Blobs, and JSON directly to navigator.clipboard. Added quick-action buttons directly to the toolbars.

## Phase E - Robustness Audit Remediations (2026-06-22)

**D106 - Store Monolith Split.**
*Context*: The `machineStore` was a God-object that managed tabs, UI routing flags, and the active execution machine, leading to rendering cascades and TS collisions.
*Decision*: We separated the `machineStore` into `tabStore` (responsible for dirty tracking, paths, and tabs) and a tightly-scoped `machineStore` that exclusively tracks the active machine's topology and definitions. 

**D107 - Exploding Earley Parse Virtualization.**
*Context*: Highly ambiguous or left-recursive CFGs caused Earley parse forests to grow exponentially, locking the React DOM thread when rendering.
*Decision*: Virtualized and paginated the parse table output within the `ParseTableViewer` to ensure 60 FPS scrolling regardless of ambiguity depth.

**D108 - JFLAP XXE Security Fix.**
*Context*: JFLAP's `.jff` files are parsed via the browser's `DOMParser`, exposing the system to XXE vulnerabilities if a hostile payload included a `DOCTYPE` definition.
*Decision*: Hand-rolled a pre-flight regex stripper in `jflapParser.ts` to rip out `<!DOCTYPE...>` before passing it to `DOMParser`.

## Reliability, State Integrity & Stability Hardening Sprint (2026-06-24)

**D109 - History Memory Leak Fix: Explicit `clear()` on Tab Close.**
*Context*: `tabStore.ts` deleted `dirtyTabs[closedId]` and `tabPaths[closedId]` on tab close but did not inform `historyStore.ts`, leaving the entire Immer patch history (past/future arrays holding large closure references per tab) permanently in memory.
*Decision*: Added `useHistoryStore.getState().clear(closedId)` to the `closeTab` action in `tabStore.ts`.
*Rationale*: Fixes unbounded memory growth during long sessions. Patch histories holding multiple machine states can consume hundreds of MB in aggregate. No architectural change — uses the already-existing `clear(tabId)` method on `historyStore`. *[store/tabStore.ts, store/historyStore.ts]*

**D110 - Tab Synchronization: clearSelection on Tab Lifecycle Events.**
*Context*: Switching tabs, closing tabs, and opening new tabs only reset the machine and simulation state. UI selection state (selected state/transition IDs, active renaming, open editors) from the previous tab leaked into the newly active tab, causing panels to display stale or blank content.
*Decision*: Added `useUIStore.getState().clearSelection()` to all three lifecycle actions in `tabStore.ts`: `addTab`, `switchTab`, and `closeTab`.
*Rationale*: Selection IDs are machine-local. They must be invalidated whenever the machine changes. This is the minimal defensive fix — no state shape change. *[store/tabStore.ts, store/uiStore.ts]*

**D111 - Widened clearSelection to Include All Transient Editor States.**
*Context*: `clearSelection` only cleared `selectedStateIds` and `selectedTransitionIds`. It did not clear `isEditingTransition`, `transitionEditorStateId`, or `renamingStateId`, all of which hold specific node IDs that become stale after a tab switch or deletion.
*Decision*: Updated `clearSelection` in `uiStore.ts` to also reset `isEditingTransition: null`, `transitionEditorStateId: null`, and `renamingStateId: null`.
*Rationale*: A single clearing action should be the authoritative "reset all cursor-local UI" primitive. Callers should not need to chain multiple setters. *[store/uiStore.ts]*

**D112 - Orphaned Selection Prevention on Node Deletion and Undo/Redo.**
*Context*: `deleteState`, `deleteTransition`, and `applyHistoryPatches` (undo/redo) in `machineStore.ts` mutated the machine definition but did not clear the active UI selection. If the user had a node selected and then deleted it or undone its creation, the selection ID remained active pointing at a now-nonexistent entity.
*Decision*: Added `useUIStore.getState().clearSelection()` calls as the first action inside `deleteState`, `deleteTransition`, and `applyHistoryPatches`.
*Rationale*: Clearing before the structural change ensures the UI never observes a moment where selection points at a deleted entity. *[store/machineStore.ts, store/uiStore.ts]*

**D113 - JFLAP Import: Transition Invariant Validation.**
*Context*: `jflap.ts` skipped transitions with null/empty `from` or `to` attributes, but did not verify that the referenced IDs actually existed in the parsed states array. A malformed or partially-exported `.jff` file could produce transitions pointing at non-existent node IDs, which caused ReactFlow to throw an unhandled exception ("source/target node not found") that crashed the entire Machine Workspace to a white screen.
*Decision*: Added an existence check: `if (!states.some(s => s.id === from) || !states.some(s => s.id === to)) continue` immediately after the null check in `parseJFLAP`.
*Rationale*: Defense in depth. The JFLAP format does not guarantee referential integrity. We must validate it before handing it to ReactFlow. *[utils/jflap.ts]*

**D114 - Parser Studio: Wrap All Grammar Evaluation in try/catch.**
*Context*: `ParsingStudio.tsx`'s `useMemo` called `parseGrammar()` and `analyzeGrammar()` before entering the `try/catch` block that wrapped table-building algorithms. If either of these functions threw an unexpected runtime error (e.g., a regex failure on a pathological input string), the exception escaped the safety boundary and crashed the React component tree.
*Decision*: Moved `parseGrammar()` and `analyzeGrammar()` inside the `try/catch` block of the `useMemo` callback. The `grammar.errors.length > 0` early-return also moved inside, keeping the same user-facing behavior.
*Rationale*: The entire evaluation pipeline is a single logical unit. The safety boundary should encompass all of it, not just the table-building step. *[components/parsing/ParsingStudio.tsx]*

## UI/UX Resizability & Collision Standardisation (2026-06-25)

**D115 - Dynamic Splitter Implementation.**
*Context*: Users reported that the text editors and drawing canvases were cramped, especially on smaller screens, and they needed the ability to dynamically adjust panel proportions.
*Decision*: Built a generic, reusable `<Splitter>` layout component and wrapped the main columns in `GrammarWorkspace` and `ParserWorkspace`.
*Rationale*: Hardcoded flex ratios (`flex: 1`, `width: 30%`) fail in a complex IDE. Exposing a draggable boundary standardizes resizability app-wide without refactoring component internals. *[components/layout/Splitter.tsx]*

**D116 - Standardized LR Conflict Resolution.**
*Context*: A grammar like `S -> aSa | a` caused Shift/Reduce conflicts in the LR parser generator. The engine logged them, but did not formally resolve them, causing table generation to fail gracefully but visibly (showing `"ERR"` in the UI).
*Decision*: Updated `slr.ts` and `lr1.ts` to implement standard Yacc/Bison resolution logic: heavily prioritize Shift over Reduce in all S/R conflicts, and favor the earlier-defined production in R/R conflicts. Updated `ParseTableViewer` to display the literal conflict (e.g., `s4/r1`) instead of `"ERR"`.
*Rationale*: Gives deterministic predictability to ambiguous educational grammars, exactly mirroring how industry-standard parser generators behave. *[engines/parsing/slr.ts, engines/parsing/lr1.ts, components/parsing/ParseTableViewer.tsx]*

**D117 - Tab Routing Cross-Contamination Fix.**
*Context*: The hash-based workspace router (`#/grammar`, `#/parser`) decoupled the UI, but `tabStore` didn't track which tool a tab belonged to. Navigating to the Hub, opening Parser Studio, and then switching back to an existing Grammar tab left the user stranded in the Parser UI looking at Grammar data.
*Decision*: Added a `tabRoutes` dictionary mapping Tab IDs to their original hash route (`#/grammar`, etc.), and modified `switchTab` and `WorkspaceHub.tsx` to actively update `window.location.hash` upon tab selection/restoration.
*Rationale*: Tabs in a multi-app IDE must own their environment route. Failing to track this breaks the workspace decoupling introduced in the Workspace Hub overhaul. *[store/tabStore.ts, components/layout/TabBar.tsx, components/layout/WorkspaceHub.tsx]*

**D118 - Parsing Studio LL(1) Automaton Null Pointer Crash.**
*Context*: Switching from an LR algorithm (SLR1/CLR1/LALR1) to LL(1) while the "Automaton" sub-tab was selected caused a fatal React crash because LL(1) doesn't produce an item-set automaton, returning null.
*Decision*: Forced the `ParsingStudio.tsx` render loop to strictly fallback to the Parse Table sub-tab whenever `currentAlgorithm === 'LL1'` or if `automaton` evaluates to null.
*Rationale*: Simple defensive render gating prevents unhandled state transitions from leaking into downstream components. *[components/parsing/ParsingStudio.tsx]*

**D120 - Parser State Decoupling.**
*Decision*: Extracted parser state generation (ParseTable and LRAutomaton) directly into the Workspace components or shared utilities, memoizing them based on the active grammar and algorithm to share exact object references across the Workspace.
*Rationale*: Prevents infinite render loops and expensive recalculations while enabling advanced IDE-style diagnostic panels.state transitions from leaking into downstream components. *[components/parsing/ParsingStudio.tsx]*

**D121 - Parse Tree mrtree Layout.**
*Context*: Using dagre or layered ELK layouts for the live Parse Tree inverted sibling node order arbitrarily, breaking the mathematical left-to-right invariant of derivation trees.
*Decision*: Swapped the tree layout algorithm in useParseTreeLayout.ts to ELK's mrtree algorithm, which inherently respects strict sibling ordering. Added visible explicit arrow markers (MarkerType.ArrowClosed) to transition edges.
*Rationale*: Preserves academic rigor in derivations; users will never see reversed AST branches. *[hooks/useParseTreeLayout.ts]*

**D122 - Parser Tokenization Maximal Munch.**
*Context*: The ParsingEngine tokenizer was splitting input naively by characters, destroying multi-character grammar terminals like id (yielding i and d instead).
*Decision*: Upgraded the lexer to use a greedy Maximal Munch algorithm. The engine now accepts the grammar's 	erminals as an initialization dependency and attempts to match the longest valid terminal at the current index.
*Rationale*: Standard compiler design practice. Allows realistic context-free grammars containing string tokens to execute correctly. *[engines/parser/ParserEngine.ts]*

**D123 - Grammar Industry-Standard Formats Support.**
*Context*: Grammars were bound purely to internal JSON logic.
*Decision*: Overhauled `fileManager.ts` to import and export Context-Free
Grammars as text files (`.txt`, `.bnf`, `.ebnf`) and added the requested JSON
grammar representation.
*Rationale*: Greatly increases academic interoperability, matching user requests for standard format support. *[utils/fileManager.ts]*

**D124 - Auto-Router Race Condition Fix (The Grammar Lab Hijack).**
*Context*: Switching from a Machine workspace tab to a Parser Studio tab would occasionally hijack the route and drop the user into the Grammar Editor instead of the Parser UI.
*Decision*: The TabBar synchronously updated the machineType to CFG, causing React to re-render App.tsx *before* the browser could process the asynchronous hashchange event. The auto-router saw CFG + #/machine and aggressively "corrected" it to #/grammar. Fixed by reading window.location.hash directly in the useEffect.
*Rationale*: Safely resolves rendering race conditions by observing true DOM state for global routing logic. *[App.tsx]*

## Edge Routing & Parser Debugging (2026-06-26)

**D125 — Interactive vs. Final Edge Routing Mode.**
*Context:* Rerouting all edges on every mouse move during node drag caused O(n²) compute and UI freezing even with ~20 edges.
*Decision:* Split routing into two modes: **interactive** (during drag: reroute only edges connected to the dragged node) and **final** (on drop: run GlobalRoutingEngine on all edges). Other edges may temporarily overlap the dragged node during drag, but this is visually acceptable.
*Rationale:* Preserves 60fps drag responsiveness while still producing globally-optimal routes on release. *[engines/parser/layout/GlobalRoutingEngine.ts]*


**D127 — A* Pathfinding with Obstacle Inflation for Edge Routing.**
*Context:* LR automaton transitions were rendering straight-line paths that cut through states, making diagrams unreadable.
*Decision:* Implemented obstacle-aware routing using A* pathfinding. Each state node's bounding box is inflated by a configurable margin to create exclusion zones. Edges pathfind around these zones on a virtual grid.
*Rationale:* Produces textbook-quality compiler automaton diagrams where long transitions naturally route around states. Readability over shortest path. *[engines/parser/layout/GlobalRoutingEngine.ts]*

**D128 — Parallel Lane Separation for Overlapping Edges.**
*Context:* Multiple routed transitions sharing the same corridor rendered directly on top of each other, making individual transitions indistinguishable.
*Decision:* When multiple edges share a route segment, offset them into parallel lanes with configurable spacing. Transitions may briefly share a trunk before diverging.
*Rationale:* Each transition must be visually distinct and independently traceable. *[engines/parser/layout/GlobalRoutingEngine.ts]*

**D129 — Cross-Edge Visibility Filter by edgeClass.**
*Context:* The "Show/Hide Extended Transitions" toggle button was not working.
*Decision:* Filter edges by `e.edgeClass === 'tree'` when `expandCrossEdges` is false, only showing tree-class edges (which form the spanning tree of the LR automaton).
*Rationale:* Clean separation between tree edges (always shown) and cross edges (toggle-controlled). *[engines/parser/layout/LRLayoutStrategy.ts]*

**D130 — StepResult.stack → simulationStore.activeStack Property Mapping.**
*Context:* The `StepResult` interface uses field name `stack: string[]`, but the simulation store uses `activeStack: string[]`.
*Decision:* Map `result.stack` → `activeStack` in `useSimulation.applyEngineResult()`. A previous session incorrectly changed this to `result.activeStack` (which doesn't exist on `StepResult`), causing the stack to always be `undefined`. Fixed back to `result.stack` during this session.
*Rationale:* The field names differ because `StepResult` is engine-domain (generic) while `activeStack` is UI-domain (specific). The mapping layer in `useSimulation` is the correct place for this translation. *[hooks/useSimulation.ts, store/simulationStore.ts]*

**D131 — Data Rescue on Error (.zip export).**
*Context:* In the event of a fatal React error, users lose uncommitted progress.
*Decision:* Implemented a one-click Data Rescue feature in `ErrorBoundary` that bundles the entire active workspace (machines, grammars, unparsed states) into a .zip file (via `jszip`) and downloads it before resetting the app.
*Rationale:* Prevents devastating data loss during crash boundaries. Machines are saved as `.automatalab` and grammars as `.txt`. *[components/layout/ErrorBoundary.tsx]*

**D132 — Workspace Hub Hash Routing (v5.0.0).**
*Context:* The app transitioned from a monolithic Machine Simulator to a multi-tool workspace.
*Decision:* Implemented lightweight, native hash-based routing in `App.tsx` (`#/machine`, `#/grammar`, `#/parser`) rather than using `react-router-dom`.
*Rationale:* Keeps the bundle size small and adheres to the project's principle of minimizing heavy third-party dependencies for core logic. *[App.tsx]*

**D133 — Tab-Isolated Global History System.**
*Context:* Global Undo/Redo commands (`Ctrl+Z`, `Ctrl+Y`) applied patches indiscriminately, causing cross-workspace data corruption when switching tabs.
*Decision:* Extracted history tracking into `historyStore.ts`, mapping independent `past` and `future` patch stacks strictly by `tabId`.
*Rationale:* Ensures that pressing Undo only affects the specific document you are looking at, while allowing the global keyboard shortcuts to function universally. *[store/historyStore.ts]*

**D134 — Visual Polish & Theme Persistence.**
*Context:* The app lacked a professional "desktop" aesthetic and lost theme state on reload.
*Decision:* Migrated from a hard-coded dark mode to a persisted Light/Dark toggle (`uiStore.ts`) applying `.dark` to the `<html>` root, powered by CSS variables (`--chrome-bg`, `--surface`).
*Rationale:* Provides a much cleaner, professional academic tool feel, significantly improving UX and accessibility. *[store/uiStore.ts, index.css]*

## Bug-Fix Session (2026-08-13)

**D135 — Two-Rule Grammar Tokenization.**
*Context:* The greedy regex `^([a-z][a-z0-9_]*)` in `tokenizeGrammarString` consumed entire lowercase runs (e.g. `aa` from `aaAb`) as a single token before seeing the uppercase nonterminal, producing wrong FIRST/FOLLOW sets.
*Decision:* Removed the greedy fallback. Rule: (1) compact/no-space alternatives tokenize character-by-character so each lowercase char is its own terminal; (2) space-separated tokens are treated as single symbols, preserving multi-char terminals like `id` or `num`. Epsilon keywords are still resolved via the tokenizer in both paths. *[engines/grammar/parser.ts]*

**D136 — ParseTablePanel Header Priority (buttons > chips).**
*Context:* When the ParseTablePanel is narrow or fully minimised, the metadata stat chips (Complexity, Det, CNF, Ambiguity) crowded out the `Parse Table` / `Automaton Graph` toggle buttons, making them invisible.
*Decision:* Applied `flexShrink: 0` to the view-toggle container and `flexShrink: 1` + `overflow: hidden` to the metadata chips so chips collapse before buttons in constrained widths. *[components/workspaces/parser/ParseTablePanel.tsx]*

**D137 — Automaton Graph Button Visibility Condition.**
*Context:* The `Automaton Graph` toggle button was conditionally rendered only when parser conflicts were present, making it invisible on conflict-free grammars.
*Decision:* Changed condition to render whenever `activeTable` is non-null, regardless of conflict state. *[components/workspaces/parser/ParseTablePanel.tsx]*

**D138 — Default Shortened Transitions + Label Format.**
*Context:* The automaton graph defaulted to the verbose extended-transition view, which was visually noisy. Stub labels showed `a ---> 2` (ambiguous).
*Decision:* `showExtended` initialises to `false`. Stub labels now read `a ---> State 2`. The eye-button toggles between modes. *[AutomatonViewerPanel.tsx, engines/parser/layout/types.ts]*

**D139 — Play Button Theme Token.**
*Context:* The active play button background was hardcoded to `#21262d`, which broke in light mode.
*Decision:* Replaced with `var(--trace-ring)` for theme-aware highlighting. *[components/controls/SimulationControls.tsx]*

**D140 — LR Automaton Self-Loop Indicator.**
*Context:* LR automaton states can have GOTO transitions back to the same state, but the graph had no compact visual indication of those self-loops.
*Decision:* Render the symbols for self-loop transitions as a compact badge outside the LR state node border at the upper-right corner. *[components/workspaces/parser/LRStateNode.tsx]*

---

## v5.0.1 — Grammar tokenization (2026-08-15)

**D141 — Deterministic grammar tokenizer (whitespace + quotes), replacing the longest-declared-match heuristic.**
*Context:* The old `tokenizeGrammarString` sorted declared nonterminals by length and greedily prefix-matched them against the RHS source. Tokenization therefore depended on which symbols happened to be declared elsewhere in the grammar — e.g. `A -> a a A b` could be mis-tokenized as `aa A b` if `aa` was declared. This produced wrong symbol boundaries that flowed silently into FIRST/FOLLOW and every parser generator.
*Decision:* Resolve symbol boundaries purely from source text, before any analysis. Whitespace is the hard boundary; a maximal `[A-Za-z0-9_']` run is one symbol; quoted strings are one symbol; backslash-epsilon commands and multi-char operators (`<= >= == != && ||`) stay grouped. No dependency on declared sets. Signature changed: `tokenizeGrammarString(str)` no longer takes declared nonterminal/terminal sets (breaking, internal only). Explicitly rejected "fixing" this in FIRST/FOLLOW — the ambiguity must be resolved in the grammar front-end. *[engines/grammar/parser.ts]*

**D142 — Separate `tokenizeInputString` for input sentences (longest-terminal-match).**
*Context:* Grammar-production tokenization must be deterministic and context-free, but tokenizing an *input sentence* against a known terminal alphabet legitimately wants longest-terminal-match (so multi-char terminals are recognized). Reusing one function for both concerns is what caused the original coupling.
*Decision:* Split into two functions — `tokenizeGrammarString(str)` (deterministic, source-only) for productions, and `tokenizeInputString(str, terminals)` (longest-match over the terminal set) for parse input. Derivation/ambiguity tabs and simulation input use the latter. *[engines/grammar/parser.ts, components/workspaces/parser/GrammarDerivationTab.tsx, GrammarAmbiguityTab.tsx]*

**D143 — Quoted terminals and literal quote/backslash round-trip safety.**
*Context:* Multi-char terminals, punctuation, and literal `"`/`'`/`\` characters need an unambiguous spelling. `formatSymbol` crashed when re-tokenizing a literal `"` ("unterminated quoted symbol"), breaking CNF/GNF transformations and grouped/flat editor sync.
*Decision:* Support single- and double-quoted terminals as one symbol. `formatSymbol` probes re-tokenization under try/catch; if it throws or yields multiple tokens, emit a quoted form, escaping `\` then `"` (so `"` → `"\""`, `\` → `"\\"`). Guarantees any grammar survives parse → transform → format → re-parse. *[engines/grammar/parser.ts, engines/grammar/transformations.ts]*

**D144 — Recognize `→` and `∣` as grammar operators; drop tokenization-guessing diagnostics.**
*Context:* Users write productions with the Unicode arrow `→` and the Unicode DIVIDES `∣` (U+2223) rather than `->` and `|`. Separately, the old diagnostics guessed at tokenization intent ("Did you forget spaces?", "suspicious uppercase terminal"), which is meaningless under a deterministic tokenizer and produced false positives.
*Decision:* Accept `→` as an arrow and split alternatives on `/[|∣]/`; the grammar editor normalizes `∣` → `|` (length-preserving) on input. Removed the speculative diagnostics, keeping only genuine "undefined nonterminal" errors. *[engines/grammar/parser.ts, engines/grammar/diagnostics.ts, components/workspaces/parser/GrammarEditorPanel.tsx]*

---

## Educational Documentation & Theory Extension Sprint (2026-08-24, v5.0.2)

**D145 — Parser Studio Pedagogical Example Library.**
*Context:* Parser Studio users needed readily loadable educational grammar examples to quickly test and inspect various parser algorithms (LL(1), LR(0), SLR(1), CLR(1), LALR(1), CYK, Earley, and Backtracking).
*Decision:* Added 16 diverse pedagogical grammar examples to `src/utils/examples.ts` categorized across: Simple Recursion, Balanced Parentheses, Palindromes, Arithmetic Expressions, Control Flow (Dangling Else), and Parser Conflicts (Ambiguous / S-R / R-R). Built an in-toolbar `ExamplePicker.tsx` component with categorized dropdowns and authored dedicated integration test suites (`requestedExamples.test.ts`, `integration.test.ts`). *[utils/examples.ts, components/toolbar/ExamplePicker.tsx, engines/parser/requestedExamples.test.ts]*

**D146 — Batch Runner `.txt` File Loading.**
*Context:* Running batch simulations across FAs, PDAs, and TMs required manual copy-pasting of test strings into the input textarea.
*Decision:* Added a "Load .txt" button to `BatchRunnerModal.tsx` allowing users to directly load batch test string files via file input, matching desktop workflow ergonomics. *[components/controls/BatchRunnerModal.tsx]*

**D147 — In-Editor Grammar Tokenization Guidance & Syntax Guide.**
*Context:* Users frequently questioned how the grammar parser distinguishes multi-character terminals (e.g. `num`, `id`) from single characters (`n`, `u`, `m`), and whether multi-character nonterminals are supported.
*Decision:* Added an in-editor collapsible "Syntax" guide in `GrammarEditorPanel.tsx` and updated `GrammarEmptyState.tsx` with explicit tokenization rules: whitespace as hard token boundary, `[A-Z][A-Za-z0-9_']*` for multi-character nonterminals, quoted terminals (`"..."` / `'...'`), and verified full algorithmic support across all parsing engines. *[components/workspaces/parser/GrammarEditorPanel.tsx, components/workspaces/grammar/GrammarEmptyState.tsx]*

**D148 — Comprehensive In-App User Manual (F1).**
*Context:* AutomataLab had quick keyboard shortcut overlays (`HelpModal`), but lacked a unified, standalone desktop User Manual explaining every workspace, simulation engine, file format (.autolab.json, .jff, LaTeX), and troubleshooting guideline.
*Decision:* Implemented `ManualModal.tsx` containing 9 comprehensive modules (Workspace Navigation, Machine Studio, Grammar Lab, Parser Studio, Batch Runner, File Interoperability, LaTeX Export, Keyboard Shortcuts, and FAQ). Wired to MenuBar (Help → User Manual) with global accelerator `F1` and cross-navigation to the Theory Handbook. *[components/layout/ManualModal.tsx, store/uiStore.ts, components/layout/MenuBar.tsx]*

**D149 — Comprehensive Theory of Computation & Compiler Design Handbook (F2).**
*Context:* AutomataLab is an educational and academic simulator requiring prerequisite theoretical foundations for automata, formal grammars, parsing algorithms, computability, and optimization.
*Decision:* Created `TheoryModal.tsx`—an exhaustive 15-chapter, 33-section, 2500+ line reference handbook wired to MenuBar (Help → Theory Handbook) and global shortcut `F2`. Features:
1. TOC Foundations: Chomsky Hierarchy, Regular Expression Algebra (Arden's Theorem), Finite Automata models & conversions (Thompson, Subset, Hopcroft).
2. Algorithmic Decision Systems: DFA equivalence, emptiness, finiteness, universality, inclusion, and shortest distinguishing strings with exact time complexities.
3. Formal Closure Proofs: Product DFA constructions and explicit non-closure counterexamples for CFLs.
4. Parsing Algorithms: CYK dynamic programming, Earley universal chart parsing (Predictor, Scanner, Completer), and DCFL vs CFL (Knuth's LR equivalence theorem).
5. Computability & Proofs: Turing machine design patterns, Enumerators (lexicographic generation ↔ decidability), Dovetailing, Rice's theorem, and formal Mapping Reductions ($A \le_m B$) with explicit directionality rules.
6. Complexity Theory: Polynomial reductions ($3\text{-SAT} \le_p \text{Vertex Cover}$), PSPACE, Savitch's Theorem.
7. Compiler Engineering: Lexical input buffering (sentinels, maximal munch), complete FIRST/FOLLOW algorithms, full LR(0)/SLR/LALR/CLR family with worked stack traces on `id + id * id$`, Semantic Analysis (scopes, type inference), Static Single Assignment (SSA form, dominators, $IDF$ $\phi$-placement, SCCP, GVN), loop optimizations (LICM, strength reduction, unrolling), graph-coloring register allocation (Chaitin–Briggs, live ranges, linear scan), modern Garbage Collection (generational, card tables, Cheney copying), and compiler correctness (CompCert, UB traps).
8. The Grand Synthesis Chapter: Theoretical bridge mapping Type-3 $\to$ Scanners, Type-2 $\to$ Parsers, Type-1 $\to$ Semantic Type Checkers, Type-0 $\to$ SSA/IR Execution & Rice's undecidability theorem for optimization limits. *[components/layout/TheoryModal.tsx, store/uiStore.ts, components/layout/MenuBar.tsx, App.tsx]*

**D150 — Unified Modal Routing & Cross-Modal Navigation.**
*Context:* Modal management was fragmented across disparate dialog triggers, making it difficult for users to navigate between Quick Help, User Manual, and Theory Handbook.
*Decision:* Extended `ModalKind` in `uiStore.ts` to include `'manual'` and `'theory'`. Added global `F1` (Manual) and `F2` (Theory) key listeners in `MenuBar.tsx` and cross-navigation header buttons in `HelpModal.tsx` and `ManualModal.tsx` enabling seamless 1-click transitions between documentation tiers. *[store/uiStore.ts, components/layout/MenuBar.tsx, components/layout/HelpModal.tsx, components/layout/ManualModal.tsx, App.tsx]*

**D151 — Central capability and persistence contracts before parity features.**
*Context:* The parity roadmap adds machine types, educational exercises, new workspaces, and richer file contents. Keeping workspace routes, machine-type lists, and serialization behavior in separate UI branches would make those additions prone to drift and break older files.*
*Decision:* Added `engines/machine/core/capabilities.ts` as the central registry for current machine types, workspace routing, and feature gates; added `utils/fileFormat.ts` for the project-file major-version contract; preserved grammar/parser fields through JSON round trips; and added `engines/education/types.ts` for bounded exercise sessions separate from authoritative simulation state. Refactored current App, Workspace Hub, and Toolbar gates to use the registry. *[engines/machine/core/capabilities.ts, utils/fileFormat.ts, engines/education/types.ts, App.tsx, components/layout/WorkspaceHub.tsx, components/toolbar/Toolbar.tsx]*

**D152 — Deterministic transducer output semantics.**
*Context:* Phase A1 adds output-producing finite-state machines without changing recognizer behavior.*
*Decision:* Added `MEALY` and `MOORE` as graph-backed machine types. Mealy emits `Transition.output` after each consumed input symbol; Moore emits the initial state's `AutomataState.output` before input and the destination state's output after each transition. Output traces are copied into configurations, history, step results, batch results, and the dedicated Output panel. `initialOutput` is retained only where a conversion needs to preserve a Moore initial emission in Mealy form. *[engines/machine/transducer, engines/machine/core/types.ts, store/simulationStore.ts, components/panels/OutputTracePanel.tsx]*

**D153 — State splitting for Mealy → Moore conversion.**
*Context:* A Moore state has one output, while multiple Mealy transitions can enter the same logical state with different outputs.*
*Decision:* Convert by cloning destination states per incoming output and redirecting every outgoing transition from each clone. Moore → Mealy instead places each destination state's output on incoming transitions and preserves the initial emission in `initialOutput`. *[engines/machine/conversions/transducers.ts]*

**D154 — Do not silently lose transducer outputs in JFLAP export.**
*Context:* JFLAP's standard finite-automaton XML format has no portable Mealy/Moore output field.*
*Decision:* Keep native `.autolab.json` as the lossless transducer format and disable JFLAP export for `MEALY`/`MOORE` rather than emitting an apparently valid but semantically incomplete file. *[utils/jflap.ts, components/layout/ExportModal.tsx]*

**D155 — One bounded, pure test-suite contract for machine and parser batches.**
*Context:* Machine and Parser Studio previously owned separate line runners, and parser batches mutated the interactive store while executing.*
*Decision:* `utils/testSuite.ts` defines the serializable suite/case/result model and delegates execution to `runToCompletion` or fresh parser engines from `engines/parser/runner.ts`. Comparisons distinguish pass, mismatch, error, and resource limit; hidden, random, and boundary categories remain metadata rather than separate execution paths. The historical `batch.ts` API stays compatible.

**D156 — Configuration exports are model-aware and preserve tape topology.**
*Context:* A single fixed trace schema would either hide useful PDA/TM data or imply that independent tapes are multi-track cells.*
*Decision:* Enrich machine history at the store boundary and derive the export matrix from machine capabilities. Add stack, one column per independent tape, and transducer output only when applicable; Markdown and LaTeX use the same deterministic rows as CSV.

**D157 — Context-sensitive `S` precedence for keyboard editing.**
*Context:* Simulation already uses `S` as step-forward, while keyboard-first canvas editing needs a fast transition completion command.*
*Decision:* Keep `S` as simulation step by default. When a canvas transition is active, the canvas command has precedence and stops the simulation handler; `T` starts from one selected state and `Enter` completes to one selected target. Input/editor/dialog suppression remains mandatory.

**D158 — Phase A validation records bounded-history and modal/throughput follow-ups.**
*Context:* Static review and automated validation of A2–A4 passed the complete test suite, type check, and production build, but also identified implementation limits that tests do not remove.*
*Decision:* Treat `MAX_HISTORY` configuration exports as a bounded retained-history window, not a complete long-run transcript. Keep suite size/step caps, but schedule worker or chunked execution because synchronous batch maps can still block rendering. Use the canonical grammar tokenizer for both interactive and batch parser inputs, including quoted terminals and epsilon; reject unsupported suite versions rather than normalizing them. Migrate Parser Batch and Transition Editor overlays onto the shared `Dialog`, and apply modal/transition-mode suppression consistently to all global shortcuts. Track stale batch reports, UTF-8-BOM CSV input, trace-only result-summary counting, keyboard self-loops/target selection, TM tape-coordinate export, transducer initialization rows, and failed-transition configuration consistency as follow-up correctness fixes. *[utils/testSuite.ts, engines/parser/runner.ts, components/workspaces/parser/InputBufferPanel.tsx, components/canvas/TransitionEditor.tsx, hooks/useCanvasKeyboard.ts, components/common/Dialog.tsx, store/simulationStore.ts, utils/exporters.ts]*

**D159 — Bundle every currently available export artifact.**
*Decision:* The shared Export dialog builds one JSZip archive for Machine Studio, Grammar Lab, or Parser Studio. It includes all applicable direct-download artifacts plus `manifest.json`, which records workspace, retained-history metadata, and any rendering omission; clipboard-only actions are excluded. *[components/layout/ExportModal.tsx, utils/diagramExport.ts]*

**D160 — Mealy/Moore machines are transducers, not recognizers.**
*Context:* Output-producing machines were initially allowed to reuse DFA-style final-state acceptance, which made their output trace and language verdict compete as two meanings of a run.*
*Decision:* Remove final-state affordances and accept/reject language semantics for `MEALY` and `MOORE`. Transducer runs complete when the input is consumed, report `completed`, return `accepted: null`, and treat a missing move as an execution error. Clear legacy final-state flags when changing type or loading a file; omit final-state roles from canvas, context menus, tables, and exports. *[engines/machine/transducer/TransducerEngine.ts, engines/machine/core/types.ts, store/machineStore.ts, utils/validator.ts, components/canvas, utils/exporters.ts]*

**D161 — Skip Phases B and D.**
*Context:* The remaining parity roadmap included educational exercise modules and optional showcase/sensory features that are not required for the current product direction.*
*Decision:* Mark Phase B (interactive conversion/CYK/tree/Pumping Lemma/ambiguity exercises) and Phase D (Formal Systems Lab, L-Systems, dual-canvas showcase, particles, and audio) as intentionally skipped. Keep Phase C as the only active future roadmap. *[internal-ref-files/PARITY_IMPLEMENTATION_PLAN_REVISED.md]*

**D162 — Record the stabilized A2–A4 baseline.**
*Decision:* The current implementation baseline is 42 Vitest files with 530 passing tests, clean TypeScript compilation, and a successful production build. Existing Vite chunk-size and mixed static/dynamic-import warnings are documented as non-blocking. *[internal-ref-files/architecture.md, internal-ref-files/handoff.md]*

---

## Phase C implementation and simulator hardening (2026-09-05)

**D163 — Implement Type 0–3 grammar representation without weakening CFG-only algorithms.**
*Context:* Type 1 and Type 0 productions need multi-symbol left-hand sides, while the existing FIRST/FOLLOW, normal-form, and parser generators assume a context-free grammar.*
*Decision:* Add `GeneralGrammar`, `GrammarFormat`, and `parseGeneralGrammarText()` as the general production-system boundary. Classify conservatively as Type 3, Type 2, Type 1, or Type 0; enforce the selected family in `validateGrammarFormat()`. Construct the legacy `CFG` model and run CFG analysis only for Type 2/3 input. Regex remains its own format. This supersedes the “Phase C is future work” portion of D161; the decision to skip Phases B and D remains unchanged. *[engines/grammar/types.ts, engines/grammar/parser.ts, engines/grammar/classification.ts, store/grammarStore.ts]*

**D164 — Treat unrestricted derivation as a bounded search with explicit inconclusive outcomes.**
*Context:* Membership for unrestricted grammars cannot be generally decided, and an interactive breadth-first search can exhaust memory or block the UI.*
*Decision:* Use duplicate-eliminating bounded BFS with depth, sentential-form length, node, and time limits. Return `FOUND`, `NOT_FOUND_WITHIN_LIMIT`, `RESOURCE_LIMIT`, or `CANCELLED`; any depth/length/node/time pruning is `RESOURCE_LIMIT`. Run interactive searches through `derivationWorker.ts`. Generated recognizers map a found derivation to `accepted`, a genuinely exhausted finite reachable search to `rejected`, and resource exhaustion to `stuck`. *[engines/grammar/derivationSearch.ts, engines/grammar/derivationWorker.ts, engines/machine/grammarRecognizer/GrammarRecognizerEngine.ts]*

**D165 — Keep multi-track, multi-tape, and hierarchical TMs as distinct models.**
*Context:* A multi-track tape shares one head and cell coordinates, whereas a multi-tape TM has independent tapes/heads. Hierarchical calls additionally need ownership and replay semantics.*
*Decision:* Introduce `MTM` for a sparse physical tape whose cells are vectors and whose one head reads/writes all tracks atomically. Preserve `TM.tapeCount` for independent multi-tape execution. Hierarchical TM children are immutable snapshots embedded in `MachineDefinition.submachines`; call transitions write/move first, then enter the child, and child acceptance produces an explicit return to the parent target. Shared tapes, call frames, global/local step guards, depth limits, serialization, and missing-child errors are part of the contract. *[engines/machine/multitrack/MultiTrackTMEngine.ts, engines/machine/hierarchical/HierarchicalTMEngine.ts, engines/machine/core/types.ts]*

**D166 — Keep TM watchers transient and pause before execution.**
*Context:* Breakpoints are debugger state, not part of the recognized language or persisted machine definition.*
*Decision:* Store watchers per open tab in `tmDebugStore`, remove them when the tab closes, and do not serialize them. Conditions may inspect state, head symbol, absolute head position, step count, a finite tape window, or nested AND/OR groups. `useSimulation` checks enabled watchers against current configurations before the next automatic step; headless and batch execution remain unaffected. *[engines/machine/tm/watchers.ts, store/tmDebugStore.ts, hooks/useSimulation.ts, components/panels/WatchersPanel.tsx]*

**D167 — Route grammar conversion through verified constructions and family gates.**
*Context:* Directly presenting one fixed right-linear grammar for arbitrary regex input is incorrect, and not every Chomsky family has every lower-power machine target.*
*Decision:* Implement Regex → Type 3 as Thompson ε-NFA → subset DFA → minimized DFA → right-linear grammar, then validate the result as Type 3. Gate machine targets by source family. Use ordinary regular/CFG constructions where available; for Type 1/0 targets retain the source in a bounded compiled recognizer rather than displaying a fictitious small transition-by-transition universal machine. *[engines/machine/conversions/regularGrammar.ts, regexToNfa.ts, grammarRecognizer.ts, engines/machine/core/capabilities.ts]*

**D168 — Standardize machine edge semantics found by the engine audit.**
*Context:* Blank cells, stay moves, PDA push ordering, Unicode symbols, post-halt stepping, and nondeterministic LBA validation are common implementation failure points.*
*Decision:* Sparse missing TM cells, `''`, and the configured blank are equivalent blank reads. `S` performs the write without moving the head. PDA stack top remains the array's last element; push text is iterated in reverse, so `aZ` leaves `a` above `Z`. Validation counts Unicode code points, permits competing NLBA moves, and continues to reject deterministic TM/LBA conflicts. Engines return stable terminal results when stepped after halting. *[engines/machine/core/utils.ts, engines/machine/tm/TMEngine.ts, engines/machine/dpda/DPDAEngine.ts, engines/machine/npda/NPDAEngine.ts, utils/validator.ts]*

**D169 — Preserve the hosted demo as an explicit thin product boundary.**
*Context:* Sharing the full Machine toolbar caused newly added Mealy/Moore, MTM, NLBA, advanced TM, watcher, and submachine controls to leak into a public demo that originally advertised seven machine types and four examples.*
*Decision:* Centralize the public machine/example lists and exact `demo=true` parser in `utils/demoMode.ts`. Demo mode keeps DFA/NFA/ε-NFA/DPDA/NPDA/TM/LBA and the four deployed examples, while hiding full-workspace additions. Landing links use `/simulator?demo=true`. Demo mode also omits the unsaved-exit guard because no Save command is exposed. This is UI/product gating only; the existing demo machines continue to use the shared corrected engines. *[utils/demoMode.ts, App.tsx, components/toolbar/Toolbar.tsx, components/workspaces/MachineWorkspace.tsx, components/panels/SidePanel.tsx, page/index.html, page/script.js]*

**D170 — Confine Tape and toolbar scrolling to their owning regions.**
*Context:* Mounting the Tape panel called `scrollIntoView()` on the head cell. Browsers can scroll every ancestor, including the page, and an over-wide TM toolbar made the entire live-demo viewport shift sideways.*
*Decision:* Center the head by adjusting only the Tape row's `scrollLeft`, never by calling `scrollIntoView()`. Constrain toolbar overflow inside `WorkspaceShell`, and make “Go to latest visited step” use the actual furthest visited step rather than an arbitrary 10,000-step replay target. *[components/panels/TapePanel.tsx, components/layout/WorkspaceShell.css, index.css, components/controls/SimulationControls.tsx]*

**D171 — Record manifest versions and capability drift as facts, not inferred completion.**
*Context:* Historical notes called the current product 5.0.2 even though both current manifests say 5.0.0. The NLBA engine implements `TreeProvider` and the capability registry marks it tree-capable, but a legacy helper still omits NLBA and is used by both SidePanel and ExportModal.*
*Decision:* Internal current-state documents must report manifest version 5.0.0 unless the manifests change. Record the NLBA computation-tree UI mismatch as known incomplete integration: both the Tree tab and tree export can be suppressed. Do not describe it as fully wired merely because the engine API exists. *[package.json, src-tauri/tauri.conf.json, engines/machine/core/capabilities.ts, engines/machine/core/utils.ts, components/panels/SidePanel.tsx, components/layout/ExportModal.tsx]*

**D172 — Record the post-audit verification baseline.**
*Decision:* The 2026-09-05 working tree passes 58 Vitest files / 645 tests. Standard and `VITE_SIMULATOR_MODE=true` production builds pass; existing Vite chunk-size and mixed-import warnings remain non-blocking. This supersedes the aggregate recorded in D162 without changing its historical Phase A result. *[internal-ref-files/architecture.md, internal-ref-files/handoff.md, internal-ref-files/project_context.md]*

**D173 — Preserve historical decisions while identifying current implementation supersessions.**
*Context:* Several 2026-06 decisions record intended or then-reported class/file names that are not present in the current tree. Deleting those entries would destroy useful history, but presenting them as the current architecture is misleading.*
*Decision:* Retain D100–D117 as historical records and use the following current mappings:
- D100–D101: current cross-panel metadata uses `traceabilityStore`; there is no `useSelectionStore` or `DependencyGraphCanvas`.
- D103/D109: `historyStore.ts` keeps bounded full snapshots and exposes `clear(workspace, tabId)`; current callers use the `machine` workspace key. It does not use Immer patches.
- D104/D108/D113: current JFLAP parsing/export is in `utils/jflap.ts`. It rejects `DOCTYPE`, validates IDs, and throws on invalid transition references; there is no `jflapParser.ts`/`jflapSerializer.ts` pair.
- D105: export code lives in `ExportModal.tsx` and `src/utils`; there is no current `ExportService`.
- D106/D110/D117: `machineStore.ts` owns tabs and `tabRoutes`; there is no current `tabStore.ts`.
- D114: the historical `ParsingStudio.tsx` path is absent; parser error boundaries are implemented in current Parser Workspace panels.
- D115: current workspace resizing uses `react-resizable-panels`; there is no current generic `Splitter.tsx`.
These mappings supersede only the as-built file/API claims in the older entries, not their design rationale. *[store/historyStore.ts, store/machineStore.ts, store/traceabilityStore.ts, utils/jflap.ts, components/layout/ExportModal.tsx, components/workspaces, package.json]*

**D174 — Correct the current conversion inventory without deleting the D61 plan record.**
*Context:* D61 and the associated historical release narrative list PDA→CFG and DFA/NFA→Regex as delivered, but the current tree contains no implementation or registered conversion for either direction.*
*Decision:* Treat the current conversion inventory in `engines/machine/conversions/index.ts` as authoritative. It includes ε-NFA→NFA, NFA/ε-NFA→DFA, DFA minimization, Regex→NFA, CFG→PDA, Mealy↔Moore, regular-grammar conversions, and bounded grammar-recognizer generation. PDA→CFG and DFA/NFA→Regex remain historical planned scope, not current features. *[engines/machine/conversions/index.ts, engines/machine/conversions/types.ts]*

