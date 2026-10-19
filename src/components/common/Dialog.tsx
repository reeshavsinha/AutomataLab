// ============================================================
// Dialog — the shared accessible modal shell (UX audit A11Y-1).
//
// Every modal (Help, Export, Convert, Batch) renders its content inside this
// shell so they all get, for free:
//   • role="dialog" + aria-modal so assistive tech announces modality
//   • Esc-to-close (capture phase, so it pre-empts the canvas/menubar global
//     keydown handlers that would otherwise also fire on Esc)
//   • a focus trap that keeps Tab inside the dialog
//   • focus restored to whatever was focused before the dialog opened
//   • click-outside (backdrop) to close
//
// The caller supplies the card chrome via `cardStyle` and the header/body as
// children, so existing modal layouts are preserved.
// ============================================================

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  onClose: () => void
  children: ReactNode
  /** Accessible name. Provide `label` or `labelledBy`. */
  label?: string
  /** id of the element that titles the dialog (takes precedence over `label`). */
  labelledBy?: string
  /** Styles merged onto the dialog card container. */
  cardStyle?: CSSProperties
  /** Backdrop stacking order (Help sits above the others at 3500). */
  zIndex?: number
  /** When false, clicking the dimmed backdrop does not call onClose. */
  closeOnBackdrop?: boolean
  /** When false, Escape does not call onClose. */
  closeOnEscape?: boolean
}

export default function Dialog({
  onClose,
  children,
  label,
  labelledBy,
  cardStyle,
  zIndex = 2000,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const card = cardRef.current
    const firstFocusable = card?.querySelector<HTMLElement>(FOCUSABLE)
    // Focus inside the dialog so screen readers enter it and Esc/Tab apply.
    ;(firstFocusable ?? card)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !card) return
      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) {
        e.preventDefault()
        card.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    // Capture phase so this wins over the window-level keydown handlers in the
    // canvas / menubar / toolbar (all bubble-phase).
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [closeOnEscape])

  const shell = (
    <div
      onClick={() => {
        if (closeOnBackdrop) onCloseRef.current()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={cardRef}
        className="selectable-text"
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ outline: 'none', userSelect: 'text', WebkitUserSelect: 'text', ...cardStyle }}
      >
        {children}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(shell, document.body) : shell
}
