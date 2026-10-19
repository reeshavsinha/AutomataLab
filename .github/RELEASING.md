# Releasing AutomataLab

Use this checklist for **v5.1.0** (and later). The desktop build is driven by a **version tag** on `main`, not by merging alone.

## Prerequisites

- `package.json`, `src-tauri/tauri.conf.json`, and `Cargo.toml` all show the target version (e.g. **5.1.0**).
- `CHANGELOG.md` has a top `## vX.Y.Z` section (release workflow copies it into the GitHub Release body).
- GitHub Actions secrets: `TAURI_PRIVATE_KEY`, `TAURI_KEY_PASSWORD` (signing + updater).
- Local verify (from repo root):

  ```bash
  npm test
  npx tsc --noEmit
  npm run build
  ```

## 1. Main repository (public)

**Note:** In this repo, `origin/main` and `wip/continue-later` may have **unrelated histories** (no common merge base). A normal PR merge can fail; use the publish script or merge with `--allow-unrelated-histories` and keep the release branch content (`-X theirs` when merging wip into main).

**Corporate proxy (Zscaler):** `git push` may return **HTTP 403** with `Server: Zscaler` even when `gh auth status` is fine. Use a network that allows GitHub `git-receive-pack`, or create a bundle on this machine and push from elsewhere:

```powershell
git bundle create release-v5.1.0.bundle origin/wip/continue-later..wip/continue-later
# On unrestricted machine: clone repo, then:
# git fetch \path\to\release-v5.1.0.bundle wip/continue-later:wip/continue-later
# git push origin wip/continue-later
```

**One-shot (PowerShell, after `gh auth login`):**

```powershell
.\scripts\publish-v5.1.0.ps1
```

**Manual:**

1. Push your integration branch (e.g. `wip/continue-later`) and open a PR into **`main`** (or use the script above).
2. Merge to **`main`** when CI is green.
3. On **`main`**, create and push the tag (must match `package.json` version):

   ```bash
   git checkout main
   git pull
   git tag v5.1.0
   git push origin v5.1.0
   ```

4. Watch **Actions → Release**. Three platform jobs build installers; `updater-manifest` mirrors `latest.json` as **`updater.json`** on the release.

**Stable vs prerelease:** The workflow marks the release **prerelease** unless the tagged commit is an ancestor of `origin/main`. Tag **after** merge so `/releases/latest` and the in-app updater point at the right build.

**Do not push** `local/private-backup` or any branch that contains `.ctx/` or `internal-ref-files/` if your policy is to keep those local-only.

## 2. GitHub Release checksums (landing page)

The landing page (`page/script.js`) calls `GET /repos/.../releases/latest` and:

- Wires download buttons to release **assets** (`.exe`, `.deb`, `.dmg`).
- Parses **SHA-256** hex digests from the release **body** when each line mentions the platform (e.g. `win`, `.exe`, `deb`, `dmg`).

The automated body from `CHANGELOG.md` does **not** include hashes. After installers are uploaded, **edit the release on GitHub** and append a block like:

```markdown
## Installer SHA256

- **Windows** (`automatalab_5.1.0_x64-setup.exe` or `.exe`): `<64-char hex>`
- **Linux** (`automatalab_5.1.0_amd64.deb`): `<64-char hex>`
- **macOS** (`automatalab_5.1.0_universal.dmg`): `<64-char hex>`
```

Use the actual asset filenames from the release. Until this is published, the site shows placeholder checksum copy; buttons still work once assets exist.

## 3. Vercel (landing + hosted simulator)

- **Project** serves from this repo; root `vercel.json` rewrites `/` → `page/index.html` and `/simulator` → app `index.html`.
- **CSP** for the landing lives in `page/vercel.json` (`connect-src` includes `https://api.github.com` for release metadata).
- Deploy happens when **`main`** updates (merge the release PR). No separate Vercel step unless you use a preview branch.
- After deploy, spot-check:
  - [https://automata-lab-sim.vercel.app/](https://automata-lab-sim.vercel.app/) — version badges and download links.
  - [https://automata-lab-sim.vercel.app/simulator?demo=true](https://automata-lab-sim.vercel.app/simulator?demo=true) — demo boundary.

Bump `page/styles.css?v=` in `page/index.html` when CSS changes so browsers skip stale caches.

## 4. GitHub Wiki (separate git remote)

The wiki is **not** in the main repo. Use the local clone (e.g. `.wiki-worktree/`):

```bash
cd .wiki-worktree
git status
git push origin master
```

For v5.1.0, wiki pages should reference **v5.1.0** in `_Footer.md`, `Home.md`, and `Roadmap.md`. Main app docs remain in-repo (`CHANGELOG.md`, F1/F2 modals).

## 5. Post-release smoke test

- Install one desktop build from the new release; confirm **Help → Check for updates** (or equivalent) sees `updater.json`.
- Open wiki **Getting Started** and landing **Docs** links.
- Confirm `releases/latest` on GitHub matches **v5.1.0** and is not marked prerelease.

## Reference

| Artifact | Location |
|----------|----------|
| Human release blurb | `release_notes.md` |
| Canonical changelog | `CHANGELOG.md` |
| CI workflow | `.github/workflows/release.yml` |
| Landing | `page/` |
