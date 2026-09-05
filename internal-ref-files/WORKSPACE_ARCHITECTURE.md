# Workspace Hub Architecture Plan

> **STATUS NOTE (2026-09-05):** This is the historical implementation plan for
> the Workspace Hub migration. The hash router and three workspace shells are
> implemented. Names such as `tabStore`, `ParsingStudio`, and a generic
> `Splitter` in later historical sections do not necessarily match the current
> files. Use `architecture.md` and `project_context.md` for the as-built
> architecture.

This document originally outlined the structural refactoring used to implement
the Workspace Hub. Statements below are preserved as design history, not as a
description of the current source tree.

## Proposed Changes (Historical)

### Routing & State Management

At the time of this proposal, `App.tsx` forced the user into `#/app` and
rendered the monolithic `AppLayout`. The current app already uses the hash
routes listed below.

#### [MODIFY] src/App.tsx
- Update the `useEffect` hash change listener to support new routes: `#/`, `#/machine`, `#/grammar`, and `#/parser`.
- *Architectural Reservation:* We will also add commented-out route placeholders for `#/research` (Phase 6) and `#/proofs` (Phase 8) to establish the structure for future expansion.
- Change the main render function to act as a top-level router:
  - If `route === '#/'`, render `<WorkspaceHub />`
  - If `route === '#/machine'`, render `<MachineWorkspace />`
  - If `route === '#/grammar'`, render `<GrammarWorkspace />`
  - If `route === '#/parser'`, render `<ParserWorkspace />`

#### [MODIFY] src/store/uiStore.ts
- *Optional:* We may add an `activeWorkspace` tracking state if components deep in the tree need to know which mode they are in, though hash routing usually suffices.

#### [MODIFIED] src/store/
*Architectural Hardening Update:* To properly isolate the workspaces, we have decoupled global persistent data from local UI state:
- **Domain Stores (`machineStore`, `grammarStore`, `parserStore`)**: The single sources of truth for the academic documents.
- **`workspaceStore`**: Manages transient UI interaction states (e.g., active tools, hover highlights).
- **`historyStore`**: Isolates undo/redo stacks per individual tab route to prevent cross-contamination.
- **`uiStore`**: Strictly limited to application-wide global states (Theme, Modals).


---

### Component Refactoring & Dependency Management

## Workspace UI/UX Requirements
*Architected from the perspective of Theoretical Computer Science and Compiler Design.*

Each workspace serves a fundamentally different academic purpose. The ergonomics must map directly to the mental models of the underlying mathematical concepts.

### 1. Machine Workspace (Finite Automata & PDA Simulator)
*Mental Model: Spatial topology, state exploration, and nondeterministic branching.*
- **The Infinite Canvas:** The visual graph is the source of truth. The canvas must take up >85% of the screen.
- **Floating Tool Palette (Figma/Miro Style):** A clean, detached, draggable toolbar. Tools include Select, State, Transition, Freestyle Edge, and Annotation. 
- **Contextual Inspector:** Instead of a fixed side panel, clicking a state or transition opens a transient properties panel (Name, Accept/Reject, PDA Stack Rules) right next to the element, keeping the user's eyes on the graph.
- **The Input Tape:** A literal, visual "tape" locked to the top or bottom of the canvas, showing the input string broken into discrete cells. A distinct "Read Head" indicator must slide across the cells as the machine consumes input.
- **Nondeterminism Explorer:** For NFAs/PDAs, simulations split into multiple paths. The UI must include a "Branch Navigator" (a mini tree-view) allowing users to pause the simulation, see all active parallel threads, and selectively step into specific branches.
- **Media-Player Simulation Controls:** Play, Pause, Step Forward, Step Back, and a Speed Slider, anchored to the bottom center.

### 2. Grammar Laboratory
*Mental Model: Algebraic symbol manipulation, set theory, and formal linguistic rewriting.*
- **IDE Split View:** The interface should mimic VS Code. A pure text editor (Monaco/CodeMirror) on the left, and an Analysis Dashboard/Dependency Graph on the right (implemented in Phase 6).
- **Dependency Graph Visualizer:** As you type your grammar, it automatically builds a directed graph of your Nonterminals, showing which rules call which. Hovering/clicking a rule explicitly syncs selection with the graph.
- **Grammar Linter & Highlighting:** Real-time semantic syntax highlighting distinguishing Terminals, Non-Terminals, and the start symbol. Live linting warnings for "Unreachable Variables" or "Undefined Non-Terminals".
- **The Transformation Wizard:** Conversions (like Chomsky Normal Form) are not instant black-box operations. They are multi-step mathematical proofs. The UI must feature a step-by-step wizard ("Remove ε-productions" -> "Remove Unit" -> "Remove Useless" -> "Chomsky"), displaying a side-by-side Git-style *Diff View* of the grammar mutating at each step.
- **Set Diagnostics Table:** A clean, sortable data grid computing the `FIRST()` and `FOLLOW()` sets for every non-terminal.
- **Language Sampler:** A utility panel that generates valid random derivation strings up to depth $N$ so users can empirically test what their grammar actually generates.

### 3. Parser Studio
*Mental Model: Compiler frontend construction, deterministic state machines, and shift-reduce conflict resolution.*
- **The Compiler Dashboard:** A dense, multi-pane "debugger" layout, optimized for tracking simultaneous data structures.
- **The Rule Index (Top Left):** The grammar productions, distinctly numbered (e.g., `(1) E -> E + T`). Numbering is critical because LR tables reference actions like `r1` (reduce by rule 1). Clicking a rule explicitly highlights matching items in the tables and automata (Phase 6 Sync).
- **The Parsing Matrices (Bottom Left):** The LL(1) table or the LR Action/Goto tables. These are massive grids. They need sticky column/row headers. *Crucial ergonomic:* When the parser executes a step, the exact cell in the matrix (e.g., State 4, Terminal '+') must highlight to visually explain *why* an action was taken.
- **Conflict Inspector (Phase 6):** In the Parse Table, any cell containing a Shift/Reduce or Reduce/Reduce conflict renders as a bold red `ERR` button. Clicking it opens the interactive Conflict Inspector at the bottom of the screen, breaking down the competing actions and providing deep educational context (e.g., Dangling-Else, Operator Precedence).
- **The Execution State Tracker (Top Right):** The holy trinity of parsing:
  1. **The Stack:** A visual stack (LIFO) showing the current state numbers and grammar symbols pushed onto it.
  2. **The Input Buffer:** The remaining input tokens, with a clear "lookahead" pointer.
  3. **The Action Log:** A running ledger of decisions ("Shift 4", "Reduce by T -> F").
- **The Live Tree Builder (Bottom Right):** A spatial canvas showing the Parse Tree (Concrete Syntax Tree) growing in real-time. For Top-Down (LL), it grows root-to-leaves. For Bottom-Up (LR), it builds disconnected subtrees (forests) that eventually snap together at the root upon acceptance.

### 4. Global UX Additions (Release 7.1)
- **Workspace-Agnostic Undo/Redo:** The `<MenuBar />` and `<Toolbar />` support universal Undo/Redo across workspaces backed by Immer patches. Global keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`) allow deep time-travel edits safely.
- **Clipboard-Centric Export:** Workspaces feature quick-action `<Toolbar />` buttons allowing users to "Copy Graph as SVG", "Copy Graph as PNG", or "Copy Machine JSON" instantly without wading through export dialogs.
- **JFLAP Open Card:** The `WorkspaceHub` features a direct "Open File" card that parses `.jff` files, instantly bridging legacy curriculum with AutomataLab.

## Proposed Execution Phases

### Phase 1: Foundation & Safety (The Hoist) [COMPLETED]
Extract global singletons to prevent data loss and UI breakage.
- **Modify:** `src/App.tsx` to include `MenuBar`, `UnsavedChangesGuard`, `ToastContainer`, `UpdateBanner`, and global modals.
- **Action:** Patch `useFileActions.ts` to ignore shortcuts if `route === '#/'` to prevent ghost saves.
- **Check:** Run app. Verify Tauri window controls work. Verify hitting `Ctrl+S` on an empty screen does not crash.

### Phase 2: The Routing Logic & Workspace Hub [COMPLETED]
Build the core navigation structure and the Wireshark-inspired landing page.
- **New:** `src/components/layout/WorkspaceHub.tsx` with the 5 specific title cards (including the two disabled Phase 5 placeholders).
- **Modify:** `src/App.tsx` to handle route switching (`#/`, `#/machine`, `#/grammar`, `#/parser`) and the Simulator Mode Bypass.
- **Action:** Implement the "Anti-Trap" observer: auto-route based on `machineType` *only* if `route !== '#/'`.
- **Check:** Run app. Verify clicking "Grammar Laboratory" navigates to `#/grammar` and updates the store. Verify clicking Launchpad logo does not instantly redirect you back to the editor.

### Phase 3: The Machine Workspace Shell [COMPLETED]
Migrate the existing canvas UI into its dedicated route.
- **New:** `src/components/workspaces/MachineWorkspace.tsx`.
- **Action:** Move `AutomataCanvas`, `Toolbar`, `TabBar`, `InputBar`, `SimulationControls`, and `SidePanel` into this new shell.
- **Action:** Implement unmount cleanup (`resetSimulation()` on component unmount).
- **Check:** Create a DFA, run a simulation, click Launchpad, return to Machine Simulator. Verify the simulation stopped and the canvas renders correctly without ghost states.

### Phase 4: Grammar & Parser Workspaces [COMPLETED]
Establish the structural shells for the remaining tools.
- **New:** `src/components/workspaces/GrammarWorkspace.tsx`.
- **New:** `src/components/workspaces/ParserWorkspace.tsx`.
- **Action:** Move `GrammarEditor` and `ParsingViewContainer` into their respective shells, adopting the custom UI/UX layouts defined above.
- **Check:** Switch from a DFA tab to a CFG tab. Verify the app automatically routes from `#/machine` to `#/grammar` and displays the split-pane layout without crashing.

### Phase 5: Global UX Polish [COMPLETED]
Apply the professional, academic visual design across the new architecture.
- **Action:** Refine CSS spacing, typography, and card designs in `WorkspaceHub`.
- **Action:** Standardize the look of the floating toolbars and side panels.
- **Check:** Final visual audit. Ensure the "sweet spot" of professional software (not too fancy, not too basic) is achieved.

#### [DELETE] src/components/layout/AppLayout.tsx
- This file will be dismantled and its contents distributed into the specific workspaces above.

---

## Verification Plan

### Dependency Verification & Technical Debt Mitigation
1. **Tauri Window Controls & MenuBar:** Because `MenuBar.tsx` renders the desktop window controls, it must be hoisted to `App.tsx`. However, its global shortcuts (e.g., `Ctrl+S` in `useFileActions`) must explicitly check if `window.location.hash !== '#/'` to prevent saving "ghost" machines while sitting on the Launchpad.
2. **Heterogeneous Tabs & Auto-Routing (CRITICAL):** Tabs in `tabStore` can hold different machine types. If a user is in `#/machine` and switches to a tab that contains a CFG, the router *must* automatically transition to `#/grammar`. We will implement a `useEffect` observer in `App.tsx` to watch `machineType` and force route changes if a tab switch demands a different workspace shell.
   * **The "Launchpad Trap" Risk:** We must ensure this observer does NOT trigger when `route === '#/'`. Otherwise, the user will be permanently trapped in the editor and unable to visit the Launchpad. It must only auto-route when moving *between* active workspaces.
3. **Mismatched Type on Navigation (CRITICAL):** If a user is on the Hub, and the active machine in memory is a CFG, and they click "Machine Simulator", navigating directly to `#/machine` will crash the canvas. The Hub buttons **must** assert the type: if the active tab doesn't match the destination workspace, it must call `addTab()` with the correct type (e.g., DFA for Machine Simulator) *before* changing the route.
4. **Hub File Loading Risk:** If a user opens a file via `Ctrl+O` while on the Launchpad, `useFileActions` must explicitly force a route change to the correct workspace (e.g., `window.location.hash = '#/machine'`). Otherwise, the file will load invisibly while the user remains stuck looking at the Launchpad.
5. **Simulator Mode Bypass:** If `isSimulatorDeployment === true` or `demo=true` is in the URL, `App.tsx` must completely bypass the `WorkspaceHub` and force `#/machine` to preserve the ability to embed the app in iframes or blog posts.
6. **Store Cleanup:** When unmounting `MachineWorkspace`, the `useSimulation` hook clears its interval, but leaves `simulationStore.status` as `'running'`. We must explicitly call `resetSimulation()` on unmount to prevent ghost states persisting across workspaces.
7. **Data Loss Prevention:** Verify `UnsavedChangesGuard` intercepts window close events even when sitting on the Launchpad.
8. **Context Safety:** Verify global keyboard shortcuts (e.g., F1 for Help, Space for Play) do not crash when triggered on the Launchpad where `sim` and `canvas` are null.
9. **No Heavy Routers:** Verify the hash-routing remains native and lightweight. We will not import `react-router-dom` to adhere to Principle 5.

---

## Post-Implementation Status (2026-06-24)

All Phase 1–5 implementation steps above are **completed**. The workspace architecture is stable. The anti-trap observer, launchpad trap prevention, simulator mode bypass, and store cleanup on unmount are all implemented and verified.

### State Integrity & Stability Hardening Sprint [COMPLETED — 2026-06-24]

A focused post-launch hardening pass was applied to the workspace state management. The following cross-workspace state bugs were identified and fixed:

| Bug | Severity | Fix Applied |
|---|---|---|
| History closures not freed when tab closed | P0 — memory leak | `tabStore.closeTab` now calls `historyStore.clear(id)` |
| UI selections leaking across tab switches | P1 — stale UI references | `tabStore` lifecycle (add/switch/close) calls `uiStore.clearSelection()` |
| `clearSelection` leaving editor states open | P1 — phantom editors | `clearSelection` now also nulls `isEditingTransition`, `transitionEditorStateId`, `renamingStateId` |
| Deleted nodes leaving active selections | P1 — orphaned references | `machineStore.deleteState/deleteTransition/applyHistoryPatches` call `clearSelection` first |
| Malformed JFLAP causing ReactFlow crash | P0 — white screen | `jflap.ts` validates transition `from`/`to` state ID existence before import |
| Grammar parser errors crashing Parser Studio | P1 — component crash | `ParsingStudio.tsx` `useMemo` wraps full grammar evaluation in `try/catch` |

### UI/UX Resizability & Collision Standardisation [COMPLETED — 2026-06-25]

Following the Workspace Hub migration, significant ergonomic and logical edge-cases were encountered and patched:
- **Resizable Layouts:** Introduced a `<Splitter>` abstraction allowing custom width distribution between columns in the Grammar Laboratory and Parser Studio.
- **LR Collision Determinism:** LR S/R conflicts are now deterministically biased towards Shift, imitating Bison/Yacc, with explicit `s4/r1` tracking rather than opaque "ERR" displays.
- **Tab Route Tracking:** The `tabStore` now tracks `tabRoutes` for every tab id to prevent cross-contamination (e.g. Grammar layout loading a Parser schema).
- **Parser Studio Stability:** Gated the LL(1) "Automaton" subview render logic to prevent null pointer crashes when algorithms lack item-set generation.
- **Expanded Hitboxes:** Collapsed workspace side-panels now have fully clickable vertical strips for much easier expansion.



