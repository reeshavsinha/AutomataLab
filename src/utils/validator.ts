// ============================================================
// Machine Validator
// Validates a machine definition before simulation starts.
// Returns structured errors and warnings.
// ============================================================

import type { MachineDefinition, ValidationError } from '@/engines/machine/core/types'
import { BLANK, isBlank, isEpsilon, isPDAType, isTMType, tmTapeOps } from '@/engines/machine/core/utils'

export function validateMachine(machine: MachineDefinition): ValidationError[] {
  const errors: ValidationError[] = []
  const isPDA = isPDAType(machine.type)
  const isTM = isTMType(machine.type)

  // ── FR-8.1: Exactly one start state ───────────────────────
  const startStates = machine.states.filter((s) => s.isStart && !s.isText)
  if (startStates.length === 0) {
    errors.push({
      severity: 'error',
      code: 'NO_START_STATE',
      message: 'No start state defined. Mark exactly one state as the start state.',
    })
  } else if (startStates.length > 1) {
    errors.push({
      severity: 'error',
      code: 'MULTIPLE_START_STATES',
      message: `Multiple start states found (${startStates.map((s) => s.label).join(', ')}). Only one is allowed.`,
    })
  }

  // ── FR-8.2: At least one accept state ─────────────────────
  const acceptStates = machine.states.filter((s) => s.isAccept && !s.isText)
  if (acceptStates.length === 0) {
    errors.push({
      severity: 'warning',
      code: 'NO_ACCEPT_STATE',
      message: 'No accept state defined. The machine will always reject.',
    })
  }

  // ── FR-8.3: DFA determinism check ─────────────────────────
  if (machine.type === 'DFA') {
    for (const state of machine.states.filter((s) => !s.isText)) {
      const symbolCount = new Map<string, number>()
      for (const t of machine.transitions) {
        if (t.from === state.id) {
          for (const sym of t.symbols) {
            symbolCount.set(sym, (symbolCount.get(sym) ?? 0) + 1)
          }
        }
      }
      for (const [sym, count] of symbolCount) {
        if (count > 1) {
          errors.push({
            severity: 'error',
            code: 'DFA_NONDETERMINISTIC',
            message: `State "${state.label}" has ${count} transitions on symbol "${sym}". DFA must be deterministic.`,
            stateId: state.id,
          })
        }
      }
      
      // Completeness is a *warning*, not an error: many curricula use partial
      // DFAs where a missing move is an implicit reject (a "trap"/dead state).
      // The run simply rejects when it can't move (UX audit #10).
      if (machine.alphabet && machine.alphabet.length > 0) {
        for (const sym of machine.alphabet) {
          if (!symbolCount.has(sym)) {
            errors.push({
              severity: 'warning',
              code: 'DFA_MISSING_TRANSITION',
              message: `State "${state.label}" has no move on "${sym}". A partial DFA rejects here (as if going to a trap state). Use "Complete DFA" to add an explicit trap.`,
              stateId: state.id,
            })
          }
        }
      }
    }
  }

  // ── FR-8.4: Unreachable state warnings ────────────────────
  if (machine.states.length > 0) {
    const reachable = new Set<string>()
    const startState = machine.states.find((s) => s.isStart)
    if (startState) {
      const queue = [startState.id]
      reachable.add(startState.id)
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const t of machine.transitions) {
          if (t.from === current && !reachable.has(t.to)) {
            reachable.add(t.to)
            queue.push(t.to)
          }
        }
      }
      for (const state of machine.states.filter((s) => !s.isText)) {
        if (!reachable.has(state.id)) {
          errors.push({
            severity: 'warning',
            code: 'UNREACHABLE_STATE',
            message: `State "${state.label}" is unreachable from the start state.`,
            stateId: state.id,
          })
        }
      }
    }
  }

  // ── Transition label check (finite automata only) ─────────
  // PDA and TM/LBA legitimately leave `symbols` empty (they use read/pop/push
  // and read/write/direction respectively), so this FA-only rule skips them.
  if (!isPDA && !isTM) {
    for (const t of machine.transitions) {
      const hasEpsilonSymbol = t.symbols.some(isEpsilon)
      if ((t.symbols.length === 0 || hasEpsilonSymbol) && machine.type !== 'ENFA') {
        errors.push({
          severity: 'error',
          code: 'EMPTY_TRANSITION_LABEL',
          message: `A transition contains an epsilon/lambda symbol or has no label. Only ε-NFA supports epsilon/lambda transitions.`,
          transitionId: t.id,
        })
      }
    }
  }

  // ── PDA-specific rules ─────────────────────────────────────
  if (isPDA) {
    validatePDA(machine, errors)
  }

  // ── TM/LBA-specific rules ──────────────────────────────────
  if (isTM) {
    validateTM(machine, errors)
  }

  return errors
}

// ─── PDA validation ──────────────────────────────────────────

function validatePDA(machine: MachineDefinition, errors: ValidationError[]): void {
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id

  for (const t of machine.transitions) {
    const read = t.read ?? ''
    if (read.length > 1 && !isEpsilon(read)) {
      errors.push({
        severity: 'error',
        code: 'PDA_BAD_READ',
        message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} has a multi-character read "${read}". A PDA can only read 1 character per step.`,
        transitionId: t.id,
      })
    }
    const pop = t.pop ?? ''
    if (pop.length > 1 && !isEpsilon(pop)) {
      errors.push({
        severity: 'error',
        code: 'PDA_BAD_POP',
        message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} pops multiple characters "${pop}". A PDA can only pop 1 character per step.`,
        transitionId: t.id,
      })
    }
  }

  // Stack alphabet Γ (when declared): pops/pushes should stay within it. These are
  // warnings — Γ is declarative and the engine doesn't constrain symbols (UX #7).
  const gamma = machine.stackAlphabet
  if (gamma && gamma.length > 0) {
    const gammaSet = new Set(gamma)
    for (const t of machine.transitions) {
      const pop = t.pop ?? ''
      if (!isEpsilon(pop) && !gammaSet.has(pop)) {
        errors.push({
          severity: 'warning',
          code: 'PDA_POP_NOT_IN_GAMMA',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} pops "${pop}", which isn't in the stack alphabet Γ.`,
          transitionId: t.id,
        })
      }
      const push = t.push ?? ''
      if (!isEpsilon(push)) {
        let pushSymbols: string[]
        if (push.includes(',')) {
          pushSymbols = push.split(',')
        } else if (gamma && gamma.includes(push)) {
          pushSymbols = [push]
        } else {
          pushSymbols = Array.from(push)
        }
        const bad = pushSymbols.find((sym) => !gammaSet.has(sym))
        if (bad !== undefined) {
          errors.push({
            severity: 'warning',
            code: 'PDA_PUSH_NOT_IN_GAMMA',
            message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} pushes "${bad}", which isn't in the stack alphabet Γ.`,
            transitionId: t.id,
          })
        }
      }
    }
  }

  // Determinism (DPDA only): no two moves from the same state may both apply.
  // Two moves conflict when they share the same read AND the same pop, OR when
  // one is an ε-read move whose pop overlaps a non-ε-read move's pop.
  if (machine.type === 'DPDA') {
    const byState = new Map<string, typeof machine.transitions>()
    for (const t of machine.transitions) {
      if (!byState.has(t.from)) byState.set(t.from, [])
      byState.get(t.from)!.push(t)
    }

    for (const [stateId, transitions] of byState) {
      const reported = new Set<string>()
      for (let i = 0; i < transitions.length; i++) {
        for (let j = i + 1; j < transitions.length; j++) {
          const a = transitions[i]
          const b = transitions[j]
          const aRead = a.read ?? ''
          const bRead = b.read ?? ''
          const aPop = a.pop ?? ''
          const bPop = b.pop ?? ''

          // Reads conflict if equal, or if either is ε (an ε-read move can fire
          // alongside any symbol-read move).
          const readsConflict = isEpsilon(aRead) || isEpsilon(bRead) || aRead === bRead
          // Pops conflict if equal, or if either is ε (ε-pop ignores the top).
          const popsConflict = isEpsilon(aPop) || isEpsilon(bPop) || aPop === bPop

          if (readsConflict && popsConflict) {
            const key = `${stateId}`
            if (!reported.has(key)) {
              reported.add(key)
              errors.push({
                severity: 'error',
                code: 'DPDA_NONDETERMINISTIC',
                message: `State "${labelFor(stateId)}" has conflicting moves that can fire on the same input and stack top. A DPDA must be deterministic — use NPDA for nondeterminism.`,
                stateId,
              })
            }
          }
        }
      }
    }
  }
}

// ─── TM / LBA validation ─────────────────────────────────────

function validateTM(machine: MachineDefinition, errors: ValidationError[]): void {
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id
  const blank = machine.blankSymbol || BLANK
  const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
  const multi = tapeCount > 1

  // Σ ∌ blank: the blank is a tape symbol, not an input symbol (UX audit #7).
  if ((machine.alphabet ?? []).some((s) => s === blank)) {
    errors.push({
      severity: 'warning',
      code: 'TM_BLANK_IN_SIGMA',
      message: `The blank symbol "${blank}" is in the input alphabet Σ. The blank is a tape symbol (Γ), not an input symbol.`,
    })
  }

  // Tape alphabet Γ (when declared): it must contain the blank and all of Σ, and
  // every read/write must stay within it. Warnings — Γ is declarative (UX #7).
  const gamma = machine.tapeAlphabet
  if (gamma && gamma.length > 0) {
    const gammaSet = new Set(gamma)
    if (!gammaSet.has(blank)) {
      errors.push({
        severity: 'warning',
        code: 'TM_BLANK_NOT_IN_GAMMA',
        message: `The tape alphabet Γ should include the blank symbol "${blank}".`,
      })
    }
    for (const sym of machine.alphabet ?? []) {
      if (sym !== blank && !gammaSet.has(sym)) {
        errors.push({
          severity: 'warning',
          code: 'SIGMA_NOT_IN_GAMMA',
          message: `Input symbol "${sym}" (Σ) isn't in the tape alphabet Γ. Every input symbol must be a tape symbol.`,
        })
      }
    }
    for (const t of machine.transitions) {
      const { reads, writes } = tmTapeOps(t, tapeCount)
      const bad = [...reads, ...writes].find((sym) => !isBlank(sym, blank) && !gammaSet.has(sym))
      if (bad !== undefined) {
        errors.push({
          severity: 'warning',
          code: 'TM_SYMBOL_NOT_IN_GAMMA',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} uses tape symbol "${bad}", which isn't in the tape alphabet Γ.`,
          transitionId: t.id,
        })
      }
    }
  }

  // Well-formed per-tape read/write (single symbol each) and valid head directions.
  for (const t of machine.transitions) {
    // A multi-tape transition must specify exactly one (read, write, direction)
    // per tape. Flag a malformed one and skip its per-cell checks.
    if (multi) {
      const okLen =
        Array.isArray(t.reads) && t.reads.length === tapeCount &&
        Array.isArray(t.writes) && t.writes.length === tapeCount &&
        Array.isArray(t.directions) && t.directions.length === tapeCount
      if (!okLen) {
        errors.push({
          severity: 'error',
          code: 'TM_TAPE_COUNT_MISMATCH',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} must specify ${tapeCount} read/write/direction entries — one per tape.`,
          transitionId: t.id,
        })
        continue
      }
    }

    const { reads, writes } = tmTapeOps(t, tapeCount)
    const rawDirs = multi ? t.directions ?? [] : [t.direction]
    const onEach = multi ? ' on each tape' : ''

    for (const read of reads) {
      if (!isBlank(read, blank) && read.length > 1) {
        errors.push({
          severity: 'error',
          code: 'TM_BAD_READ',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} reads "${read}". A TM reads a single tape symbol per move${onEach}.`,
          transitionId: t.id,
        })
      }
    }
    for (const write of writes) {
      if (!isBlank(write, blank) && write.length > 1) {
        errors.push({
          severity: 'error',
          code: 'TM_BAD_WRITE',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} writes "${write}". A TM writes a single tape symbol per move${onEach}.`,
          transitionId: t.id,
        })
      }
    }
    for (const d of rawDirs) {
      if (d !== 'L' && d !== 'R' && d !== 'S') {
        errors.push({
          severity: 'error',
          code: 'TM_BAD_DIRECTION',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} has no head direction. Choose L, R, or S${multi ? ' for each tape' : ''}.`,
          transitionId: t.id,
        })
      }
    }
  }

  // A state can't be both accept and reject.
  for (const s of machine.states.filter((st) => !st.isText)) {
    if (s.isAccept && s.isReject) {
      errors.push({
        severity: 'error',
        code: 'TM_ACCEPT_REJECT_CONFLICT',
        message: `State "${s.label}" is marked both accept and reject. Choose one.`,
        stateId: s.id,
      })
    }
  }

  // LBA note: the tape is bounded to the input region, unlike an unbounded TM.
  if (machine.type === 'LBA') {
    errors.push({
      severity: 'warning',
      code: 'LBA_BOUNDED_TAPE',
      message: 'LBA: the head is confined to the input cells (plus the trailing blank). A move past either end halts and rejects.',
    })
  }

  // Determinism: at most one move per (state, read-tuple). Our TM/LBA are
  // deterministic (NTM is deferred — it would reuse the computation-tree path).
  const byState = new Map<string, typeof machine.transitions>()
  for (const t of machine.transitions) {
    if (!byState.has(t.from)) byState.set(t.from, [])
    byState.get(t.from)!.push(t)
  }
  for (const [stateId, transitions] of byState) {
    const seen = new Map<string, number>()
    for (const t of transitions) {
      const { reads } = tmTapeOps(t, tapeCount)
      const key = reads.map((r) => (isBlank(r, blank) ? blank : r)).join('\u0001')
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    for (const [key, count] of seen) {
      if (count > 1) {
        const display = key.split('\u0001').join(', ')
        errors.push({
          severity: 'error',
          code: 'TM_NONDETERMINISTIC',
          message: `State "${labelFor(stateId)}" has ${count} moves reading "${display}". A deterministic TM allows only one move per tape-symbol${multi ? ' combination' : ''}.`,
          stateId,
        })
        break
      }
    }
  }
}

export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error')
}
