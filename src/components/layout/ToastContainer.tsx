// ============================================================
// ToastContainer — Renders the stack of active toasts (bottom-right).
// Each toast slides in, auto-dismisses, and is colour-coded by type.
// ============================================================

import { useEffect } from 'react'
import { useToastStore, type Toast, type ToastType } from '@/store/toastStore'

const ACCENT: Record<ToastType, string> = {
  success: 'var(--status-accept)',
  error: 'var(--status-reject)',
  warning: 'var(--status-running)',
  info: 'var(--border-strong)',
}

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const accent = ACCENT[toast.type]

  useEffect(() => {
    if (toast.duration <= 0) return
    const timer = setTimeout(() => removeToast(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        minWidth: '240px',
        maxWidth: '360px',
        padding: '10px 12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
        pointerEvents: 'all',
        animation: 'toast-in 160ms ease-out',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: accent,
          color: 'var(--bg-card)',
          fontSize: '10px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '1px',
        }}
      >
        {ICON[toast.type]}
      </span>
      <span style={{ flex: 1, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
        {toast.message}
      </span>
      <button
        onClick={() => removeToast(toast.id)}
        title="Dismiss"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '12px',
          lineHeight: 1,
          padding: '2px',
        }}
      >
        ✕
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 4000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
