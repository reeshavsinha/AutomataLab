// ============================================================
// TransitionEditor — Modal for editing outgoing transitions from a state
// Finite automata: edit comma-separated symbols per transition.
// PDA: edit the (read, pop → push) triple per transition.
// Plain black & white, no animations.
// ============================================================

import { useMachineStore } from '@/store/machineStore'
import FiniteAutomataEditor from '@/components/canvas/editors/FiniteAutomataEditor'
import PDAEditor from '@/components/canvas/editors/PDAEditor'
import TMEditor from '@/components/canvas/editors/TMEditor'
import LBAEditor from '@/components/canvas/editors/LBAEditor'
import Dialog from '@/components/common/Dialog'

interface TransitionEditorProps {
  /** stateId whose outgoing transitions we are editing */
  stateId: string
  onClose: () => void
}

export default function TransitionEditor({ stateId, onClose }: TransitionEditorProps) {
  const machine = useMachineStore((s) => s.machine)
  const state = machine.states.find((s) => s.id === stateId)

  if (!state) return null

  const renderEditor = () => {
    switch (machine.type) {
      case 'DFA':
      case 'NFA':
      case 'ENFA':
        return <FiniteAutomataEditor stateId={stateId} onClose={onClose} />
      case 'DPDA':
      case 'NPDA':
        return <PDAEditor stateId={stateId} onClose={onClose} />
      case 'TM':
      case 'MTM':
        return <TMEditor stateId={stateId} onClose={onClose} />
      case 'LBA':
        return <LBAEditor stateId={stateId} onClose={onClose} />
      default:
        return null
    }
  }

  const getSubTitle = () => {
    switch (machine.type) {
      case 'TM':
        return machine.tapeCount && machine.tapeCount > 1
          ? `Format per tape (T1–T${machine.tapeCount}): read → write, dir. Blank read/write = the blank symbol.`
          : 'Format: read → write, dir. Leave read/write blank for the blank symbol.'
      case 'MTM':
        return 'One shared head reads and writes the full track vector, then moves L/R/S.'
      case 'LBA':
        return 'Format: read → write, dir. Leave read/write blank for the blank symbol.'
      case 'DPDA':
      case 'NPDA':
        return 'Format: read, pop → push. Leave a field blank for ε.'
      default:
        return 'Edit symbols for each transition leaving this state'
    }
  }

  return (
    <Dialog
      onClose={onClose}
      label={`Outgoing transitions for ${state.label}`}
      cardStyle={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '0',
          minWidth: '440px',
          maxWidth: '560px',
          width: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
      }}
    >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>
              Outgoing Transitions — {state.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              {getSubTitle()}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close outgoing transitions editor"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Editor Body */}
        {renderEditor()}

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              padding: '6px 18px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
    </Dialog>
  )
}
