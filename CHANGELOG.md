# Changelog

All notable changes to AutomataLab are documented in this file.

## v5.0.0

### Added
- **Grammar Lab:** A dedicated workspace for designing and analyzing Context-Free Grammars. Features include real-time Nullability, FIRST, and FOLLOW set computations, as well as ambiguity and left-recursion detection.
- **Grammar Transformations:** Natively convert any Context-Free Grammar into Chomsky Normal Form (CNF) and Greibach Normal Form (GNF) with a single click.
- **Parser Studio:** A massive new workspace for executing Top-Down and Bottom-Up parsers.
- **Deterministic Parsers:** Construct Parse Tables and visualize Shift/Reduce actions for LL(1), LR(0), SLR(1), LALR(1), and CLR(1) algorithms.
- **General Parsers:** Parse any ambiguous grammar using the CYK dynamic programming algorithm or the Earley chart parser.
- **Visualizations:** Real-time generation of the LR Item Set DFA, interactive CYK matrices, and top-down/bottom-up step-by-step Abstract Syntax Tree (AST) building visualizations.

## v4.1.0

### Added
- **Landing Page Academic Redesign**: Cleaned up the landing page aesthetic, grouped features into academic Chomsky Hierarchy categories, and refined citation elements.
- **Dynamic SHA-256 Verification**: The landing page now dynamically fetches the latest GitHub release and extracts SHA-256 integrity verification hashes for secure downloads.
- **Analysis Tools**: Reachability, Emptiness, Equivalence, and Inclusion structural analysis.
- **Background Computation**: Offloaded O(2^n) equivalence construction to a Web Worker to ensure 60 FPS UI performance.
- **JFLAP Compatibility**: Native browser DOM parsing and exporting for JFLAP 7.1 `.jff` XML files across all 7 machine types, featuring dynamic alphabet inference.

### Fixed
- **Theoretical correctness gating**: Operations like reachability are now properly gated by `isFAType` to prevent executing undecidable properties on Pushdown Automata and Turing Machines.
- **Render performance**: Decoupled the cosmetic node coordinates from structural changes via `topologyKey` and optimized `StateNode` Zustand selectors to prevent O(N^2) React Flow thrashing.
- **Build stability**: Fixed a critical TypeScript compilation crash in the Toolbar component.
- **Documentation**: Renamed the root `docs/` folder to `internal-ref-files/` to separate it from the public web documentation.

## v4.0.1

### Added
- **Classic desktop menu bar.** A familiar top **File / Edit / View / Simulate / Convert / Help** menu bar now sits above a refreshed toolbar, so every action (new/open/save, copy/cut/paste, run/step/reset, conversions, batch testing, export, help) is reachable from a predictable place — not just from scattered toolbar icons.
- **Custom application logo & icons.** Finalized the 4-state transition diagram logo (with solid white background and 1:1 aspect ratio) in the top menu bar, and regenerated all native platform desktop app icons (including taskbar and window icons) using Tauri's CLI icon generator.
- **Auto-Update Banner.** Added a non-blocking notification banner sliding down from the top of the application when a new update is available. Supports development mocking to test available, downloading, and installed states, and caches dismissal using sessionStorage.
- **Frameless window & custom window controls.** Removed the native OS title bar in the Tauri desktop app for a cleaner, unified workspace. Integrated a custom window control suite (Minimize, Maximize, and Close) at the right end of the `MenuBar`, featuring system-accurate Windows hover/active effects (e.g. red close hover state). Added drag capability using `data-tauri-drag-region` on the menu bar background.
- **Rename machine tabs from tab bar.** Right-click or double-click any tab in the tab bar to rename the machine directly, with immediate sync to the store.
- **Simulation and batch input ε (epsilon) inserter.** A clickable **ε / λ** button is now available on the simulation input bar and the batch runner inputs. The inserter remains persistent during active typing to allow epsilon entry at any point.
- **Keyboard parity for state roles & visible selection.** Press **I** to mark the selected state as the start state and **F** to toggle it as an accept state; drag with **Shift** held to rubber-band-select several elements at once (Ctrl/Cmd-click still adds to a selection).

### Changed
- **MenuBar outside click collapse & separators.** Added vertical separators between menu options for visual clarity and registered pointer/mouse event capture phase listeners to ensure the dropdown menu collapses reliably when clicking anywhere outside.
- **SidePanel tab compression & separators.** The side panel tabs now show vertical separators for better readability, and when the panel is compressed (narrow width), tab labels dynamically abbreviate to their first letter (e.g. 'δ', 'H', 'V', 'T', 'I') instead of disappearing entirely.
- **Refreshed “classic desktop” look.** The toolbar and menus adopt a native-application chrome (subtle bevels, compact icons, a menu bar) for a more familiar, less cluttered workspace; the simulation transport (play / step / step-back / reset / speed) and the canvas tool palette were restyled to match.
- **Accessibility & UX pass.** Modal dialogs (Help, Export, Convert, Batch) now trap keyboard focus, restore focus when they close, close on **Esc**, and announce themselves to screen readers. The right side panel remembers which tab you were on (defaulting to the **δ** transition table instead of an empty History tab) and can be collapsed to reclaim space. A **blocked run now explains why** — it surfaces the first validation problem and opens the Validate tab (with a count badge) instead of doing nothing. A halted run **highlights the witness path** on the diagram, and **“stuck” is now clearly distinguished from “reject”** in tooltips and styling. Epsilon typed as `eps` / `λ` / `lambda` (or left blank) normalizes to `ε`. The δ-table and nondeterministic history now render set-valued state collections as `{q0, q1}`.

### Performance & robustness
- **Nondeterministic runs can no longer exhaust memory.** An NPDA distinguishes computation branches by their *stack*, so a grammar/machine with ε-moves that push different symbols could double the live branch set every step and run the app out of memory in seconds. The engine now caps the live frontier width: when a single step would blow past the limit it stops expanding and decides on what it has (accepting if a valid accepting branch exists, otherwise halting as `stuck`) — the verdict stays correct, the memory stays bounded.
- **Malformed machine files fail gracefully.** Opening a corrupt, truncated, or hand-edited `.autolab.json` (or a file whose `name` / fields have the wrong type) now reports a clean error instead of crashing; the loader only ever reads known fields (prototype-pollution safe).
- **A bad step limit can’t brick a run.** A zero, negative, or non-numeric step limit for a TM / PDA now falls back to the default instead of halting the machine on its first step.
- **Property-based fuzzing.** A new randomized test suite throws thousands of arbitrary machines of every type at the engines (must never crash and must always halt), cross-checks every conversion against its source machine for language equivalence, and verifies Regex → NFA against a reference regular-expression engine.
- **Dependency synchronization.** Synchronized package lockfiles and resolved import warnings (such as the `elkjs` warning on build).

## v4.0.0

### Added
- **Conversion & transformation utilities.** A new **CONVERT** toolbar button opens a dedicated workspace that runs the classic constructions and plays them back **step by step** on a live diagram preview, then lets you **open the result in a new tab**:
  - **NFA → DFA** and **ε-NFA → DFA** — subset (powerset) construction.
  - **ε-NFA → NFA** — ε-transition elimination via epsilon-closures.
  - **DFA minimization** — partition refinement (Moore/Hopcroft), after completing the automaton and dropping unreachable states.
  - **Regex → NFA** — Thompson's construction from a regular expression (`|`, `*`, `+`, `?`, grouping, `ε`).
  - **CFG → PDA** — the standard one-state nondeterministic pushdown construction from a context-free grammar.
- **Step-by-step construction player.** Each conversion is broken into ordered steps with a title and explanation; play/pause, scrub, or click any step to reveal exactly the states and transitions it adds (the new states/edges are highlighted), with a **Source ⇄ Result** toggle to compare against the input.
- **Readable converted states with provenance.** Subset construction and minimization no longer produce illegible nested-set labels like `{{q3,q5},{q6}}`. Converted states are named compactly (`q0, q1, …`), and the set / equivalence class they stand for is shown **on hover**, via a **short ⇄ full labels** toggle in the preview, and in the step text — so the diagram stays clean without losing the construction's meaning (ε-elimination states also show their ε-closure).
- **Diagram image export (PNG / SVG).** The Export dialog now exports the **state diagram** itself as a crisp vector **SVG** or a high-resolution **PNG**, theme-aware (light/dark), in addition to the existing data exports. Powered by a new dependency-free machine→SVG renderer.
- **Clickable ε (epsilon) inserter.** A small **ε / λ** button now appears wherever you type symbols — the transition editor, the δ-table (for ε-NFAs), and the Regex / CFG conversion inputs — so you can enter epsilon without an epsilon key on your keyboard.

### Changed
- The **Export** dialog gained a **Diagram** section (SVG / PNG) alongside the transition table, trace, tree, and machine-definition exports.
- **Help** now documents the conversion utilities, readable converted labels, the ε inserter, and diagram image export.

### Fixed
- **Transitions now follow a state while you drag it.** Previously the connected edges stayed pinned to a state's old position until the drag ended; they now track the node continuously as it moves.

### Notes
- Fully **backward compatible**: conversions never mutate the source machine — results open in a separate tab and use the existing `.autolab.json` shape, so nothing about saved files or existing machine behavior changes. Converted states carry an optional, additive `description` (their provenance); older files without it load unchanged.

## v3.0.0

### Added
- **Turing Machines (TM).** A new deterministic single-tape machine type completes the Chomsky hierarchy: transitions use the `read → write, direction` (L/R/S) format, the tape is two-way infinite, and acceptance is by halting in an accept state.
- **Linear-Bounded Automata (LBA).** A bounded Turing machine whose head is confined to the input region; a move past either end halts and rejects, with `⊢`/`⊣` boundary markers shown on the tape.
- **Tape panel** with a live head (▲), current-state label, instantaneous description (`α q β`), auto-scroll, and LBA boundary markers — available from the new **Tape** tab for TM/LBA machines.
- **Reject states (TM/LBA).** Mark a state as an explicit halt-and-reject state via right-click; reject states render with a red double-ring and are mutually exclusive with accept states.
- **Configurable blank symbol and step limit** in the toolbar for TM/LBA, with an infinite-loop guard that halts runaway computations as `stuck` and surfaces a toast pointing at the adjustable limit.
- **Multi-tape Turing machines.** Set the toolbar **TAPES** count (`> 1`) to give a TM several tapes in parallel: each transition reads/writes one symbol per tape (`a → b, R | _ → c, L`) and fires only when every tape matches. The input seeds tape 1 and the Tape panel shows one row per tape.
- **Global transition (δ) table.** A new **δ** side-panel tab lists every transition grouped by source state and lets you edit them as a table — add, delete, retarget, and relabel inline (FA / PDA / single-tape TM) — with a click-to-locate jump to the matching state or edge on the canvas.
- **Data export.** Export the **transition table** (CSV / LaTeX), the **execution trace** (CSV / JSON), the **computation tree** (JSON), and the **machine definition** (JSON) from a new Export dialog in the overflow menu.
- **Batch / test-suite runner.** A **Batch…** button runs many input strings at once with optional `accept:` / `reject:` expectations, showing a pass/fail table you can export as CSV.
- **Declared stack/tape alphabets (Γ).** Optional **STACK (Γ)** (PDA) and **TAPE (Γ)** (TM/LBA) toolbar fields drive non-blocking validation warnings — e.g. a pushed/written symbol outside Γ, or the blank symbol appearing in the input alphabet Σ.
- **Canvas tool palette + visible connection dot.** An explicit left-rail palette (select / add state / add transition / add text) makes editing modes discoverable, and states now show a **connection dot** on hover for drawing transitions.
- **“Complete DFA” quick-fix.** One click adds a trap state and the missing transitions to turn a partial DFA into a total one.

### Changed
- The **transition editor, edge labels, and canvas** adapt to TM/LBA (a `read → write, dir` row with an L/R/S selector, edited through the modal like PDAs; multi-tape shows one cluster per tape).
- The **Input bar** seeds the initial tape for TM/LBA and hides its finite-automaton tape preview (the Tape panel is canonical).
- **The Tape panel previews your input live while idle** — it mirrors the input box as you type, with the head resting on the start state's first cell, instead of showing an empty placeholder.
- **A faded grey arrow under the tape marks the head's last move** (←/→), drawn under the cell the head came from, as a history cue for which way it just moved.
- **Copy/paste** now preserves TM tape moves (`write`/`direction`, multi-tape arrays) and reject states alongside the existing PDA stack operations.
- **Help** and **`fsm_format.md`** now document the TM/LBA JSON format, tape/blank/boundary semantics, multi-tape arrays, and include complete `0ⁿ1ⁿ` (TM), `aⁿbⁿcⁿ` (LBA), and 2-tape `aⁿbⁿ` examples.
- **Honest computation _trellis_.** For NFA/ε-NFA the computation view is now labelled a **trellis** — paths reaching the same state at the same step are merged — and shows a `⇉ₙ` chip for how many parents merged, instead of implying a true unmerged tree. NPDA keeps a real branching tree.
- **More legible transition labels.** Labels sit just off the curve with a thin leader line, and a merged edge shows a compact `×n` count that expands on hover/selection.
- **Accessibility pass.** Visible keyboard focus rings, higher-contrast muted text, larger base fonts, and ARIA roles/labels for the side-panel tabs, canvas tool palette, context menus, and simulation controls.
- **A partial DFA is now a warning, not an error.** A missing transition rejects (as theory dictates) rather than blocking the run; the validator points you at the new **Complete DFA** fix.
- **Toolbar tidied.** Theme, help, update-check, and export moved into a **⋯** overflow menu; the speed control is now a compact read-out; the minimap auto-hides for small machines.

### Performance & robustness
- **Large inputs no longer freeze the UI.** Finite-automaton engines (DFA/NFA/ε-NFA/DPDA) previously rebuilt the *entire* consumed/remaining input string on every step (and, for NFAs, for every active branch) — O(n²) over a run, with each step getting slower as the head advanced. The engines now surface a bounded window of the input around the head; per-step cost is constant. (Inputs short enough to fit the window are byte-identical.)
- **Turing-machine tape is a bounded moving window.** A head that travels far (or a huge seeded tape) no longer materialises — or renders — a cell array as wide as the whole tape on every step; the Tape panel shows a fixed span around the head and follows it.
- **Bounded buffers.** The execution-history log keeps a capped recent window (older steps are summarised as “N earlier steps hidden”), and the computation-tree node buffer is capped on very wide/long nondeterministic runs (the run keeps going; only the visualised tree stops growing).
- **Multiple tabs are smoother.** Switching tabs now resets the live simulation, so a run can no longer keep stepping a previous tab’s machine in the background, and a previous tab’s (possibly large) tape/tree/history no longer renders against the new one. Canvas node/edge syncing is O(n) instead of O(n²), and per-edge auto-routing is skipped on very large graphs to keep them responsive.
- **Step Back is no longer O(n²).** Retracing a step replays the engine silently and commits the result in a single store update instead of one update (and one tree rebuild) per replayed step.

### Fixed
- **A finished run no longer locks the editor.** After a machine ran to a verdict, the Delete key, the “+ Add a state” button, the input field, and the hover connection dot could all appear dead (only right-click → Delete worked). Editing is now blocked only while a run is *actively in progress*; editing a *finished* run clears the stale result and returns to idle automatically.

### Notes
- Fully **backward compatible**: existing `.autolab.json` files load unchanged; the new `blankSymbol`/`stepLimit`/`tapeCount` fields, the `reads`/`writes`/`directions` arrays, and the `isReject` flag are additive and optional. No existing DFA/NFA/ε-NFA/DPDA/NPDA behavior changes.

## v2.1.1

### Added
- **Redesigned file controls** — dedicated **New / Open / Save** toolbar buttons (with **Save As…** and a **Recent files** menu) replacing the old FILE dropdown, plus standard shortcuts **Ctrl/Cmd+N/O/S/Shift+S** and **Ctrl+T / Ctrl+W** for tabs.
- **Unsaved-changes guard** — closing the app (or a tab) with unsaved work now prompts **Save All / Discard / Cancel** instead of losing it silently, and the title shows a **“●”** dot while there are unsaved changes.
- **Simulation Step Back** (**⏮ / ←**) to retrace one step of a run.
- **Interactive minimap** — pan, scroll to zoom, and click to recenter.

### Changed
- **Auto-layout rebuilt on ELK “stress”** for compact, roughly-symmetric, deterministic arrangements with no overlapping states (start state on the left); text notes stay put.
- **Fit-view frames the whole machine** — self-loops and curved transition edges are included, not just the state boxes.
- **Opening a file never clobbers unsaved work** — it reuses an empty tab or opens a new one; **Save writes in place** once a file’s path is known.
- The **machine-name field** now reads as editable (bordered with a hover/focus highlight).

### Fixed
- **Deleting a transition edge that bundles several transitions** (common for PDAs) now removes the whole edge instead of leaving a “ghost”; editing such an edge’s label updates it consistently.
- **Pressing Play** no longer leaves the input briefly editable / out of sync at the start of a run.
- **Copy/paste now preserves PDA stack operations** (read / pop / push).
- Graph edits are disabled during a running simulation, and transitions whose endpoints were removed no longer render as broken edges.
- Smaller fixes: Escape cancels inline label editing cleanly, the computation-tree selection resets on a new run, drag interactions clean up reliably, and toast durations are guarded against bad values.

## v2.1.0

### Added
- **Undo / redo** for all machine edits (Ctrl+Z / Ctrl+Y), with rapid edits coalesced into single steps.
- **Light / dark theme toggle**, remembered between sessions.
- **Toast notifications** for save / load / update and machine-type changes, replacing blocking dialogs.
- **Onboarding & help** — an empty-canvas hint plus a `?` quick-start and keyboard-shortcut cheat sheet.
- **Resizable side panel** (width remembered) and **resizable, draggable text-annotation boxes** whose placeholder clears as you type.
- **Recent files** menu (desktop) for quickly reopening machines.
- **Keyboard shortcut `N`** to add a state at the viewport centre.

### Changed
- **Auto-layout** now produces a clean, organised arrangement in a single press and re-frames the view to fit; text notes keep their place.
- **Accept / reject results are unmistakable** — a colour-coded status badge, highlighted final states, and a one-shot canvas flash.
- **Transitions route around intermediate states** instead of crossing them, and labels lift to the front on hover.
- **Tab bar moved to the top**; the simulation-speed input is clamped with quick presets; the history log auto-scrolls to the latest step.

### Fixed
- The "AutomataLab" title no longer opens the repository in two browser tabs.
- Scrolling over a text box now scrolls the box instead of zooming the canvas.
- The right-click menu no longer runs off the bottom of the screen, and the Help dialog's close button stays pinned while scrolling.

## v2.0.0

### Added
- **Pushdown Automata.** Two new machine types extend AutomataLab beyond finite automata:
  - **DPDA** (deterministic pushdown automaton) — single-configuration stack machine with a determinism check in the validator.
  - **NPDA** (nondeterministic pushdown automaton) — explores all computation branches breadth-first, accepting by final state, with termination guards against ε-loops.
- **Stack visualization** with push/pop animations and an instantaneous-description (ID) readout for PDA simulations.
- **Computation-tree viewer** for NFA, ε-NFA, and NPDA: the full tree of explored branches, colour-coded by status (accepted / rejected / running), with collapsible subtrees, click-to-inspect, and depth/branch statistics.

### Fixed
- **Input tape no longer renders the current symbol twice** during simulation; the most-recently-read cell is highlighted once.
- **Simulation speed control** is guarded against non-positive or non-finite values, preventing a runaway play interval.

## v1.0.2

### Fixed
- **Auto-updater now actually works.** Three issues prevented over-the-air updates from functioning:
  - The window lacked the `updater:default` capability, so the app could not call the updater at all.
  - The bundler was not configured to emit signed update artifacts (`createUpdaterArtifacts` was unset), so no `.sig` files or update bundles were produced.
  - The release manifest was published as `latest.json`, while the app's update endpoint expects `updater.json`; the release workflow now mirrors it to the correct name and prefers the NSIS installer for Windows updates.

> **Note:** Because the missing capability is compiled into the binary, builds **v1.0.0** and **v1.0.1** cannot self-update and must be updated to v1.0.2 manually. Auto-updates work from **v1.0.2 onward**.

## v1.0.1

### Added
- **Unsaved-changes prompt on tab close.** Closing a tab with unsaved edits now shows a **Save / Don't Save / Cancel** dialog instead of discarding work silently. Tabs display an unsaved-changes indicator dot.

### Fixed
- The toolbar **Save** action now awaits the file write and clears the unsaved state only on a successful save.

## v1.0.0
- First stable release: DFA / NFA / ε-NFA design and simulation, interactive canvas, multi-tab editing, file save/load, real-time validation, and execution history.
