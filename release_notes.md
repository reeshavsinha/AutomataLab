# AutomataLab v5.0.0 — The Grammar & Parser Update

We are incredibly excited to announce AutomataLab **v5.0.0**, our largest and most ambitious update ever! 

With this release, AutomataLab evolves from a pure Finite State Machine visualizer into a **Unified Formal Languages Integrated Environment**. We are introducing two entirely new core workspaces: the **Grammar Lab** and the **Parser Studio**.

### 🌟 New Workspaces

#### 1. The Grammar Lab
A dedicated playground for Context-Free Grammars (CFGs).
- **Mathematical Diagnostics**: Instantly calculate exact `Nullability`, `FIRST`, and `FOLLOW` sets for every non-terminal in real-time.
- **Ambiguity & Recursion**: Automatically detect Left-Recursion and un-factored ambiguity rules in your grammar that would break predictive parsers.
- **Grammar Transformations**: Convert any Context-Free Grammar directly into strictly formatted **Chomsky Normal Form (CNF)** or **Greibach Normal Form (GNF)** with a single click.

#### 2. The Parser Studio
A massive new visual environment for compiler design and parser generation.
- **Top-Down Parsing**: Automatically construct exact predictive **LL(1)** parse tables and watch step-by-step AST derivation.
- **Bottom-Up Parsing**: Explore deterministic Shift/Reduce mechanics with four distinct LR algorithms: **LR(0)**, **SLR(1)**, **LALR(1)**, and **CLR(1)**.
- **State Machine Generation**: Generate and visualize the massive underlying Deterministic Finite Automaton (DFA) of LR Item Sets. Click on conflict cells (Shift/Reduce or Reduce/Reduce) to see the exact rules colliding!
- **General Parsing Algorithms**: Parse *any* ambiguous grammar directly using the $O(n^3)$ **CYK Dynamic Programming Matrix**, or the incredibly robust **Earley Chart Parser**.

### 🎨 Architecture & UI
- **Unified 3-Pillar UI**: The application interface has been completely redesigned into three distinct modes (Machine Workspace, Grammar Lab, Parser Studio). 
- **Landing Page Overhaul**: Our documentation website has received a stunning visual update reflecting the entire formal computation lifecycle, powered by Vercel.
- **Massive Wiki Rewrite**: The entire GitHub Wiki has been restructured into an academic textbook-style hierarchy to match the new engine capabilities.

### 🐛 Improvements & Fixes
- **Tauri Core Bump**: Upgraded to Tauri v2.11.2 for faster window rendering and seamless over-the-air auto-updates.
- **Performance**: Abstract Syntax Tree rendering optimizations ensuring 60FPS UI performance even for massive deep-recursion derivations.
- **Security**: Updated the internal sandbox policy to ensure all `.autolab.json` files are parsed purely as declarative ASTs, mitigating prototype-pollution risks.

*(Note: v5.0.0 maintains 100% backward compatibility with all `.autolab.json` machine files exported from v4.x.x)*
