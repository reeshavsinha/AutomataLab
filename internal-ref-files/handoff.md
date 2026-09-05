# Handoff — AutomataLab

> **INTERNAL / DO NOT COMMIT.**
>
> **Last updated:** 2026-09-05
>
> This file describes the current working tree. Historical release narrative
> belongs in `decisions.md` and roadmap documents.

## Working agreements

- Branch: `wip/continue-later`.
- Current HEAD: `a623ae21e65c170c85ad682a8112de4a2fb216a6`
  (`WIP: save current application state`, 2026-08-29).
- The working tree contains many intentional modified and untracked files.
  Do not reset, discard, commit, push, or open a PR without explicit user
  instruction.
- Internal reference files are git-ignored and must not be committed.
- Shell is PowerShell on Windows.
- Verification order for a release candidate:
  `npm test` → `npx tsc --noEmit` → `npm run build`.

## Version facts

- `package.json`: 5.0.0.
- `src-tauri/tauri.conf.json`: 5.0.0.
- Some older internal documents describe a planned or historical 5.0.2
  baseline. Do not report 5.0.2 as the current manifest version unless the
  manifests are intentionally updated.
- Native project-file major version: 2 (`src/utils/fileFormat.ts`).

## Current implementation status

### Workspaces

- Workspace Hub with hash routes for Machine, Grammar, and Parser workspaces.
- Machine Studio supports DFA, NFA, ε-NFA, Mealy, Moore, DPDA, NPDA, TM,
  multi-track TM (`MTM`), LBA, and NLBA document types.
- Grammar Lab represents Regex and Type 0–3 grammars, performs Chomsky
  classification/validation, and constructs the CFG model only for Type 2/3.
  Regex tools are explicitly gated; Type 0/1 CFG-only tabs remain visible but
  render unavailable/empty states because no CFG model is constructed.
- Parser Studio supports LL(1), LR(0), SLR(1), CLR(1), LALR(1), CYK, Earley,
  and backtracking.

### Phase C parity work now present

The old handoff called Phase C future work. That is no longer correct in the
current working tree:

- Type 0/1 grammar representation and conservative classification are
  implemented.
- Bounded derivation search provides `FOUND`, `NOT_FOUND_WITHIN_LIMIT`,
  `RESOURCE_LIMIT`, and `CANCELLED`, with a worker-backed UI path.
- TM watchers support state, head symbol, head position, step, tape window,
  and nested AND/OR conditions. Watcher state is transient per tab.
- `MTM` implements one physical tape, one head, and vector cells across tracks.
- Hierarchical TM calls use embedded child snapshots, explicit call/return
  frames, shared tapes, depth limits, and error handling for missing children.
- NLBA has a bounded nondeterministic frontier and implements computation-tree
  lineage.

### Conversion additions

- Regex → Type 3 grammar now uses Thompson ε-NFA, subset construction,
  minimization, and right-linear grammar emission; it is not hard-coded.
- Regular grammars can be converted to compatible automata.
- Type 2 can target NPDA directly and bounded NLBA/TM recognizer shells.
- Type 1 can target NLBA/TM; Type 0 can target TM.
- Generated high-power recognizers retain the source grammar and execute
  bounded derivation search. Resource exhaustion reports `stuck`.

### Machine correctness/hardening completed in this working tree

- TM-family sparse tape, configurable blank, `S` stay operation, and
  tape-content-aware loop detection have focused coverage.
- DPDA/NPDA push notation is standard: for `aZ`, `Z` is inserted lower and `a`
  is the resulting stack top.
- Terminal results are stable when deterministic engines are stepped after
  halting.
- Validator symbol length uses Unicode code points rather than UTF-16 code
  units.
- NLBA nondeterminism is allowed by validation while deterministic TM/LBA
  conflicts remain errors.

## Hosted demo audit and fixes

The deployed demo observed at
`https://automata-lab-sim.vercel.app/simulator?demo=true` exposes the original
thin Machine Studio subset:

- DFA, NFA, ε-NFA, DPDA, NPDA, TM, LBA;
- four examples: even-zero DFA, ends-in-11 NFA, balanced-parentheses NPDA,
  and `aⁿbⁿcⁿ` TM.

The current worktree now:

- centralizes the exact demo query parser and public feature lists in
  `src/utils/demoMode.ts`;
- prevents Mealy/Moore, MTM, NLBA, advanced TM configuration, watchers, and
  hierarchical calls from leaking into the hosted demo UI;
- routes landing links to `/simulator?demo=true`;
- disables the unsaved-exit prompt in demo mode;
- makes “Go to latest visited step” use the actual furthest visited step;
- confines Tape-panel head centering to its own horizontal scroller; and
- contains toolbar overflow so opening Tape cannot shift the whole viewport.

These changes are local until Vercel is redeployed.

## Verification record

Verified during the 2026-09-05 audit:

- final full suite: **58 test files / 645 tests passed**;
- demo behavior/UI focused tests passed;
- Tape-panel alignment regression test passed;
- standard production build passed;
- demo-mode production build passed after the Tape alignment fix;
- IDE diagnostics for edited demo/Tape files were clean;
- `git diff --check` passed.

## Known issues and boundaries

1. `capabilities.ts` marks NLBA as computation-tree capable and the engine
   implements `TreeProvider`, but `core/utils.ts::supportsComputationTree()`
   omits NLBA. SidePanel and ExportModal use the older helper, so both the NLBA
   Tree tab and NLBA tree export can be absent.
2. NPDA and NLBA frontier caps deliberately return `stuck` when the frontier
   overflows without an accepting branch already found. This avoids a false
   rejection but does not decide the language.
3. General grammar derivation and generated grammar recognizers are bounded.
   `RESOURCE_LIMIT`/`stuck` is inconclusive.
4. The current Vite build has non-blocking large-chunk and mixed import
   warnings.
5. Browser-level end-to-end interaction coverage remains smaller than engine
   and component coverage.
6. The public Vercel deployment must be tested again after redeployment; local
   build success is not deployment verification.

## Next actions

1. Decide whether to fix the NLBA capability-helper drift by delegating all UI
   gates to `capabilities.ts`.
2. Redeploy the simulator and landing page, then verify the demo route in a real
   browser at desktop and narrow widths.
3. Review the large existing working tree and split/commit only when explicitly
   requested.
