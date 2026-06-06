// ============================================================
// SidePanel — Right sidebar. Plain B&W. Tabs: History, Validate, Info.
// ============================================================

import { useUIStore } from '@/store/uiStore'
import { useMachineStore } from '@/store/machineStore'
import { useSimulationStore } from '@/store/simulationStore'
import HistoryLog from './HistoryLog'
import ValidationPanel from './ValidationPanel'

type Tab = 'history' | 'validation' | 'info'

const TABS: { id: Tab; label: string }[] = [
  { id: 'history',    label: 'History' },
  { id: 'validation', label: 'Validate' },
  { id: 'info',       label: 'Info' },
]

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

  return (
    <aside style={{
      width: '230px',
      flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
      }}>
        {TABS.map((tab) => (
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
        {activePanel === 'info'       && <InfoPanel />}
      </div>
    </aside>
  )
}
