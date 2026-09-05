// ============================================================
// Machine Validator
// Validates a machine definition before simulation starts.
// Returns structured errors and warnings.
// ============================================================

import type { MachineDefinition, ValidationError } from '@/engines/machine/core/types'
import { BLANK, isBlank, isEpsilon, isPDAType, isTMType, isTransducerType, tmTapeOps, tmTrackOps } from '@/engines/machine/core/utils'

const symbolLength = (symbol: string): number => Array.from(symbol).length

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
  // Mealy/Moore machines are transducers, not recognizers. Their result is an
  // output sequence, so final-state acceptance is neither required nor used.
  if (acceptStates.length === 0 && !isTransducerType(machine.type)) {
    errors.push({
      severity: 'warning',
      code: 'NO_ACCEPT_STATE',
      message: 'No accept state defined. The machine will always reject.',
    })
  }

  // ── FR-8.3: deterministic transition check ────────────────
  if (machine.type === 'DFA' || machine.type === 'MEALY' || machine.type === 'MOORE') {
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
            code: machine.type === 'MEALY'
              ? 'MEALY_NONDETERMINISTIC'
              : machine.type === 'MOORE'
                ? 'MOORE_NONDETERMINISTIC'
                : 'DFA_NONDETERMINISTIC',
            message: `State "${state.label}" has ${count} transitions on symbol "${sym}". ${machine.type} must be deterministic.`,
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
              code: machine.type === 'MEALY'
                ? 'MEALY_MISSING_TRANSITION'
                : machine.type === 'MOORE'
                  ? 'MOORE_MISSING_TRANSITION'
                  : 'DFA_MISSING_TRANSITION',
              message: `State "${state.label}" has no move on "${sym}". A partial ${machine.type} stops with no output here.`,
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

  if (isTransducerType(machine.type)) {
    validateTransducer(machine, errors)
  }

  return errors
}

function validateTransducer(machine: MachineDefinition, errors: ValidationError[]): void {
  const outputAlphabet = new Set(machine.outputAlphabet ?? [])
  if (!machine.outputAlphabet || machine.outputAlphabet.length === 0) {
    errors.push({
      severity: 'warning',
      code: 'TRANSDUCER_NO_OUTPUT_ALPHABET',
      message: 'No output alphabet declared. Add Γ so output symbols can be checked.',
    })
  }

  if (machine.type === 'MEALY') {
    for (const transition of machine.transitions) {
      // An explicit empty/epsilon/lambda output is valid: it means this
      // transition emits no symbol. `undefined` still means the field is
      // missing altogether.
      if (transition.output === undefined) {
        errors.push({
          severity: 'error',
          code: 'MEALY_MISSING_OUTPUT',
          message: 'Every Mealy transition must define an output symbol or ε/λ for no output.',
          transitionId: transition.id,
        })
      } else if (outputAlphabet.size > 0 && !isEpsilon(transition.output.trim()) && !outputAlphabet.has(transition.output)) {
        errors.push({
          severity: 'warning',
          code: 'TRANSDUCER_OUTPUT_NOT_IN_GAMMA',
          message: `Output "${transition.output}" is not in the declared output alphabet Γ.`,
          transitionId: transition.id,
        })
      }
    }
  } else {
    for (const state of machine.states.filter((s) => !s.isText)) {
      // An explicit empty/epsilon/lambda output is valid for Moore states.
      if (state.output === undefined) {
        errors.push({
          severity: 'error',
          code: 'MOORE_MISSING_OUTPUT',
          message: 'Every Moore state must define an output symbol or ε/λ for no output, including the initial state.',
          stateId: state.id,
        })
      } else if (outputAlphabet.size > 0 && !isEpsilon(state.output.trim()) && !outputAlphabet.has(state.output)) {
        errors.push({
          severity: 'warning',
          code: 'TRANSDUCER_OUTPUT_NOT_IN_GAMMA',
          message: `Output "${state.output}" is not in the declared output alphabet Γ.`,
          stateId: state.id,
        })
      }
    }
  }
}

// ─── PDA validation ──────────────────────────────────────────

function validatePDA(machine: MachineDefinition, errors: ValidationError[]): void {
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id

  for (const t of machine.transitions) {
    const read = t.read ?? ''
    if (symbolLength(read) > 1 && !isEpsilon(read)) {
      errors.push({
        severity: 'error',
        code: 'PDA_BAD_READ',
        message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} has a multi-character read "${read}". A PDA can only read 1 character per step.`,
        transitionId: t.id,
      })
    }
    const pop = t.pop ?? ''
    if (symbolLength(pop) > 1 && !isEpsilon(pop)) {
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
  if (machine.type === 'MTM') {
    validateMultiTrackTM(machine, errors)
    return
  }
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id
  const blank = machine.blankSymbol || BLANK
  const tapeCount = Math.max(1, Math.floor(machine.tapeCount ?? 1) || 1)
  const multi = tapeCount > 1

  if (symbolLength(blank) !== 1) {
    errors.push({
      severity: 'error',
      code: 'TM_BAD_BLANK',
      message: `The blank "${blank}" must be exactly one tape symbol.`,
    })
  }

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
      if (!isBlank(read, blank) && symbolLength(read) > 1) {
        errors.push({
          severity: 'error',
          code: 'TM_BAD_READ',
          message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} reads "${read}". A TM reads a single tape symbol per move${onEach}.`,
          transitionId: t.id,
        })
      }
    }
    for (const write of writes) {
      if (!isBlank(write, blank) && symbolLength(write) > 1) {
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

  // TM/LBA are deterministic; NLBA deliberately branches when several moves
  // match the same read tuple.
  if (machine.type !== 'NLBA') {
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

  if (machine.type === 'TM') validateSubmachineContracts(machine, errors)
}

function validateSubmachineContracts(
  machine: MachineDefinition,
  errors: ValidationError[],
  path = machine.name || 'Root TM',
  ancestors = new Set<MachineDefinition>(),
  depth = 0,
): void {
  const children = machine.submachines ?? {}
  const depthLimit = Math.max(1, Math.min(16, machine.submachineDepthLimit ?? 16))
  if (depth > depthLimit) {
    errors.push({ severity: 'error', code: 'SUBMACHINE_DEPTH_LIMIT', message: `${path} exceeds its submachine depth limit of ${depthLimit}.` })
    return
  }
  if (ancestors.has(machine)) {
    errors.push({ severity: 'error', code: 'SUBMACHINE_CYCLE', message: `${path} contains a recursive embedded submachine reference.` })
    return
  }
  const nextAncestors = new Set(ancestors).add(machine)
  const parentTapeCount = Math.max(1, machine.tapeCount ?? 1)
  const parentBlank = machine.blankSymbol || BLANK

  for (const transition of machine.transitions) {
    if (!transition.submachineId) continue
    const child = children[transition.submachineId]
    if (!child) {
      errors.push({
        severity: 'error',
        code: 'SUBMACHINE_MISSING',
        message: `${path}: transition ${labelFor(machine, transition.from)} → ${labelFor(machine, transition.to)} calls missing child "${transition.submachineId}". Repair or remove the call.`,
        transitionId: transition.id,
      })
      continue
    }
    if (child.type !== 'TM') {
      errors.push({ severity: 'error', code: 'SUBMACHINE_UNSUPPORTED_TYPE', message: `${path}: child "${transition.submachineId}" must be a deterministic TM.`, transitionId: transition.id })
    }
    if (Math.max(1, child.tapeCount ?? 1) !== parentTapeCount || (child.blankSymbol || BLANK) !== parentBlank) {
      errors.push({ severity: 'error', code: 'SUBMACHINE_TAPE_CONTRACT', message: `${path}: child "${transition.submachineId}" must use the caller's ${parentTapeCount} tape(s) and blank "${parentBlank}".`, transitionId: transition.id })
    }
    const starts = child.states.filter((state) => state.isStart && !state.isText)
    if (starts.length !== 1) {
      errors.push({ severity: 'error', code: 'SUBMACHINE_START_STATE', message: `${path}: child "${transition.submachineId}" must define exactly one start state.`, transitionId: transition.id })
    }
    if (!child.states.some((state) => state.isAccept && !state.isText)) {
      errors.push({ severity: 'error', code: 'SUBMACHINE_NO_ACCEPT', message: `${path}: child "${transition.submachineId}" needs an accept state to return to its caller.`, transitionId: transition.id })
    }
  }

  for (const [id, child] of Object.entries(children)) {
    validateSubmachineContracts(child, errors, `${path} › ${id}`, nextAncestors, depth + 1)
  }
}

function labelFor(machine: MachineDefinition, id: string): string {
  return machine.states.find((state) => state.id === id)?.label ?? id
}

/** MTM validation deliberately does not reuse multi-tape validation: its vector
 * is one cell under one head, with a single movement direction. */
function validateMultiTrackTM(machine: MachineDefinition, errors: ValidationError[]): void {
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id
  const trackCount = Math.max(2, Math.floor(machine.trackCount ?? 2) || 2)
  const blanks = Array.from({ length: trackCount }, (_, index) => machine.trackBlanks?.[index] || machine.blankSymbol || BLANK)
  const alphabets = machine.trackAlphabets ?? []

  if (machine.tapeCount !== undefined && machine.tapeCount > 1) {
    errors.push({ severity: 'error', code: 'MTM_MULTIPLE_TAPES', message: 'A multi-track TM has one physical tape and one head; use a multi-tape TM for independent tapes.' })
  }
  for (let index = 0; index < trackCount; index++) {
    const blank = blanks[index]
    if (symbolLength(blank) !== 1) {
      errors.push({ severity: 'error', code: 'MTM_BAD_BLANK', message: `Track ${index + 1} blank "${blank}" must be one symbol.` })
    }
    const alphabet = alphabets[index]
    if (alphabet?.length && !alphabet.includes(blank)) {
      errors.push({ severity: 'warning', code: 'MTM_BLANK_NOT_IN_GAMMA', message: `Track ${index + 1} alphabet should include its blank "${blank}".` })
    }
  }
  const firstAlphabet = alphabets[0]
  if (firstAlphabet?.length) {
    for (const symbol of machine.alphabet ?? []) {
      if (!firstAlphabet.includes(symbol)) {
        errors.push({ severity: 'warning', code: 'MTM_INPUT_NOT_ON_TRACK_1', message: `Input symbol "${symbol}" isn't in track 1's alphabet.` })
      }
    }
  }

  const seenByState = new Map<string, Set<string>>()
  for (const transition of machine.transitions) {
    if (!Array.isArray(transition.trackReads) || transition.trackReads.length !== trackCount ||
        !Array.isArray(transition.trackWrites) || transition.trackWrites.length !== trackCount) {
      errors.push({
        severity: 'error',
        code: 'MTM_TRACK_COUNT_MISMATCH',
        message: `Transition ${labelFor(transition.from)} → ${labelFor(transition.to)} must specify ${trackCount} read and write symbols — one vector component per track.`,
        transitionId: transition.id,
      })
      continue
    }
    const { reads, writes, direction } = tmTrackOps(transition, trackCount, blanks)
    for (const [index, symbol] of [...reads, ...writes].entries()) {
      const track = index % trackCount
      if (symbolLength(symbol) !== 1) {
        errors.push({ severity: 'error', code: 'MTM_BAD_SYMBOL', message: `Transition ${labelFor(transition.from)} → ${labelFor(transition.to)} uses "${symbol}" on track ${track + 1}; each vector component must be one symbol.`, transitionId: transition.id })
      } else if (alphabets[track]?.length && !alphabets[track].includes(symbol)) {
        errors.push({ severity: 'warning', code: 'MTM_SYMBOL_NOT_IN_TRACK_ALPHABET', message: `Transition ${labelFor(transition.from)} → ${labelFor(transition.to)} uses "${symbol}", not declared for track ${track + 1}.`, transitionId: transition.id })
      }
    }
    if (!['L', 'R', 'S'].includes(transition.direction ?? '')) {
      errors.push({ severity: 'error', code: 'MTM_BAD_DIRECTION', message: `Transition ${labelFor(transition.from)} → ${labelFor(transition.to)} must select one shared head direction (L, R, or S).`, transitionId: transition.id })
    }
    const key = reads.join('\u0001')
    const seen = seenByState.get(transition.from) ?? new Set<string>()
    if (seen.has(key)) {
      errors.push({ severity: 'error', code: 'MTM_NONDETERMINISTIC', message: `State "${labelFor(transition.from)}" has multiple moves reading vector ⟨${reads.join(', ')}⟩.`, stateId: transition.from })
    }
    seen.add(key)
    seenByState.set(transition.from, seen)
  }
  for (const state of machine.states.filter((candidate) => !candidate.isText)) {
    if (state.isAccept && state.isReject) {
      errors.push({ severity: 'error', code: 'TM_ACCEPT_REJECT_CONFLICT', message: `State "${state.label}" is marked both accept and reject. Choose one.`, stateId: state.id })
    }
  }
}

export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error')
}
