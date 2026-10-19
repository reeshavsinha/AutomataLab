import type { GrammarFormat } from '@/engines/machine/core/types'
import { canOpenInParserStudio, grammarMachineTargets } from '@/engines/machine/core/capabilities'

export type GrammarLabTab =
  | 'derivations'
  | 'transformations'
  | 'ambiguity'
  | 'sampler'
  | 'properties'
  | 'firstfollow'
  | 'diagnostics'

export interface GrammarLabTabDescriptor {
  id: GrammarLabTab
  label: string
  available: boolean
  unavailableReason?: string
}

const TAB_LABELS: Record<GrammarLabTab, string> = {
  derivations: 'Derivations',
  transformations: 'Transformations',
  ambiguity: 'Ambiguity',
  sampler: 'Sampler',
  properties: 'Properties',
  firstfollow: 'FIRST/FOLLOW',
  diagnostics: 'Problems',
}

function tab(
  id: GrammarLabTab,
  available: boolean,
  unavailableReason?: string,
): GrammarLabTabDescriptor {
  return { id, label: TAB_LABELS[id], available, unavailableReason }
}

/**
 * Grammar Lab feature gates by declared format. Machine routing stays in
 * `capabilities.ts`; this module only describes analysis tabs and pedagogy.
 */
export function getGrammarLabTabs(format: GrammarFormat): GrammarLabTabDescriptor[] {
  const parserStudio = canOpenInParserStudio(format)
  const targets = grammarMachineTargets(format).join(', ')

  if (format === 'REGEX') {
    return [
      tab('properties', true),
      tab('sampler', true),
      tab(
        'derivations',
        false,
        'Regex describes a language without rewrite rules. Try Sampler, or convert to Type 3 / open Parser Studio for tree-style views.',
      ),
      tab('transformations', false, 'Normal-form transforms need explicit productions (Type 2 or 3), not regex syntax.'),
      tab('ambiguity', false, 'Ambiguity needs two different parse trees — use a context-free grammar (Type 2).'),
      tab('firstfollow', false, 'FIRST and FOLLOW are computed from grammar rules, not from a regex pattern.'),
      tab('diagnostics', false, 'CFG problem checks run after you convert the regex to a grammar.'),
    ]
  }

  const cfgTools = format === 'TYPE_2' || format === 'TYPE_3'

  const tabs = [
    tab('properties', true),
    tab(
      'derivations',
      true,
      format === 'TYPE_0' || format === 'TYPE_1'
        ? 'Search stops at a limit — that means “not found in time”, not “string is impossible”.'
        : undefined,
    ),
    tab(
      'sampler',
      true,
      format === 'TYPE_0' || format === 'TYPE_1'
        ? 'Only short derivations are explored; longer strings in the language may be missed.'
        : undefined,
    ),
    tab(
      'transformations',
      cfgTools,
      'CNF, GNF, and left-recursion removal need Type 2 or Type 3 grammars.',
    ),
    tab(
      'ambiguity',
      format === 'TYPE_2',
      'Ambiguity search is available for Type 2 (context-free) grammars only.',
    ),
    tab(
      'firstfollow',
      cfgTools,
      'FIRST/FOLLOW needs a context-free grammar (Type 2 or 3).',
    ),
    tab(
      'diagnostics',
      cfgTools || format === 'TYPE_0' || format === 'TYPE_1',
      'Reachability and left-recursion checks apply to Type 2/3; Type 0/1 get shape checks in Problems.',
    ),
  ]

  if (format === 'TYPE_0' || format === 'TYPE_1') {
    const derivations = tabs.find((t) => t.id === 'derivations')
    if (derivations) {
      derivations.unavailableReason = [
        derivations.unavailableReason,
        `Recognizers: ${targets}. Parser Studio: ${parserStudio ? 'yes for regex / Type 2 / Type 3' : 'not for this format'}.`,
      ].filter(Boolean).join(' ')
    }
  }

  return tabs
}

export function defaultGrammarLabTab(format: GrammarFormat): GrammarLabTab {
  return 'properties'
}

export function isGrammarLabTabAvailable(format: GrammarFormat, tabId: GrammarLabTab): boolean {
  return getGrammarLabTabs(format).find((t) => t.id === tabId)?.available ?? false
}
