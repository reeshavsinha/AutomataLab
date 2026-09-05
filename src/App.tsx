// ============================================================
// App.tsx — Root component. Renders the application shell.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import WorkspaceHub from './components/layout/WorkspaceHub';
import { MachineWorkspace } from './components/workspaces/MachineWorkspace';
import { GrammarWorkspace } from './components/workspaces/GrammarWorkspace';
import { ParserWorkspace } from './components/workspaces/ParserWorkspace';

import { useUIStore } from '@/store/uiStore'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useCommandStore } from '@/store/commandStore'
import MenuBar from '@/components/layout/MenuBar'
import ToastContainer from '@/components/layout/ToastContainer'
import UpdateBanner from '@/components/layout/UpdateBanner'
import UnsavedChangesGuard from '@/components/layout/UnsavedChangesGuard'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import HelpModal from '@/components/layout/HelpModal'
import ManualModal from '@/components/layout/ManualModal'
import TheoryModal from '@/components/layout/TheoryModal'
import ExportModal from '@/components/layout/ExportModal'
import ConversionsModal from '@/components/conversions/ConversionsModal'
import BatchRunnerModal from '@/components/controls/BatchRunnerModal'
import AnalysisModal from '@/components/analysis/AnalysisModal'
import { useGrammarStore } from '@/store/grammarStore'
import { useParserStore } from '@/store/parserStore'
import { isAutomatonType, isGrammarType, isParserType } from '@/engines/machine/core/capabilities'
import { shouldSuppressGlobalShortcut } from '@/utils/keyboardShortcuts'
import { hasDemoModeQuery } from '@/utils/demoMode'

const isSimulatorDeployment = import.meta.env.VITE_SIMULATOR_MODE === 'true';

function TabSyncListener() {
  const machine = useMachineStore((s) => s.machine);

  const lastParserTabId = useRef<string | null>(null);
  const lastMachineTabId = useRef<string | null>(null);

  useEffect(() => {
    if (!machine) {
      useParserStore.getState().setIsPlaying(false);
      return;
    }
    
    const isAutomaton = isAutomatonType(machine.type);
    
    if (machine.type === 'CFG_PARSER') {
      if (lastParserTabId.current !== machine.id) {
        useParserStore.getState().resetSim();
        lastParserTabId.current = machine.id;
      }
    } else if (isAutomaton) {
      useParserStore.getState().setIsPlaying(false);
      if (lastMachineTabId.current !== machine.id) {
        useSimulationStore.getState().resetSimulation();
        lastMachineTabId.current = machine.id;
      }
    } else {
      useParserStore.getState().setIsPlaying(false);
    }

    // When the active tab changes (or undo/redo alters the active tab),
    // sync the tab's grammar and parser state into the global stores.
    if (machine.type === 'CFG' || machine.type === 'CSG' || machine.type === 'UG' || machine.type === 'CFG_PARSER') {
      useGrammarStore.getState().setGrammarFormatWithoutSync(machine.grammarFormat ?? (machine.type === 'CSG' ? 'TYPE_1' : machine.type === 'UG' ? 'TYPE_0' : 'TYPE_2'));
      useGrammarStore.getState().setRawTextWithoutSync(machine.grammarText || '');
    }
    if (machine.type === 'CFG_PARSER') {
      useParserStore.getState().setAlgorithmWithoutSync(machine.parserAlgorithm || 'LL1');
      useParserStore.getState().setRawInputWithoutSync(machine.parserInput || '');
    }
  }, [machine?.id, machine?.grammarText, machine?.grammarFormat, machine?.parserAlgorithm, machine?.parserInput, machine?.type]);

  return null;
}

export default function App() {
  const isTauri = '__TAURI_INTERNALS__' in window;
  const isDemoMode = isSimulatorDeployment || hasDemoModeQuery(window.location.search);

  const [route, setRoute] = useState(() => {
    if (!isDemoMode) {
      window.location.hash = '#/';
      return '#/';
    }
    return window.location.hash;
  });
  
  const theme = useUIStore((s) => s.theme)
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)
  
  const activeMachineType = useMachineStore((s) => s.machine?.type)
  const machineId = useMachineStore((s) => s.machine?.id)
  const activeIsParser = isParserType(activeMachineType)
  const activeIsGrammar = isGrammarType(activeMachineType)
  const activeIsAutomaton = isAutomatonType(activeMachineType)

  // Reflect the active theme onto <html> so the CSS token overrides apply.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isTauri, isDemoMode])

  // Record the active tab's preferred route ONLY when the route itself changes
  // (not when the user switches tabs, which would corrupt other tabs' saved routes).
  useEffect(() => {
    if (!route || route === '#' || route === '#/') return;
    const state = useMachineStore.getState();
    if (route === '#/machine' || route === '#/grammar' || route === '#/parser') {
      if (state.machine && state.tabRoutes[state.machine.id] !== route) {
        useMachineStore.setState((s) => ({
          tabRoutes: { ...s.tabRoutes, [state.machine!.id]: route }
        }));
      }
    }
  }, [route])

  // Global Keyboard Shortcuts (Undo, Redo, Cut, Copy, Paste) for non-inputs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      
      const k = e.key.toLowerCase();
      const canvas = useCommandStore.getState().canvas;
      const machine = useMachineStore.getState().machine;
      const canEdit = useSimulationStore.getState().status !== 'running';
      
      const target = e.target as HTMLElement;
      // Monaco editor handles key events on a hidden textarea or `.view-lines`
      const isInput = shouldSuppressGlobalShortcut(target) || target.classList.contains('inputarea');
      const hasSelection = (window.getSelection()?.toString().length || 0) > 0;
      
      if (isInput) return;
      if (hasSelection && (k === 'c' || k === 'x')) return;

      if (k === 'z') {
        if (!machine || !canEdit) return;
        e.preventDefault();
        if (e.shiftKey) {
          useMachineStore.getState().redo();
        } else {
          useMachineStore.getState().undo();
        }
      } else if (k === 'y') {
        if (!machine || !canEdit) return;
        e.preventDefault();
        useMachineStore.getState().redo();
      } else {
        if (k === 'c') {
          e.preventDefault();
          canvas?.copy();
        } else if (k === 'x') {
          if (!machine || !canEdit) return;
          e.preventDefault();
          canvas?.cut();
        } else if (k === 'v') {
          if (!machine || !canEdit) return;
          e.preventDefault();
          canvas?.paste();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Anti-Trap: when the active tab TYPE changes (tab switch), redirect to the
  // correct workspace route for that type if we're on the wrong one.
  useEffect(() => {
    if (route === '' || route === '#' || route === '#/') return;

    const state = useMachineStore.getState();
    const machineId = state.machine?.id;
    const preferredRoute = machineId ? state.tabRoutes[machineId] : null;

    const isParser = isParserType(activeMachineType);
    const isGrammar = isGrammarType(activeMachineType);
    const isMachine = isAutomatonType(activeMachineType);

    if (isParser && route !== '#/parser') {
      window.location.hash = '#/parser';
    } else if (isGrammar && route !== '#/grammar') {
      window.location.hash = preferredRoute === '#/grammar' ? '#/grammar' : '#/grammar';
    } else if (isMachine && route !== '#/machine') {
      window.location.hash = '#/machine';
    } else if (!activeMachineType && route !== '' && route !== '#/') {
      // If there are no tabs left, redirect to the WorkspaceHub
      window.location.hash = '#/';
    }
  }, [activeMachineType, route]);

  // Auto-initialize Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      const state = useMachineStore.getState();
      if (!state.machine && state.tabs.length === 0) {
        state.addTab('DFA');
      }
    }
  }, [isDemoMode]);

  // -----------------------------------------------------
  // Route dispatch
  // -----------------------------------------------------
  let content = null;

  if (isDemoMode) {
    if (!machineId) {
      content = <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading demo workspace...</div>;
    } else {
      content = <ErrorBoundary key={machineId || 'demo'} fallbackName="Demo Workspace" onRevert={() => useMachineStore.getState().undo()}><MachineWorkspace isDemoMode={true} /></ErrorBoundary>;
    }
  } else if (!machineId && route !== '' && route !== '#/') {
    // Guard against crashing during the first render before Anti-Trap redirects
    content = null;
  } else if (route === '' || route === '#/') {
    content = <WorkspaceHub />;
  } else if (route === '#/machine' && activeIsAutomaton) {
    content = <ErrorBoundary key={machineId} fallbackName="Machine Workspace" onRevert={() => useMachineStore.getState().undo()}><MachineWorkspace /></ErrorBoundary>;
  } else if (route === '#/grammar' && activeIsGrammar) {
    content = <ErrorBoundary key={machineId} fallbackName="Grammar Workspace" onRevert={() => { window.location.hash = ''; }}><GrammarWorkspace /></ErrorBoundary>;
  } else if (route === '#/parser' && activeIsParser) {
    content = <ErrorBoundary key={machineId} fallbackName="Parser Workspace" onRevert={() => { window.location.hash = ''; }}><ParserWorkspace /></ErrorBoundary>;
  } else if (machineId) {
    // The Anti-Trap effect will redirect on the next tick. Render nothing during
    // the mismatch so a workspace never observes an incompatible machine type.
    content = null;
  } else {
    // Fallback or legacy route
    content = <WorkspaceHub />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* Global Hoisted Singletons */}
      {!isDemoMode && <MenuBar />}
      <TabSyncListener />
      
      {/* Main Workspace Content */}
      {content}

      <ToastContainer />
      <UpdateBanner />
      {!isDemoMode && <UnsavedChangesGuard />}

      {/* Modals */}
      {activeModal === 'help' && <HelpModal onClose={closeModal} />}
      {activeModal === 'manual' && <ManualModal onClose={closeModal} />}
      {activeModal === 'theory' && <TheoryModal onClose={closeModal} />}
      {machineId && activeModal === 'export' && <ExportModal onClose={closeModal} />}
      {machineId && activeModal === 'convert' && <ConversionsModal onClose={closeModal} />}
      {machineId && activeModal === 'batch' && <BatchRunnerModal onClose={closeModal} />}
      {machineId && activeModal === 'analysis' && <AnalysisModal onClose={closeModal} />}


    </div>
  );
}
