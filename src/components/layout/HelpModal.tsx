// ============================================================
// HelpModal — Quick-start guide + keyboard shortcut cheat sheet.
// Opened from the toolbar "?" button. Improves first-run learnability.
// ============================================================

interface HelpModalProps {
  onClose: () => void
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + N', action: 'New machine (new tab)' },
  { keys: 'Ctrl + O', action: 'Open a machine file' },
  { keys: 'Ctrl + S', action: 'Save' },
  { keys: 'Ctrl + Shift + S', action: 'Save As…' },
  { keys: 'Ctrl + T / Ctrl + W', action: 'New tab / Close tab' },
  { keys: 'Right-click / N', action: 'Add a state' },
  { keys: 'Drag from a state', action: 'Create a transition' },
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
            1. <strong style={{ color: 'var(--text-primary)' }}>Right-click</strong> the canvas (or press <strong style={{ color: 'var(--text-primary)' }}>N</strong>) to add a state.<br />
            2. <strong style={{ color: 'var(--text-primary)' }}>Drag from one state to another</strong> to create a transition, then type its symbol(s).<br />
            3. Set the <strong style={{ color: 'var(--text-primary)' }}>start</strong> and <strong style={{ color: 'var(--text-primary)' }}>final</strong> states via right-click.<br />
            4. Type an input string up top and press <strong style={{ color: 'var(--text-primary)' }}>▶</strong> or <strong style={{ color: 'var(--text-primary)' }}>Step</strong> to simulate.
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
