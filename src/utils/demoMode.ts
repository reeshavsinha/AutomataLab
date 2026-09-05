import type { MachineType } from '@/engines/machine/core/types'

/** Features intentionally exposed by the small hosted simulator. */
export const DEMO_MACHINE_TYPES = [
  'DFA',
  'NFA',
  'ENFA',
  'DPDA',
  'NPDA',
  'TM',
  'LBA',
] as const satisfies readonly MachineType[]

/** Keep the hosted demo's original short, representative example menu. */
export const DEMO_EXAMPLE_KEYS = [
  'dfaEvenZeros',
  'nfaEndsIn11',
  'npdaBalancedParens',
  'tmAnBnCn',
] as const

/** Parse the query exactly; substring checks also matched unrelated parameters. */
export function hasDemoModeQuery(search: string): boolean {
  return new URLSearchParams(search).get('demo') === 'true'
}
