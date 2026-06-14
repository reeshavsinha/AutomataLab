// ============================================================
// AutomataLab — LBA Engine
// Linear-Bounded Automaton: a deterministic Turing machine whose tape head is
// confined to the region that initially held the input (plus the end-of-input
// blank used to detect the right boundary). Conceptually the tape is bracketed
// by end markers ⊢…⊣; the head may read the boundary cells but may not move
// past them — an out-of-bounds move halts-and-rejects (FR-8.5).
//
// Implemented as a bounded TMEngine: the ONLY behavioural difference is the
// head-movement limit set in `_setupBounds`. Everything else (read/write/move,
// acceptance, step-limit guard, snapshots) is inherited unchanged, so the same
// machine definition runs identically as a `TM` or an `LBA` as long as it stays
// within its linear space.
// ============================================================

import { TMEngine } from '../tm/TMEngine'

export class LBAEngine extends TMEngine {
  /**
   * Confine the head to the input region. Cells `0 … n-1` hold the input and
   * cell `n` is the trailing blank (the right end marker `⊣`), so the head may
   * occupy `[0, n]`. The left end marker `⊢` sits just before cell 0. Empty
   * input still grants a single usable cell (`[0, 0]`) so the machine can read
   * the blank and decide. Any move outside this window is rejected in `step()`.
   * (For a multi-tape LBA the same linear window bounds every tape's head.)
   */
  protected override _setupBounds(inputLength: number): void {
    this.leftBound = 0
    this.rightBound = Math.max(inputLength, 0)
  }
}
