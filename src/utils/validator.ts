// ============================================================
// Machine Validator
// Validates a machine definition before simulation starts.
// Returns structured errors and warnings.
// ============================================================

import type { MachineDefinition, ValidationError } from '@/engines/core/types'
import { isEpsilon, isPDAType } from '@/engines/core/utils'

export function validateMachine(machine: MachineDefinition): ValidationError[] {
  const errors: ValidationError[] = []
  const isPDA = isPDAType(machine.type)

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
      
      // Check for missing transitions (DFA must be complete)
      if (machine.alphabet && machine.alphabet.length > 0) {
        for (const sym of machine.alphabet) {
          if (!symbolCount.has(sym)) {
            errors.push({
              severity: 'error',
              code: 'DFA_MISSING_TRANSITION',
              message: `State "${state.label}" is missing a transition for symbol "${sym}". DFA must have exactly one transition per alphabet symbol.`,
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
  if (!isPDA) {
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

  return errors
}

// ─── PDA validation ──────────────────────────────────────────

function validatePDA(machine: MachineDefinition, errors: ValidationError[]): void {
  const labelFor = (id: string) => machine.states.find((s) => s.id === id)?.label ?? id

  // Well-formed read/pop: each must denote at most a single symbol.
  for (const t of machine.transitions) {
    const read = t.read ?? ''
    const pop = t.pop ?? ''
    if (!isEpsilon(read) && read.length > 1) {
      errors.push({
        severity: 'error',
        code: 'PDA_BAD_READ',
        message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} reads "${read}". A PDA reads a single input symbol (or ε) per move.`,
        transitionId: t.id,
      })
    }
    if (!isEpsilon(pop) && pop.length > 1) {
      errors.push({
        severity: 'error',
        code: 'PDA_BAD_POP',
        message: `Transition ${labelFor(t.from)} → ${labelFor(t.to)} pops "${pop}". A PDA pops a single stack symbol (or ε) per move.`,
        transitionId: t.id,
      })
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

export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error')
}
