// ============================================================
// EpsilonInserter — shared ε / λ insert dropdown (ε-NFA only).
// Inserts the chosen symbol at the caret of the target <input> and
// returns the new value via onInsert. Used by both the inline edge
// label editor and the transition-editor modal.
// ============================================================

const SYMBOLS = [
  { char: 'ε', label: 'ε (epsilon)' },
  { char: 'λ', label: 'λ (lambda)' },
]

export default function EpsilonInserter({
  targetRef,
  open,
  setOpen,
  onInsert,
  size = 'md',
}: {
  targetRef: React.RefObject<HTMLInputElement | null>
  open: boolean
  setOpen: (v: boolean) => void
  /** Receives the full new input value with the symbol inserted at the caret. */
  onInsert: (newValue: string) => void
  /** 'sm' for the compact inline edge label, 'md' for the modal. */
  size?: 'sm' | 'md'
}) {
  const insert = (char: string) => {
    const input = targetRef.current
    if (!input) return
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const val = input.value
    const newVal = val.substring(0, start) + char + val.substring(end)
    onInsert(newVal)
    setOpen(false)
    setTimeout(() => {
      input.focus()
      const pos = start + 1
      input.setSelectionRange(pos, pos)
    }, 0)
  }

  const isSm = size === 'sm'

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(!open)
        }}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: isSm ? '11px' : '12px',
          padding: isSm ? '2px 6px' : '5px 8px',
          cursor: 'pointer',
          height: isSm ? '22px' : '31px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        ε/λ
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          marginTop: '4px',
          minWidth: '90px',
        }}>
          {SYMBOLS.map(({ char, label }) => (
            <button
              key={char}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                insert(char)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px 10px',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
