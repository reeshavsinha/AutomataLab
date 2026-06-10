// ============================================================
// SidePanel — Right sidebar. Plain B&W. Tabs: History, Validate, Info.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import { isPDAType, supportsComputationTree } from '@/engines/core/utils'
import HistoryLog from './HistoryLog'
import ValidationPanel from './ValidationPanel'
import StackPanel from './StackPanel'
import ComputationTreePanel from './ComputationTreePanel'

type Tab = 'history' | 'validation' | 'info' | 'stack' | 'tree'

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
  const { activePanel, setActivePanel } = useUIStore()
  const machineType = useMachineStore((s) => s.machine.type)
  const isPDA = isPDAType(machineType)
  const hasTree = supportsComputationTree(machineType)

  // Width is user-resizable (persisted). Until the user drags, stack-machine
  // and tree views default wider since their content is denser.
  const [userWidth, setUserWidth] = useState<number | null>(() => {
    if (typeof localStorage === 'undefined') return null
    const n = parseInt(localStorage.getItem(WIDTH_KEY) ?? '', 10)
    return Number.isFinite(n) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n)) : null
  })

  const width = userWidth ?? (isPDA || hasTree ? 300 : 240)

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'history',    label: 'History' },
    { id: 'validation', label: 'Validate' },
    ...(isPDA ? [{ id: 'stack' as Tab, label: 'Stack' }] : []),
    ...(hasTree ? [{ id: 'tree' as Tab, label: 'Tree' }] : []),
    { id: 'info',       label: 'Info' },
  ]

  // If a context-specific tab is active but no longer applies, fall back to History.
  useEffect(() => {
    if (activePanel === 'stack' && !isPDA) {
      setActivePanel('history')
    } else if (activePanel === 'tree' && !hasTree) {
      setActivePanel('history')
    }
  }, [activePanel, isPDA, hasTree, setActivePanel])

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
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              background: 'transparent',
              borderBottom: `2px solid ${activePanel === tab.id ? 'var(--text-primary)' : 'transparent'}`,
              color: activePanel === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.03em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePanel === 'history'    && <HistoryLog />}
        {activePanel === 'validation' && <ValidationPanel />}
        {activePanel === 'stack'      && <StackPanel />}
        {activePanel === 'tree'       && <ComputationTreePanel />}
        {activePanel === 'info'       && <InfoPanel />}
      </div>
    </aside>
  )
}
