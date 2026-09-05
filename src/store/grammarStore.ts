// src/store/grammarStore.ts

import { create } from 'zustand';
import { CFG, GeneralGrammar, GrammarAnalysisResult, GrammarClassificationResult } from '@/engines/grammar/types';
import { parseGrammarText, parseGeneralGrammarText } from '@/engines/grammar/parser';
import { analyzeGrammar } from '@/engines/grammar/analysis';
import { runDiagnostics, GrammarDiagnostic } from '@/engines/grammar/diagnostics';
import { formatCFGToString } from '@/engines/grammar/transformations';
import { validateGrammarFormat } from '@/engines/grammar/classification';
import { validateRegex } from '@/engines/machine/conversions/regexToNfa';
import { useMachineStore } from './machineStore';
import { useHistoryStore } from './historyStore';
import type { GrammarFormat, MachineType } from '@/engines/machine/core/types';

export interface GrammarSession {
  derivationInput?: string;
  leftmost?: string[][];
  rightmost?: string[][];
  derivationError?: string | null;
  samples?: string[];
  maxLengthStr?: string;
  maxStepsStr?: string;
}

interface GrammarStore {
  rawText: string;
  grammarFormat: GrammarFormat;
  grammar: GeneralGrammar | null;
  classification: GrammarClassificationResult | null;
  cfg: CFG | null;
  analysis: GrammarAnalysisResult | null;
  diagnostics: GrammarDiagnostic[];
  setRawText: (text: string) => void;
  setRawTextWithoutSync: (text: string) => void;
  setGrammarFormat: (format: GrammarFormat) => void;
  setGrammarFormatWithoutSync: (format: GrammarFormat) => void;
  applyTransformation: (transformFn: (cfg: CFG, nt: string) => CFG, nt: string) => void;
  sessions: Record<string, GrammarSession>;
  getSession: (id: string) => GrammarSession;
  updateSession: (id: string, patch: Partial<GrammarSession>) => void;
}

const defaultText = ``;
const defaultFormat: GrammarFormat = 'TYPE_2';

function workspaceTypeForFormat(format: GrammarFormat): MachineType {
  if (format === 'TYPE_0') return 'UG'
  if (format === 'TYPE_1') return 'CSG'
  return 'CFG'
}

export const useGrammarStore = create<GrammarStore>((set, get) => {
  return {
    rawText: defaultText,
    grammarFormat: defaultFormat,
    grammar: null,
    classification: null,
    cfg: null,
    analysis: null,
    diagnostics: [],
    sessions: {},
    getSession: (id) => get().sessions[id] || {},
    updateSession: (id, patch) => {
      set((s) => ({
        sessions: {
          ...s.sessions,
          [id]: { ...(s.sessions[id] || {}), ...patch }
        }
      }));
    },
    setRawText: (text) => {
      // Write back to the active tab in machineStore and push to history
      useMachineStore.setState((s) => {
        const tabs = [...s.tabs];
        const active = tabs[s.activeTabIndex];
        
        if (active && (active.type === 'CFG' || active.type === 'CSG' || active.type === 'UG' || active.type === 'CFG_PARSER')) {
          // Push old state to history before mutating
          useHistoryStore.getState().pushState('machine', active.id, s.machine, 'grammar-typing');
          tabs[s.activeTabIndex] = { ...active, grammarText: text };
          return { tabs, machine: tabs[s.activeTabIndex], dirtyTabs: { ...s.dirtyTabs, [active.id]: true } };
        }
        return {};
      });
      get().setRawTextWithoutSync(text);
    },
    setRawTextWithoutSync: (text) => {
      if (get().rawText === text && (get().cfg !== null || get().grammar !== null || !text.trim())) return;
      try {
        const format = get().grammarFormat
        if (format === 'REGEX') {
          validateRegex(text)
          set({ rawText: text, grammar: null, classification: null, cfg: null, analysis: null, diagnostics: [] });
          return
        }
        const grammar = parseGeneralGrammarText(text, format)
        const classification = validateGrammarFormat(grammar, format)
        if (!classification.isValidForSelectedFormat) {
          set({
            rawText: text,
            grammar,
            classification,
            cfg: null,
            analysis: null,
            diagnostics: classification.violations.map((message) => ({ type: 'error', message, nonterminal: '', productions: [] })),
          })
          return
        }
        const cfg = format === 'TYPE_2' || format === 'TYPE_3' ? parseGrammarText(text) : null
        const analysis = cfg ? analyzeGrammar(cfg) : null
        const diagnostics = cfg ? runDiagnostics(cfg) : []
        set({ rawText: text, grammar, classification, cfg, analysis, diagnostics });
      } catch (e: any) {
        set({ 
          rawText: text,
          grammar: null,
          classification: null,
          cfg: null,
          analysis: null,
          diagnostics: [{
            type: 'error',
            message: `Syntax Error: ${e.message}`,
            nonterminal: '',
            productions: []
          }]
        });
      }
    },
    setGrammarFormat: (format) => {
      useMachineStore.setState((s) => {
        const tabs = [...s.tabs]
        const active = tabs[s.activeTabIndex]
        if (!active || !['CFG', 'CSG', 'UG', 'CFG_PARSER'].includes(active.type)) return {}
        useHistoryStore.getState().pushState('machine', active.id, s.machine, 'grammar-format')
        const updated = {
          ...active,
          type: active.type === 'CFG_PARSER' ? active.type : workspaceTypeForFormat(format),
          grammarFormat: format,
        }
        tabs[s.activeTabIndex] = updated
        return {
          tabs,
          machine: updated,
          dirtyTabs: { ...s.dirtyTabs, [active.id]: true },
        }
      })
      get().setGrammarFormatWithoutSync(format)
    },
    setGrammarFormatWithoutSync: (format) => {
      if (get().grammarFormat === format) return
      set({ grammarFormat: format, grammar: null, classification: null, cfg: null, analysis: null, diagnostics: [] })
      get().setRawTextWithoutSync(get().rawText)
    },
    applyTransformation: (transformFn, nt) => {
      const { cfg, setRawText } = get();
      if (!cfg) return;
      
      const newCfg = transformFn(cfg, nt);
      const newText = formatCFGToString(newCfg);
      setRawText(newText);
    }
  };
});

// Per-tab lab sessions are transient. Remove entries as soon as their tabs close
// so repeated open/close cycles do not retain derivations and samples forever.
useMachineStore.subscribe((state) => {
  const openIds = new Set(state.tabs.map((tab) => tab.id));
  const sessions = useGrammarStore.getState().sessions;
  const staleIds = Object.keys(sessions).filter((id) => !openIds.has(id));
  if (staleIds.length === 0) return;
  const next = { ...sessions };
  for (const id of staleIds) delete next[id];
  useGrammarStore.setState({ sessions: next });
});
