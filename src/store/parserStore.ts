import { useMemo } from 'react';
import { create } from 'zustand';
import { toast } from '@/store/toastStore';
import { useGrammarStore } from './grammarStore';
import { useMachineStore } from './machineStore';
import { useHistoryStore } from './historyStore';
import { LL1Table } from '@/engines/parser/ll1';
import { LR0Table } from '@/engines/parser/lr0';
import { LL1Simulation } from '@/engines/parser/ll1Simulation';
import { LRSimulation } from '@/engines/parser/lrSimulation';
import { tokenizeGrammarString } from '@/engines/grammar/parser';
import { CYKSimulation } from '@/engines/parser/cyk';
import { EarleySimulation } from '@/engines/parser/earley';
import { BacktrackingSimulation } from '@/engines/parser/backtracking';
import { ParserModel, ParserEngine } from '@/engines/parser/model';
import { ParserBuilder } from '@/engines/parser/builder';
import { ParsingSession } from '@/engines/parser/session';

export function useLL1Table(): LL1Table | null {
  return useParserStore(s => s.model?.parsers.ll1.table || null);
}

export function useLR0Table(): LR0Table | null {
  return useParserStore(s => s.model?.parsers.lr0.table || null);
}

export function useSLR1Table(): LR0Table | null {
  return useParserStore(s => s.model?.parsers.slr.table || null);
}

export function useCLR1Table(): LR0Table | null {
  return useParserStore(s => s.model?.parsers.clr.table || null);
}

export function useLALR1Table(): LR0Table | null {
  return useParserStore(s => s.model?.parsers.lalr.table || null);
}

interface ParserSimulationState {
  model: ParserModel | null;
  setModel: (model: ParserModel | null) => void;
  buildDiagnostics: string | null;
  setBuildDiagnostics: (d: string | null) => void;
  session: ParsingSession | null;
  algorithm: string;
  setAlgorithm: (alg: string) => void;
  setAlgorithmWithoutSync: (alg: string) => void;
  rawInput: string;
  setRawInput: (input: string) => void;
  setRawInputWithoutSync: (input: string) => void;
  tokens: string[];
  simulation: ParserEngine | null;
  currentStep: number;
  maxStep: number;
  isPlaying: boolean;
  playSpeed: number;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  initializeSim: (silent?: boolean) => void;
  seekToStep: (step: number) => void;
  stepSim: () => void;
  stepBack: () => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  runSimToEnd: () => void;
  resetSim: () => void;
  exitPreviewMode: () => void;
}

export const useParserStore = create<ParserSimulationState>((set, get) => ({
  model: null,
  setModel: (model) => set({ model }),
    buildDiagnostics: null,
    setBuildDiagnostics: (d) => set({ buildDiagnostics: d }),
  session: null,
  algorithm: 'LL1',
  setAlgorithm: (alg) => {
    useMachineStore.setState((s) => {
      const tabs = [...s.tabs];
      const active = tabs[s.activeTabIndex];
      if (active && active.type === 'CFG_PARSER') {
        tabs[s.activeTabIndex] = { ...active, parserAlgorithm: alg };
      }
      return { tabs, machine: tabs[s.activeTabIndex], dirtyTabs: { ...s.dirtyTabs, [active.id]: true } };
    });
    get().setAlgorithmWithoutSync(alg);
    get().initializeSim(true);
  },
  setAlgorithmWithoutSync: (alg) => set({ algorithm: alg, simulation: null, currentStep: 0, maxStep: 0, isPlaying: false }),
  rawInput: '',
  tokens: [],
  simulation: null,
  currentStep: 0,
  maxStep: 0,
  isPlaying: false,
  playSpeed: 1,

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),

  setRawInput: (input: string) => {
    useMachineStore.setState((s) => {
      const tabs = [...s.tabs];
      const active = tabs[s.activeTabIndex];
      if (active && active.type === 'CFG_PARSER') {
        useHistoryStore.getState().pushState('machine', active.id, s.machine, 'parser-typing');
        tabs[s.activeTabIndex] = { ...active, parserInput: input };
      }
      return { tabs, machine: tabs[s.activeTabIndex], dirtyTabs: { ...s.dirtyTabs, [active?.id]: true } };
    });
    get().setRawInputWithoutSync(input);
  },

  setRawInputWithoutSync: (input: string) => {
    const { cfg } = useGrammarStore.getState();
    const terminals = cfg ? cfg.terminals : new Set<string>();
    
    const sortedTerminals = Array.from(terminals).sort((a, b) => b.length - a.length);
    const tokens: string[] = [];
    let remaining = input.trim();
    
    while (remaining.length > 0) {
      remaining = remaining.trimStart();
      if (remaining.length === 0) break;
      
      let matched = false;
      for (const t of sortedTerminals) {
        if (remaining.startsWith(t)) {
          tokens.push(t);
          remaining = remaining.substring(t.length);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        tokens.push(remaining[0]);
        remaining = remaining.substring(1);
      }
    }

    set({ rawInput: input, tokens, simulation: null, session: null, currentStep: 0, maxStep: 0, isPlaying: false });
  },

  initializeSim: (silent = false) => {
    const { tokens, algorithm, model } = get();
    const { cfg } = useGrammarStore.getState();
    if (!cfg || !model) return;

    let sim = null;
    if (algorithm === 'LL1') {
      if (!model.parsers.ll1.table || model.parsers.ll1.hasConflict) return;
      sim = new LL1Simulation(cfg, model.parsers.ll1.table);
    } else if (algorithm === 'LR0') {
      if (!model.parsers.lr0.table || model.parsers.lr0.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lr0.table);
    } else if (algorithm === 'SLR1') {
      if (!model.parsers.slr.table || model.parsers.slr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.slr.table);
    } else if (algorithm === 'CLR1') {
      if (!model.parsers.clr.table || model.parsers.clr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.clr.table);
    } else if (algorithm === 'LALR1') {
      if (!model.parsers.lalr.table || model.parsers.lalr.hasConflict) return;
      sim = new LRSimulation(cfg, model.parsers.lalr.table);
    } else if (algorithm === 'CYK') {
      sim = new CYKSimulation(cfg);
    } else if (algorithm === 'EARLEY') {
      sim = new EarleySimulation(cfg);
    } else if (algorithm === 'BACKTRACKING') {
      sim = new BacktrackingSimulation(cfg);
    } else {
      return;
    }

    if (sim) {
      try {
        sim.initialize(tokens);
        const session = new ParsingSession(model, algorithm, sim, get().rawInput);
        set({ simulation: sim, session, currentStep: 0, maxStep: 0, isPlaying: false });
      } catch (e: any) {
        if (!silent) {
          toast.error(e.message);
        }
        set({ simulation: null, session: null, currentStep: 0, maxStep: 0, isPlaying: false });
      }
    }
  },

  seekToStep: (targetStep) => {
    set({ currentStep: targetStep, isPlaying: false });
  },

  stepSim: () => {
    const { simulation, currentStep, maxStep } = get();
    if (!simulation) return;
    
    if (currentStep < maxStep) {
      set({ currentStep: currentStep + 1 });
    } else {
      if (simulation.step()) {
        const nextStep = simulation.history.length - 1;
        set({ maxStep: nextStep, currentStep: nextStep });
      } else {
        set({ isPlaying: false });
      }
    }
  },

  stepBack: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      get().seekToStep(currentStep - 1);
    }
  },

  seekToStart: () => {
    get().seekToStep(0);
  },

  seekToEnd: () => {
    get().runSimToEnd();
  },

  runSimToEnd: () => {
    // Arbitrary large number to run to end
    let { simulation, currentStep, maxStep } = get();
    if (!simulation) return;
    
    // Jump out of preview mode
    if (currentStep < maxStep) {
      set({ currentStep: maxStep });
    }
    
    // Execute until done
    while (simulation.status === 'running') {
      if (!simulation.step()) break;
    }
    const nextStep = simulation.history.length - 1;
    set({ maxStep: nextStep, currentStep: nextStep, isPlaying: false });
  },
  
  resetSim: () => {
    set({ simulation: null, currentStep: 0, maxStep: 0, isPlaying: false });
  },

  exitPreviewMode: () => {
    const { maxStep } = get();
    set({ currentStep: maxStep });
  }
}));

export const useActiveSimulationState = () => {
  return useParserStore(s => {
    if (!s.simulation) return null;
    if (s.currentStep < s.maxStep && s.simulation.history && s.simulation.history[s.currentStep]) {
      return s.simulation.history[s.currentStep].snapshot;
    }
    return s.simulation;
  });
};

useGrammarStore.subscribe((state, prevState) => {
  if (state.cfg !== prevState.cfg) {
    if (state.cfg && state.cfg.productions.length > 0) {
      const buildResult = ParserBuilder.build(state.cfg);
      if (buildResult.model) {
        useParserStore.getState().setModel(buildResult.model);
        useParserStore.getState().setBuildDiagnostics(null);
        useParserStore.getState().initializeSim(true);
      } else {
        useParserStore.getState().setModel(null);
        useParserStore.getState().setBuildDiagnostics(buildResult.diagnostics || 'Unknown build error');
        useParserStore.getState().resetSim();
      }
    } else {
      useParserStore.getState().setModel(null);
      useParserStore.getState().setBuildDiagnostics(null);
      useParserStore.getState().resetSim();
    }
  }
});
