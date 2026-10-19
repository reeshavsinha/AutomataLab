# Publish AutomataLab v5.1.0 - run in PowerShell from repo root after: gh auth login -h github.com
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Require-GhAuth {
  gh auth status 2>&1 | Out-String | Write-Host
  if ($LASTEXITCODE -ne 0) {
    throw 'GitHub CLI is not authenticated. Run: gh auth login -h github.com'
  }
}

function Require-CleanTree {
  $dirty = git status --porcelain
  if ($dirty) { throw "Working tree is not clean:`n$dirty" }
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed (exit $LASTEXITCODE). If HTTP 403 shows Server: Zscaler, use hotspot/VPN or git bundle (see RELEASING.md)."
  }
}

Write-Host '==> Fetching origin'
git fetch origin

Require-GhAuth
Require-CleanTree

Write-Host '==> Pre-push check (private paths in commits to publish on wip)'
$private = git log origin/wip/continue-later..wip/continue-later -- internal-ref-files .ctx examples 2>$null
if ($private) {
  Write-Warning 'Commits in range touch private paths — review before pushing:'
  Write-Host $private
}

Write-Host '==> Push wip/continue-later'
git checkout wip/continue-later
Invoke-Git push -u origin wip/continue-later

Write-Host '==> Publish main (unrelated histories: merge wip with wip winning)'
$mergeBranch = 'release-merge-temp'
if (-not (git rev-parse --verify $mergeBranch 2>$null)) {
  git checkout -B $mergeBranch origin/main
  git merge wip/continue-later -X theirs --allow-unrelated-histories -m 'merge: publish v5.1.0 release line onto main'
} else {
  git checkout $mergeBranch
  $wipTip = git rev-parse wip/continue-later
  $mergedWip = git merge-base --is-ancestor $wipTip HEAD 2>$null; if ($LASTEXITCODE -ne 0) {
    git merge wip/continue-later -X theirs -m 'merge: sync v5.1.0 release line onto main'
  }
}

$mainPrivate = git log origin/main..HEAD -- internal-ref-files .ctx examples
if ($mainPrivate) { throw 'Refusing to push main: commits would publish private paths.' }

Write-Host '==> Push main'
Invoke-Git push origin HEAD:main

$ver = node -p "require('./package.json').version"
$tag = "v$ver"
if ($tag -ne 'v5.1.0') { Write-Warning "package.json version is $ver (expected 5.1.0 for this script)." }

Write-Host "==> Tag and push $tag"
git tag -a $tag -m "AutomataLab $tag" -f
Invoke-Git push origin $tag -f

Write-Host '==> Push wiki'
if (-not (Test-Path '.wiki-worktree')) { throw 'Missing .wiki-worktree clone.' }
Push-Location .wiki-worktree
Invoke-Git push origin master
Pop-Location

Write-Host '==> Done. Watch GitHub Actions (Release workflow), then add SHA256 block to the release body per .github/RELEASING.md'
git checkout wip/continue-later
