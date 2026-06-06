# AutomataLab

A modern, fast, and interactive web application for designing, simulating, and testing finite state automata (DFA, NFA, and ε-NFA). 

## Features

- **Interactive Canvas**: Drag and drop states, draw transitions, and visually arrange your automata.
- **Support for Multiple Automata Types**: Create Deterministic Finite Automata (DFA), Nondeterministic Finite Automata (NFA), and ε-NFA.
- **Live Simulation**: Run step-by-step or continuous simulations with speed control to watch the automaton process strings.
- **Real-Time Validation**: Instant feedback on missing start states, unreachable states, or nondeterminism.
- **Copy/Paste & Selection**: Full keyboard shortcut support for selecting, moving, cutting, copying, pasting, and deleting.
- **Execution History**: Detailed step-by-step logs of active states and consumed symbols during simulation.
- **Export/Import**: Save your machines to `.autolab.json` and load them back later.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

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
