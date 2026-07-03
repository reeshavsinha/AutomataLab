// src/store/grammarStore.ts

import { create } from 'zustand';
import { CFG, GrammarAnalysisResult } from '@/engines/grammar/types';
import { parseGrammarText } from '@/engines/grammar/parser';
import { analyzeGrammar } from '@/engines/grammar/analysis';
import { runDiagnostics, GrammarDiagnostic } from '@/engines/grammar/diagnostics';
import { formatCFGToString } from '@/engines/grammar/transformations';
import { useMachineStore } from './machineStore';
import { useHistoryStore } from './historyStore';

interface GrammarStore {
  rawText: string;
  cfg: CFG | null;
  analysis: GrammarAnalysisResult | null;
  diagnostics: GrammarDiagnostic[];
  setRawText: (text: string) => void;
  setRawTextWithoutSync: (text: string) => void;
  applyTransformation: (transformFn: (cfg: CFG, nt: string) => CFG, nt: string) => void;
}

const defaultText = ``;

export const useGrammarStore = create<GrammarStore>((set, get) => {
  return {
    rawText: defaultText,
    cfg: null,
    analysis: null,
    diagnostics: [],
    setRawText: (text) => {
      // Write back to the active tab in machineStore and push to history
      useMachineStore.setState((s) => {
        const tabs = [...s.tabs];
        const active = tabs[s.activeTabIndex];
        
        if (active && (active.type === 'CFG' || active.type === 'CSG' || active.type === 'REG' || active.type === 'CFG_PARSER')) {
          // Push old state to history before mutating
          useHistoryStore.getState().pushState('machine', active.id, s.machine, 'grammar-typing');
          tabs[s.activeTabIndex] = { ...active, grammarText: text };
        }
        return { tabs, machine: tabs[s.activeTabIndex], dirtyTabs: { ...s.dirtyTabs, [active?.id]: true } };
      });
      get().setRawTextWithoutSync(text);
    },
    setRawTextWithoutSync: (text) => {
      try {
        const cfg = parseGrammarText(text);
        const analysis = analyzeGrammar(cfg);
        const diagnostics = runDiagnostics(cfg);
        set({ rawText: text, cfg, analysis, diagnostics });
      } catch (e: any) {
        set({ 
          rawText: text,
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
    applyTransformation: (transformFn, nt) => {
      const { cfg, setRawText } = get();
      if (!cfg) return;
      
      const newCfg = transformFn(cfg, nt);
      const newText = formatCFGToString(newCfg);
      setRawText(newText);
    }
  };
});
