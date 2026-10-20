<div align="center"> <img width="128" height="128" alt="image" src="https://github.com/reeshavsinha/AutomataLab/blob/main/src/assets/logo-transparent.svg" /> </div>


<div align="center">
  <h1>AutomataLab</h1>
  <p><strong>A modern, fast, interactive desktop app (Tauri) and hosted simulator for automata, grammars, and parsers across the Chomsky hierarchy.</strong></p>

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

![AutomataLab Screenshot](https://github.com/reeshavsinha/AutomataLab/blob/main/page/docs/screenshot.png)

<br/>

## Download & Install

**[Download AutomataLab v5.1.1](https://github.com/reeshavsinha/AutomataLab/releases/latest)**

Auto-updates are supported on desktop builds. A thinner **hosted simulator** is also available from the project landing page; it exposes a subset of machine types and examples compared to the full Tauri app.

---

## Three workspaces

| Workspace | What you do there |
| :--- | :--- |
| **Machine Studio** | Draw and simulate automata on an interactive canvas. |
| **Grammar Lab** | Edit regex and Chomsky Types 0–3 grammars; analysis and tools depend on the selected format. |
| **Parser Studio** | Build LL/LR/CYK/Earley tables and step through parses on the same grammar syntax as Grammar Lab. |

In-app docs: **F1** User Manual, **F2** Theory Handbook. **Help** also includes workspace-specific quick reference.

---

## Features

### Machine Studio

- **Machine types:** DFA, NFA, ε-NFA, Mealy, Moore, DPDA, NPDA, TM, multi-track TM (MTM), LBA, NLBA, plus grammar-derived recognizers where supported.
- **Canvas:** Drag-and-drop states and transitions; ELK-based auto-layout; JFLAP `.jff` and native `.autolab.json` import/export (transducers use JSON only—JFLAP has no portable output fields).
- **Simulation:** Step, play, and batch test suites. NFA/NPDA/NLBA runs expose a **computation tree** (export JSON, Markdown, or SVG outline from **Export**).
- **Conversions (transform):** ε-removal, subset construction, DFA minimization, Regex→NFA (Thompson), CFG→PDA, Mealy↔Moore, regex/Type-3→machine, and bounded grammar recognizers.
- **Extract to text:** FA→regex (GNFA elimination) and PDA→CFG (triplet construction with automatic PDA normalization). Results can open directly in Grammar Lab.

### Grammar Lab

- **Formats:** Regular expressions, and grammars classified as Type 3, 2, 1, or 0. Tabs (FIRST/FOLLOW, CNF, derivations, etc.) are gated by format—CFG-only tools do not run on unrestricted grammars.
- **Diagnostics:** Nullability, FIRST/FOLLOW, left recursion, and ambiguity checks where applicable.
- **Transforms:** CNF/GNF and related CFG tools on Type 2/3 input.
- **Derivations:** Bounded search for Types 0–3 with explicit outcomes when limits are hit (`RESOURCE_LIMIT` is inconclusive, not a proof of non-membership).
- **Transfer:** Send grammar text to Parser Studio or build a standard machine target without retyping rules.

### Parser Studio

- **Algorithms:** LL(1); LR(0), SLR(1), LALR(1), CLR(1); CYK; Earley; recursive-descent backtracking.
- **Views:** Parse tables, LR item-set **automaton graph** (compact layout for large grammars; graph hidden above ~1500 states—tables and simulation still work), stack/buffer, syntax tree, and timeline transport.
- **Batch:** Run many inputs without mutating the interactive parse session.

### Desktop file I/O (Tauri)

- Open/Save machine projects (`.autolab.json`, `.jff`) and grammar/parser **`.txt`** files.
- **Open Recent** lists machines and labeled grammar/parser text files (available from the hub when the list is non-empty).

---

## Keyboard shortcuts

| Shortcut | Action |
| :--- | :--- |
| `F1` / `F2` | User Manual / Theory Handbook |
| `Space` or `P` | Play / Pause simulation |
| `Right Arrow` or `S` | Step forward (simulation; or complete a transition when drawing on canvas) |
| `Left Arrow` | Step back |
| `R` | Reset simulation |
| `N` | Add state at viewport centre |
| `I` / `F` | Toggle start / accept (recognizers) |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo |
| `Ctrl + Click` / `Shift + Drag` | Add to selection / rubber-band select |
| `Ctrl + C` / `V` / `X` | Copy / Paste / Cut |
| `Ctrl/Cmd + N` / `O` / `S` / `Shift + S` | New / Open / Save / Save As |

More shortcuts are listed in the in-app manual.

---

## Development

Requirements: Node.js (LTS), Rust toolchain for Tauri desktop builds.

```bash
npm install

# Desktop app (recommended for full features and file paths)
npm run tauri:dev

# Web dev server only
npm run dev

# Verify
npm test
npx tsc --noEmit
npm run build

# Desktop release binary (optional)
npm run tauri:build
```

Engines live under `src/engines/` (pure TypeScript, no React). UI under `src/components/` and `src/store/`.

**Tests:** `npm test` runs Vitest over `src/**/*.test.ts`. Ad-hoc scripts and sample batch suites live under [`tests/`](./tests/README.md). **Release docs:** [`CHANGELOG.md`](./CHANGELOG.md) (history + CI release body) and [`release_notes.md`](./release_notes.md) (optional announcement copy).

### Notes for contributors

- **PDA→CFG:** PDAs built via CFG→PDA may return the original grammar text on extract (language-preserving round-trip). Other PDAs use triplet extraction after normalization.
- **LR automaton graph:** Simplified layout between 200 and 1500 LR states; no graph rendering above 1500 states.
- **Open Recent** requires Tauri (absolute paths); the hosted simulator uses Open each time.

File formats and deeper design notes: **[Project Wiki](https://github.com/reeshavsinha/AutomataLab/wiki)**.

---

## License

This project is licensed under the [MIT License](LICENSE).
