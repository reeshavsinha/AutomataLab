// ============================================================
// Mealy / Moore transducer engine.
//
// Transducers consume input and emit output. They do not recognize a language:
// completion means every input symbol was processed, regardless of the state
// occupied at the end.
// ============================================================

import type {
  Automaton,
  Configuration,
  HistoryEntry,
  MachineDefinition,
  SimulationStatus,
  StepResult,
} from '../core/types'
import {
  buildConfig,
  consumedWindow,
  getStartState,
  getTransitionsOn,
  normalizeTransducerOutput,
  remainingWindow,
} from '../core/utils'

export class TransducerEngine implements Automaton {
  private readonly definition: MachineDefinition
  private currentStateId: string | null = null
  private inputChars: string[] = []
  private inputIndex = 0
  private status: SimulationStatus = 'idle'
  private history: HistoryEntry[] = []
  private outputTrace: string[] = []
  private lastOutput = ''

  constructor(definition: MachineDefinition) {
    this.definition = definition
  }

  initialize(input: string): void {
    const startState = getStartState(this.definition)
    if (!startState) {
      this.status = 'error'
      return
    }

    this.currentStateId = startState.id
    this.inputChars = input === '' ? [] : Array.from(input)
    this.inputIndex = 0
    this.status = 'running'
    this.history = []
    this.lastOutput = ''
    this.outputTrace = []

    // Moore emits its initial state output. A converted Mealy machine may
    // preserve an explicit initial output as well.
    const initialOutput = this.definition.type === 'MOORE'
      ? startState.output
      : this.definition.initialOutput
    const normalizedInitialOutput = normalizeTransducerOutput(initialOutput)
    if (normalizedInitialOutput !== '') {
      this.outputTrace.push(normalizedInitialOutput)
    }
  }

  step(): StepResult {
    if (this.status !== 'running' || this.currentStateId === null) {
      return this.makeResult(this.status === 'idle' ? 'stuck' : this.status, [], '', '')
    }

    if (this.inputIndex >= this.inputChars.length) {
      this.status = 'completed'
      return this.makeResult(
        this.status,
        [this.currentStateId],
        consumedWindow(this.inputChars, this.inputIndex),
        ''
      )
    }

    const symbol = this.inputChars[this.inputIndex]
    const consumed = consumedWindow(this.inputChars, this.inputIndex)
    const remaining = remainingWindow(this.inputChars, this.inputIndex + 1)
    const transitions = getTransitionsOn(this.definition.transitions, this.currentStateId, symbol)

    if (transitions.length === 0) {
      // A missing transition is an incomplete transduction, not a language
      // rejection. Preserve the output already produced and expose the error
      // state to the simulation UI.
      this.status = 'error'
      this.lastOutput = ''
      const entry: HistoryEntry = {
        step: this.history.length,
        fromStateIds: [this.currentStateId],
        toStateIds: [],
        symbol,
        transitionIds: [],
        status: this.status,
        output: '',
        outputTrace: [...this.outputTrace],
      }
      this.history.push(entry)
      return {
        status: this.status,
        activeStateIds: [],
        consumedInput: consumed + symbol,
        remainingInput: remaining,
        symbol,
        transitionIds: [],
        historyEntry: entry,
        configurations: [],
        stack: [],
        output: '',
        outputTrace: [...this.outputTrace],
      }
    }

    const transition = transitions[0]
    const fromStateId = this.currentStateId
    this.currentStateId = transition.to
    this.inputIndex++

    const destination = this.definition.states.find((state) => state.id === transition.to)
    const rawOutput = this.definition.type === 'MEALY'
      ? transition.output ?? ''
      : destination?.output ?? ''
    const output = normalizeTransducerOutput(rawOutput)
    this.lastOutput = output
    if (output !== '') this.outputTrace.push(output)

    let nextStatus: SimulationStatus = 'running'
    if (this.inputIndex >= this.inputChars.length) {
      nextStatus = 'completed'
    }
    this.status = nextStatus

    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: [fromStateId],
      toStateIds: [this.currentStateId],
      symbol,
      transitionIds: [transition.id],
      status: nextStatus,
      output,
      outputTrace: [...this.outputTrace],
    }
    this.history.push(entry)

    return {
      status: nextStatus,
      activeStateIds: [this.currentStateId],
      consumedInput: consumed + symbol,
      remainingInput: remaining,
      symbol,
      transitionIds: [transition.id],
      historyEntry: entry,
      configurations: this.configurations(nextStatus),
      stack: [],
      output,
      outputTrace: [...this.outputTrace],
    }
  }

  reset(): void {
    this.currentStateId = null
    this.inputChars = []
    this.inputIndex = 0
    this.status = 'idle'
    this.history = []
    this.outputTrace = []
    this.lastOutput = ''
  }

  getCurrentConfigurations(): Configuration[] {
    return this.currentStateId === null ? [] : this.configurations(this.status)
  }

  getExecutionHistory(): HistoryEntry[] {
    return [...this.history]
  }

  isAccepted(): boolean | null {
    // A Mealy/Moore machine produces a sequence; it has no language verdict.
    return null
  }

  getStatus(): SimulationStatus {
    return this.status
  }

  getOutputTrace(): string[] {
    return [...this.outputTrace]
  }

  private configurations(status: SimulationStatus): Configuration[] {
    if (this.currentStateId === null) return []
    const config = buildConfig({
      stateId: this.currentStateId,
      inputChars: this.inputChars,
      inputIndex: this.inputIndex,
      status,
    })
    return [{
      ...config,
      output: this.lastOutput,
      outputTrace: [...this.outputTrace],
    }]
  }

  private makeResult(
    status: SimulationStatus,
    stateIds: string[],
    consumed: string,
    remaining: string
  ): StepResult {
    const entry: HistoryEntry = {
      step: this.history.length,
      fromStateIds: stateIds,
      toStateIds: stateIds,
      symbol: '',
      transitionIds: [],
      status,
      output: '',
      outputTrace: [...this.outputTrace],
    }
    return {
      status,
      activeStateIds: stateIds,
      consumedInput: consumed,
      remainingInput: remaining,
      symbol: '',
      transitionIds: [],
      historyEntry: entry,
      configurations: this.configurations(status),
      stack: [],
      output: '',
      outputTrace: [...this.outputTrace],
    }
  }
}
