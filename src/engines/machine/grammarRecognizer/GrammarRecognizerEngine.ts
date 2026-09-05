import { findDerivation } from '@/engines/grammar/derivationSearch'
import { parseGeneralGrammarText, tokenizeInputString } from '@/engines/grammar/parser'
import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
} from '../core/types'

/**
 * Execution backend for a generated universal grammar recognizer. The grammar
 * is fixed in `compiledGrammarRecognizer`, while the current input remains the
 * machine input. A run performs bounded derivation search and reports an honest
 * `stuck` result if its resource budget is exhausted.
 */
export class GrammarRecognizerEngine implements Automaton {
  private readonly definition: MachineDefinition
  private status: SimulationStatus = 'idle'
  private input = ''
  private history: HistoryEntry[] = []
  private currentStateId = 'q_search'

  constructor(definition: MachineDefinition) {
    this.definition = definition
  }

  initialize(input: string): void {
    this.input = input
    this.status = this.definition.compiledGrammarRecognizer ? 'running' : 'error'
    this.history = []
    this.currentStateId = 'q_search'
  }

  step(): StepResult {
    if (this.status !== 'running') return this.result(this.status === 'idle' ? 'stuck' : this.status)
    const descriptor = this.definition.compiledGrammarRecognizer
    if (!descriptor) {
      this.status = 'error'
      return this.result('error')
    }
    try {
      const grammar = parseGeneralGrammarText(descriptor.sourceText, descriptor.sourceFormat)
      const target = tokenizeInputString(this.input, grammar.terminals)
      const search = findDerivation(grammar, target, {
        maxNodes: Math.max(1_000, this.definition.stepLimit ?? 20_000),
        maxTimeMs: 1_500,
      })
      this.status = search.status === 'FOUND'
        ? 'accepted'
        : search.status === 'NOT_FOUND_WITHIN_LIMIT'
          ? 'rejected'
          : 'stuck'
      this.currentStateId = this.status === 'accepted' ? 'q_accept' : this.status === 'rejected' ? 'q_reject' : 'q_search'
      this.history.push({
        step: 0,
        fromStateIds: ['q_search'],
        toStateIds: [this.currentStateId],
        symbol: `derive (${search.exploredNodes} forms)`,
        transitionIds: [],
        status: this.status,
      })
      return this.result(this.status)
    } catch {
      this.status = 'error'
      return this.result('error')
    }
  }

  reset(): void {
    this.status = 'idle'
    this.history = []
    this.currentStateId = 'q_search'
  }

  getCurrentConfigurations(): Configuration[] {
    return [{
      id: this.currentStateId,
      parentId: null,
      stateId: this.currentStateId,
      stack: [],
      inputIndex: 0,
      status: this.status,
      consumedInput: this.status === 'accepted' || this.status === 'rejected' ? this.input : '',
      remainingInput: this.status === 'running' ? this.input : '',
    }]
  }

  getExecutionHistory(): HistoryEntry[] {
    return [...this.history]
  }

  isAccepted(): boolean | null {
    return this.status === 'accepted' ? true : this.status === 'rejected' || this.status === 'stuck' ? false : null
  }

  getStatus(): SimulationStatus {
    return this.status
  }

  private result(status: SimulationStatus): StepResult {
    const historyEntry = this.history[this.history.length - 1] ?? {
      step: this.history.length,
      fromStateIds: [this.currentStateId],
      toStateIds: [this.currentStateId],
      symbol: '',
      transitionIds: [],
      status,
    }
    return {
      status,
      activeStateIds: [this.currentStateId],
      consumedInput: status === 'accepted' || status === 'rejected' ? this.input : '',
      remainingInput: status === 'running' ? this.input : '',
      symbol: '',
      transitionIds: [],
      historyEntry,
      configurations: this.getCurrentConfigurations(),
      stack: [],
    }
  }
}
