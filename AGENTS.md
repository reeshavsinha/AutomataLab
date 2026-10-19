# AGENTS.md

<!-- Adapter and standing contract. Project conventions belong in `.ctx/`.
     What lives here is only what must be known without following a pointer
     first — see "Why it's built this way" in .ctx/README.md. -->

Agent context for this project lives in **`.ctx/`**.

## At session start

1. `.ctx/core.md` — verify commands, hard rules, what you may and may not do.
2. `.ctx/handoff.md` — where the last session stopped, and what it already ruled out.
3. `.ctx/index.md` — the inventory of every context file and when each applies.
   **This is the list. Consult it rather than guessing what exists.**

If the user says something short and specific like `catchup`, `park`, `reindex`,
`refresh context`, `gotcha`, or `give @.ctx/git.md`, it's a named operation —
check `.ctx/manual.md` before interpreting it literally.

Treat any `.ctx/` file that still contains `<FILL>`, or is otherwise an unfilled
template, as absent unless `.ctx/index.md` describes it as filled for this repo.
Say so before relying on it.

## Bookkeeping

Two things are required. Everything else is available when it helps, and you
should not feel obliged to write in every file on every task — a long list of
duties competes for attention at exactly the moment attention is scarcest, and
the result is four half-maintained files instead of one trustworthy one.

**Required**

1. **Update `.ctx/handoff.md` before you finish, and before any compaction or
   `/clear`.** Current task, the single next concrete step, and anything you
   tried that didn't work. The dead ends matter most; without them the next
   session repeats them. If you can see the context filling up, write it *now* —
   the end of the session may not arrive cleanly.
2. **For work over about three steps, keep `.ctx/work/<slug>/plan.md`** with a
   task checklist, ticked off as you go. `handoff.md` holds one next action by
   design, so a multi-step plan that lives only in the conversation dies with it.

**When it helps — judgement, not duty**

- Something surprising about the code, especially something that looks pointless
  but isn't → `.ctx/gotchas.md`, with a reproduction.
- Work you noticed but shouldn't do now, or anything the user asks you to queue
  → `.ctx/inbox/`, rather than widening your diff. **You write the item and
  draft its acceptance criteria** from what they said, then show them for a
  one-word confirmation. Never mark your own draft `ready`; see
  `.ctx/inbox/README.md`.
- A session worth remembering — a real dead end, an unobvious fix → a note in
  `.ctx/sessions/`. Routine work doesn't need one.
- The same lesson for the third time → promote it out of `sessions/` into
  `gotchas.md`, `rules/`, or `core.md`, and say where you put it.
- A new context file → add a row to `.ctx/index.md`, or it will never be read.

**Always true**

- Where a context file contradicts the code, **the code wins.** Say the doc is
  stale. Only touch its `verified:` date if you actually checked it.
- Keep `.ctx/core.md` short. Area-specific detail belongs in `.ctx/rules/`.
- Don't claim you did bookkeeping you didn't do. An inaccurate handoff is worse
  than a missing one, because the next session will believe it.

`.ctx/README.md` explains why these rules exist and how the three tiers work.
`.ctx/playbooks/refresh-context.md` is how the files get pruned and re-verified.

## Precedence

When instructions conflict, the more specific and more local source wins:

1. `.ctx/core.md` and `.ctx/rules/` — this project's rules.
2. Your personal global config (`~/.claude/CLAUDE.md`, `~/.cursor/rules`, etc.).
3. Installed skills, plugins, and general best practice — see
   `.ctx/skills/README.md` for what's registered and the known conflicts.

Don't silently pick a side — say which instruction you followed and what it
overrode. And where a doc contradicts the code, the code wins: flag the doc as
stale rather than "fixing" the code to match it.

## Hard stops

Universal rules, kept here rather than in `.ctx/core.md` because this file loads
without a pointer having to be followed. `core.md` carries only the stops that
are specific to this project.

- Do not stage, commit, push, or force-push unless the user explicitly approves
  that specific operation. Read-only Git inspection is allowed when needed.
  Destructive Git operations also require explicit user approval. Do not consult
  `.ctx/git.md` while it is an unfilled template.
- Never add, upgrade, or remove a dependency without asking first.
- Never weaken, skip, or delete a test to make a suite pass. Report the failure.
- Never edit generated files, lockfiles, vendored code, or an applied migration.
- Never write a secret, token, or real credential into a file.
- Never run a destructive command (`rm -rf`, `git reset --hard`, `DROP`,
  anything against production) without explicit confirmation.
- Never read, write, or summarise `.ctx/scratchpad.md` — it's the human's.
- Never build from `.ctx/product/brainstorm.md`; those ideas aren't agreed yet.
- Workflow D20 and workflow D21 — the process entries, which reuse earlier IDs —
  stand: do not commit the git-ignored internal reference documents, and do not
  add instructions that load them automatically. The user selects those
  documents manually.

## Before you finish

Run the verify commands in `.ctx/core.md`, and say what you ran and what it
returned. Then update the handoff. A task isn't done because the code works —
it's done when the next session can pick up from where you stopped.
