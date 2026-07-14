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
import { LBAEngine } from '../lba/LBAEngine'
import type { Automaton, MachineDefinition, SimulationStatus } from './types'

/** Construct the engine for a machine definition's type (defaults to DFA). */
export function createEngine(definition: MachineDefinition): Automaton {
  switch (definition.type) {
    case 'NFA':  return new NFAEngine(definition)
    case 'ENFA': return new ENFAEngine(definition)
    case 'DPDA': return new DPDAEngine(definition)
    case 'NPDA': return new NPDAEngine(definition)
    case 'TM':   return new TMEngine(definition)
    case 'LBA':  return new LBAEngine(definition)
    default:     return new DFAEngine(definition)
  }
}

export interface RunOutcome {
  input: string
  status: SimulationStatus
  /** true = accepted, false = rejected/stuck, null = could not run (error). */
  accepted: boolean | null
  steps: number
}

/**
 * Run a fresh engine on one input to a halting state without touching any store.
 * `maxSteps` guards against a non-halting TM (the engine also self-limits via its
 * own step limit, but this is a hard ceiling for the batch loop).
 */
export function runToCompletion(
  definition: MachineDefinition,
  input: string,
  maxSteps = 100_000
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
  return { input, status, accepted: engine.isAccepted(), steps }
}
