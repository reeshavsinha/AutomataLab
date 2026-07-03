# AutomataLab Web Architecture Document

This document outlines the high-level architecture, design philosophy, core abstractions, and technical roadmap for AutomataLab. It acts as a living document to guide future development and help contributors orient themselves.

## 1. Design Philosophy

AutomataLab is built on the core principle of **strict separation of concerns**. 
- **Engines are Pure:** The theoretical logic of automata (simulators, parsers, converters) resides in pure TypeScript, entirely agnostic of the UI, DOM, or React. 
- **UI is Presentation:** The React frontend handles rendering, state hydration, and user interactions. 
- **Algorithms over Abstractions:** We prefer explicit algorithm implementations (e.g., explicit subset construction, Moore's minimization) over deep object-oriented hierarchies or "magic" generic frameworks.
- **Explicit Type-Gating:** Instead of loose duck typing, we rely on discriminated unions (`MachineType`) and specific interfaces to define boundaries between different classes of automata (e.g., DFA vs. Pushdown Automata vs. Turing Machines).

*(See `principles.md` for a complete list of project principles).*

## 2. Current Architecture

The application follows a predictable, three-tier architecture:

### A. The Engine Tier (`src/engines/`)
Contains all computational logic, definitions, and algorithms.
- **Core Types:** Defines the foundational interfaces (`MachineDefinition`, `State`, `Transition`, `MachineType`).
- **Simulators:** Isolated directories for each machine type (`dfa/`, `pda/`, `tm/`, etc.). Each contains an `Engine` class or function that computes step-by-step execution states (the "Computation Tree").
- **Conversions:** Contains pure functions that transform one `MachineDefinition` into another (e.g., `nfaToDfa`, `minimizeDfa`) or construct machines from text (`regexToNfa`, `cfgToPda`).
- **Validation:** Functions to ensure machine definitions satisfy theoretical requirements before execution.
- **Analysis (`engines/core/analysis.ts` & `engines/workers/analysis.worker.ts`):** Implements structural analysis algorithms (Reachability, Emptiness, Equivalence, Inclusion). In order to maintain 60 FPS UI performance, heavy computations (like DFA equivalence via powerset construction) are offloaded to a background Web Worker using Vite's `?worker` query. Algorithms are strictly gated by `isFAType` to preserve theoretical correctness (since path-based reachability is undecidable on PDA/TM types).

### B. The State Management Tier (`src/store/`)
Uses `zustand` to bridge the Engine Tier and the UI Tier.
- **`machineStore`:** The single source of truth for the active `MachineDefinition`. Handles CRUD operations for states/transitions, undo/redo history, and tab management.
- **`simulationStore`:** Manages the active execution state (e.g., stepping through an input string, tracking the computation tree, current active nodes).
- **`uiStore`:** Manages transient UI state (e.g., active selection, clipboard, modal visibility, current theme, and analysis highlights).
- **`commandStore`:** Acts as a lightweight command bus to pass imperative commands (like zooming or specific canvas manipulations) from the menu bar to the canvas instance.

### C. The UI Tier (`src/components/`, `src/hooks/`)
A React-based presentation layer.
- **Canvas (`components/canvas/`)**: Uses `xyflow` (React Flow) for interactive graph visualization. Interactions are extracted into modular hooks (`hooks/useCanvasSelection`, `hooks/useTransitionDrawing`, etc.). The component listens to a derived `topologyKey` (excluding node `x/y` coordinates) to prevent cosmetic drag updates from clearing active analysis highlights.
- **Editors (`components/canvas/editors/`)**: Type-specific transition forms (e.g., `FiniteAutomataEditor`, `TMEditor`) dispatched by a central `TransitionEditor` modal.
- **Conversions (`components/conversions/`)**: A plugin-style registry (`conversionsRegistry.tsx`) powers the conversions modal, allowing new algorithms to be injected dynamically without modifying the modal's core layout.
- **Analysis (`components/analysis/`)**: Houses `AnalysisModal.tsx`, which manages asynchronous communication with the background Web Worker and displays analysis results (Reachability, Emptiness, Equivalence, Inclusion).
- **Panels (`components/panels/`)**: Sidebars for managing input simulation, testing, and tabular data.

## 3. Core Abstractions

### `MachineDefinition`
The universal serializable object representing any automaton in the system.
```typescript
interface MachineDefinition {
  id: string;
  type: MachineType; // 'DFA' | 'NFA' | 'ENFA' | 'DPDA' | 'NPDA' | 'TM' | 'LBA'
  states: State[];
  transitions: Transition[];
  // Extensible fields depending on the type:
  tapeCount?: number;
  blankSymbol?: string;
}
```

### `Transition`
A flat, flexible object representing an edge in the graph. It relies on optional properties that are strictly validated based on the `MachineType`.
- **FA:** Uses `symbols` array.
- **PDA:** Uses `read`, `pop`, `push`.
- **TM:** Uses arrays `reads`, `writes`, `directions` mapped by tape index.

### `ComputationTree`
Because non-deterministic machines (NFAs, NPDAs, TMs) branch, the simulation engine returns a tree of configurations rather than a linear history. The UI traverses this tree to display active execution frontiers.

## 4. Engine Responsibilities

- **Immutability:** Engines treat `MachineDefinition` as immutable. All transformations yield a new machine object.
- **Deterministic Traversal:** Even for non-deterministic machines, the engine must produce deterministic, reproducible computation trees.
- **Self-Contained Validation:** Engines do not rely on the UI to sanitize inputs. They throw clear, descriptive errors when fed invalid state machines.
- **Execution History:** Engines must track their internal state efficiently (often via bounded snapshotting) to support backward-stepping without memory leaks.

## 5. Known Technical Debt

- **React Flow Render Thrashing:** While custom hooks have organized the logic, the canvas still triggers frequent re-renders when dragging nodes. *Optimization achieved:* `StateNode.tsx` uses targeted Zustand store selectors (`s => s.analysisHighlights[id]`) instead of destructuring the whole store, preventing massive O(N^2) render cascades.
- **Graph Layout Performance:** The `applyAutoLayout` utility (using ELK.js) handles initial arrangements well but struggles to maintain "mental map" stability during live conversions.
- **Serialization Formats:** The app natively supports both our custom `.autolab.json` format and standard JFLAP 7.1 `.jff` XML files, improving interoperability across educational tools.

## 6. Future Plans

- **Regex & Grammar Integration:** Expand text-to-machine capabilities. Build visual parsers that step through CYK algorithms for CFGs.
- **Advanced Machine Types:** Explore adding Mealy/Moore machines, Petri Nets, or Register Machines.
