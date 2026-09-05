import { validateGrammarFormat } from '../../grammar/classification'
import { parseGeneralGrammarText } from '../../grammar/parser'
import type { GrammarFormat, MachineDefinition, MachineType } from '../core/types'
import { canConvertGrammarToMachine } from '../core/capabilities'
import type { ConversionResult } from './types'

/**
 * Build an executable high-power recognizer for a grammar. The source grammar
 * is retained as immutable machine metadata and executed with bounded
 * derivation search, so a resource limit reports `stuck` rather than a false
 * rejection. The visible three-state shell makes the universal-recognizer
 * boundary explicit instead of pretending it is a small rule-by-rule TM.
 */
export function grammarToRecognizer(
  text: string,
  format: Exclude<GrammarFormat, 'REGEX'>,
  target: Extract<MachineType, 'NLBA' | 'TM'>,
): ConversionResult {
  if (!canConvertGrammarToMachine(format, target)) {
    throw new Error(`${format.replace('_', ' ')} cannot be converted to ${target}.`)
  }
  const grammar = parseGeneralGrammarText(text, format)
  const validation = validateGrammarFormat(grammar, format)
  if (!validation.isValidForSelectedFormat) {
    throw new Error(validation.violations[0])
  }
  const result: MachineDefinition = {
    id: `grammar-${target.toLowerCase()}`,
    name: `${format.replace('_', ' ')} → ${target}`,
    type: target,
    language: `L(G), start symbol ${grammar.startSymbol}`,
    alphabet: [...grammar.terminals].sort(),
    grammarText: text,
    grammarFormat: format,
    compiledGrammarRecognizer: {
      sourceText: text,
      sourceFormat: format,
      strategy: 'bounded-derivation',
    },
    states: [
      { id: 'q_search', label: 'q_search', description: 'Universal bounded derivation recognizer.', x: 0, y: 0, isStart: true, isAccept: false },
      { id: 'q_accept', label: 'q_accept', description: 'A derivation of the input was found.', x: 220, y: -80, isStart: false, isAccept: true },
      { id: 'q_reject', label: 'q_reject', description: 'The bounded search exhausted reachable forms without a derivation.', x: 220, y: 80, isStart: false, isAccept: false, isReject: true },
    ],
    transitions: [],
    tapeAlphabet: [...grammar.terminals, '_'],
    blankSymbol: '_',
  }
  return {
    kind: 'grammar-to-recognizer',
    result,
    summary: [
      `Compiled ${format.replace('_', ' ')} source grammar into a ${target} recognizer shell.`,
      'Runs use bounded derivation search; resource exhaustion is reported as stuck, never rejection.',
    ],
    steps: [{
      title: 'Embed the grammar recognizer',
      detail: 'The original production system is retained by the generated universal recognizer and evaluated against its input.',
      addedStateIds: result.states.map((state) => state.id),
      addedTransitionIds: [],
    }],
  }
}
