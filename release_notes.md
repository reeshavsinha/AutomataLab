# AutomataLab v5.1.1 — Parser automaton graph fix

**Release date:** 2026-10-20 (tag `v5.1.1` on `main`)

## Summary

AutomataLab **v5.1.1** is a **bug-fix** release on the v5.1 line. It fixes Parser Studio’s **LR automaton graph**: layout, scrolling, zoom/fit/lock, column spacing, stub labels, canvas padding, and persisted arrangements after you drag states.

Installers and the desktop app use the same frontend as the web build (Tauri WebView).

## Fixed

- Automaton graph layout and finite canvas (scroll, pan, zoom, fit, lock, padding).
- Overlap between full state cards and shortened `→ State N` stub chips.
- Layout cache so manual arrangements are not reset when switching views.
- ResizeObserver loop messages no longer show as a blocking red overlay.

## Known limitations — Grammar / Parser → Machine Studio

Converting a **Type 2** grammar from Grammar Lab or Parser Studio to Machine Studio still has gaps:

| Target | Current behavior |
|--------|------------------|
| **NPDA** | Standard CFG→PDA construction; **multi-character terminals** (e.g. `id`) are not supported by the PDA simulator’s one-symbol read/pop rule. |
| **NLBA / TM** | Embeds the grammar and runs **bounded derivation search**; not a compiled linear-bounded or Turing machine with transition rules. |

**These conversion paths are incomplete and are under active development.** A fuller, consistent Grammar→Machine pipeline is planned for a **future update**.

## Upgrade

Download the latest build from [GitHub Releases](https://github.com/reeshavsinha/AutomataLab/releases/latest). Your `.autolab.json` files are unchanged.

Full technical list: [`CHANGELOG.md`](./CHANGELOG.md) § v5.1.1.
