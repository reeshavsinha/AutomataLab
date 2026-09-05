import { describe, expect, it } from 'vitest'
import { runToCompletion } from '../core/engineFactory'
import { grammarToRecognizer } from './grammarRecognizer'

describe('high-power grammar recognizer constructions', () => {
  it('runs a Type 1 grammar through the generated NLBA recognizer', () => {
    const result = grammarToRecognizer('S -> A\nA B -> A B\nA -> a', 'TYPE_1', 'NLBA').result
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return

    expect(runToCompletion(result, 'a').accepted).toBe(true)
  })

  it('keeps Type 0 resource exhaustion distinct from rejection', () => {
    const result = grammarToRecognizer('S -> S | a', 'TYPE_0', 'TM').result
    expect(typeof result).not.toBe('string')
    if (typeof result === 'string') return

    expect(runToCompletion(result, 'a').accepted).toBe(true)
    expect(runToCompletion(result, 'b').accepted).toBe(false)
  })
})
