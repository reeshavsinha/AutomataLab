import type { Configuration, MachineDefinition, TapeSnapshot } from '../core/types'

export type WatcherComparator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

export type WatcherCondition =
  | { kind: 'state'; stateId: string }
  | { kind: 'headSymbol'; tapeIndex: number; symbol: string; trackIndex?: number }
  | { kind: 'headPosition'; tapeIndex: number; comparator: WatcherComparator; position: number }
  | { kind: 'step'; comparator: WatcherComparator; step: number }
  | { kind: 'tapeWindow'; tapeIndex: number; start: number; pattern: string[]; trackIndex?: number }
  | { kind: 'group'; operator: 'AND' | 'OR'; children: WatcherCondition[] }

export interface TMWatcher {
  id: string
  label: string
  enabled: boolean
  predicate: WatcherCondition
}

export interface WatcherMatchContext {
  stepCount: number
  configuration: Configuration
}

export interface WatcherHit {
  watcherId: string
  watcherLabel: string
  summary: string
  stepCount: number
  configurationId: string
  stateId: string
}

function tapeAt(configuration: Configuration, tapeIndex: number): TapeSnapshot | undefined {
  return configuration.tapes?.[tapeIndex]
}

function compare(actual: number, comparator: WatcherComparator, expected: number): boolean {
  switch (comparator) {
    case 'eq': return actual === expected
    case 'neq': return actual !== expected
    case 'gt': return actual > expected
    case 'gte': return actual >= expected
    case 'lt': return actual < expected
    case 'lte': return actual <= expected
  }
}

function comparatorLabel(comparator: WatcherComparator): string {
  return ({ eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' } as const)[comparator]
}

function headPosition(tape: TapeSnapshot): number {
  return tape.left + tape.head
}

function tapeCellsForWatcher(tape: TapeSnapshot, trackIndex?: number): string[] {
  return tape.tracks?.[trackIndex ?? 0] ?? tape.cells
}

export function matchesWatcherCondition(condition: WatcherCondition, context: WatcherMatchContext): boolean {
  const { configuration, stepCount } = context
  switch (condition.kind) {
    case 'state':
      return configuration.stateId === condition.stateId
    case 'headSymbol': {
      const tape = tapeAt(configuration, condition.tapeIndex)
      return tape !== undefined && tapeCellsForWatcher(tape, condition.trackIndex)[tape.head] === condition.symbol
    }
    case 'headPosition': {
      const tape = tapeAt(configuration, condition.tapeIndex)
      return tape !== undefined && compare(headPosition(tape), condition.comparator, condition.position)
    }
    case 'step':
      return compare(stepCount, condition.comparator, condition.step)
    case 'tapeWindow': {
      const tape = tapeAt(configuration, condition.tapeIndex)
      if (!tape || condition.pattern.length === 0) return false
      const offset = condition.start - tape.left
      const cells = tapeCellsForWatcher(tape, condition.trackIndex)
      if (offset < 0 || offset + condition.pattern.length > cells.length) return false
      return condition.pattern.every((symbol, index) => cells[offset + index] === symbol)
    }
    case 'group':
      return condition.operator === 'AND'
        ? condition.children.every((child) => matchesWatcherCondition(child, context))
        : condition.children.some((child) => matchesWatcherCondition(child, context))
  }
}

export function findWatcherHit(
  watchers: readonly TMWatcher[],
  configurations: readonly Configuration[],
  stepCount: number,
): WatcherHit | null {
  for (const watcher of watchers) {
    if (!watcher.enabled) continue
    for (const configuration of configurations) {
      if (!matchesWatcherCondition(watcher.predicate, { configuration, stepCount })) continue
      return {
        watcherId: watcher.id,
        watcherLabel: watcher.label,
        summary: summarizeWatcherCondition(watcher.predicate),
        stepCount,
        configurationId: configuration.id,
        stateId: configuration.stateId,
      }
    }
  }
  return null
}

export function validateWatcherCondition(
  condition: WatcherCondition,
  machine: Pick<MachineDefinition, 'states' | 'tapeCount'> & Partial<Pick<MachineDefinition, 'type' | 'trackCount'>>,
  path = 'Condition',
): string[] {
  const errors: string[] = []
  const tapeCount = Math.max(1, machine.tapeCount ?? 1)
  const validTape = (index: number) => Number.isInteger(index) && index >= 0 && index < tapeCount
  const trackCount = machine.type === 'MTM' ? Math.max(2, machine.trackCount ?? 2) : 1
  const checkTape = (index: number) => {
    if (!validTape(index)) errors.push(`${path}: tape ${index + 1} is outside the machine's ${tapeCount} tape(s).`)
  }
  const finiteInteger = (value: number, field: string) => {
    if (!Number.isFinite(value) || !Number.isInteger(value)) errors.push(`${path}: ${field} must be an integer.`)
  }
  const checkTrack = (trackIndex: number | undefined) => {
    if (trackIndex !== undefined && (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= trackCount)) {
      errors.push(`${path}: track ${trackIndex + 1} is outside the machine's ${trackCount} track(s).`)
    }
  }

  switch (condition.kind) {
    case 'state':
      if (!machine.states.some((state) => state.id === condition.stateId)) errors.push(`${path}: selected state no longer exists.`)
      break
    case 'headSymbol':
      checkTape(condition.tapeIndex)
      checkTrack(condition.trackIndex)
      if (!condition.symbol) errors.push(`${path}: head symbol cannot be empty.`)
      break
    case 'headPosition':
      checkTape(condition.tapeIndex)
      finiteInteger(condition.position, 'head position')
      break
    case 'step':
      finiteInteger(condition.step, 'step number')
      if (condition.step < 0) errors.push(`${path}: step number cannot be negative.`)
      break
    case 'tapeWindow':
      checkTape(condition.tapeIndex)
      checkTrack(condition.trackIndex)
      finiteInteger(condition.start, 'window start')
      if (condition.pattern.length === 0 || condition.pattern.some((symbol) => !symbol)) {
        errors.push(`${path}: tape window needs one or more non-empty symbols.`)
      }
      break
    case 'group':
      if (condition.children.length < 2) errors.push(`${path}: an ${condition.operator} group needs at least two conditions.`)
      condition.children.forEach((child, index) => errors.push(...validateWatcherCondition(child, machine, `${path}.${index + 1}`)))
      break
  }
  return errors
}

export function summarizeWatcherCondition(condition: WatcherCondition): string {
  switch (condition.kind) {
    case 'state': return `state is ${condition.stateId}`
    case 'headSymbol': return `${condition.trackIndex !== undefined ? `track ${condition.trackIndex + 1} of ` : ''}tape ${condition.tapeIndex + 1} head is "${condition.symbol}"`
    case 'headPosition': return `tape ${condition.tapeIndex + 1} head ${comparatorLabel(condition.comparator)} ${condition.position}`
    case 'step': return `step ${comparatorLabel(condition.comparator)} ${condition.step}`
    case 'tapeWindow': return `${condition.trackIndex !== undefined ? `track ${condition.trackIndex + 1} of ` : ''}tape ${condition.tapeIndex + 1} at ${condition.start} is ${condition.pattern.join(' ')}`
    case 'group':
      return `(${condition.children.map(summarizeWatcherCondition).join(` ${condition.operator} `)})`
  }
}
