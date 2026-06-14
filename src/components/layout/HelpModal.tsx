// ============================================================
// HelpModal — Quick-start guide + keyboard shortcut cheat sheet.
// Opened from the toolbar "?" button. Improves first-run learnability.
// ============================================================

interface HelpModalProps {
  onClose: () => void
}

const codeStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '3px',
  padding: '1px 4px',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-primary)',
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + N', action: 'New machine (new tab)' },
  { keys: 'Ctrl + O', action: 'Open a machine file' },
  { keys: 'Ctrl + S', action: 'Save' },
  { keys: 'Ctrl + Shift + S', action: 'Save As…' },
  { keys: 'Ctrl + T / Ctrl + W', action: 'New tab / Close tab' },
  { keys: 'Right-click / N / ◯ tool', action: 'Add a state' },
  { keys: 'Drag the connection dot', action: 'Create a transition (hover a state, drag its rim dot)' },
  { keys: '↗ tool', action: 'Create a transition (click source, then target)' },
  { keys: 'Double-click', action: 'Rename a state / edit a label' },
  { keys: 'Delete / Backspace', action: 'Delete selection' },
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Y / Ctrl + Shift + Z', action: 'Redo' },
  { keys: 'Ctrl + C / X / V', action: 'Copy / Cut / Paste' },
  { keys: 'Ctrl + A', action: 'Select all' },
  { keys: 'Space / P', action: 'Play / Pause simulation' },
  { keys: '→ / S', action: 'Step forward' },
  { keys: '←', action: 'Step back' },
  { keys: 'R', action: 'Reset simulation' },
  { keys: 'Esc', action: 'Cancel current action' },
]

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3500,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          width: '520px',
          maxWidth: '92vw',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Fixed header — stays put while the body scrolls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>Getting Started</div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '18px 24px 24px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
            1. <strong style={{ color: 'var(--text-primary)' }}>Add a state</strong>: right-click the canvas, press <strong style={{ color: 'var(--text-primary)' }}>N</strong>, or pick the <strong style={{ color: 'var(--text-primary)' }}>◯</strong> tool from the left palette and click.<br />
            2. <strong style={{ color: 'var(--text-primary)' }}>Create a transition</strong>: hover a state and drag the <strong style={{ color: 'var(--text-primary)' }}>connection dot</strong> on its rim onto another state (or use the <strong style={{ color: 'var(--text-primary)' }}>↗</strong> tool, then click source then target), then type its symbol(s).<br />
            3. Set the <strong style={{ color: 'var(--text-primary)' }}>start</strong> and <strong style={{ color: 'var(--text-primary)' }}>final</strong> states via right-click.<br />
            4. Type an input string up top and press <strong style={{ color: 'var(--text-primary)' }}>▶</strong> or <strong style={{ color: 'var(--text-primary)' }}>Step</strong> to simulate.
          </div>

          <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Machine Types
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Pick a type from the toolbar: <strong style={{ color: 'var(--text-primary)' }}>DFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>NFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>ε-NFA</strong>, <strong style={{ color: 'var(--text-primary)' }}>DPDA</strong>, <strong style={{ color: 'var(--text-primary)' }}>NPDA</strong>, <strong style={{ color: 'var(--text-primary)' }}>TM</strong>, and <strong style={{ color: 'var(--text-primary)' }}>LBA</strong>. The transition editor and panels adapt to the type you choose.
          </div>

          <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Turing Machines &amp; LBA
          </div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
            • <strong style={{ color: 'var(--text-primary)' }}>Transitions</strong> use the form <code style={codeStyle}>read → write, dir</code>, where <code style={codeStyle}>dir</code> is <strong style={{ color: 'var(--text-primary)' }}>L</strong>, <strong style={{ color: 'var(--text-primary)' }}>R</strong>, or <strong style={{ color: 'var(--text-primary)' }}>S</strong> (stay). A blank read/write means the blank symbol. Double-click a state or edge to open the transition editor.<br />
            • The <strong style={{ color: 'var(--text-primary)' }}>Tape</strong> tab shows the tape, the head (▲), the current state, and the instantaneous description. The <strong style={{ color: 'var(--text-primary)' }}>Input</strong> bar seeds the initial tape.<br />
            • TM/LBA are <strong style={{ color: 'var(--text-primary)' }}>deterministic</strong>: a run <strong style={{ color: 'var(--text-primary)' }}>accepts</strong> on an accept state, <strong style={{ color: 'var(--text-primary)' }}>rejects</strong> on a reject state or when no move applies. Mark a <strong style={{ color: 'var(--text-primary)' }}>reject state</strong> via right-click (TM/LBA only).<br />
            • <strong style={{ color: 'var(--text-primary)' }}>BLANK</strong> and <strong style={{ color: 'var(--text-primary)' }}>LIMIT</strong> (toolbar) set the blank symbol and the step limit. Exceeding the limit halts the run as <strong style={{ color: 'var(--text-primary)' }}>stuck</strong> (infinite-loop guard).<br />
            • <strong style={{ color: 'var(--text-primary)' }}>Multi-tape</strong> (TM only): set <strong style={{ color: 'var(--text-primary)' }}>TAPES</strong> in the toolbar. Each transition then reads/writes one symbol per tape (<code style={codeStyle}>a → b, R | _ → c, L</code>) and fires only when every tape matches. The input seeds tape&nbsp;1; the Tape tab shows one row per tape.<br />
            • An <strong style={{ color: 'var(--text-primary)' }}>LBA</strong> confines the head to the input cells (between the <code style={codeStyle}>⊢ ⊣</code> markers); moving past either end halts and rejects.
          </div>

          <div style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Keyboard &amp; Mouse
          </div>
          <div>
            {SHORTCUTS.map((s) => (
              <div
                key={s.action}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
                <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{s.keys}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
