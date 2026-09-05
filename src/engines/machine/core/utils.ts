// ============================================================
// AutomataLab — Engine Utilities
// Pure functions with no side effects. Used by all engines.
// ============================================================

import type {
  AutomataState,
  Configuration,
  MachineDefinition,
  SimulationStatus,
  Transition,
} from './types'

/** Normalize a symbol — empty string and 'ε' both represent epsilon */
export const EPSILON = 'ε'

export function isEpsilon(symbol: string | undefined): boolean {
  return symbol === undefined || symbol === '' || symbol === EPSILON || symbol === 'eps' || symbol === 'epsilon' || symbol === 'λ' || symbol === 'lambda'
}

/** Canonical transducer output: every epsilon/lambda spelling means no output. */
export function normalizeTransducerOutput(value: string | null | undefined): string {
  const output = value?.trim() ?? ''
  return isEpsilon(output) ? '' : output
}

/** The default Turing-machine blank tape symbol. */
export const BLANK = '_'

/**
 * Whether a read/write field denotes the blank symbol. An empty/omitted field
 * is treated as blank (a TM always reads/writes exactly one tape symbol).
 */
export function isBlank(symbol: string | undefined, blank: string = BLANK): boolean {
  return symbol === undefined || symbol === '' || symbol === blank
}

export const FA_TYPES = ['DFA', 'NFA', 'ENFA'] as const

export function isFAType(type: string): boolean {
  return (FA_TYPES as readonly string[]).includes(type)
}

export const TRANSDUCER_TYPES = ['MEALY', 'MOORE'] as const

export function isTransducerType(type: string): boolean {
  return (TRANSDUCER_TYPES as readonly string[]).includes(type)
}

/**
 * Parse the compact Mealy edge notation used on the canvas. Each comma
 * separated entry is an input/output pair, for example `0 / 1, 1 / 0`.
 * Keeping this parser here prevents the slash from being treated as another
 * input symbol by generic FA label parsing.
 */
export function parseMealyLabel(value: string): Array<{ input: string; output: string }> | null {
  const pairs = value
    .split(',')
    .map((part) => {
      const separator = part.indexOf('/')
      if (separator < 0) return null
      const input = part.slice(0, separator).trim()
      const output = part.slice(separator + 1).trim()
      return input && output ? { input, output } : null
    })
  if (pairs.length === 0 || pairs.some((pair) => pair === null)) return null
  return pairs as Array<{ input: string; output: string }>
}

/**
 * Machine types backed by a stack. `'NPDA'` is listed ahead of its engine so
 * the PDA-aware UI/validator branches light up the moment the type is added.
 * This is the single source of truth — do not redeclare it elsewhere.
 */
export const PDA_TYPES = ['DPDA', 'NPDA'] as const

export function isPDAType(type: string): boolean {
  return (PDA_TYPES as readonly string[]).includes(type)
}

/**
 * Machine types that explore multiple branches and therefore have a
 * computation tree to visualise. Single source of truth gating the tree tab /
 * panel, mirroring `PDA_TYPES`/`isPDAType`.
 */
export const NONDETERMINISTIC_TYPES = ['NFA', 'ENFA', 'NPDA'] as const

export function supportsComputationTree(type: string): boolean {
  return (NONDETERMINISTIC_TYPES as readonly string[]).includes(type)
}

/**
 * Tape-backed machine types. `'LBA'` is a bounded TM. Single source of truth
 * gating the tape UI / TM validator branches, mirroring `PDA_TYPES`/`isPDAType`.
 */
export const TM_TYPES = ['TM', 'MTM', 'LBA', 'NLBA'] as const

export function isTMType(type: string): boolean {
  return (TM_TYPES as readonly string[]).includes(type)
}

/**
 * Format a PDA transition for display as `read, pop → push`, rendering any
 * epsilon (empty/undefined) component as ε. Pure: no UI imports.
 */
export function formatPdaLabel(read?: string, pop?: string, push?: string): string {
  const r = isEpsilon(read) ? EPSILON : read
  const p = isEpsilon(pop) ? EPSILON : pop
  const u = isEpsilon(push) ? EPSILON : push
  return `${r}, ${p} → ${u}`
}

/**
 * Format a TM/LBA transition for display as `read → write, dir`, rendering any
 * blank (empty/undefined) read/write component as the blank glyph. Pure: no UI
 * imports.
 */
export function formatTmLabel(read?: string, write?: string, direction?: string, blank: string = BLANK): string {
  const r = isBlank(read, blank) ? blank : read
  const w = isBlank(write, blank) ? blank : write
  const d = direction === 'L' || direction === 'R' || direction === 'S' ? direction : 'S'
  return `${r} → ${w}, ${d}`
}

export type TapeDir = 'L' | 'R' | 'S'

/** Coerce an arbitrary value to a valid head direction, defaulting to 'S' (stay). */
export function normalizeDir(d: string | undefined): TapeDir {
  return d === 'L' || d === 'R' || d === 'S' ? d : 'S'
}

/**
 * Resolve a (possibly multi-tape) TM transition into per-tape read/write/direction
 * arrays of length `tapeCount`. Single-tape (count 1) uses the scalar
 * `read`/`write`/`direction` fields; multi-tape uses the `reads`/`writes`/`directions`
 * arrays, falling back to the scalar fields for tape 0 so a single-tape transition
 * upgraded to multi-tape still has a sensible first column. Missing cells become ''
 * (blank) / 'S'. Single source of truth for the engine, validator, and label code.
 */
export function tmTapeOps(
  t: Pick<Transition, 'read' | 'write' | 'direction' | 'reads' | 'writes' | 'directions'>,
  tapeCount: number
): { reads: string[]; writes: string[]; directions: TapeDir[] } {
  const n = Math.max(1, Math.floor(tapeCount) || 1)
  if (n === 1) {
    return { reads: [t.read ?? ''], writes: [t.write ?? ''], directions: [normalizeDir(t.direction)] }
  }
  const reads: string[] = []
  const writes: string[] = []
  const directions: TapeDir[] = []
  for (let i = 0; i < n; i++) {
    reads.push(t.reads?.[i] ?? (i === 0 ? t.read ?? '' : ''))
    writes.push(t.writes?.[i] ?? (i === 0 ? t.write ?? '' : ''))
    directions.push(normalizeDir(t.directions?.[i] ?? (i === 0 ? t.direction : undefined)))
  }
  return { reads, writes, directions }
}

/**
 * Format a (possibly multi-tape) TM/LBA transition. Single-tape → `a → b, R`;
 * multi-tape → per-tape segments joined with ` | ` (e.g. `a → b, R | _ → c, L`).
 */
export function formatTmTransition(
  t: Pick<Transition, 'read' | 'write' | 'direction' | 'reads' | 'writes' | 'directions' | 'submachineId'>,
  tapeCount: number,
  blank: string = BLANK
): string {
  const { reads, writes, directions } = tmTapeOps(t, tapeCount)
  const move = reads.map((r, i) => formatTmLabel(r, writes[i], directions[i], blank)).join(' | ')
  return t.submachineId ? `${move} · call ${t.submachineId}` : move
}

/** Resolve one multi-track move. Vector components are tracks at a single
 * physical head, so direction remains scalar and never uses `directions[]`. */
export function tmTrackOps(
  transition: Pick<Transition, 'trackReads' | 'trackWrites' | 'direction'>,
  trackCount: number,
  blanks: string[],
): { reads: string[]; writes: string[]; direction: TapeDir } {
  const count = Math.max(2, Math.floor(trackCount) || 2)
  return {
    reads: Array.from({ length: count }, (_, index) => transition.trackReads?.[index] ?? blanks[index] ?? BLANK),
    writes: Array.from({ length: count }, (_, index) => transition.trackWrites?.[index] ?? blanks[index] ?? BLANK),
    direction: normalizeDir(transition.direction),
  }
}

/** Format a multi-track vector move distinctly from independent multi-tape moves. */
export function formatMultiTrackTransition(
  transition: Pick<Transition, 'trackReads' | 'trackWrites' | 'direction'>,
  trackCount: number,
  blanks: string[],
): string {
  const { reads, writes, direction } = tmTrackOps(transition, trackCount, blanks)
  return `⟨${reads.join(', ')}⟩ → ⟨${writes.join(', ')}⟩, ${direction}`
}

/** Get all transitions leaving a given state */
export function getTransitionsFrom(
  transitions: Transition[],
  stateId: string
): Transition[] {
  return transitions.filter((t) => t.from === stateId)
}

/** Get all transitions from a state on a given input symbol (non-epsilon) */
export function getTransitionsOn(
  transitions: Transition[],
  stateId: string,
  symbol: string
): Transition[] {
  return transitions.filter(
    (t) => t.from === stateId && t.symbols.some((s) => s === symbol)
  )
}

/** Compute ε-closure of a set of state IDs */
export function epsilonClosure(
  stateIds: Set<string>,
  transitions: Transition[]
): Set<string> {
  const closure = new Set<string>(stateIds)
  const stack = [...stateIds]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const t of transitions) {
      if (t.from === current && t.symbols.some(isEpsilon)) {
        if (!closure.has(t.to)) {
          closure.add(t.to)
          stack.push(t.to)
        }
      }
    }
  }

  return closure
}

/** Move: compute the set of states reachable from a set of states on a symbol */
export function move(
  stateIds: Set<string>,
  symbol: string,
  transitions: Transition[]
): Set<string> {
  const result = new Set<string>()
  for (const stateId of stateIds) {
    for (const t of transitions) {
      if (t.from === stateId && t.symbols.includes(symbol) && !isEpsilon(symbol)) {
        result.add(t.to)
      }
    }
  }
  return result
}

/** Get state by id */
export function getState(
  states: AutomataState[],
  id: string
): AutomataState | undefined {
  return states.find((s) => s.id === id)
}

/** Get the start state of a machine */
export function getStartState(
  definition: MachineDefinition
): AutomataState | undefined {
  return definition.states.find((s) => s.isStart)
}

/** Check if any state in a set is an accept state */
export function hasAcceptState(
  stateIds: Set<string>,
  states: AutomataState[]
): boolean {
  return [...stateIds].some((id) => {
    const state = states.find((s) => s.id === id)
    return state?.isAccept ?? false
  })
}

/** Generate a unique ID */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Display-only cap (in characters) for the consumed/remaining input strings the
 * engines surface to the panels. Materialising the FULL input as a string on
 * every step — and, for nondeterministic engines, for every active branch — is
 * O(n) work per step, i.e. O(n²) over a run, which freezes the UI on large
 * inputs (the per-step cost grows as the head advances). Panels only ever render
 * a neighbourhood of the head, so the engines emit a bounded window instead.
 * Inputs shorter than this are unaffected (the strings are byte-identical).
 */
export const IO_WINDOW = 256

/** Consumed-input string ending at `idx`, capped to the last `IO_WINDOW` chars. */
export function consumedWindow(inputChars: string[], idx: number): string {
  const clamped = idx < 0 ? 0 : idx > inputChars.length ? inputChars.length : idx
  const start = clamped > IO_WINDOW ? clamped - IO_WINDOW : 0
  return inputChars.slice(start, clamped).join('')
}

/** Remaining-input string from `idx`, capped to the next `IO_WINDOW` chars. */
export function remainingWindow(inputChars: string[], idx: number): string {
  const clamped = idx < 0 ? 0 : idx > inputChars.length ? inputChars.length : idx
  const end = clamped + IO_WINDOW < inputChars.length ? clamped + IO_WINDOW : inputChars.length
  return inputChars.slice(clamped, end).join('')
}

/**
 * Build a per-branch Configuration. `inputChars` + `inputIndex` are used to
 * derive the consumed/remaining input strings so panels don't need the raw
 * input. For finite automata the stack is empty and there is no branch lineage
 * (parentId defaults to null, id defaults to the stateId, which is unique
 * within a powerset of active states).
 */
export function buildConfig(params: {
  stateId: string
  inputChars: string[]
  inputIndex: number
  status: SimulationStatus
  stack?: string[]
  parentId?: string | null
  id?: string
}): Configuration {
  const { stateId, inputChars, inputIndex, status } = params
  return {
    id: params.id ?? stateId,
    parentId: params.parentId ?? null,
    stateId,
    stack: params.stack ?? [],
    inputIndex,
    status,
    consumedInput: consumedWindow(inputChars, inputIndex),
    remainingInput: remainingWindow(inputChars, inputIndex),
  }
}
