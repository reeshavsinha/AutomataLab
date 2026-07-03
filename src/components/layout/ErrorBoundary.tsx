import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useMachineStore } from '@/store/machineStore';


interface Props {
  children: ReactNode;
  fallbackName: string;
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
              <button 
                onClick={() => {
                  useMachineStore.getState().closeTab(useMachineStore.getState().activeTabIndex);
                }}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
              >
                Close Tab
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
