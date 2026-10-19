#!/usr/bin/env node
/**
 * One-off patcher for git-ignored internal-ref-files (Cursor cannot edit via tools).
 * Run: node scripts/patch-internal-ref-docs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

function patchArchitecture() {
  const file = path.join(root, 'internal-ref-files', 'architecture.md')
  let s = fs.readFileSync(file, 'utf8')

  const addendumOld =
    /> \*\*Current-state addendum \(2026-09-05\):\*\*[\s\S]*?treat the dated statement as\r?\n> historical\./

  const addendumNew = `> **Current-state addendum (2026-10-18):** The historical detail below is
> intentionally preserved. Current manifests report version **5.1.0**. The
> current working tree passes **65 Vitest files / 724 tests** (\`npm test\`),
> \`npx tsc --noEmit\`, and \`npm run build\` (verified 2026-10-18). Where an older
> dated statement conflicts with this addendum, treat the dated statement as
> historical. Mirrored decision summaries: \`.ctx/decisions/0163\`–\`0175\` (local;
> \`.ctx/\` is git-ignored). Product limits: \`.ctx/product/known-limitations.md\`.`

  if (!addendumOld.test(s)) throw new Error('architecture: addendum block not found')
  s = s.replace(addendumOld, addendumNew)

  s = s.replace(
    /There is currently no implemented PDA→CFG or DFA\/NFA→Regex conversion module;\r?\nolder references to those conversions describe prior plans, not current code\.\r?\n\r?\n/,
    '',
  )

  const convOld =
    /- `engines\/machine\/conversions\/`: ε-elimination, subset construction, DFA\r?\n  minimization, Thompson Regex→NFA, CFG→PDA, Mealy↔Moore,\r?\n  Regex\/Type-3 grammar conversion, and bounded grammar-recognizer generation\./

  const convNew = `- \`engines/machine/conversions/\`: ε-elimination, subset construction, DFA
  minimization, Thompson Regex→NFA, CFG→PDA, Mealy↔Moore,
  Regex/Type-3 grammar conversion, bounded grammar-recognizer generation, and
  **extract** conversions **FA → regex** (\`dfaToRegex.ts\`, GNFA elimination) and
  **PDA → CFG** (\`pdaToCfg.ts\` with \`pdaNormalize.ts\` triplet path). CFG→PDA
  sets \`grammarText\` on the result NPDA; PDA→CFG returns embedded grammar when
  present (language-preserving round-trip) instead of re-extracting triplets.
  Registry: \`engines/machine/conversions/index.ts\` (\`mode: 'extract'\`).`

  if (!convOld.test(s)) throw new Error('architecture: conversions bullet not found')
  s = s.replace(convOld, convNew)

  const grammarOld =
    /- `engines\/grammar\/`: Type 0–3 production parsing\/classification, CFG analysis\r?\n  and transformations, bounded derivation search, and its worker\./

  const grammarNew = `- \`engines/grammar/\`: Type 0–3 production parsing/classification (\`GeneralGrammar\`,
  \`grammarLabCapabilities.ts\`, \`grammarFundamentals.ts\`, \`sampleLanguage.ts\`),
  CFG analysis and transformations, bounded derivation search, and its worker.`

  if (!grammarOld.test(s)) throw new Error('architecture: grammar bullet not found')
  s = s.replace(grammarOld, grammarNew)

  const parserOld =
    /- `engines\/parser\/`: LL\(1\), LR\(0\), SLR\(1\), CLR\(1\), LALR\(1\), CYK, Earley, and\r?\n  backtracking engines plus LR graph layout\./

  const parserNew = `- \`engines/parser/\`: LL(1), LR(0), SLR(1), CLR(1), LALR(1), CYK, Earley, and
  backtracking engines plus LR graph layout (\`engines/parser/layout/worker.ts\`,
  \`GlobalRoutingEngine\`; \`LRLayoutStrategy.ts\` removed). Parser automaton viewer
  (\`AutomatonViewerPanel.tsx\`) uses \`LR_AUTOMATON_LAYOUT_FULL\` 200, \`COMPACT\` 500,
  \`MAX\` 1500 in \`engines/parser/layout/types.ts\` — truncated item lists and tighter
  spacing above 200 states; graph not drawn above 1500 (parse tables still work).
  Cached layout: \`MachineDefinition.parserLayoutCache\`.`

  if (!parserOld.test(s)) throw new Error('architecture: parser bullet not found')
  s = s.replace(parserOld, parserNew)

  const treeOld =
    /### `ComputationTree`\r?\nNFA, ε-NFA, NPDA, and NLBA engines retain configuration lineage for branching\r?\nruns\. The UI can transform that flat lineage into a tree; NLBA currently has a\r?\nknown type-helper drift that can suppress its Tree tab and tree export\./

  const treeNew = `### \`ComputationTree\`
NFA, ε-NFA, NPDA, and NLBA engines retain configuration lineage for branching
runs. \`supportsComputationTree()\` reads \`engines/machine/core/capabilities.ts\`
(NLBA is tree-capable). UI: \`ComputationTreePanel.tsx\`; exports include JSON,
Markdown, and SVG outline (\`treeToSVG\` in \`utils/exporters.ts\`, 800-row cap).
Tape snapshots in tree labels use \`formatTapeSnapshot\` in \`utils/exporters.ts\`.`

  if (!treeOld.test(s)) throw new Error('architecture: ComputationTree section not found')
  s = s.replace(treeOld, treeNew)

  if (!s.includes('## 8. October 2026 workspace & platform additions')) {
    s += `

## 8. October 2026 workspace & platform additions (2026-10-18)

### Agent / local context

- **\`.ctx/\`** — Bookkeeper agent context (handoff, PRD, decisions mirror). **Git-ignored** as of 2026-10-18; not shipped with the app. Historical narrative remains in this \`internal-ref-files/\` folder.

### Three-workspace UX

- **Tabs onboarding** — \`TabsOnboardingModal.tsx\`, storage key \`automatalab.tabs-onboarding-v3\`; Help → workspace intro; Tauri vs hosted demo via \`isTauriRuntime()\` (\`__TAURI_INTERNALS__\`) and \`isRestrictedSimulatorShell()\` in \`utils/demoMode.ts\`.
- **Theory & Help** — \`src/content/labTheorySections.tsx\`, \`theoryMath.tsx\`, \`grammarSyntaxGuide.tsx\`; F2 handbook and F1 Help aligned with format gates (\`GrammarLabTabGate.tsx\`).

### File I/O (Tauri)

- **Open Recent** — \`utils/recentFiles.ts\` (\`RecentFileKind\`: machine | grammar | parser); \`loadMachineFromPath\` opens \`.txt\` grammars; File menu enabled on hub when recents exist; Open/Save still require a workspace tab.
- **Grammar saves** — grammar-only \`.txt\` via Save; \`addRecentFile\` records kind from workspace hash.

### Conversions UI

- **Extract to text** — \`ConversionsModal.tsx\`: FA→regex, PDA→CFG; **Open in Grammar Lab** for string results.
- **PDA normalizer** — \`pdaNormalize.ts\` (comma-separated push expansion, ε-setup) before triplet extract.

### Demo / desktop detection

- Shared \`localhost:5173\` can leave \`sessionStorage\` demo flags; desktop uses \`__TAURI_INTERNALS__\` so full shell is not mistaken for hosted demo (\`demoMode.test.ts\`).

### Documentation map

- Shipped user docs: \`HelpModal.tsx\`, \`ManualModal.tsx\`, F2 sections.
- Repo-only limits table: \`.ctx/product/known-limitations.md\` (also summarized in \`README.md\` Development section).
`
  }

  fs.writeFileSync(file, s, 'utf8')
  console.log('Patched', file)
}

function patchDecisions() {
  const file = path.join(root, 'internal-ref-files', 'decisions.md')
  let s = fs.readFileSync(file, 'utf8')

  s = s.replace(
    /> \*\*Last updated:\*\* 2026-09-05\. Decisions through D162 are historical; D163\+\r?\n> records the current Phase C and hosted-demo worktree\./,
    `> **Last updated:** 2026-10-18. Decisions through D162 are historical; D163–D175
> record Phase C, hosted-demo boundaries, and the 2026-10 conversion/UI work.
> Summaries mirrored under \`.ctx/decisions/\` (git-ignored).`,
  )

  // Supersede D174 closing paragraph
  s = s.replace(
    /\*\*D174 — Correct the current conversion inventory without deleting the D61 plan record\.\*\*\r?\n\*Context:\* D61 and the associated historical release narrative list PDA→CFG and DFA\/NFA→Regex as delivered, but the current tree contains no implementation or registered conversion for either direction\.\*\r?\n\*Decision:\* Treat the current conversion inventory in `engines\/machine\/conversions\/index\.ts` as authoritative\. It includes ε-NFA→NFA, NFA\/ε-NFA→DFA, DFA minimization, Regex→NFA, CFG→PDA, Mealy↔Moore, regular-grammar conversions, and bounded grammar-recognizer generation\. PDA→CFG and DFA\/NFA→Regex remain historical planned scope, not current features\. \*\[engines\/machine\/conversions\/index\.ts, engines\/machine\/conversions\/types\.ts\]\*/,
    `**D174 — Correct the current conversion inventory without deleting the D61 plan record.**
*Context:* D61 and the associated historical release narrative list PDA→CFG and DFA/NFA→Regex as delivered; the 2026-09 tree had neither registered.
*Decision (2026-09):* Treat \`engines/machine/conversions/index.ts\` as authoritative for **transform** conversions.
*Superseded (extract directions only) by D175 (2026-10-18).* *[engines/machine/conversions/index.ts]*`,
  )

  s = s.replace(
    /\*\*D172 — Record the post-audit verification baseline\.\*\*\r?\n\*Decision:\* The 2026-09-05 working tree passes 58 Vitest files \/ 645 tests\. Standard and `VITE_SIMULATOR_MODE=true` production builds pass; existing Vite chunk-size and mixed-import warnings remain non-blocking\. This supersedes the aggregate recorded in D162 without changing its historical Phase A result\. \*\[internal-ref-files\/architecture\.md\]\*/,
    `**D172 — Record the post-audit verification baseline.**
*Decision:* Verification commands live in \`.ctx/core.md\` when present locally. Historical: 58 files / 645 tests (2026-09-05). **Current (2026-10-18):** 65 files / 724 tests; \`npx tsc --noEmit\` and \`npm run build\` pass; Vite chunk-size warnings remain non-blocking. *[package.json, vitest.config.ts, internal-ref-files/architecture.md]*`,
  )

  s = s.replace(
    /\*\*D171 — Record manifest versions and capability drift as facts, not inferred completion\.\*\*\r?\n\*Context:\* Historical notes called the current product 5\.0\.2 even though both current manifests say 5\.0\.0\. The NLBA engine implements `TreeProvider` and the capability registry marks it tree-capable, but a legacy helper still omits NLBA and is used by both SidePanel and ExportModal\.\*\r?\n\*Decision:\* Internal current-state documents must report manifest version 5\.0\.0 unless the manifests change\. Record the NLBA computation-tree UI mismatch as known incomplete integration: both the Tree tab and tree export can be suppressed\. Do not describe it as fully wired merely because the engine API exists\. \*\[package\.json, src-tauri\/tauri\.conf\.json, engines\/machine\/core\/capabilities\.ts, engines\/machine\/core\/utils\.ts, components\/panels\/SidePanel\.tsx, components\/layout\/ExportModal\.tsx\]\*/,
    `**D171 — Record manifest versions and capability drift as facts, not inferred completion.**
*Context:* Historical notes called the product 5.0.2 while manifests say 5.0.0. NLBA tree gating previously drifted from capabilities.
*Decision:* Report version from manifests. Use \`supportsComputationTree()\` from \`capabilities.ts\` (NLBA included). Tree export/panel follow that registry; residual limits (SVG row cap, large LR graph) are product limits, not missing engine APIs. *[engines/machine/core/capabilities.ts, components/panels/SidePanel.tsx, components/layout/ExportModal.tsx]*`,
  )

  if (!s.includes('**D175 —')) {
    s += `

---

## October 2026 — extracts, files, parser scale (D175–D182)

**D175 — Restore FA→regex and PDA→CFG as extract conversions.**
*Context:* JFLAP-parity; D174 recorded absence in 2026-09.
*Decision:* Register \`dfa-to-regex\` and \`pda-to-cfg\` as \`mode: 'extract'\` in \`CONVERSIONS\`. \`pdaToCfg\` calls \`normalizePdaForCfg\` (\`pdaNormalize.ts\`) before triplet extraction. When \`grammarText\` is set on an NPDA from **CFG → PDA**, return embedded grammar for language-preserving round-trip instead of triplets. Surface in Convert modal; **Open in Grammar Lab** on extract (\`ConversionsModal.tsx\`). *[engines/machine/conversions/dfaToRegex.ts, pdaToCfg.ts, index.ts, extractConversions.test.ts]*

**D176 — Tauri Open Recent spans machine and grammar paths.**
*Decision:* \`recentFiles.ts\` stores \`RecentFileKind\` (\`machine\` | \`grammar\` | \`parser\`). \`loadMachineFromPath\` parses \`.txt\` via \`grammarMachineFromText\`; menu labels \`(Grammar)\` / \`(Parser)\`. Open Recent enabled on workspace hub when list non-empty; Open/Save remain disabled on hub. Web builds have no path recents. *[utils/fileManager.ts, hooks/useFileActions.ts, components/layout/MenuBar.tsx]*

**D177 — LR automaton viewer tiered layout and hard cap.**
*Decision:* \`LR_AUTOMATON_LAYOUT_FULL\` 200, \`COMPACT\` 500, \`MAX\` 1500 (\`engines/parser/layout/types.ts\`). \`AutomatonViewerPanel.tsx\` truncates displayed items (\`LRStateNode\` \`maxItems\`), tightens worker spacing, disables extended back-edges in compact mode, and refuses to render the graph above 1500 states (parse tables unchanged). Invalidate stale cache when node count ≠ state count. *[components/workspaces/parser/AutomatonViewerPanel.tsx, LRStateNode.tsx]*

**D178 — Computation tree export includes NLBA tapes and SVG outline.**
*Decision:* \`formatTapeSnapshot\` for tree labels; \`treeToSVG\` (800-row cap, white background) in Export modal; \`liveBranchIds\` from \`simulationStore\` for status coloring. *[utils/exporters.ts, ComputationTreePanel.tsx, ExportModal.tsx]*

**D179 — Desktop vs hosted demo detection uses Tauri runtime globals.**
*Context:* \`TAURI_ENV_PLATFORM\` alone was unreliable under \`tauri dev\` on Vite.
*Decision:* \`isTauriRuntime()\` checks \`__TAURI_INTERNALS__\` on \`window\`; demo session storage on shared localhost must not hide the full desktop app. *[utils/demoMode.ts, App.tsx, TabsOnboardingModal.tsx]*

**D180 — Grammar Lab format-aware tabs and pedagogy copy.**
*Decision:* \`grammarLabCapabilities.ts\` gates tabs; \`grammarFundamentals.ts\` / \`sampleLanguage.ts\` support Types 0–3; shared \`grammarSyntaxGuide.tsx\`; F1/F2 content in \`labTheorySections.tsx\` and \`theoryMath.tsx\`. Parser Help links to Grammar syntax tab (no duplicate token table). *[components/workspaces/grammar/*, content/*, HelpModal.tsx]*

**D181 — \`.ctx/\` is local agent context only (git-ignored).**
*Decision:* Bookkeeper files under \`.ctx/\` are not committed; durable human reference stays in \`internal-ref-files/\` (also git-ignored per D20). Agents update local handoff; do not treat \`.ctx/\` as repo state. *[.gitignore, AGENTS.md]*

**D182 — Documented product limits without blocking ship.**
*Decision:* Maintain \`known-limitations.md\` (local \`.ctx/product/\`) with impact notes: legacy recent \`.txt\` without \`kind\`, triplet vs \`grammarText\` extract, LR graph >1500, bundle size warnings. *[.ctx/product/known-limitations.md, README.md]*

`
  }

  fs.writeFileSync(file, s, 'utf8')
  console.log('Patched', file)
}

patchArchitecture()
patchDecisions()
