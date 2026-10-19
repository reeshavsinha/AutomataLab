import { canConvertGrammarToMachine } from '../core/capabilities'
import type { GrammarFormat, MachineType } from '../core/types'
import { cfgToPda } from './cfgToPda'
import { grammarToRecognizer } from './grammarRecognizer'
import { regularGrammarToMachine, regexToRegularGrammar } from './regularGrammar'
import type { ConversionResult } from './types'

/**
 * Build a recognizer machine from Grammar Lab / Parser Studio text.
 * Throws when the format–target pair has no verified construction or validation fails.
 */
export function convertGrammarToMachine(
  text: string,
  format: GrammarFormat,
  target: MachineType,
): ConversionResult {
  const source = text.trim()
  if (!source) {
    throw new Error('Grammar text is empty.')
  }
  if (!canConvertGrammarToMachine(format, target)) {
    throw new Error(`No verified ${format.replace('_', ' ')} → ${target} construction is available.`)
  }

  if (format === 'REGEX' || format === 'TYPE_3') {
    const grammarText = format === 'REGEX' ? regexToRegularGrammar(source) : source
    return regularGrammarToMachine(grammarText, target)
  }

  if (format === 'TYPE_2' && target === 'NPDA') {
    return cfgToPda(source)
  }

  if ((format === 'TYPE_0' || format === 'TYPE_1' || format === 'TYPE_2') && (target === 'NLBA' || target === 'TM')) {
    const grammarFormat = format === 'TYPE_2' ? 'TYPE_2' : format
    return grammarToRecognizer(source, grammarFormat, target)
  }

  throw new Error(`No verified ${format.replace('_', ' ')} → ${target} construction is available.`)
}

/** Whether the UI should offer this target for the given grammar format. */
export function isGrammarToMachineTargetAvailable(
  format: GrammarFormat | undefined,
  target: MachineType,
): boolean {
  if (!format || !canConvertGrammarToMachine(format, target)) return false
  if (format === 'REGEX' || format === 'TYPE_3') return true
  if (format === 'TYPE_2' && target === 'NPDA') return true
  if ((format === 'TYPE_0' || format === 'TYPE_1' || format === 'TYPE_2') && (target === 'NLBA' || target === 'TM')) {
    return true
  }
  return false
}
