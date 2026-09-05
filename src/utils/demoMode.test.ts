import { describe, expect, it } from 'vitest'
import type { MachineDefinition } from '@/engines/machine/core/types'
import { runToCompletion } from '@/engines/machine/core/engineFactory'
import { validateMachine, hasBlockingErrors } from '@/utils/validator'
import { EXAMPLES } from '@/utils/examples'
import {
  DEMO_EXAMPLE_KEYS,
  DEMO_MACHINE_TYPES,
  hasDemoModeQuery,
} from '@/utils/demoMode'

describe('hosted demo feature boundary', () => {
  it('recognizes only an explicit demo=true query parameter', () => {
    expect(hasDemoModeQuery('?demo=true')).toBe(true)
    expect(hasDemoModeQuery('?source=landing&demo=true')).toBe(true)
    expect(hasDemoModeQuery('?demo=false')).toBe(false)
    expect(hasDemoModeQuery('?notdemo=true')).toBe(false)
    expect(hasDemoModeQuery('?next=demo%3Dtrue')).toBe(false)
  })

  it('keeps the original machine and example set', () => {
    expect(DEMO_MACHINE_TYPES).toEqual([
      'DFA', 'NFA', 'ENFA', 'DPDA', 'NPDA', 'TM', 'LBA',
    ])
    expect(DEMO_EXAMPLE_KEYS).toEqual([
      'dfaEvenZeros', 'nfaEndsIn11', 'npdaBalancedParens', 'tmAnBnCn',
    ])
  })

  const cases: Record<(typeof DEMO_EXAMPLE_KEYS)[number], {
    accept: string[]
    reject: string[]
  }> = {
    dfaEvenZeros: {
      accept: ['', '1', '00', '1001'],
      reject: ['0', '10', '000'],
    },
    nfaEndsIn11: {
      accept: ['11', '011', '1011'],
      reject: ['', '1', '110'],
    },
    npdaBalancedParens: {
      accept: ['', '()', '(())', '()()'],
      reject: ['(', ')', '(()', '())'],
    },
    tmAnBnCn: {
      accept: ['abc', 'aabbcc', 'aaabbbccc'],
      reject: ['', 'ab', 'aabcc', 'abbc'],
    },
  }

  for (const key of DEMO_EXAMPLE_KEYS) {
    it(`${key} is valid and recognizes its advertised language`, () => {
      const machine = {
        ...EXAMPLES[key],
        id: `demo-${key}`,
      } as MachineDefinition

      expect(DEMO_MACHINE_TYPES).toContain(machine.type)
      expect(hasBlockingErrors(validateMachine(machine))).toBe(false)

      for (const input of cases[key].accept) {
        expect(runToCompletion(machine, input).accepted, `${input || 'ε'} should accept`).toBe(true)
      }
      for (const input of cases[key].reject) {
        expect(runToCompletion(machine, input).accepted, `${input || 'ε'} should reject`).toBe(false)
      }
    })
  }

  const buildableTypeCases = [
    {
      key: 'enfaAStarBStar',
      type: 'ENFA',
      accept: ['', 'a', 'b', 'aaabbb'],
      reject: ['ba', 'aba'],
    },
    {
      key: 'dpdaAnBn',
      type: 'DPDA',
      accept: ['ab', 'aabb', 'aaabbb'],
      reject: ['', 'aab', 'abb'],
    },
    {
      key: 'lbaAnBn',
      type: 'LBA',
      accept: ['', 'ab', 'aabb', 'aaabbb'],
      reject: ['aab', 'abb'],
    },
  ] as const

  for (const exampleCase of buildableTypeCases) {
    it(`${exampleCase.type} remains buildable and executable`, () => {
      const machine = {
        ...EXAMPLES[exampleCase.key],
        id: `demo-${exampleCase.key}`,
      } as MachineDefinition

      expect(machine.type).toBe(exampleCase.type)
      expect(DEMO_MACHINE_TYPES).toContain(machine.type)
      expect(hasBlockingErrors(validateMachine(machine))).toBe(false)

      for (const input of exampleCase.accept) {
        expect(runToCompletion(machine, input).accepted, `${input || 'ε'} should accept`).toBe(true)
      }
      for (const input of exampleCase.reject) {
        expect(runToCompletion(machine, input).accepted, `${input || 'ε'} should reject`).toBe(false)
      }
    })
  }
})
