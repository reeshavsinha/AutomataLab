# AutomataLab

A modern, fast, and interactive cross-platform desktop application for designing, simulating, and testing finite state automata. Powered by Tauri, React, and Vite.

## Current Status & Features

AutomataLab is currently in active development, successfully functioning as a desktop application. The core engine is capable of simulating finite state machines with a highly interactive, node-based visual interface.

- **Supported Machine Types**: Deterministic Finite Automata (DFA), Non-Deterministic Finite Automata (NFA), and Epsilon-NFA (e-NFA).
- **Interactive Canvas**: Drag and drop states, draw transitions, and visually arrange your automata.
- **Live Simulation**: Run step-by-step or continuous simulations with speed control to watch the automaton process strings. Full support for non-deterministic branching computations.
- **Application Features**: Multi-tab interface for working on multiple automata simultaneously, native OS file dialogs for saving/loading `.autolab.json` projects, and integrated over-the-air updates.
- **Real-Time Validation**: Instant feedback on missing start states, unreachable states, or nondeterminism.
- **Copy/Paste & Selection**: Full keyboard shortcut support for selecting, moving, cutting, copying, pasting, and deleting.
- **Execution History**: Detailed step-by-step logs of active states and consumed symbols during simulation.

## Project Roadmap and Future Direction

The primary goal of AutomataLab is to evolve from a finite automata simulator into a comprehensive visual learning environment for all levels of computational theory.

### Phase 1: Advanced Computational Models
*   **Pushdown Automata (PDA):** Implement stack memory logic in the simulation engine, with UI components for visual stack representation and push/pop animations.
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
