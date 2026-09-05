// ============================================================
// Engine factory + headless runner.
// Single source of truth for "machine type → engine instance" and for running
// a machine on a string to completion without any UI. Used by the live
// simulation hook AND the batch / test-suite runner (UX audit #7).
// Pure TypeScript — zero React/UI dependencies.
// ============================================================

import { DFAEngine } from '../dfa/DFAEngine'
import { NFAEngine } from '../nfa/NFAEngine'
import { ENFAEngine } from '../enfa/ENFAEngine'
import { DPDAEngine } from '../dpda/DPDAEngine'
import { NPDAEngine } from '../npda/NPDAEngine'
import { TMEngine } from '../tm/TMEngine'
import { MultiTrackTMEngine } from '../multitrack/MultiTrackTMEngine'
import { HierarchicalTMEngine } from '../hierarchical/HierarchicalTMEngine'
import { LBAEngine } from '../lba/LBAEngine'
import { NLBAEngine } from '../nlba/NLBAEngine'
import { GrammarRecognizerEngine } from '../grammarRecognizer/GrammarRecognizerEngine'
import { TransducerEngine } from '../transducer/TransducerEngine'
import type { Automaton, MachineDefinition, SimulationStatus } from './types'

/** Construct the engine for a machine definition's type (defaults to DFA). */
export function createEngine(definition: MachineDefinition): Automaton {
  if (definition.compiledGrammarRecognizer) return new GrammarRecognizerEngine(definition)
  switch (definition.type) {
    case 'NFA':  return new NFAEngine(definition)
    case 'ENFA': return new ENFAEngine(definition)
    case 'DPDA': return new DPDAEngine(definition)
    case 'NPDA': return new NPDAEngine(definition)
    case 'TM':   return definition.transitions.some((transition) => transition.submachineId)
      ? new HierarchicalTMEngine(definition)
      : new TMEngine(definition)
    case 'MTM':  return new MultiTrackTMEngine(definition)
    case 'LBA':  return new LBAEngine(definition)
    case 'NLBA': return new NLBAEngine(definition)
    case 'MEALY':
    case 'MOORE': return new TransducerEngine(definition)
    default:     return new DFAEngine(definition)
  }
}

export interface RunOutcome {
  input: string
  status: SimulationStatus
  /** Recognizer verdict; null for transducers and runs that could not start. */
  accepted: boolean | null
  steps: number
  outputTrace?: string[]
  tapes?: import('./types').TapeSnapshot[]
  trace?: string[]
  limited?: boolean
}

/**
 * Run a fresh engine on one input to a halting state without touching any store.
 * `maxSteps` guards against a non-halting TM (the engine also self-limits via its
 * own step limit, but this is a hard ceiling for the batch loop).
 */
export function runToCompletion(
  definition: MachineDefinition,
  input: string,
  maxSteps = 100_000,
  options: { captureTrace?: boolean; captureTapes?: boolean } = {}
): RunOutcome {
  const engine = createEngine(definition)
  engine.initialize(input)
  if (engine.getStatus() === 'error') {
    return { input, status: 'error', accepted: null, steps: 0 }
  }

  let steps = 0
  while (engine.getStatus() === 'running' && steps < maxSteps) {
    engine.step()
    steps++
  }

  const status = engine.getStatus()
  const outputTrace = engine.getOutputTrace?.()
  const tapes = options.captureTapes ? engine.getCurrentConfigurations()[0]?.tapes : undefined
  const trace = options.captureTrace
    ? engine.getExecutionHistory().map((entry) => `${entry.status}:${entry.symbol}`)
    : undefined
  return {
    input,
    status,
    accepted: engine.isAccepted(),
    steps,
    ...(outputTrace ? { outputTrace } : {}),
    ...(tapes ? { tapes } : {}),
    ...(trace ? { trace } : {}),
    ...(status === 'stuck' || (status === 'running' && steps >= maxSteps) ? { limited: true } : {}),
  }
}
