import { bench, describe } from 'vitest'
import { DFAEngine } from '@/engines/machine/dfa/DFAEngine'
import { NFAEngine } from '@/engines/machine/nfa/NFAEngine'
import { dfaToggle, nfaComplete } from '@/engines/machine/testing/fixtures'

const input10k = 'a'.repeat(10_000)

describe('Engine execution benchmarks', () => {
  bench('DFA execution on 10,000 characters', () => {
    const eng = new DFAEngine(dfaToggle())
    eng.initialize(input10k)
    let r = eng.step()
    while (r.status === 'running') r = eng.step()
  })

  bench('NFA building complete frontier (30 states)', () => {
    const m = nfaComplete(30)
    const eng = new NFAEngine(m)
    eng.initialize('a'.repeat(100))
    let r = eng.step()
    while (r.status === 'running') r = eng.step()
  })
})
