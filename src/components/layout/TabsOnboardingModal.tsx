import type { CSSProperties } from 'react'
import Dialog from '@/components/common/Dialog'

const STORAGE_KEY = 'automatalab.tabs-onboarding-v3'

export function hasSeenTabsOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // If storage is blocked, still try to show the intro once per session.
    return false
  }
}

export function markTabsOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

const cardShell: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-lg)',
  width: 'min(520px, 94vw)',
  maxHeight: 'min(88vh, 640px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: 'var(--font-sans, inherit)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-lg)',
  isolation: 'isolate',
}

export default function TabsOnboardingModal({
  onClose,
  /** When false (Help → replay), closing does not write localStorage. */
  persistSeen = true,
}: {
  onClose: () => void
  persistSeen?: boolean
}) {
  const dismiss = () => {
    if (persistSeen) markTabsOnboardingSeen()
    onClose()
  }

  return (
    <Dialog
      onClose={dismiss}
      labelledBy="workspace-intro-title"
      zIndex={4500}
      closeOnBackdrop={false}
      cardStyle={cardShell}
    >
      <header
        style={{
          padding: '20px 22px 0',
          flexShrink: 0,
        }}
      >
        <h2
          id="workspace-intro-title"
          style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 700,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
          }}
        >
          How AutomataLab is organized
        </h2>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '13px',
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
          }}
        >
          One browser tab can hold many file tabs. Three workspaces share grammar text; machines use their own tabs.
        </p>
      </header>

      <div
        style={{
          padding: '16px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {WORKSPACE_ROWS.map((row) => (
          <div
            key={row.studio}
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {row.n}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.studio}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.hubLabel}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                {row.blurb}
              </div>
            </div>
          </div>
        ))}

        <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.55, color: 'var(--text-muted)' }}>
          <kbd style={kbdStyle}>F1</kbd> workspace help · <kbd style={kbdStyle}>F2</kbd> theory handbook
        </p>
      </div>

      <footer
        style={{
          flexShrink: 0,
          padding: '14px 22px 18px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button type="button" onClick={dismiss} style={primaryBtn}>
          Got it
        </button>
      </footer>
    </Dialog>
  )
}

const WORKSPACE_ROWS = [
  {
    n: '1',
    studio: 'Machine Studio',
    hubLabel: 'Hub card: Finite Automata & PDA Simulator',
    blurb: 'Graph canvas, tape/stack, simulation, and conversions.',
  },
  {
    n: '2',
    studio: 'Grammar Lab',
    hubLabel: 'Hub card: Grammar Laboratory',
    blurb: 'Regex and Types 0–3 grammars, analysis, derivations, and transforms.',
  },
  {
    n: '3',
    studio: 'Parser Studio',
    hubLabel: 'Hub card: Parser Studio',
    blurb: 'Same grammar text as Grammar Lab; parse tables, stepping, and trees.',
  },
] as const

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  padding: '1px 5px',
  borderRadius: '4px',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
}

const primaryBtn: CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--text-primary)',
  color: 'var(--bg-primary)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '13px',
}
