import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useMachineStore } from '@/store/machineStore';
import { useGrammarStore } from '@/store/grammarStore';
import { useParserStore } from '@/store/parserStore';
import JSZip from 'jszip';


interface Props {
  children: ReactNode;
  fallbackName: string;
  onRevert?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.fallbackName}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRescueWork = async () => {
    try {
      const zip = new JSZip();
      
      // Save all machines
      const machineTabs = useMachineStore.getState().tabs;
      const machinesFolder = zip.folder("machines");
      if (machinesFolder && machineTabs.length > 0) {
        machineTabs.forEach((tab, index) => {
          const name = tab.name || `machine_${index + 1}`;
          const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          machinesFolder.file(`${safeName}.json`, JSON.stringify(tab, null, 2));
        });
      }

      // Save grammar
      const grammarText = useGrammarStore.getState().rawText;
      if (grammarText && grammarText.trim() !== '') {
        zip.file("grammar_lab.txt", grammarText);
      }

      // Generate and download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `automatalab_rescue_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to rescue work:", e);
      alert("Failed to create rescue ZIP. See console for details.");
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-200 p-8">
          <div className="max-w-2xl bg-gray-900 border border-red-500/30 rounded-lg shadow-2xl p-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h2 className="text-xl font-bold">Component Crashed</h2>
            </div>
            <p className="text-gray-300">
              The <strong>{this.props.fallbackName}</strong> encountered an unexpected error.
            </p>
            <div className="bg-black/50 p-4 rounded text-sm font-mono text-red-300 overflow-auto max-h-[300px]">
              {this.state.error?.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </div>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Try Again
              </button>
              {this.props.onRevert && (
                <button 
                  onClick={() => {
                    this.props.onRevert?.();
                    this.setState({ hasError: false, error: null, errorInfo: null });
                  }}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium"
                  title="Undo the last action and try to recover the workspace"
                >
                  Revert to Last Valid State
                </button>
              )}
              <button 
                onClick={() => {
                  useMachineStore.getState().closeTab(useMachineStore.getState().activeTabIndex);
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
              >
                Close Tab
              </button>
              <button 
                onClick={this.handleRescueWork}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium ml-auto flex items-center gap-2"
                title="Save all workspaces as a ZIP file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Rescue Work
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
