import React, { useRef, useState } from 'react';
import { useGrammarStore } from '@/store/grammarStore';
import { useMachineStore } from '@/store/machineStore';
import { EarleySimulation } from '@/engines/parser/earley';
import { SyntaxTreeNode } from '@/engines/parser/model';
import { tokenizeInputString } from '@/engines/grammar/parser';
import type { DerivationSearchResult } from '@/engines/grammar/types';

export function GrammarDerivationTab() {
  const { cfg, grammar, grammarFormat, getSession, updateSession } = useGrammarStore();
  const machine = useMachineStore((s) => s.machine);
  
  const session = machine ? getSession(machine.id) : {};
  const derivationInput = session.derivationInput || '';
  
  const [inputStr, setInputStr] = useState(derivationInput);
  
  // Keep arrays in state to avoid re-rendering issues, but initialize from session
  const [leftmost, setLeftmost] = useState<string[][]>(session.leftmost || []);
  const [rightmost, setRightmost] = useState<string[][]>(session.rightmost || []);
  const [error, setError] = useState<string | null>(session.derivationError || null);
  const [searchResult, setSearchResult] = useState<DerivationSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  React.useEffect(() => {
    // If the inputStr doesn't match the session derivationInput (e.g., when switching tabs), update it
    setInputStr(derivationInput);
    setLeftmost(session.leftmost || []);
    setRightmost(session.rightmost || []);
    setError(session.derivationError || null);
  }, [machine?.id]);

  React.useEffect(() => {
    if (!grammar || !machine) {
      setLeftmost([]);
      setRightmost([]);
      setError(null);
      setSearchResult(null);
      setSearching(false);
      return;
    }

    if (!derivationInput.trim() && derivationInput !== '') {
        setLeftmost([]);
        setRightmost([]);
        setError(null);
        return;
    }
    
    if (!cfg) {
      const tokens = derivationInput.trim() ? tokenizeInputString(derivationInput, grammar.terminals) : [];
      setLeftmost([]);
      setRightmost([]);
      if (typeof Worker === 'undefined') {
        setSearchResult({ status: 'RESOURCE_LIMIT', steps: [], exploredNodes: 0, reason: 'Derivation workers are unavailable in this environment.' });
        setError('Derivation workers are unavailable in this environment.');
        return;
      }
      const worker = new Worker(new URL('../../../engines/grammar/derivationWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      setSearching(true);
      worker.onmessage = (event: MessageEvent<DerivationSearchResult>) => {
        if (workerRef.current !== worker) return;
        setSearchResult(event.data);
        setError(event.data.status === 'FOUND' ? null : event.data.reason ?? event.data.status);
        setSearching(false);
        workerRef.current = null;
        worker.terminate();
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        setSearchResult({ status: 'RESOURCE_LIMIT', steps: [], exploredNodes: 0, reason: 'Derivation worker failed.' });
        setError('Derivation worker failed.');
        setSearching(false);
        workerRef.current = null;
        worker.terminate();
      };
      worker.postMessage({
        grammar: {
          ...grammar,
          nonterminals: [...grammar.nonterminals],
          terminals: [...grammar.terminals],
        },
        target: tokens,
      });
      return () => {
        if (workerRef.current === worker) {
          worker.terminate();
          workerRef.current = null;
        }
      };
    }

    // Only parse if we don't already have results for this input
    if (session.leftmost && session.leftmost.length > 0) return;

    try {
      const tokens = derivationInput.trim() ? tokenizeInputString(derivationInput, cfg.terminals) : [];
      const sim = new EarleySimulation(cfg);
      sim.initialize(tokens);
      while (sim.status === 'running') {
        sim.step();
      }
      
      if (sim.status === 'accepted' && sim.tree) {
        generateDerivations(sim.tree);
        setError(null);
      } else {
        setError(sim.errorMsg || 'Failed to parse input.');
        setLeftmost([]);
        setRightmost([]);
      }
    } catch (e: any) {
      setError(e.message || 'Error during parsing');
      setLeftmost([]);
      setRightmost([]);
    }
  }, [cfg, grammar, derivationInput, machine?.id]);

  if ((!cfg && !grammar) || !machine || grammarFormat === 'REGEX') return <div style={{ padding: 16 }}>Choose a non-regex grammar with valid productions.</div>;

  const handleParse = () => {
    updateSession(machine.id, { 
      derivationInput: inputStr,
      leftmost: undefined, // Clear session cache so it recalculates
      rightmost: undefined,
      derivationError: undefined 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleParse();
    }
  };

  const cancelSearch = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setSearching(false);
    setSearchResult({ status: 'CANCELLED', steps: [], exploredNodes: 0, reason: 'Search cancelled.' });
    setError('Search cancelled.');
  };

  const generateDerivations = (tree: SyntaxTreeNode) => {
    // Leftmost
    const leftSteps: string[][] = [[tree.symbol]];
    let currentLeft = [tree];
    
    let changed = true;
    while (changed) {
      changed = false;
      const nextLeft: SyntaxTreeNode[] = [];
      let expanded = false;
      
      for (const node of currentLeft) {
        if (!expanded && node.children && node.children.length > 0) {
          nextLeft.push(...node.children);
          expanded = true;
          changed = true;
        } else {
          nextLeft.push(node);
        }
      }
      
      if (changed) {
        currentLeft = nextLeft;
        leftSteps.push(currentLeft.map(n => n.symbol).filter(s => s !== 'ε'));
      }
    }
    setLeftmost(leftSteps);

    // Rightmost
    const rightSteps: string[][] = [[tree.symbol]];
    let currentRight = [tree];
    
    changed = true;
    while (changed) {
      changed = false;
      const nextRight: SyntaxTreeNode[] = [];
      let expanded = false;
      
      // Expand rightmost non-terminal
      for (let i = currentRight.length - 1; i >= 0; i--) {
        const node = currentRight[i];
        if (!expanded && node.children && node.children.length > 0) {
          nextRight.unshift(...node.children);
          expanded = true;
          changed = true;
        } else {
          nextRight.unshift(node);
        }
      }
      
      if (changed) {
        currentRight = nextRight;
        rightSteps.push(currentRight.map(n => n.symbol).filter(s => s !== 'ε'));
      }
    }
    setRightmost(rightSteps);

    if (machine) {
      updateSession(machine.id, { leftmost: leftSteps, rightmost: rightSteps });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Derivations</h3>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input 
          type="text"
          value={inputStr}
          onChange={e => setInputStr(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter string to parse..."
          style={{ flex: 1, padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}
        />
        <button 
          onClick={handleParse}
          style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {cfg ? 'Parse' : searching ? 'Searching…' : 'Find derivation'}
        </button>
        {!cfg && searching && (
          <button onClick={cancelSearch} style={{ padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: '#ef4444', marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {searchResult && (
          <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Bounded derivation — {searchResult.status.replace(/_/g, ' ')}
            </h4>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Explored {searchResult.exploredNodes.toLocaleString()} unique sentential forms. {searchResult.reason ?? ''}
            </div>
            {searchResult.steps.map((step, index) => (
              <div key={index} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: 4 }}>
                {index > 0 && <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>⇒</span>}
                {step.form.length ? step.form.join(' ') : 'ε'}
                {step.rewrite && <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.72rem' }}>rule {step.rewrite.productionIndex + 1} at {step.rewrite.position + 1}</span>}
              </div>
            ))}
          </div>
        )}
        {leftmost.length > 0 && (
          <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Leftmost Derivation</h4>
            {leftmost.map((step, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 4 }}>
                {i > 0 && <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>⇒</span>}
                {step.length === 0 ? 'ε' : step.join(' ')}
              </div>
            ))}
          </div>
        )}

        {rightmost.length > 0 && (
          <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rightmost Derivation</h4>
            {rightmost.map((step, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: 4 }}>
                {i > 0 && <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>⇒</span>}
                {step.length === 0 ? 'ε' : step.join(' ')}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
