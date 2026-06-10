// ============================================================
// Toast Store — Zustand
// Lightweight, non-blocking notifications shown bottom-right.
// Replaces raw window.alert() for informational messages.
// ============================================================

import { create } from 'zustand'
import { generateId } from '@/engines/core/utils'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  /** Auto-dismiss delay in ms. 0 keeps it until manually closed. */
  duration: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => string
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message, duration = 3500) => {
    const id = generateId('toast')
    // Guard against NaN/Infinity/negative durations (e.g. computed delays) which
    // would otherwise make the timer fire immediately or never. 0 = keep open.
    const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : 3500
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration: safeDuration }] }))
    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/**
 * Convenience helpers usable from anywhere (components or plain modules)
 * without needing the hook. They read the store via getState().
 */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast('success', message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast('error', message, duration ?? 5000),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast('info', message, duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast('warning', message, duration ?? 4500),
}
