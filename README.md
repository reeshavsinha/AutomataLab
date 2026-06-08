<div align="center">
  <h1>⚙️ AutomataLab</h1>
  <p><strong>A modern, fast, and interactive cross-platform desktop application for designing, simulating, and testing finite state automata.</strong></p>

  <!-- Badges -->
  <img src="https://img.shields.io/github/v/release/reeshavsinha/AutomataLab?style=flat-square&color=007ACC" alt="Release" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platforms" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License" />
  <br/>
  <img src="https://img.shields.io/badge/Built_with-Tauri-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=flat-square&logo=vite&logoColor=FFD62E" alt="Vite" />
</div>

<br/>

<!-- REPLACE THIS LINK WITH YOUR ACTUAL SCREENSHOT/GIF -->
![AutomataLab Screenshot](./docs/screenshot.png)

<br/>

## 🚀 Download & Install

Ready to build some state machines? Download the latest stable release for your operating system:

👉 **[Download AutomataLab v2.0.0](https://github.com/reeshavsinha/AutomataLab/releases/latest)**

*Auto-updates are fully supported for all platforms from v1.0.2 onward.*

---

## ✨ Features

- **🌐 Multiple Machine Types**: Finite automata — Deterministic (DFA), Non-Deterministic (NFA), and Epsilon-NFA (ε-NFA) — plus Pushdown Automata, both deterministic (DPDA) and non-deterministic (NPDA).
- **🖱️ Interactive Canvas**: Seamless drag-and-drop interface for placing states and drawing transitions. Powered by a dynamic d3-force auto-layout engine to keep things tidy.
- **▶️ Live Simulation**: Run step-by-step or continuous simulations with custom speed controls. Watch the automaton process strings with full visual branching for non-deterministic paths.
- **📚 Stack & Computation Tree**: A live stack panel with push/pop animations for PDAs, plus a status-coloured computation-tree viewer for exploring every branch of a nondeterministic run (NFA, ε-NFA, NPDA).
- **🖥️ Desktop Native**: Enjoy a multi-tab interface, native file saving/loading (`.autolab.json`), and over-the-air auto-updates.
- **⚡ Real-Time Validation**: Instant UI feedback on missing start states, unreachable nodes, or invalid configurations.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` or `P` | Play / Pause Simulation |
| `Right Arrow` or `S` | Step Forward Simulation |
| `R` | Reset Simulation |
| `Ctrl + Click` | Select multiple elements |
| `Ctrl + C` / `V` / `X` | Copy / Paste / Cut |
| `Delete` | Remove selected elements |
| `Double Click` | Edit label / Enter drag mode |

## 🗺️ Roadmap

The ultimate goal of AutomataLab is to evolve into a comprehensive visual learning environment for all levels of computational theory.

- **Phase 1:** Advanced Models — ✅ Pushdown Automata (DPDA & NPDA) shipped in v2.0.0; Turing Machines (tape visualization) next.
- **Phase 2:** Analytical Tools (NFA to DFA conversion, State Minimization, Regex integration).
- **Phase 3:** Visual Exports (PNG/SVG) and Web-browser parity.

## 🛠️ Development

Want to build it from source?

```bash
# Install dependencies
npm install

# Run the Tauri development app
npm run tauri:dev
```

## 📄 License
This project is licensed under the [MIT License](LICENSE).
