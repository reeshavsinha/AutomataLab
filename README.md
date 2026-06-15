<div align="center">
  <h1>AutomataLab</h1>
  <p><strong>A modern, fast, and interactive cross-platform desktop application for designing, simulating, and testing automata across the Chomsky hierarchy — from finite automata to Turing machines.</strong></p>

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

## Download & Install

Ready to build some state machines? Download the latest stable release for your operating system:

**[Download AutomataLab v4.0.0](https://github.com/reeshavsinha/AutomataLab/releases/latest)**

*Auto-updates are fully supported for all platforms from v1.0.2 onward.*

---

## Features

- **The Full Chomsky Hierarchy**: Finite automata — Deterministic (DFA), Non-Deterministic (NFA), and Epsilon-NFA (ε-NFA) — Pushdown Automata, both deterministic (DPDA) and non-deterministic (NPDA), and now **Turing Machines (TM)** and **Linear-Bounded Automata (LBA)**.
- **Interactive Canvas**: Seamless drag-and-drop interface for placing states and drawing transitions. A one-click auto-layout (powered by ELK) tidies messy diagrams into a compact, readable arrangement.
- **Live Simulation**: Run step-by-step or continuous simulations with custom speed controls. Watch the automaton process strings with full visual branching for non-deterministic paths.
- **Tape, Stack & Computation Tree**: A Turing-machine tape panel with a live head, instantaneous description, LBA boundary markers, a live preview of your input as you type, a marker for the head's last move, and one row per tape for **multi-tape** machines; a stack panel with push/pop animations for PDAs; and a status-coloured computation-tree viewer for every branch of a nondeterministic run (NFA, ε-NFA, NPDA).
- **Reject States & Loop Guard**: Mark explicit reject states for TM/LBA, and rely on a configurable step limit that halts runaway computations as `stuck`.
- **Transition Table (δ) Editor**: Edit every transition in a grouped, inline table view as an alternative to the canvas — with click-to-locate jumps back to the matching state or edge, and a clickable **ε** button for entering epsilon transitions without an epsilon key.
- **Conversions & Constructions**: One-click **NFA → DFA** and **ε-NFA → DFA** (subset construction), **ε-NFA → NFA** (ε-elimination), **DFA minimization**, **Regex → NFA** (Thompson's), and **CFG → PDA** — each played back **step by step** on a live preview with a Source ⇄ Result toggle, then opened in a new tab. Converted machines use clean, short state names (`q0, q1, …`) with the original subset or merged class revealed on hover or via a full-labels toggle.
- **Export & Batch Testing**: Export the transition table, execution trace, and computation tree as CSV / LaTeX / JSON, export the **state diagram** as **PNG / SVG** (theme-aware), and run many input strings at once with `accept:` / `reject:` expectations in a pass/fail batch runner.
- **Desktop Native**: A familiar classic-desktop workspace — a top **File / Edit / View / Simulate / Convert / Help** menu bar above a compact toolbar — with a multi-tab interface, native file saving/loading (`.autolab.json`), keyboard-accessible dialogs (focus-trapped, Esc-to-close), and over-the-air auto-updates.
- **Real-Time Validation**: Instant UI feedback on missing start states, unreachable nodes, nondeterminism, and invalid configurations — plus optional declared stack/tape alphabets (Γ), a one-click **Complete DFA** fix, and click-to-locate from any warning to the offending element.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` or `P` | Play / Pause Simulation |
| `Right Arrow` or `S` | Step Forward Simulation |
| `Left Arrow` | Step Back Simulation |
| `R` | Reset Simulation |
| `N` | Add a state at the viewport centre |
| `I` / `F` | Set selected state as **Start** / toggle **Accept** |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `Ctrl + Click` / `Shift + Drag` | Add to selection / rubber-band select an area |
| `Ctrl + C` / `V` / `X` | Copy / Paste / Cut |
| `Ctrl/Cmd + N` / `O` / `S` / `Shift + S` | New / Open / Save / Save As |
| `Delete` | Remove selected elements |
| `Double Click` | Edit label / Enter drag mode |

> Editing is locked only while a simulation is actively running. Once a run finishes (Accepted / Rejected / Stuck), the diagram is fully editable again — your first edit clears the result and returns to idle automatically.

## Roadmap

The ultimate goal of AutomataLab is to evolve into a comprehensive visual learning environment for all levels of computational theory.

- **Phase 1:** Advanced Models — Pushdown Automata (DPDA & NPDA) shipped in v2.0.0; Turing Machines & Linear-Bounded Automata (tape visualization, reject states, loop guard, multi-tape) shipped in v3.0.0, alongside a transition-table editor, data/trace/tree export, and a batch test runner.
- **Phase 2:** Analytical Tools — NFA → DFA conversion, DFA minimization, Regex → NFA, and CFG → PDA — all with step-by-step playback — shipped in v4.0.0.
- **Phase 3:** Image exports (PNG/SVG of the diagram) shipped in v4.0.0; web-browser parity next.

For more detailed information, please check out our **[Project Wiki](https://github.com/reeshavsinha/AutomataLab/wiki)**.

## Development

Want to build it from source?

```bash
# Install dependencies
npm install

# Run the Tauri development app
npm run tauri:dev
```

## 📄 License
This project is licensed under the [MIT License](LICENSE).
