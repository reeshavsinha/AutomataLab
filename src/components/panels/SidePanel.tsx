// ============================================================
// SidePanel — Right sidebar. Plain B&W. Tabs (machine-type aware):
// δ (transition table), History, Validate, Stack/Tape/Tree, Info.
// Collapsible to a thin reopen strip; the active tab persists across sessions.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { isPDAType, isTMType, supportsComputationTree } from '@/engines/core/utils'
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

  // Live validation counts → a badge on the Validate tab so problems are
  // visible without opening the panel (UX audit FLO-1).
  const issues = useMemo(() => {
    const errs = validateMachine(machine)
    return {
      errors: errs.filter((e) => e.severity === 'error').length,
      warnings: errs.filter((e) => e.severity === 'warning').length,
    }
  }, [machine])

  // Width is user-resizable (persisted). Until the user drags, stack-machine
  // and tree views default wider since their content is denser.
  const [userWidth, setUserWidth] = useState<number | null>(() => {
    if (typeof localStorage === 'undefined') return null
    const n = parseInt(localStorage.getItem(WIDTH_KEY) ?? '', 10)
    return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)) : null
  })

  const width = userWidth ?? (isPDA || hasTree || isTM ? 300 : 240)

  useEffect(() => {
    if (userWidth != null && typeof localStorage !== 'undefined') {
      localStorage.setItem(WIDTH_KEY, String(userWidth))
    }
  }, [userWidth])

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    const onMove = (ev: PointerEvent) => {
      // Panel is on the right, so dragging the handle left widens it.
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (startX - ev.clientX)))
      setUserWidth(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    // pointercancel covers gestures interrupted outside the window so the
    // move listener can't leak and keep resizing on the next click.
    window.addEventListener('pointercancel', onUp)
  }, [width])

  const tabs: { id: Tab; label: string; title?: string }[] = [
    { id: 'delta',      label: 'δ',        title: 'Transition table (δ) — every move, grouped by state' },
    { id: 'history',    label: 'History',  title: 'Run history — each step of the last simulation' },
    { id: 'validation', label: 'Validate', title: 'Validation — errors and warnings (click to locate)' },
    ...(isPDA ? [{ id: 'stack' as Tab, label: 'Stack', title: 'PDA stack + instantaneous description' }] : []),
    ...(isTM ? [{ id: 'tape' as Tab, label: 'Tape', title: 'Turing tape, head, and instantaneous description' }] : []),
    ...(hasTree ? [{ id: 'tree' as Tab, label: 'Tree', title: 'Computation tree / trellis of branches' }] : []),
    { id: 'info',       label: 'Info',     title: 'Machine summary and simulation status' },
  ]

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
          width: '26px',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-default)',
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
          style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
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
    <aside style={{
      width: `${width}px`,
      flexShrink: 0,
      position: 'relative',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Resize handle */}
      <div
        onPointerDown={startResize}
        title="Drag to resize"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          marginLeft: '-3px',
          cursor: 'col-resize',
          zIndex: 20,
        }}
      />
      {/* Tab bar */}
      <div role="tablist" aria-label="Side panel" style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}>
        {tabs.map((tab) => {
          const selected = activePanel === tab.id
          const showBadge = tab.id === 'validation' && (issues.errors > 0 || issues.warnings > 0)
          return (
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
                padding: '8px 4px',
                border: 'none',
                background: 'transparent',
                borderBottom: `2px solid ${selected ? 'var(--text-primary)' : 'transparent'}`,
                color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.03em',
              }}
            >
              {tab.label}
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
                  }}
                >
                  {issues.errors > 0 ? issues.errors : issues.warnings}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={togglePanel}
          title="Collapse panel"
          aria-label="Collapse side panel"
          style={{
            flexShrink: 0,
            width: '24px',
            border: 'none',
            borderLeft: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ›
        </button>
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
