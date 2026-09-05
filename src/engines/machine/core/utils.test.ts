import { describe, expect, it } from 'vitest'
import { parseMealyLabel } from './utils'

describe('Mealy edge labels', () => {
  it('parses input/output notation as pairs instead of input symbols', () => {
    expect(parseMealyLabel('0 / 1')).toEqual([{ input: '0', output: '1' }])
    expect(parseMealyLabel('0 / 1, 1 / 0')).toEqual([
      { input: '0', output: '1' },
      { input: '1', output: '0' },
    ])
  })

  it('rejects incomplete pairs', () => {
    expect(parseMealyLabel('0 / 1, / / 1')).toBeNull()
  })
})
