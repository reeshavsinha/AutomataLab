// ============================================================
// SidePanel — Right sidebar. Plain B&W. Tabs (machine-type aware):
// δ (transition table), History, Validate, Stack/Tape/Tree, Info.
// Collapsible to a thin reopen strip; the active tab persists across sessions.
// ============================================================

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { isPDAType, isTMType, supportsComputationTree } from '@/engines/machine/core/utils'
import { validateMachine } from '@/utils/validator'
import HistoryLog from './HistoryLog'
import ValidationPanel from './ValidationPanel'
import StackPanel from './StackPanel'
import ComputationTreePanel from './ComputationTreePanel'
import TapePanel from './TapePanel'
import DeltaTablePanel from './DeltaTablePanel'

type Tab = 'history' | 'validation' | 'info' | 'stack' | 'tree' | 'tape' | 'delta'

const WIDTH_KEY = 'automatalab-panel-width'
const MIN_WIDTH = 220
const MAX_WIDTH = 560

function InfoPanel() {
  const { machine } = useMachineStore()
  const { status, stepCount } = useSimulationStore()

  const rows = [
    { label: 'Type',         value: machine.type },
    { label: 'States',       value: machine.states.length },
    { label: 'Transitions',  value: machine.transitions.length },
    { label: 'Start State',  value: machine.states.find((s) => s.isStart)?.label ?? 'None' },
    { label: 'Accept States',value: machine.states.filter((s) => s.isAccept).map((s) => s.label).join(', ') || 'None' },
    { label: 'Sim Status',   value: status },
    { label: 'Steps Taken',  value: stepCount },
  ]

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '7px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
          <span style={{ color: 'var(--text-primary)' }}>{String(row.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function SidePanel() {
  const activePanel = useUIStore((s) => s.activePanel)
  const setActivePanel = useUIStore((s) => s.setActivePanel)
  const panelCollapsed = useUIStore((s) => s.panelCollapsed)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const machine = useMachineStore((s) => s.machine)
  const machineType = machine.type
  const isPDA = isPDAType(machineType)
  const isTM = isTMType(machineType)
  const hasTree = supportsComputationTree(machineType)

  const [isCompressed, setIsCompressed] = useState(false)
  const containerRef = useRef<HTMLElement>(null)

  // Live validation counts → a badge on the Validate tab so problems are
  // visible without opening the panel (UX audit FLO-1).
  const issues = useMemo(() => {
    const errs = validateMachine(machine)
    return {
      errors: errs.filter((e) => e.severity === 'error').length,
      warnings: errs.filter((e) => e.severity === 'warning').length,
    }
  }, [machine])

  const tabs: { id: Tab; label: string; title?: string }[] = [
    { id: 'delta',      label: 'δ',        title: 'Transition table (δ) — every move, grouped by state' },
    { id: 'history',    label: 'History',  title: 'Run history — each step of the last simulation' },
    { id: 'validation', label: 'Validate', title: 'Validation — errors and warnings (click to locate)' },
    ...(isPDA ? [{ id: 'stack' as Tab, label: 'Stack', title: 'PDA stack + instantaneous description' }] : []),
    ...(isTM ? [{ id: 'tape' as Tab, label: 'Tape', title: 'Turing tape, head, and instantaneous description' }] : []),
    ...(hasTree ? [{ id: 'tree' as Tab, label: 'Tree', title: 'Computation tree / trellis of branches' }] : []),
    { id: 'info',       label: 'Info',     title: 'Machine summary and simulation status' },
  ]

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setIsCompressed(entry.contentRect.width < tabs.length * 55)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [tabs.length])

  // If a context-specific tab no longer applies (e.g. NFA→DFA drops Tree), fall
  // back to δ — the always-present machine definition — rather than History.
  useEffect(() => {
    if (activePanel === 'stack' && !isPDA) {
      setActivePanel('delta')
    } else if (activePanel === 'tree' && !hasTree) {
      setActivePanel('delta')
    } else if (activePanel === 'tape' && !isTM) {
      setActivePanel('delta')
    }
  }, [activePanel, isPDA, isTM, hasTree, setActivePanel])

  // Collapsed → a thin reopen strip so the canvas can use the full width
  // (UX audit NAV-1).
  if (panelCollapsed) {
    return (
      <aside
        style={{
          width: '100%',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '8px',
        }}
      >
        <button
          onClick={togglePanel}
          title="Show panel"
          aria-label="Show side panel"
          style={{ 
            border: 'none', 
            background: 'transparent', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            fontSize: '18px',
            width: '100%',
            padding: '16px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          ‹
        </button>
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
          }}
        >
          Panels
        </span>
      </aside>
    )
  }

  return (
    <aside ref={containerRef} style={{
      width: '100%',
      height: '100%',
      flexShrink: 0,
      position: 'relative',
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div role="tablist" aria-label="Side panel" className="workspace-sidepanel-tablist" style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}>
        {/* We can hide the webkit scrollbar in css if needed, but inline styles for scrollbar-width cover Firefox/Edge */}
        <style>{`
          .workspace-sidepanel-tablist::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <button
          onClick={togglePanel}
          title="Collapse panel"
          aria-label="Collapse side panel"
          style={{
            flexShrink: 0,
            width: '24px',
            border: 'none',
            borderRight: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ›
        </button>
        {tabs.map((tab, idx) => {
          const selected = activePanel === tab.id
          const showBadge = tab.id === 'validation' && (issues.errors > 0 || issues.warnings > 0)
          const displayLabel = isCompressed && tab.label !== 'δ' ? tab.label.charAt(0) : tab.label
          
          return [
            idx > 0 && (
              <div
                key={`${tab.id}-sep`}
                style={{
                  width: '1px',
                  height: '14px',
                  backgroundColor: 'var(--border-strong)',
                  alignSelf: 'center',
                  opacity: 0.4,
                  flexShrink: 0
                }}
              />
            ),
            <button
              key={tab.id}
              role="tab"
              aria-selected={selected}
              title={tab.title}
              onClick={() => setActivePanel(tab.id)}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 2px',
                border: 'none',
                background: 'transparent',
                borderBottom: `2px solid ${selected ? 'var(--text-primary)' : 'transparent'}`,
                color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
                minWidth: isCompressed ? '32px' : '48px', // Ensure tabs do not retract completely
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayLabel}
              </span>
              {showBadge && (
                <span
                  aria-label={`${issues.errors} error(s), ${issues.warnings} warning(s)`}
                  style={{
                    minWidth: '15px',
                    height: '15px',
                    padding: '0 3px',
                    borderRadius: '8px',
                    background: issues.errors > 0 ? 'var(--status-reject)' : 'var(--status-running)',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    lineHeight: '15px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  {issues.errors > 0 ? issues.errors : issues.warnings}
                </span>
              )}
            </button>
          ]
        })}
      </div>

      <div role="tabpanel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePanel === 'delta'      && <DeltaTablePanel />}
        {activePanel === 'history'    && <HistoryLog />}
        {activePanel === 'validation' && <ValidationPanel />}
        {activePanel === 'stack'      && <StackPanel />}
        {activePanel === 'tape'       && <TapePanel />}
        {activePanel === 'tree'       && <ComputationTreePanel />}
        {activePanel === 'info'       && <InfoPanel />}
      </div>
    </aside>
  )
}
