import type { CFG } from '@/engines/grammar/types'
import { tokenizeInputString } from '@/engines/grammar/parser'
import { BacktrackingSimulation } from './backtracking'
import { CYKSimulation } from './cyk'
import { EarleySimulation } from './earley'
import { LL1Simulation } from './ll1Simulation'
import { LRSimulation } from './lrSimulation'
import type { ParserEngine, ParserModel, ParserStatus } from './model'

export type ParserAlgorithm = 'LL1' | 'LR0' | 'SLR1' | 'CLR1' | 'LALR1' | 'CYK' | 'EARLEY' | 'BACKTRACKING'

export interface ParserRunOutcome {
  input: string
  status: ParserStatus
  accepted: boolean | null
  steps: number
  limited: boolean
  trace?: string[]
  error?: string
}

/** Tokenize parser input using the grammar's longest declared terminal first. */
export function tokenizeParserInput(raw: string, cfg: CFG): string[] {
  return tokenizeInputString(raw, cfg.terminals)
}

export function createParserEngine(model: ParserModel, algorithm: ParserAlgorithm): ParserEngine {
  switch (algorithm) {
    case 'LL1': {
      const table = model.parsers.ll1.table
      if (!table || model.parsers.ll1.hasConflict) throw new Error('LL(1) table is unavailable or contains conflicts.')
      return new LL1Simulation(model.cfg, table)
    }
    case 'LR0': {
      const table = model.parsers.lr0.table
      if (!table || model.parsers.lr0.hasConflict) throw new Error('LR(0) table is unavailable or contains conflicts.')
      return new LRSimulation(model.cfg, table)
    }
    case 'SLR1': {
      const table = model.parsers.slr.table
      if (!table || model.parsers.slr.hasConflict) throw new Error('SLR(1) table is unavailable or contains conflicts.')
      return new LRSimulation(model.cfg, table)
    }
    case 'CLR1': {
      const table = model.parsers.clr.table
      if (!table || model.parsers.clr.hasConflict) throw new Error('CLR(1) table is unavailable or contains conflicts.')
      return new LRSimulation(model.cfg, table)
    }
    case 'LALR1': {
      const table = model.parsers.lalr.table
      if (!table || model.parsers.lalr.hasConflict) throw new Error('LALR(1) table is unavailable or contains conflicts.')
      return new LRSimulation(model.cfg, table)
    }
    case 'CYK':
      return new CYKSimulation(model.cfg)
    case 'EARLEY':
      return new EarleySimulation(model.cfg)
    case 'BACKTRACKING':
      return new BacktrackingSimulation(model.cfg)
  }
}

export function runParserCase(
  model: ParserModel,
  algorithm: ParserAlgorithm,
  input: string,
  maxSteps = 10_000
): ParserRunOutcome {
  try {
    const engine = createParserEngine(model, algorithm)
    engine.initialize(tokenizeParserInput(input, model.cfg))
    let steps = 0
    while (engine.status === 'running' && steps < maxSteps) {
      const progressed = engine.step()
      steps++
      if (!progressed && engine.status === 'running') {
        return {
          input,
          status: 'error',
          accepted: null,
          steps,
          limited: false,
          trace: engine.history.map((entry) => entry.actionTitle),
          error: 'Parser made no progress while still running.',
        }
      }
    }

    const limited = engine.status === 'running'
    const status: ParserStatus = limited ? 'error' : engine.status
    return {
      input,
      status,
      accepted: status === 'accepted' ? true : status === 'rejected' ? false : null,
      steps,
      limited,
      trace: engine.history.map((entry) => entry.actionTitle),
      ...(limited ? { error: `Parser exceeded the ${maxSteps.toLocaleString()}-step limit.` } : {}),
      ...(!limited && engine.errorMsg ? { error: engine.errorMsg } : {}),
    }
  } catch (error) {
    return {
      input,
      status: 'error',
      accepted: null,
      steps: 0,
      limited: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
