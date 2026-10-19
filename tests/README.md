# Tests

AutomataLab uses two kinds of tests: **automated** (Vitest, `npm test`) and **manual** scripts for one-off engine checks.

## Automated tests (`npm test`)

Vitest runs every `*.test.ts` file under `src/` (co-located with the code they cover). Setup: `src/test-setup.ts`. Config: `vitest.config.ts`.

| Area | Location (examples) |
| :--- | :--- |
| Machine engines | `src/engines/machine/**/*.test.ts` |
| Conversions | `src/engines/machine/conversions/*.test.ts` |
| Grammar | `src/engines/grammar/*.test.ts` |
| Parsers | `src/engines/parser/*.test.ts` |
| Utils / stores | `src/utils/*.test.ts`, `src/store/*.test.ts` |
| Stress | `src/__stress__/stress.test.ts` |

Run one file: `npm test -- src/utils/validator.test.ts`

## Batch test suites (in-app)

The **Batch** runner accepts `.txt`, `.csv`, or `.json` suite files (`accept:` / `reject:` lines, categories, trace oracles). Sample files:

- `tests/suites/sample-dfa.txt`

Format is implemented in `src/utils/testSuite.ts` (see `src/utils/testSuite.test.ts`).

## Manual scripts (`tests/manual/`)

Ad-hoc TypeScript scripts moved from the repo root. **Not** part of `npm test`. Run with a TS runner from the repo root, for example:

```bash
npx tsx tests/manual/test-earley.ts
```

Imports use `../../src/...`. Use these for local debugging; prefer adding a Vitest case when a check should stay in CI.

## Release documentation (repo root)

| File | Purpose |
| :--- | :--- |
| **`CHANGELOG.md`** | Full version history. **GitHub Releases** body is extracted from the top `## vX.Y.Z` section via `.github/workflows/release.yml`. |
| **`release_notes.md`** | Human-edited announcement copy for the current release (marketing-style). Update when publishing; keep in sync with the top `CHANGELOG.md` section. |

The landing page “Release Notes” link points at GitHub Releases (generated from `CHANGELOG.md`), not `release_notes.md`.
