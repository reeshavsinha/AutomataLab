import type { MachineType } from '@/engines/machine/core/types'

/** Features intentionally exposed by the small hosted simulator. */
export const DEMO_MACHINE_TYPES = [
  'DFA',
  'NFA',
  'ENFA',
  'DPDA',
  'NPDA',
  'TM',
  'LBA',
] as const satisfies readonly MachineType[]

/** Keep the hosted demo's original short, representative example menu. */
export const DEMO_EXAMPLE_KEYS = [
  'dfaEvenZeros',
  'nfaEndsIn11',
  'npdaBalancedParens',
  'tmAnBnCn',
] as const

const DEMO_SESSION_KEY = 'automatalab.demo'

/**
 * True in the Tauri desktop webview. Prefer the runtime global (always present in
 * `tauri dev`); `TAURI_ENV_PLATFORM` alone is not reliable on the Vite dev server.
 */
export function isTauriRuntime(): boolean {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return true
  }
  const platform = import.meta.env.TAURI_ENV_PLATFORM
  return typeof platform === 'string' && platform.length > 0
}

/** Hosted web simulator or explicit ?demo=true — not the full desktop shell. */
export function isRestrictedSimulatorShell(search: string): boolean {
  if (import.meta.env.VITE_SIMULATOR_MODE === 'true') return true
  if (hasDemoModeQuery(search)) return true
  if (isTauriRuntime()) return false
  return hasDemoSessionFlag()
}

/** Parse the query exactly; substring checks also matched unrelated parameters. */
export function hasDemoModeQuery(search: string): boolean {
  return new URLSearchParams(search).get('demo') === 'true'
}

/** Remember hosted demo across hash-only navigation and full reloads. */
export function rememberDemoSession(search: string): void {
  if (hasDemoModeQuery(search)) {
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true')
    } catch {
      // Private mode or blocked storage — query string still works for this load.
    }
  }
}

export function hasDemoSessionFlag(): boolean {
  try {
    return sessionStorage.getItem(DEMO_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * True when the hosted web simulator (or an explicit ?demo=true) is active.
 * The desktop app shares localhost:5173 with Vite — ignore the web-only session
 * flag there so demo mode does not suppress hub, menus, or first-run intro.
 */
export function isHostedDemoActive(search: string): boolean {
  return isRestrictedSimulatorShell(search)
}

/** Drop a stale web-demo session flag when opening the full desktop shell. */
export function clearStaleWebDemoSessionInTauri(): void {
  if (!isTauriRuntime()) return
  if (hasDemoModeQuery(window.location.search)) return
  if (!hasDemoSessionFlag()) return
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Set the hash route without dropping `?demo=true` (and other query params).
 * Use instead of assigning `window.location.hash` directly in demo builds.
 */
export function navigateAppHash(hash: string): void {
  const normalized = hash.startsWith('#') ? hash : `#${hash}`

  const url = new URL(window.location.href)
  url.hash = normalized
  if (isHostedDemoActive(url.search)) {
    url.searchParams.set('demo', 'true')
  }
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) {
    return
  }
  window.history.replaceState(null, '', next)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
