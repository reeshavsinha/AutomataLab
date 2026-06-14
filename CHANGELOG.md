# Changelog

All notable changes to AutomataLab are documented in this file.

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
