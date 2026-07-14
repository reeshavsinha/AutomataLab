// ============================================================
// AnalysisModal — Provides DFA Equivalence, Inclusion, Emptiness,
// and Reachability analysis. Uses a Web Worker to prevent UI lockups.
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useMachineStore } from '@/store/machineStore'
import { useUIStore } from '@/store/uiStore'
import Dialog from '@/components/common/Dialog'
import AnalysisWorker from '@/engines/machine/workers/analysis.worker?worker'
import type { AnalysisRequest, AnalysisResponse } from '@/engines/machine/workers/analysis.worker'

type TabId = 'reachability' | 'emptiness' | 'equivalence' | 'inclusion'

export default function AnalysisModal({ onClose }: { onClose: () => void }) {
  const machine = useMachineStore((s) => s.machine)
  const tabs = useMachineStore((s) => s.tabs)
  const activeTabIndex = useMachineStore((s) => s.activeTabIndex)
  const setAnalysisHighlights = useUIStore((s) => s.setAnalysisHighlights)

  const [activeTab, setActiveTab] = useState<TabId>('reachability')
  
  const defaultTarget = activeTabIndex === 0 && tabs.length > 1 ? 1 : 0
  const [targetTabIndex, setTargetTabIndex] = useState<number>(defaultTarget)

  // Local state for results to prevent blocking main thread during pure render
  const [reachabilityResult, setReachabilityResult] = useState<{ unreachable: string[], dead: string[], sink: string[] } | null>(null)
  const [emptinessResult, setEmptinessResult] = useState<{ isEmpty: boolean, witness: string | null } | null>(null)
  const [compareResult, setCompareResult] = useState<{ result: boolean, counterexample: string | null } | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pendingRequestIdRef = useRef<string | null>(null)

  useEffect(() => {
    workerRef.current = new AnalysisWorker()
    workerRef.current.onmessage = (e: MessageEvent<AnalysisResponse>) => {
      const res = e.data
      if (res.id !== pendingRequestIdRef.current) return // Ignore stale messages
      
      setIsComputing(false)
      pendingRequestIdRef.current = null
      
      if (!res.success) {
        setError(res.error)
        return
      }

      switch (res.type) {
        case 'reachability':
          setReachabilityResult(res.result)
          break
        case 'emptiness':
          setEmptinessResult(res.result)
          break
        case 'equivalence':
        case 'inclusion':
          setCompareResult({ 
            result: 'equivalent' in res.result ? res.result.equivalent : res.result.included, 
            counterexample: res.result.counterexample 
          })
          break
      }
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  // Clear results when machine or tab changes
  useEffect(() => {
    setReachabilityResult(null)
    setEmptinessResult(null)
    setCompareResult(null)
    setError(null)
  }, [activeTab, machine.id, targetTabIndex])

  type AnalysisPayload = 
    | { type: 'reachability'; machine: any }
    | { type: 'emptiness'; machine: any }
    | { type: 'equivalence'; m1: any; m2: any }
    | { type: 'inclusion'; m1: any; m2: any }

  const runWorkerTask = (req: AnalysisPayload) => {
    setIsComputing(true)
    setError(null)
    const id = Date.now().toString()
    pendingRequestIdRef.current = id
    workerRef.current?.postMessage({ ...req, id } as AnalysisRequest)
  }

  const handleRunReachability = () => {
    runWorkerTask({ type: 'reachability', machine })
  }

  const handleRunEmptiness = () => {
    runWorkerTask({ type: 'emptiness', machine })
  }

  const handleRunCompare = (type: 'equivalence' | 'inclusion') => {
    const targetMachine = tabs[targetTabIndex]
    if (!targetMachine) return
    runWorkerTask({ type, m1: machine, m2: targetMachine })
  }

  const handleHighlightReachability = () => {
    if (!reachabilityResult) return
    const { unreachable, dead, sink } = reachabilityResult
    const highlights: Record<string, 'unreachable' | 'dead' | 'sink'> = {}
    unreachable.forEach(id => highlights[id] = 'unreachable')
    dead.forEach(id => {
       if (sink.includes(id)) {
         highlights[id] = 'sink'
       } else {
         highlights[id] = 'dead'
       }
    })
    setAnalysisHighlights(highlights)
    onClose()
  }

  const renderReachability = () => {
    const deadOnly = reachabilityResult ? reachabilityResult.dead.filter(id => !reachabilityResult.sink.includes(id)) : []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Identify states that are unreachable from the start state, dead (cannot reach an accept state), or sinks (dead states with only self-loops).
        </div>
        
        {!reachabilityResult && !error && (
          <button onClick={handleRunReachability} style={primaryBtn} disabled={isComputing}>
            {isComputing ? 'Analyzing...' : 'Run Reachability Analysis'}
          </button>
        )}

        {error && <ErrorBox message={error} />}

        {reachabilityResult && (
          <>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <StatBox label="Unreachable" count={reachabilityResult.unreachable.length} />
              <StatBox label="Dead" count={deadOnly.length} />
              <StatBox label="Sink" count={reachabilityResult.sink.length} />
            </div>
            <button onClick={handleHighlightReachability} style={primaryBtn}>
              Highlight on Canvas
            </button>
          </>
        )}
      </div>
    )
  }

  const renderEmptiness = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Determine if the language accepted by the machine is empty.
        </div>

        {!emptinessResult && !error && (
          <button onClick={handleRunEmptiness} style={primaryBtn} disabled={isComputing}>
            {isComputing ? 'Checking...' : 'Check Emptiness'}
          </button>
        )}

        {error && <ErrorBox message={error} />}

        {emptinessResult && (
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            {emptinessResult.isEmpty ? (
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                L(M) = ∅ (The language is empty)
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  The language is NOT empty.
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Shortest witness string:
                </div>
                <pre style={{ margin: '4px 0 0', padding: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}>
                  {emptinessResult.witness === '' ? '(empty string ε)' : emptinessResult.witness}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderCompare = (type: 'equivalence' | 'inclusion') => {
    const targetMachine = tabs[targetTabIndex]
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {type === 'equivalence' 
            ? 'Check if the current machine and a target machine recognize the exact same language.'
            : 'Check if the language of the current machine is a subset of the target machine.'}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Target Machine (M2):</label>
          <select 
            value={targetTabIndex} 
            onChange={(e) => setTargetTabIndex(Number(e.target.value))}
            style={{
              padding: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {tabs.map((t, i) => (
              <option key={t.id} value={i} disabled={i === activeTabIndex}>
                {t.name} {i === activeTabIndex ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {tabs.length < 2 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            You need to have at least two machines open in separate tabs to compare them.
          </div>
        )}

        {targetMachine && tabs.length >= 2 && !compareResult && !error && (
          <button onClick={() => handleRunCompare(type)} style={primaryBtn} disabled={isComputing}>
            {isComputing ? 'Comparing...' : 'Run Comparison'}
          </button>
        )}

        {error && <ErrorBox message={error} />}

        {compareResult && (
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            {type === 'equivalence' ? (
               compareResult.result ? (
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Yes, L(M1) = L(M2)</div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--status-reject)' }}>No, they are not equivalent.</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Counterexample:</div>
                  <pre style={{ margin: '4px 0 0', padding: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}>{compareResult.counterexample === '' ? '(empty string ε)' : compareResult.counterexample}</pre>
                </div>
              )
            ) : (
               compareResult.result ? (
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Yes, L(M1) ⊆ L(M2)</div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--status-reject)' }}>No, L(M1) is not a subset of L(M2).</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Counterexample (in M1 but not M2):</div>
                  <pre style={{ margin: '4px 0 0', padding: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)' }}>{compareResult.counterexample === '' ? '(empty string ε)' : compareResult.counterexample}</pre>
                </div>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog
      onClose={onClose}
      label="Analysis Tools"
      cardStyle={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        width: '560px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={headerStyle}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>Analysis Tools</div>
        <button onClick={onClose} aria-label="Close" style={ghostBtn}>×</button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)' }}>
        <TabBtn active={activeTab === 'reachability'} onClick={() => setActiveTab('reachability')}>Reachability</TabBtn>
        <TabBtn active={activeTab === 'emptiness'} onClick={() => setActiveTab('emptiness')}>Emptiness</TabBtn>
        <TabBtn active={activeTab === 'equivalence'} onClick={() => setActiveTab('equivalence')}>Equivalence</TabBtn>
        <TabBtn active={activeTab === 'inclusion'} onClick={() => setActiveTab('inclusion')}>Inclusion</TabBtn>
      </div>

      <div style={{ padding: '16px', overflow: 'auto' }}>
        {activeTab === 'reachability' && renderReachability()}
        {activeTab === 'emptiness' && renderEmptiness()}
        {activeTab === 'equivalence' && renderCompare('equivalence')}
        {activeTab === 'inclusion' && renderCompare('inclusion')}
      </div>
    </Dialog>
  )
}

function StatBox({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{count}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        fontSize: '12px',
        color: 'var(--status-reject)',
        border: '1px solid var(--status-reject)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 12px',
        background: 'var(--status-reject-soft)',
      }}
    >
      {message}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const headerStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '18px',
  lineHeight: 1,
  padding: '2px 8px',
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontWeight: 600,
  padding: '7px 16px',
  cursor: 'pointer',
  width: '100%',
}
