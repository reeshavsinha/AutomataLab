# AutomataLab

A modern, fast, and interactive cross-platform desktop application for designing, simulating, and testing finite state automata. Powered by Tauri, React, and Vite.

## Current Status & Features

AutomataLab is currently in active development, successfully functioning as a desktop application. The core engine is capable of simulating finite state machines with a highly interactive, node-based visual interface.

- **Supported Machine Types**: Deterministic Finite Automata (DFA), Non-Deterministic Finite Automata (NFA), Epsilon-NFA (ε-NFA), and Pushdown Automata — both deterministic (DPDA) and non-deterministic (NPDA).
- **Interactive Canvas**: Drag and drop states, draw transitions, and visually arrange your automata.
- **Live Simulation**: Run step-by-step or continuous simulations with speed control to watch the automaton process strings. Full support for non-deterministic branching computations.
- **Stack Visualization**: A live stack panel with push/pop animations and instantaneous-description (ID) display for PDA simulations.
- **Computation-Tree Viewer**: For NFA, ε-NFA, and NPDA, explore the full tree of computation branches — colour-coded by status, collapsible, and click-to-inspect.
- **Application Features**: Multi-tab interface for working on multiple automata simultaneously, native OS file dialogs for saving/loading `.autolab.json` projects, and a prompt to save unsaved work before closing a tab.
- **Over-the-Air Updates**: Built-in signed auto-updates via the **UPDATES** button. Functional from **v1.0.2 onward** — earlier builds (v1.0.0 / v1.0.1) shipped without the required updater capability and must be updated to v1.0.2 manually, once.
- **Real-Time Validation**: Instant feedback on missing start states, unreachable states, or nondeterminism.
- **Copy/Paste & Selection**: Full keyboard shortcut support for selecting, moving, cutting, copying, pasting, and deleting.
- **Execution History**: Detailed step-by-step logs of active states and consumed symbols during simulation.

## Project Roadmap and Future Direction

The primary goal of AutomataLab is to evolve from a finite automata simulator into a comprehensive visual learning environment for all levels of computational theory.

### Phase 1: Advanced Computational Models
*   **Pushdown Automata (PDA):** ✅ Delivered in v2.0.0 — stack memory in the engine, a visual stack panel with push/pop animations, and a computation-tree viewer for nondeterministic branches.
*   **Turing Machines (TM):** Implement an infinite tape memory model, with UI components for tape visualization and read/write head movement.

### Phase 2: Analytical and Educational Tools
*   **Machine Conversion:** Implement automated tools to convert an NFA to a DFA.
*   **State Minimization:** Implement algorithms to optimize and minimize DFA states.
*   **Regex Integration:** Allow users to generate a DFA/NFA directly from a Regular Expression, and vice versa.

### Phase 3: Export and Accessibility
*   **Visual Exports:** Add functionality to export the current canvas as a PNG, JPG, or SVG for use in assignments and presentations.
*   **Web Version Parity:** Ensure that the core simulation engine remains completely decoupled from Tauri, allowing for a fully functional web-browser version of AutomataLab in the future.

## Quick Start (Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the Tauri development app:
   ```bash
   npm run tauri:dev
   ```

## Keyboard Shortcuts

- `Space` or `P`: Play / Pause Simulation
- `Right Arrow` or `S`: Step Forward Simulation
- `R`: Reset Simulation
- `Ctrl + Click`: Select multiple states/transitions
- `Ctrl + A`: Select all elements
- `Ctrl + C`: Copy selection
- `Ctrl + X`: Cut selection
- `Ctrl + V`: Paste selection
- `Delete` or `Backspace`: Delete selected elements
- `Double Click` (Canvas): Enter selection drag mode
- `Double Click` (State/Edge): Edit label

## License
MIT License
