import { bench, describe, beforeAll } from 'vitest'
import { nfaToDfa } from '@/engines/machine/conversions/subsetConstruction'
import { minimizeDfa } from '@/engines/machine/conversions/minimizeDfa'
import { nfaComplete } from '@/engines/machine/testing/fixtures'
import type { MachineDefinition } from '@/engines/machine/core/types'

describe('Conversion algorithm benchmarks', () => {
  let dfa10: MachineDefinition;
  let nfa10: MachineDefinition;
  let nfa15: MachineDefinition;

  beforeAll(() => {
    nfa10 = nfaComplete(10, ['a', 'b'])
    nfa15 = nfaComplete(15, ['a', 'b'])
    // Pre-compute the DFA to independently benchmark minimization (avoid top-level execution block)
    dfa10 = nfaToDfa(nfa10).result as MachineDefinition
  })

  bench('Subset Construction (NFA -> DFA) - 10 complete states', () => {
    nfaToDfa(nfa10)
  })

  bench('Subset Construction (NFA -> DFA) - 15 complete states', () => {
    nfaToDfa(nfa15)
  })
  
  bench('DFA Minimization - Moore\'s algorithm', () => {
    minimizeDfa(dfa10)
  })
})
