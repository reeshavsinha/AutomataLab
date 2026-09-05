import { useSimulationStore } from '@/store/simulationStore'
import { useMachineStore } from '@/store/machineStore'

export default function OutputTracePanel() {
  const outputTrace = useSimulationStore((s) => s.outputTrace)
  const machine = useMachineStore((s) => s.machine)

  if (outputTrace.length === 0) {
    return (
      <div style={emptyStyle}>
        <div>No output yet.</div>
        <div style={{ fontSize: '11px' }}>
          {machine.type === 'MOORE' ? 'The initial state output appears after initialization.' : 'Run a transducer to produce output.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
        {machine.type === 'MOORE' ? 'Initial state + destination-state outputs' : 'Transition outputs'}
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
      }}>
        {outputTrace.map((output, index) => (
          <span key={`${index}-${output}`} style={{
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 7px',
            color: 'var(--text-primary)',
            background: index === 0 && machine.type === 'MOORE' ? 'var(--bg-elevated)' : 'transparent',
          }}>
            {output}
          </span>
        ))}
      </div>
      <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        Output string: {outputTrace.join(' ')}
      </div>
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: '6px',
  color: 'var(--text-muted)',
  fontSize: '12px',
  padding: '24px',
  textAlign: 'center',
  fontFamily: 'var(--font-mono)',
}
