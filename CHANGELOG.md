# Changelog

All notable changes to AutomataLab are documented in this file.

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
